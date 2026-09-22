<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentPositionCostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'family' => $this->family,
            'price_element_id' => $this->price_element_id,
            'label' => $this->label,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'per_dimension' => $this->per_dimension,
            'pack_size' => $this->pack_size,
            'unit_cost' => $this->unit_cost,
            'markup_percent' => $this->markup_percent,
            'cost' => $this->cost,
            'sale' => $this->sale,
            'note' => $this->note,
        ];
    }
}
