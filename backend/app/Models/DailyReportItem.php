<?php

namespace App\Models;

use App\Support\RegiePricing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ressource consommée dans un rapport : matériau, machine, matériel d'exploitation, outillage ou tiers,
 * rattachée à une étape du devis, avec ses trois niveaux de prix : coût brut (prix net de l'élément de
 * coûts), prix régie (majoré) et prix client.
 */
class DailyReportItem extends Model
{
    /** Familles = celles des éléments de coûts, hors salaire. */
    public const FAMILIES = [2, 3, 4, 5, 6];

    protected $fillable = [
        'daily_report_id', 'family', 'document_step_id', 'price_element_id', 'label', 'unit', 'quantity',
        'unit_cost', 'regie_price', 'client_price', 'note', 'position',
    ];

    protected function casts(): array
    {
        return [
            'family' => 'integer', 'quantity' => 'float', 'unit_cost' => 'float', 'regie_price' => 'float',
            'client_price' => 'float', 'amount' => 'float', 'regie_amount' => 'float', 'client_amount' => 'float',
            'position' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Prix régie : celui de l'élément de coûts, sinon le coût brut majoré ; prix client = régie par défaut.
        static::saving(function (self $item) {
            if ($item->regie_price === null) {
                $item->regie_price = RegiePricing::forElement($item->priceElement, $item->unit_cost);
            }
            if ($item->client_price === null) {
                $item->client_price = $item->regie_price;
            }
            $item->amount = round($item->quantity * (float) $item->unit_cost, 2);
            $item->regie_amount = round($item->quantity * (float) $item->regie_price, 2);
            $item->client_amount = round($item->quantity * (float) $item->client_price, 2);
        });
    }

    /** Reprend le prix régie actuel (élément de coûts ou majoration) et remet le prix client au prix régie. */
    public function applyTariffs(): void
    {
        $this->regie_price = RegiePricing::forElement($this->priceElement, $this->unit_cost);
        $this->client_price = $this->regie_price;
        $this->save();
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(DocumentStep::class, 'document_step_id');
    }

    public function priceElement(): BelongsTo
    {
        return $this->belongsTo(PriceElement::class)->withTrashed();
    }
}
