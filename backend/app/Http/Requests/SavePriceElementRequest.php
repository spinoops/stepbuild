<?php

namespace App\Http\Requests;

use App\Models\PriceElement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePriceElementRequest extends FormRequest
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
            'family' => ['required', 'integer', Rule::in(array_keys(PriceElement::FAMILIES))],
            'group_code' => ['nullable', 'string', 'max:20'],
            'number' => ['required', 'string', 'max:30'],
            'description' => ['required', 'string', 'max:500'],
            'unit' => ['nullable', 'string', 'max:20'],
            'unit_regie' => ['nullable', 'string', 'max:20'],
            'supplier_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'net_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'regie_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'regie_code' => ['nullable', 'string', 'max:30'],
            'unit_factor' => ['sometimes', 'numeric', 'min:0', 'max:999999'],
            'discount_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
