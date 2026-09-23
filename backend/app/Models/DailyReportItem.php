<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ressource consommée dans un rapport : matériau, machine, matériel d'exploitation, outillage ou tiers,
 * rattachée à une étape du devis, avec son coût brut (prix net de l'élément de coûts).
 */
class DailyReportItem extends Model
{
    /** Familles = celles des éléments de coûts, hors salaire. */
    public const FAMILIES = [2, 3, 4, 5, 6];

    protected $fillable = [
        'daily_report_id', 'family', 'document_step_id', 'price_element_id', 'label', 'unit', 'quantity',
        'unit_cost', 'note', 'position',
    ];

    protected function casts(): array
    {
        return ['family' => 'integer', 'quantity' => 'float', 'unit_cost' => 'float', 'amount' => 'float', 'position' => 'integer'];
    }

    protected static function booted(): void
    {
        static::saving(fn (self $item) => $item->amount = round($item->quantity * (float) $item->unit_cost, 2));
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
