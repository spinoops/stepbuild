<?php

namespace App\Http\Requests;

use App\Models\Address;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Création et mise à jour d'une adresse (mêmes règles). */
class SaveAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // filtré en amont par le middleware roles
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(Address::TYPES)],
            'title' => ['nullable', 'string', 'max:30'],
            'last_name' => ['required', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'designation' => ['nullable', 'string', 'max:255'],
            'street' => ['nullable', 'string', 'max:255'],
            'street_no' => ['nullable', 'string', 'max:20'],
            'po_box' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:5'],
            'zip' => ['nullable', 'string', 'max:10'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'debtor_no' => ['nullable', 'string', 'max:40'],
            'remark' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
