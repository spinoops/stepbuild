<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentPositionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_step_id' => $this->document_step_id,
            'catalog_article_id' => $this->catalog_article_id,
            'kind' => $this->kind,
            'code' => $this->code,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'cost_price' => $this->cost_price,
            'amount' => $this->amount,
            'is_optional' => $this->is_optional,
            'internal_remark' => $this->internal_remark,
            'dimension' => $this->dimension,
            'dimension_unit' => $this->dimension_unit,
            'price_per_dimension' => $this->price_per_dimension,
            'calculated_price' => $this->calculated_price,
            'costs' => DocumentPositionCostResource::collection($this->whenLoaded('costs')),
            'position' => $this->position,
        ];
    }
}
