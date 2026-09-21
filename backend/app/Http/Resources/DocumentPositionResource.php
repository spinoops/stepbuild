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
            'position' => $this->position,
        ];
    }
}
