<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // filtré en amont par le middleware roles
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $projectId = $this->route('project')?->id;

        return [
            'number' => [
                'required', 'string', 'max:30',
                Rule::unique('projects', 'number')->ignore($projectId)->whereNull('deleted_at'),
            ],
            'designation1' => ['required', 'string', 'max:255'],
            'designation2' => ['nullable', 'string', 'max:255'],
            'client_id' => ['nullable', 'integer', Rule::exists('addresses', 'id')->whereNull('deleted_at')],
            'status' => ['required', Rule::in(Project::STATUSES)],
            'is_active' => ['sometimes', 'boolean'],
            'is_template' => ['sometimes', 'boolean'],
            'street' => ['nullable', 'string', 'max:255'],
            'street_no' => ['nullable', 'string', 'max:20'],
            'zip' => ['nullable', 'string', 'max:10'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:5'],
            'phone' => ['nullable', 'string', 'max:40'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'contract_no' => ['nullable', 'string', 'max:60'],
            'cost_unit' => ['nullable', 'string', 'max:60'],
            'invoice_instructions' => ['nullable', 'string', 'max:5000'],
            'remark' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return ['number.unique' => 'Ce numéro de projet est déjà utilisé.'];
    }
}
