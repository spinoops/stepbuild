<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCollaboratorRequest extends FormRequest
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
        $id = $this->route('collaborator')?->id;

        return [
            'number' => ['nullable', 'string', 'max:20'],
            'last_name' => ['required', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'hourly_cost' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'regie_element_id' => ['nullable', 'integer', Rule::exists('price_elements', 'id')->where('family', 1)->whereNull('deleted_at')],
            'regie_price' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            // Un compte de connexion ne peut correspondre qu'à un seul collaborateur.
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id'), Rule::unique('collaborators', 'user_id')->ignore($id)->whereNull('deleted_at')],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
