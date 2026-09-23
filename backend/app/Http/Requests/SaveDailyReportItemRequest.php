<?php

namespace App\Http\Requests;

use App\Models\DailyReportItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveDailyReportItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Depuis un élément de coûts (libellé, unité et prix net repris) ou en saisie libre.
     * Le coût unitaire n'est accepté que de la gestion.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $creating = $this->isMethod('post');
        $fromElement = $creating && $this->filled('price_element_id');
        $manager = $this->user()?->canSeePrices() ?? false;

        return [
            'family' => [$creating ? 'required' : 'sometimes', 'integer', Rule::in(DailyReportItem::FAMILIES)],
            'document_step_id' => ['nullable', 'integer'],
            'price_element_id' => ['nullable', 'integer', Rule::exists('price_elements', 'id')->whereNull('deleted_at')],
            'label' => [$fromElement ? 'nullable' : ($creating ? 'required' : 'sometimes'), 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:20'],
            'quantity' => ['sometimes', 'numeric', 'min:-99999999', 'max:99999999'],
            'unit_cost' => $manager ? ['nullable', 'numeric', 'min:0', 'max:9999999999'] : ['prohibited'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
