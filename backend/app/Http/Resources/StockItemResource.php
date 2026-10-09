<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Produit en stock. Jamais de prix : la vue stock est faite pour le rôle « stock »,
 * qui ne voit ni coûts ni marges.
 */
class StockItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'price_element_id' => $this->price_element_id,
            'number' => $this->element?->number,
            'description' => $this->element?->description,
            'unit' => $this->element?->unit,
            'group_code' => $this->element?->group_code,
            'family' => $this->element?->family,
            'quantity' => $this->quantity,
            'min_quantity' => $this->min_quantity,
            'price_updated_at' => $this->element?->price_updated_at?->toDateString(),
            'location' => $this->location,
            'note' => $this->note,
            'status' => $this->status(),
            'counted_at' => $this->counted_at?->toIso8601String(),
            'counted_by' => $this->countedBy?->name,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
