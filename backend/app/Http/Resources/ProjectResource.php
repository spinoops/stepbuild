<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'designation1' => $this->designation1,
            'designation2' => $this->designation2,
            'client_id' => $this->client_id,
            'client' => $this->whenLoaded('client', fn () => $this->client ? [
                'id' => $this->client->id,
                'label' => trim("{$this->client->last_name} {$this->client->first_name}"),
                'city' => $this->client->city,
                'phone' => $this->client->phone,
                'email' => $this->client->email,
            ] : null),
            'status' => $this->status,
            'is_active' => $this->is_active,
            'is_template' => $this->is_template,
            'street' => $this->street,
            'street_no' => $this->street_no,
            'zip' => $this->zip,
            'city' => $this->city,
            'country' => $this->country,
            'phone' => $this->phone,
            'mobile' => $this->mobile,
            'contract_no' => $this->contract_no,
            'cost_unit' => $this->cost_unit,
            'invoice_instructions' => $this->invoice_instructions,
            'remark' => $this->remark,
            'cover_url' => $this->whenLoaded('cover', fn () => $this->cover?->url()),
            'addresses' => ProjectAddressResource::collection($this->whenLoaded('addresses')),
            'photos' => ProjectPhotoResource::collection($this->whenLoaded('photos')),
            'addresses_count' => $this->whenCounted('addresses'),
            'photos_count' => $this->whenCounted('photos'),
            'updated_at' => $this->updated_at,
        ];
    }
}
