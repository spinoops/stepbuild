<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\DailyReportHour;
use App\Models\DailyReportItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Régie : les lignes des rapports journaliers (heures et ressources) avec leurs trois niveaux de prix
 * — brut (coût), régie (tarif majoré de l'entreprise), client — contrôlables et modifiables jusqu'à la
 * facturation. Réservé à la gestion.
 */
class RegieController extends Controller
{
    /**
     * Lignes de régie. Filtres : ?project_id=, ?status=, ?from=, ?to=, ?collaborator_id=, ?all=1
     * (inclut les rapports non marqués « régie »). Renvoie aussi les totaux des trois niveaux.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(DailyReport::STATUSES)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'collaborator_id' => ['nullable', 'integer'],
            'all' => ['nullable', 'boolean'],
        ]);

        $reports = DailyReport::query()
            ->with(['project'])
            ->when(! ($data['all'] ?? false), fn ($q) => $q->where('is_regie', true))
            ->when(! empty($data['project_id']), fn ($q) => $q->where('project_id', (int) $data['project_id']))
            ->when(! empty($data['status']), fn ($q) => $q->where('status', $data['status']))
            ->when(! empty($data['from']), fn ($q) => $q->whereDate('date', '>=', $data['from']))
            ->when(! empty($data['to']), fn ($q) => $q->whereDate('date', '<=', $data['to']))
            ->when(! empty($data['collaborator_id']), fn ($q) => $q->whereHas('hours', fn ($h) => $h->where('collaborator_id', (int) $data['collaborator_id'])))
            ->orderBy('date')->orderBy('sequence')
            ->limit(500)
            ->get()
            ->keyBy('id');

        $ids = $reports->keys()->all();
        $hours = DailyReportHour::query()
            ->whereIn('daily_report_id', $ids)
            ->where('quantity', '>', 0)
            ->when(! empty($data['collaborator_id']), fn ($q) => $q->where('collaborator_id', (int) $data['collaborator_id']))
            ->with(['collaborator.regieElement', 'step', 'workType'])
            ->orderBy('daily_report_id')->orderBy('collaborator_id')->orderBy('id')
            ->get()
            ->filter(fn (DailyReportHour $line) => $line->isHours())
            ->map(fn (DailyReportHour $line) => $this->hourLine($line, $reports[$line->daily_report_id]));

        $items = DailyReportItem::query()
            ->whereIn('daily_report_id', $ids)
            ->with(['priceElement', 'step'])
            ->orderBy('daily_report_id')->orderBy('family')->orderBy('position')->orderBy('id')
            ->get()
            ->map(fn (DailyReportItem $item) => $this->itemLine($item, $reports[$item->daily_report_id]));

        $lines = $hours->concat($items)
            ->sortBy(fn (array $line) => sprintf('%s-%05d-%d-%08d', $line['date'], $line['report_sequence'], $line['family'], $line['id']))
            ->values();

        return response()->json([
            'data' => $lines,
            'reports' => $reports->values()->map(fn (DailyReport $report) => [
                'id' => $report->id,
                'number' => $report->number,
                'date' => $report->date?->format('Y-m-d'),
                'status' => $report->status,
                'is_regie' => $report->is_regie,
                'project' => $report->project ? ['id' => $report->project->id, 'number' => $report->project->number, 'designation1' => $report->project->designation1] : null,
                'total_hours' => $report->total_hours,
                'total_amount' => $report->total_amount,
                'total_regie' => $report->total_regie,
                'total_client' => $report->total_client,
            ])->values(),
            'totals' => $this->totals($lines),
        ]);
    }

    /**
     * Modifie les prix d'une ligne : { cost_price?, regie_price?, client_price? }. Un rapport facturé est
     * verrouillé. Renvoie la ligne et les totaux du rapport.
     */
    public function update(Request $request, string $kind, int $id): JsonResponse
    {
        $data = $request->validate([
            'cost_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999'],
            'regie_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999'],
            'client_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999'],
        ]);

        $line = $kind === 'hour'
            ? DailyReportHour::with(['collaborator.regieElement', 'step', 'workType'])->findOrFail($id)
            : DailyReportItem::with(['priceElement', 'step'])->findOrFail($id);
        $report = DailyReport::with('project')->findOrFail($line->daily_report_id);
        abort_if($report->status === 'facture', 403, 'Rapport facturé : les prix ne peuvent plus être modifiés.');

        if (array_key_exists('cost_price', $data)) {
            $line->{$kind === 'hour' ? 'hourly_cost' : 'unit_cost'} = $data['cost_price'];
        }
        if (array_key_exists('regie_price', $data)) {
            $line->regie_price = $data['regie_price'];
            // Le prix client suit le prix régie tant qu'il n'a pas été fixé à part.
            if (! array_key_exists('client_price', $data) && ($line->client_price === null || $line->client_price == $line->getOriginal('regie_price'))) {
                $line->client_price = $data['regie_price'];
            }
        }
        if (array_key_exists('client_price', $data)) {
            $line->client_price = $data['client_price'];
        }
        $line->save();
        $report->recalculate();

        return response()->json([
            'data' => $kind === 'hour' ? $this->hourLine($line->refresh(), $report) : $this->itemLine($line->refresh(), $report),
            'report' => ['id' => $report->id, 'total_amount' => $report->total_amount, 'total_regie' => $report->total_regie, 'total_client' => $report->total_client],
        ]);
    }

    /**
     * Réapplique les tarifs actuels (collaborateurs, éléments de coûts, majoration) aux rapports non
     * facturés : { project_id } ou { report_ids: [] }. Le prix client repart du prix régie.
     */
    public function applyTariffs(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required_without:report_ids', 'integer'],
            'report_ids' => ['required_without:project_id', 'array'],
            'report_ids.*' => ['integer'],
        ]);

        $reports = DailyReport::query()
            ->where('status', '!=', 'facture')
            ->when(! empty($data['report_ids']), fn ($q) => $q->whereIn('id', $data['report_ids']), fn ($q) => $q->where('project_id', (int) $data['project_id']))
            ->get();
        $reports->each->applyTariffs();

        return response()->json(['updated' => $reports->count()]);
    }

    /** @return array<string, mixed> */
    private function hourLine(DailyReportHour $line, DailyReport $report): array
    {
        return $this->base($report) + [
            'kind' => 'hour',
            'id' => $line->id,
            'family' => 1,
            'collaborator_id' => $line->collaborator_id,
            'step_id' => $line->document_step_id,
            'step' => $line->step ? trim("{$line->step->code} {$line->step->label}") : ($line->workType ? trim("{$line->workType->code} {$line->workType->label}") : null),
            'label' => $line->collaborator?->name ?? "Collaborateur n° {$line->collaborator_id}",
            'regie_label' => $line->collaborator?->regieElement?->description,
            'regie_number' => $line->collaborator?->regieElement?->number,
            'unit' => 'h',
            'quantity' => $line->quantity,
            'cost_price' => $line->hourly_cost,
            'regie_price' => $line->regie_price,
            'client_price' => $line->client_price,
            'cost_amount' => $line->amount,
            'regie_amount' => $line->regie_amount,
            'client_amount' => $line->client_amount,
        ];
    }

    /** @return array<string, mixed> */
    private function itemLine(DailyReportItem $item, DailyReport $report): array
    {
        return $this->base($report) + [
            'kind' => 'item',
            'id' => $item->id,
            'family' => $item->family,
            'collaborator_id' => null,
            'step_id' => $item->document_step_id,
            'step' => $item->step ? trim("{$item->step->code} {$item->step->label}") : null,
            'label' => $item->label,
            'regie_label' => $item->priceElement?->regie_code ? trim("{$item->priceElement->regie_code} {$item->priceElement->description}") : $item->priceElement?->description,
            'regie_number' => $item->priceElement?->number,
            'unit' => $item->unit,
            'quantity' => $item->quantity,
            'cost_price' => $item->unit_cost,
            'regie_price' => $item->regie_price,
            'client_price' => $item->client_price,
            'cost_amount' => $item->amount,
            'regie_amount' => $item->regie_amount,
            'client_amount' => $item->client_amount,
        ];
    }

    /** @return array<string, mixed> */
    private function base(DailyReport $report): array
    {
        return [
            'report_id' => $report->id,
            'report_number' => $report->number,
            'report_sequence' => $report->sequence,
            'date' => $report->date?->format('Y-m-d'),
            'status' => $report->status,
            'locked' => $report->status === 'facture',
            'project_id' => $report->project_id,
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $lines
     * @return array<string, float>
     */
    private function totals(Collection $lines): array
    {
        return [
            'hours' => round((float) $lines->where('kind', 'hour')->sum('quantity'), 2),
            'cost' => round((float) $lines->sum('cost_amount'), 2),
            'regie' => round((float) $lines->sum('regie_amount'), 2),
            'client' => round((float) $lines->sum('client_amount'), 2),
        ];
    }
}
