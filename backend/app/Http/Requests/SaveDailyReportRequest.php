<?php

namespace App\Http\Requests;

use App\Models\DailyReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * En-tête d'un rapport journalier. Un ouvrier ne peut passer le statut qu'à « en contrôle » ;
 * le rattachement au devis est réservé à la gestion.
 */
class SaveDailyReportRequest extends FormRequest
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
        $manager = $this->user()?->canSeePrices() ?? false;
        $report = $this->route('report');
        $projectId = $report?->project_id ?? $this->route('project')?->id;

        return [
            'date' => ['sometimes', 'date'],
            'document_id' => $manager
                ? ['nullable', 'integer', Rule::exists('documents', 'id')->where('project_id', $projectId)->where('type', 'devis')->whereNull('deleted_at')]
                : ['prohibited'],
            'status' => ['sometimes', Rule::in($manager ? DailyReport::STATUSES : ['en_cours', 'en_controle'])],
            'is_regie' => ['sometimes', 'boolean'],
            'responsible_id' => ['nullable', 'integer', Rule::exists('collaborators', 'id')->whereNull('deleted_at')],
            'remark' => ['nullable', 'string', 'max:5000'],
            'events' => ['nullable', 'string', 'max:5000'],
            'weather' => ['nullable', 'string', 'max:60'],
            'temp_min' => ['nullable', 'integer', 'min:-50', 'max:60'],
            'temp_max' => ['nullable', 'integer', 'min:-50', 'max:60'],
        ];
    }
}
