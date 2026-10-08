<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'quantity_after' => $this->quantity_after,
            'note' => $this->note,
            'user' => $this->user?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
