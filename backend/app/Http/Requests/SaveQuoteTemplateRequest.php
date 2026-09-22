<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Modèle de devis : nom, description, défaut, et la liste complète de ses étapes (remplacée à chaque envoi). */
class SaveQuoteTemplateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_default' => ['sometimes', 'boolean'],
            'steps' => ['sometimes', 'array', 'max:100'],
            'steps.*.catalog_chapter_id' => ['nullable', 'integer', Rule::exists('catalog_chapters', 'id')->whereNull('deleted_at')],
            'steps.*.code' => ['required_without:steps.*.catalog_chapter_id', 'nullable', 'string', 'max:20'],
            'steps.*.label' => ['required_without:steps.*.catalog_chapter_id', 'nullable', 'string', 'max:255'],
            'steps.*.with_articles' => ['sometimes', 'boolean'],
        ];
    }
}
