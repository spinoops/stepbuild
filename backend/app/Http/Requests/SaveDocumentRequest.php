<?php

namespace App\Http\Requests;

use App\Models\Document;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** En-tête d'un document (le numéro et le type ne se modifient pas). */
class SaveDocumentRequest extends FormRequest
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
            'title' => ['nullable', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'status' => ['required', Rule::in(Document::STATUSES)],
            'address_id' => ['nullable', 'integer', Rule::exists('addresses', 'id')->whereNull('deleted_at')],
            'recipient_title' => ['nullable', 'string', 'max:30'],
            'recipient_name' => ['nullable', 'string', 'max:255'],
            'recipient_first_name' => ['nullable', 'string', 'max:255'],
            'recipient_street' => ['nullable', 'string', 'max:255'],
            'recipient_street_no' => ['nullable', 'string', 'max:20'],
            'recipient_zip' => ['nullable', 'string', 'max:10'],
            'recipient_city' => ['nullable', 'string', 'max:255'],
            'recipient_email' => ['nullable', 'email', 'max:255'],
            'initials' => ['nullable', 'string', 'max:10'],
            'header_text' => ['nullable', 'string', 'max:10000'],
            'footer_text' => ['nullable', 'string', 'max:10000'],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:30'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
