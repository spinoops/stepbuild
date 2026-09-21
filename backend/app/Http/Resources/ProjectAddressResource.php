<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectAddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'label' => $this->label,
            'address_id' => $this->address_id,
            'name' => $this->name,
            'street' => $this->street,
            'street_no' => $this->street_no,
            'zip' => $this->zip,
            'city' => $this->city,
            'phone' => $this->phone,
            'email' => $this->email,
            'remark' => $this->remark,
            'position' => $this->position,
        ];
    }
}
