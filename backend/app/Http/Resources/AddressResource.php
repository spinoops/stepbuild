<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'designation' => $this->designation,
            'street' => $this->street,
            'street_no' => $this->street_no,
            'po_box' => $this->po_box,
            'country' => $this->country,
            'zip' => $this->zip,
            'city' => $this->city,
            'phone' => $this->phone,
            'mobile' => $this->mobile,
            'email' => $this->email,
            'debtor_no' => $this->debtor_no,
            'remark' => $this->remark,
            'is_active' => $this->is_active,
            'updated_at' => $this->updated_at,
        ];
    }
}
