<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BreakdownTemplateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'group' => $this->group,
            'name' => $this->name,
            'catalog_article_id' => $this->catalog_article_id,
            'dimension' => $this->dimension,
            'dimension_unit' => $this->dimension_unit,
            'price_per_dimension' => $this->price_per_dimension,
            'note' => $this->note,
            'usage_count' => $this->usage_count,
            'lines_count' => $this->whenCounted('lines'),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($line) => [
                'id' => $line->id,
                'family' => $line->family,
                'price_element_id' => $line->price_element_id,
                'label' => $line->label,
                'unit' => $line->unit,
                'quantity' => $line->quantity,
                'per_dimension' => $line->per_dimension,
                'pack_size' => $line->pack_size,
                'unit_cost' => $line->unit_cost,
                'markup_percent' => $line->markup_percent,
                'note' => $line->note,
            ])->values()),
            'updated_at' => $this->updated_at,
        ];
    }
}
