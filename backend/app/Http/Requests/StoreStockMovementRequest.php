<?php

namespace App\Http\Requests;

use App\Models\StockItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockMovementRequest extends FormRequest
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
        $isCount = $this->input('type') === 'inventaire';

        return [
            'type' => ['required', Rule::in(StockItem::TYPES)],
            // Entrée / sortie : quantité strictement positive ; inventaire : quantité comptée (0 accepté).
            'quantity' => ['required', 'numeric', $isCount ? 'min:0' : 'gt:0', 'max:9999999999'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
