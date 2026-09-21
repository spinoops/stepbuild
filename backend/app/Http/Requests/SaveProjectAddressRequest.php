<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveProjectAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:80'],
            'address_id' => ['nullable', 'integer', Rule::exists('addresses', 'id')->whereNull('deleted_at')],
            'name' => ['nullable', 'string', 'max:255'],
            'street' => ['nullable', 'string', 'max:255'],
            'street_no' => ['nullable', 'string', 'max:20'],
            'zip' => ['nullable', 'string', 'max:10'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'remark' => ['nullable', 'string', 'max:2000'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
