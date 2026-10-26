<?php

namespace App\Support;

use App\Models\Document;
use App\Models\DocumentPosition;
use App\Models\DocumentPositionCost;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfWrapper;
use Carbon\Carbon;
use Dompdf\Adapter\CPDF;
use Dompdf\FontMetrics;

/**
 * Mise en page d'un document commercial (devis) pour le PDF : page de garde avec récapitulation,
 * puis le détail des positions. Numérotation continue comme sur les devis Lachat : étape 5,
 * positions 5.1, 5.2 ; un sous-titre 6.1 ouvre un sous-groupe 6.1.1, 6.1.2.
 */
class DocumentPrint
{
    public const TITLES = ['devis' => 'Devis estimatif', 'acompte' => "Demande d'acompte", 'travaux' => 'Travaux exécutés', 'facture' => 'Facture'];

    public static function title(Document $document): string
    {
        return (self::TITLES[$document->type] ?? 'Document').' N° '.$document->number;
    }

    /**
     * Étapes et positions numérotées pour l'impression. Avec `$withBreakdown`, chaque position chiffrée
     * reçoit ses lignes de sous-détail (`costs`) pour les imprimer, en compact, sous la ligne.
     *
     * @return array<int, array{number: string, label: string, total: float, rows: array<int, array<string, mixed>>}>
     */
    public static function steps(Document $document, bool $withBreakdown = false): array
    {
        $document->loadMissing($withBreakdown ? 'steps.positions.costs' : 'steps.positions');
        $steps = [];

        foreach ($document->steps->values() as $index => $step) {
            $number = (string) ($index + 1);
            $rows = [];
            $item = 0;        // compteur au niveau de l'étape (positions et sous-titres)
            $group = null;    // numéro du sous-titre courant
            $sub = 0;         // compteur sous le sous-titre

            foreach ($step->positions as $position) {
                if ($position->kind === 'text') {
                    $rows[] = ['kind' => 'text', 'number' => '', 'description' => $position->description];

                    continue;
                }

                if ($position->kind === 'pagebreak') {
                    $rows[] = ['kind' => 'pagebreak', 'number' => '', 'description' => ''];

                    continue;
                }

                if ($position->kind === 'title') {
                    $group = $number.'.'.(++$item);
                    $sub = 0;
                    $rows[] = ['kind' => 'title', 'number' => $group, 'description' => $position->description];

                    continue;
                }

                $rows[] = [
                    'kind' => 'item',
                    'number' => $group ? $group.'.'.(++$sub) : $number.'.'.(++$item),
                    'description' => $position->description,
                    'unit' => $position->unit,
                    'quantity' => $position->quantity,
                    'quoted_quantity' => $position->quoted_quantity,
                    'quoted_amount' => $position->quoted_quantity !== null && $position->unit_price !== null ? round($position->quoted_quantity * $position->unit_price, 2) : null,
                    'unit_price' => $position->unit_price,
                    'amount' => $position->amount,
                    'is_optional' => $position->is_optional,
                    'costs' => $withBreakdown ? self::costRows($position) : [],
                    'breakdown_total' => $withBreakdown && $position->calculated_price !== null ? round((float) $position->costs->sum('sale'), 2) : null,
                ];
            }

            $steps[] = [
                'number' => $number,
                'label' => $step->label,
                'total' => round((float) $step->positions->where('is_optional', false)->sum('amount'), 2),
                // Travaux exécutés : montant du devis pour la même étape (quantités du devis × prix).
                'quoted_total' => round((float) collect($rows)->where('kind', 'item')->where('is_optional', false)->sum('quoted_amount'), 2),
                'rows' => $rows,
            ];
        }

        return $steps;
    }

    /**
     * Lignes du sous-détail d'une position, prêtes à imprimer (famille, libellé, quantité comptée, coût, vente).
     *
     * @return array<int, array<string, mixed>>
     */
    private static function costRows(DocumentPosition $position): array
    {
        $quantity = $position->breakdownQuantity();

        return $position->costs->map(fn (DocumentPositionCost $cost) => [
            'family' => DocumentPositionCost::FAMILIES[$cost->family] ?? '',
            'label' => $cost->label,
            'quantity' => $cost->computedQuantity($quantity),
            'unit' => $cost->unit,
            'unit_cost' => $cost->unit_cost,
            'markup_percent' => $cost->markup_percent,
            'sale' => $cost->sale,
        ])->all();
    }

    /** Quantité du sous-détail : 2, 2.5, 37.8 (sans zéros inutiles). */
    public static function qty(float $value): string
    {
        return rtrim(rtrim(number_format($value, 3, '.', "'"), '0'), '.');
    }

