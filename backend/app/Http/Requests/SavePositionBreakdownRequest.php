<?php

namespace App\Http\Requests;

use App\Models\DocumentPositionCost;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Sous-détail de prix d'une position : dimension de référence, mode de prix et lignes de coûts.
 * `apply_price` reporte le prix calculé dans le prix de vente de la position.
 */
class SavePositionBreakdownRequest extends FormRequest
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
            'dimension' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'dimension_unit' => ['nullable', 'string', 'max:20'],
            'price_per_dimension' => ['sometimes', 'boolean'],
            'internal_remark' => ['nullable', 'string', 'max:2000'],
            'apply_price' => ['sometimes', 'boolean'],
            'lines' => ['present', 'array', 'max:200'],
            'lines.*.id' => ['nullable', 'integer'],
            'lines.*.family' => ['required', 'integer', Rule::in(array_keys(DocumentPositionCost::FAMILIES))],
            'lines.*.price_element_id' => ['nullable', 'integer', Rule::exists('price_elements', 'id')],
            'lines.*.label' => ['required', 'string', 'max:255'],
            'lines.*.unit' => ['nullable', 'string', 'max:20'],
            'lines.*.quantity' => ['required', 'numeric', 'min:-99999999', 'max:99999999'],
            'lines.*.per_dimension' => ['sometimes', 'boolean'],
            'lines.*.pack_size' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:-9999999999', 'max:9999999999'],
            'lines.*.markup_percent' => ['sometimes', 'numeric', 'min:-100', 'max:1000'],
            'lines.*.note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
