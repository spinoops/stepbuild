<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCatalogChapterRequest extends FormRequest
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
        $chapterId = $this->route('chapter')?->id;

        return [
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('catalog_chapters', 'id')->whereNull('deleted_at'),
                Rule::notIn(array_filter([$chapterId])), // un chapitre ne peut pas être son propre parent
            ],
            'code' => ['required', 'string', 'max:20'],
            'label' => ['required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
