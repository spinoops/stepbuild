<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockItemRequest extends FormRequest
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
            'price_element_id' => [
                'required', 'integer',
                Rule::exists('price_elements', 'id')->whereNull('deleted_at'),
                Rule::unique('stock_items', 'price_element_id'),
            ],
            'quantity' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'min_quantity' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'location' => ['nullable', 'string', 'max:60'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['price_element_id.unique' => 'Ce produit est déjà suivi en stock.'];
    }
}
