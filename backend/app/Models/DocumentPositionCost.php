<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ligne du sous-détail de prix d'une position : une ressource (main-d'œuvre, matériau, machine…)
 * avec sa consommation, son conditionnement, son coût unitaire et sa majoration.
 *
 * Quantité calculée = quantité (× dimension de la position si `per_dimension`),
 * arrondie au conditionnement supérieur si `pack_size` (40.5 kg → 3 sacs de 15 kg).
 * Coût = quantité calculée × coût unitaire ; vente = coût × (1 + majoration).
 */
class DocumentPositionCost extends Model
{
    /** Familles = celles des éléments de coûts, avec les abréviations utilisées par les métreurs. */
    public const FAMILIES = [
        1 => 'MO',
        2 => 'MAT',
        3 => 'MACH',
        4 => 'MAT EX',
        5 => 'OUT',
        6 => 'ST',
    ];

    protected $fillable = [
        'document_position_id', 'family', 'price_element_id', 'label', 'unit', 'quantity', 'per_dimension',
        'pack_size', 'unit_cost', 'markup_percent', 'note', 'position',
    ];

    protected function casts(): array
    {
        return [
            'family' => 'integer',
            'quantity' => 'float',
            'per_dimension' => 'boolean',
            'pack_size' => 'float',
            'unit_cost' => 'float',
            'markup_percent' => 'float',
            'cost' => 'float',
            'sale' => 'float',
            'position' => 'integer',
        ];
    }

    public function documentPosition(): BelongsTo
    {
        return $this->belongsTo(DocumentPosition::class);
    }

    public function priceElement(): BelongsTo
    {
        return $this->belongsTo(PriceElement::class)->withTrashed();
    }

    /** Quantité réellement comptée (après dimension et conditionnement). */
    public function computedQuantity(?float $dimension): float
    {
        $quantity = $this->quantity * ($this->per_dimension ? ($dimension ?? 1.0) : 1.0);
        if ($this->pack_size !== null && $this->pack_size > 0) {
            // ceil() sur des flottants : 1.98 / 1 → 2, mais 4.2 / 4.2 doit rester 1 (tolérance).
            return (float) ceil(round($quantity / $this->pack_size, 6));
        }

        return $quantity;
    }

    /** Recalcule coût et vente pour la dimension donnée (sans enregistrer). */
    public function compute(?float $dimension): self
    {
        $this->cost = round($this->computedQuantity($dimension) * $this->unit_cost, 2);
        $this->sale = round($this->cost * (1 + $this->markup_percent / 100), 2);

        return $this;
    }
}
