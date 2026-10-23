<?php

namespace App\Support;

use App\Models\DailyReport;
use App\Models\DailyReportHour;
use App\Models\DailyReportItem;
use App\Models\Document;
use App\Models\DocumentPosition;
use App\Models\DocumentPositionCost;
use App\Models\DocumentStep;
use App\Models\Project;
use Illuminate\Support\Collection;

/**
 * Rapport de régie (contrôle des coûts) : pour chaque étape du devis du projet, ce qui a été chiffré
 * (vente, prix de revient, heures prévues) face à ce que les rapports journaliers ont consommé (heures,
 * coût brut, régie, client). Le **budget** d'une étape est son prix de revient quand le devis en a un
 * (sous-détails ou prix d'achat), sinon son prix de vente ; l'étape est « dépassée » dès que le coût
 * brut réalisé le franchit.
 */
class CostControl
{
    /** Unités qui comptent comme des heures dans le devis (positions et lignes MO des sous-détails). */
    private const HOUR_UNITS = ['h', 'heure', 'heures', 'std'];

    /**
     * @param  array{document_id?: int|null, status?: string|null, from?: string|null, to?: string|null}  $filters
     * @return array<string, mixed>
     */
    public static function build(Project $project, array $filters = []): array
    {
        $quotes = Document::where('project_id', $project->id)->where('type', 'devis')
            ->orderByDesc('sequence')->get(['id', 'number', 'status', 'sequence', 'total_net']);
        $documentId = ! empty($filters['document_id']) && $quotes->contains('id', (int) $filters['document_id'])
            ? (int) $filters['document_id']
            : DailyReport::defaultDocumentId($project);
        $document = $documentId ? Document::with(['steps.positions.costs'])->find($documentId) : null;

        $reports = DailyReport::query()
            ->where('project_id', $project->id)
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(! empty($filters['from']), fn ($q) => $q->whereDate('date', '>=', $filters['from']))
            ->when(! empty($filters['to']), fn ($q) => $q->whereDate('date', '<=', $filters['to']))
            ->orderBy('date')->orderBy('sequence')
            ->get(['id', 'number', 'date', 'status', 'is_regie'])
            ->keyBy('id');
        $reportIds = $reports->keys()->all();

        $hours = DailyReportHour::query()->whereIn('daily_report_id', $reportIds)->where('quantity', '>', 0)
            ->with('workType')->get()
            ->filter(fn (DailyReportHour $line) => $line->isHours());
        $items = DailyReportItem::query()->whereIn('daily_report_id', $reportIds)->get();

        $stepIds = $document?->steps->pluck('id')->all() ?? [];
        $byStep = [];
        foreach ($hours as $line) {
            $key = self::bucketKey($line->document_step_id, $stepIds);
            $bucket = &$byStep[$key][$line->daily_report_id];
            $bucket = self::add($bucket ?? null, (float) $line->quantity, (float) $line->amount, (float) $line->regie_amount, (float) $line->client_amount);
            unset($bucket);
        }
        foreach ($items as $line) {
            $key = self::bucketKey($line->document_step_id, $stepIds);
            $bucket = &$byStep[$key][$line->daily_report_id];
            $bucket = self::add($bucket ?? null, 0.0, (float) $line->amount, (float) $line->regie_amount, (float) $line->client_amount);
            unset($bucket);
        }

        $steps = [];
        $totals = ['planned' => ['sale' => 0.0, 'cost' => 0.0, 'hours' => 0.0, 'budget' => 0.0], 'actual' => self::empty()];
        foreach ($document?->steps ?? [] as $step) {
            $planned = self::planned($step);
            $row = self::row($step->id, $step->code, $step->label, $planned, $byStep[$step->id] ?? [], $reports);
            unset($byStep[$step->id]);
            $steps[] = $row;
            foreach (['sale', 'cost', 'hours', 'budget'] as $k) {
                $totals['planned'][$k] += $planned[$k] ?? 0;
            }
            $totals['actual'] = self::merge($totals['actual'], $row['actual']);
        }

        // Lignes hors devis : types de travail en heures (samedi, formation…), ressources sans étape, et étapes
        // d'une autre version du devis (regroupées ensemble : la marge s'y applique d'un bloc).
        $others = [];
        if (isset($byStep[0])) {
            $row = self::row(null, '—', 'Hors devis (types de travail, lignes sans étape ou d’une autre version)', null, $byStep[0], $reports);
            $others[] = $row;
            $totals['actual'] = self::merge($totals['actual'], $row['actual']);
        }

        $budget = $totals['planned']['budget'];
        $totals['margin_percent'] = self::marginPercent($totals['actual']['cost'], $totals['actual']['client']);
        $totals['budget_basis'] = $totals['planned']['cost'] > 0 ? 'cost' : ($totals['planned']['sale'] > 0 ? 'sale' : null);
        $totals['variance'] = round($budget - $totals['actual']['cost'], 2);
        $totals['percent'] = $budget > 0 ? round($totals['actual']['cost'] / $budget * 100, 1) : null;
        $totals['status'] = self::status($budget, $totals['actual']['cost'], $totals['budget_basis']);
        foreach ($totals['planned'] as $k => $v) {
            $totals['planned'][$k] = round($v, 2);
        }

        return [
            'project' => ['id' => $project->id, 'number' => $project->number, 'designation1' => $project->designation1],
            'document' => $document ? ['id' => $document->id, 'number' => $document->number, 'status' => $document->status] : null,
            'documents' => $quotes->map(fn (Document $q) => ['id' => $q->id, 'number' => $q->number, 'status' => $q->status])->values()->all(),
            'reports' => [
                'count' => $reports->count(),
                'from' => $reports->min('date')?->toDateString(),
                'to' => $reports->max('date')?->toDateString(),
            ],
            'steps' => $steps,
            'others' => $others,
            'totals' => $totals,
        ];
    }

