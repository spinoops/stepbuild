<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CollaboratorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $prices = $request->user()?->canSeePrices() ?? false;

        return [
            'id' => $this->id,
            'number' => $this->number,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'name' => $this->name,
            'hourly_cost' => $this->when($prices, $this->hourly_cost),
            'user_id' => $this->when($prices, $this->user_id),
            'user_email' => $this->when($prices, fn () => $this->user?->email),
            'is_active' => $this->is_active,
            'updated_at' => $this->updated_at,
        ];
    }
}
