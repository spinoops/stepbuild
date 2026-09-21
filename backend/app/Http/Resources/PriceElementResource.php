<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PriceElementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'family' => $this->family,
            'group_code' => $this->group_code,
            'number' => $this->number,
            'description' => $this->description,
            'unit' => $this->unit,
            'unit_regie' => $this->unit_regie,
            'supplier_price' => $this->supplier_price,
            'net_price' => $this->net_price,
            'regie_price' => $this->regie_price,
            'regie_code' => $this->regie_code,
            'unit_factor' => $this->unit_factor,
            'discount_amount' => $this->discount_amount,
            'discount_percent' => $this->discount_percent,
            'usage_count' => $this->usage_count,
            'updated_at' => $this->updated_at,
        ];
    }
}