    /**
     * Applique une marge sur le coût brut aux lignes de rapports du projet (rapports non facturés, filtres de
     * statut / période respectés) : prix client = coût brut × (1 + marge %), arrondi à 5 centimes. Le prix
     * régie (tarif de l'entreprise) n'est pas touché. Portée : une étape (`document_step_id`), « hors devis »
     * (lignes sans étape ou d'une autre version du devis) ou tout le chantier. Renvoie le nombre de lignes
     * modifiées et le nombre de lignes verrouillées par la facturation.
     *
     * @param  array{document_id?: int|null, status?: string|null, from?: string|null, to?: string|null}  $filters
     * @return array{updated: int, locked: int}
     */
    public static function applyMargin(Project $project, string $scope, ?int $stepId, float $percent, array $filters = []): array
    {
        $documentId = ! empty($filters['document_id']) ? (int) $filters['document_id'] : DailyReport::defaultDocumentId($project);
        $stepIds = $documentId ? DocumentStep::where('document_id', $documentId)->pluck('id')->all() : [];

        $reports = DailyReport::query()
            ->where('project_id', $project->id)
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(! empty($filters['from']), fn ($q) => $q->whereDate('date', '>=', $filters['from']))
            ->when(! empty($filters['to']), fn ($q) => $q->whereDate('date', '<=', $filters['to']))
            ->get(['id', 'status'])
            ->keyBy('id');
        $ids = $reports->keys()->all();

        $inScope = function (?int $lineStepId) use ($scope, $stepId, $stepIds): bool {
            return match ($scope) {
                'step' => $lineStepId === $stepId,
                'other' => $lineStepId === null || ! in_array($lineStepId, $stepIds, true),
                default => true,
            };
        };
        $factor = 1 + $percent / 100;
        $updated = 0;
        $locked = 0;
        $touched = [];

        $hours = DailyReportHour::query()->whereIn('daily_report_id', $ids)->where('quantity', '>', 0)->with('workType')->get()
            ->filter(fn (DailyReportHour $line) => $line->isHours() && $inScope($line->document_step_id));
        $items = DailyReportItem::query()->whereIn('daily_report_id', $ids)->get()
            ->filter(fn (DailyReportItem $line) => $inScope($line->document_step_id));

        foreach ([$hours, $items] as $lines) {
            foreach ($lines as $line) {
                $cost = $line instanceof DailyReportHour ? $line->hourly_cost : $line->unit_cost;
                if ($cost === null) {
                    continue;
                }
                if ($reports[$line->daily_report_id]->status === 'facture') {
                    $locked++;

                    continue;
                }
                $line->client_price = round((float) $cost * $factor * 20) / 20;
                $line->save();
                $touched[$line->daily_report_id] = true;
                $updated++;
            }
        }
        DailyReport::whereIn('id', array_keys($touched))->get()->each->recalculate();

        return ['updated' => $updated, 'locked' => $locked];
    }

    /** Clé de regroupement d'une ligne : son étape si elle appartient au devis comparé, sinon 0 (hors devis). */
    private static function bucketKey(?int $lineStepId, array $stepIds): int
    {
        return $lineStepId !== null && in_array($lineStepId, $stepIds, true) ? $lineStepId : 0;
    }

    /** Marge réalisée : prix client par rapport au coût brut, en pour-cent (null sans coût). */
    private static function marginPercent(float $cost, float $client): ?float
    {
        return $cost > 0.005 ? round(($client - $cost) / $cost * 100, 1) : null;
    }

