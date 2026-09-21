<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCatalogArticleRequest extends FormRequest
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
            'catalog_chapter_id' => ['required', 'integer', Rule::exists('catalog_chapters', 'id')->whereNull('deleted_at')],
            'code' => ['nullable', 'string', 'max:20'],
            'sub_code' => ['nullable', 'string', 'max:20'],
            'description' => ['required', 'string', 'max:5000'],
            'unit' => ['nullable', 'string', 'max:20'],
            'purchase_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'sale_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'work_type' => ['nullable', 'string', 'max:20'],
            'category' => ['nullable', 'string', 'max:50'],
            'is_title' => ['sometimes', 'boolean'],
        ];
    }
}