    /** Montant au format suisse : 12'420.69. */
    public static function money(?float $value): string
    {
        return $value === null ? '' : number_format($value, 2, '.', "'");
    }

    /** « 27 août 2026 ». */
    public static function longDate(Carbon $date): string
    {
        $months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

        return $date->day.($date->day === 1 ? 'er' : '').' '.$months[$date->month - 1].' '.$date->year;
    }

    /**
     * Construit le PDF : vue Blade + en-têtes et pieds de page dessinés sur chaque page
     * (la page de garde porte le n° TVA, les suivantes le rappel du document et du projet).
     * Options : `breakdown` (sous-détails sous les positions, en rouge), `prices` (false = sans prix),
     * `step_totals` (false = sans le total de chaque étape sous ses lignes).
     *
     * @param  array{breakdown?: bool, prices?: bool, step_totals?: bool}  $options
     */
    public static function pdf(Document $document, array $options = []): PdfWrapper
    {
        $withBreakdown = (bool) ($options['breakdown'] ?? false);
        $showPrices = (bool) ($options['prices'] ?? true);
        $stepTotals = (bool) ($options['step_totals'] ?? true);
        $document->loadMissing(['project', 'source', 'steps.positions']);
        // Options (hors total) : leur somme est rappelée dans la récapitulation.
        $optionsTotal = round((float) $document->steps->flatMap->positions->where('is_optional', true)->sum('amount'), 2);
        $company = config('company');
        // Demande d'acompte : rappel du devis et des acomptes déjà demandés (hors refusés).
        $advance = null;
        if ($document->type === 'acompte' && $document->source) {
            $previous = Document::where('source_document_id', $document->source_document_id)->where('type', 'acompte')
                ->where('id', '!=', $document->id)->where('sequence', '<', $document->sequence)->where('status', '!=', 'refuse')->get();
            $advance = [
                'quote' => $document->source,
                'quote_net' => $document->source->netAmount(),
                'previous_count' => $previous->count(),
                'previous_net' => round((float) $previous->sum(fn (Document $d) => $d->netAmount()), 2),
            ];
        }
        $logo = $company['logo'] ? resource_path($company['logo']) : null;
        $title = self::title($document);

        $pdf = Pdf::loadView('pdf.document', [
            'document' => $document,
            'project' => $document->project,
            'company' => $company,
            'logo' => $logo && is_file($logo) ? $logo : null,
            'title' => $title,
            'steps' => self::steps($document, $withBreakdown),
            'withBreakdown' => $withBreakdown,
            'showPrices' => $showPrices,
            'stepTotals' => $stepTotals,
            'optionsTotal' => $optionsTotal,
            'advance' => $advance,
            'executed' => $document->type === 'travaux',
            'source' => $document->source,
            'dateLine' => trim($company['city'].', le '.self::longDate($document->date).($document->initials ? ' /'.$document->initials : '')),
        ])->setPaper('a4');

        $pdf->render();

        $projectLine = trim(($document->project?->number ?? '').'  '.($document->project?->designation1 ?? ''));
        $date = $document->date->format('d.m.Y');

        $pdf->getDomPDF()->getCanvas()->page_script(
            function (int $page, int $pages, CPDF $canvas, FontMetrics $fonts) use ($company, $title, $projectLine, $date) {
                $text = fn (string $value) => $value;
                $regular = $fonts->getFont('Helvetica', 'normal');
                $bold = $fonts->getFont('Helvetica', 'bold');
                $gray = [0.35, 0.35, 0.35];
                $left = 56.7;                       // 20 mm
                $right = $canvas->get_width() - 51; // 18 mm
                $bottom = $canvas->get_height() - 34;

                $pageLabel = $text("Page {$page} de {$pages}");
                $canvas->text($right - $fonts->getTextWidth($pageLabel, $regular, 8), $bottom, $pageLabel, $regular, 8, $gray);

                if ($page === 1) {
                    $canvas->text($left, $bottom, $text('N° TVA '.$company['vat_number']), $regular, 8, $gray);

                    return;
                }

                $canvas->text($left, $bottom, $text($company['name'].', '.$company['city']), $regular, 8, $gray);

                // Rappel en tête des pages de détail.
                $canvas->text($left, 34, $text($title), $bold, 9, [0, 0, 0]);
                $canvas->text($right - $fonts->getTextWidth($date, $regular, 8), 34, $date, $regular, 8, $gray);
                $canvas->text($left, 47, $text('Projet : '.mb_strimwidth($projectLine, 0, 110, '…')), $regular, 8, $gray);
                $canvas->line($left, 56, $right, 56, [0.75, 0.75, 0.75], 0.5);
            }
        );

        return $pdf;
    }
}
