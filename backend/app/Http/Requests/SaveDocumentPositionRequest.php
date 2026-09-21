<?php

namespace App\Http\Requests;

use App\Models\DocumentPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveDocumentPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * À la création, `catalog_article_id` suffit : la position reprend l'article du catalogue.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $creating = $this->isMethod('post');
        $fromArticle = $creating && $this->filled('catalog_article_id');

        return [
            'document_step_id' => [$creating ? 'required' : 'sometimes', 'integer'],
            'catalog_article_id' => ['nullable', 'integer', Rule::exists('catalog_articles', 'id')->whereNull('deleted_at')],
            'after_id' => ['nullable', 'integer'],
            'kind' => ['sometimes', Rule::in(DocumentPosition::KINDS)],
            'code' => ['nullable', 'string', 'max:40'],
            'description' => [$fromArticle ? 'nullable' : 'required', 'string', 'max:5000'],
            'unit' => ['nullable', 'string', 'max:20'],
            'quantity' => ['nullable', 'numeric', 'min:-999999999', 'max:999999999'],
            'unit_price' => ['nullable', 'numeric', 'min:-9999999999', 'max:9999999999'],
            'cost_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'is_optional' => ['sometimes', 'boolean'],
            'internal_remark' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