    /**
     * Ce que le devis prévoit pour une étape : vente, prix de revient (positions avec un coût), heures
     * (positions en heures + lignes main-d'œuvre des sous-détails), budget retenu.
     *
     * @return array{sale: float, cost: float|null, hours: float, budget: float, budget_basis: string|null}
     */
    public static function planned(DocumentStep $step): array
    {
        $sale = 0.0;
        $cost = 0.0;
        $costed = false;
        $hours = 0.0;
        foreach ($step->positions as $position) {
            /** @var DocumentPosition $position */
            if ($position->kind !== 'item' || $position->is_optional) {
                continue;
            }
            $quantity = (float) ($position->quantity ?? 0);
            $sale += (float) ($position->amount ?? 0);
            if ($position->cost_price !== null && $position->quantity !== null) {
                $cost += $quantity * (float) $position->cost_price;
                $costed = true;
            }
            if ($position->costs->isNotEmpty()) {
                $reference = $position->breakdownQuantity();
                foreach ($position->costs as $line) {
                    /** @var DocumentPositionCost $line */
                    if ($line->family === 1 && self::isHourUnit($line->unit)) {
                        $hours += $line->computedQuantity($reference);
                    }
                }
            } elseif (self::isHourUnit($position->unit)) {
                $hours += $quantity;
            }
        }
        $basis = $costed ? 'cost' : ($sale > 0 ? 'sale' : null);

        return [
            'sale' => round($sale, 2),
            'cost' => $costed ? round($cost, 2) : null,
            'hours' => round($hours, 2),
            'budget' => round($costed ? $cost : $sale, 2),
            'budget_basis' => $basis,
        ];
    }

    private static function isHourUnit(?string $unit): bool
    {
        return $unit !== null && in_array(mb_strtolower(rtrim(trim($unit), '.')), self::HOUR_UNITS, true);
    }

    /**
     * @param  array<int, array{hours: float, cost: float, regie: float, client: float}>  $perReport
     * @param  Collection<int, DailyReport>  $reports
     * @return array<string, mixed>
     */
    private static function row(?int $stepId, string $code, string $label, ?array $planned, array $perReport, Collection $reports): array
    {
        $actual = self::empty();
        $lines = [];
        $lockedCost = 0.0;
        foreach ($perReport as $reportId => $sums) {
            $actual = self::merge($actual, $sums);
            $report = $reports[$reportId];
            if ($report->status === 'facture') {
                $lockedCost += $sums['cost'];
            }
            $lines[] = [
                'id' => $report->id,
                'number' => $report->number,
                'date' => $report->date->toDateString(),
                'status' => $report->status,
                'is_regie' => $report->is_regie,
                'hours' => round($sums['hours'], 2),
                'cost' => round($sums['cost'], 2),
                'regie' => round($sums['regie'], 2),
                'client' => round($sums['client'], 2),
            ];
        }
        usort($lines, fn ($a, $b) => [$a['date'], $a['number']] <=> [$b['date'], $b['number']]);
        $budget = $planned['budget'] ?? 0.0;
        $basis = $planned['budget_basis'] ?? null;

        return [
            'id' => $stepId,
            'code' => $code,
            'label' => $label,
            'planned' => $planned,
            'actual' => array_map(fn ($v) => round($v, 2), $actual),
            'margin_percent' => self::marginPercent($actual['cost'], $actual['client']),
            'locked_cost' => round($lockedCost, 2),
            'variance' => $planned ? round($budget - $actual['cost'], 2) : null,
            'percent' => $budget > 0 ? round($actual['cost'] / $budget * 100, 1) : null,
            'status' => self::status($budget, $actual['cost'], $basis),
            'reports' => $lines,
        ];
    }

    /** ok = dans le budget ; over = dépassé (ou coûts sans rien de prévu) ; none = ni budget ni dépense. */
    private static function status(float $budget, float $actualCost, ?string $basis): string
    {
        if ($basis === null) {
            return $actualCost > 0.005 ? 'over' : 'none';
        }

        return $actualCost > $budget + 0.005 ? 'over' : 'ok';
    }

    /** @return array{hours: float, cost: float, regie: float, client: float} */
    private static function empty(): array
    {
        return ['hours' => 0.0, 'cost' => 0.0, 'regie' => 0.0, 'client' => 0.0];
    }

    /**
     * @param  array{hours: float, cost: float, regie: float, client: float}|null  $bucket
     * @return array{hours: float, cost: float, regie: float, client: float}
     */
    private static function add(?array $bucket, float $hours, float $cost, float $regie, float $client): array
    {
        $bucket ??= self::empty();
        $bucket['hours'] += $hours;
        $bucket['cost'] += $cost;
        $bucket['regie'] += $regie;
        $bucket['client'] += $client;

        return $bucket;
    }

    /**
     * @param  array{hours: float, cost: float, regie: float, client: float}  $a
     * @param  array{hours: float, cost: float, regie: float, client: float}  $b
     * @return array{hours: float, cost: float, regie: float, client: float}
     */
    private static function merge(array $a, array $b): array
    {
        return self::add($a, $b['hours'], $b['cost'], $b['regie'], $b['client']);
    }
}
