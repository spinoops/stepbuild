<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
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
            'app_name' => ['required', 'string', 'max:255'],
            'app_logo_url' => ['nullable', 'string', 'max:2048'],
            'app_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'regie_markup_percent' => ['sometimes', 'numeric', 'min:0', 'max:500'],
            'work_day_hours' => ['sometimes', 'numeric', 'min:1', 'max:24'],
        ];
    }
}
