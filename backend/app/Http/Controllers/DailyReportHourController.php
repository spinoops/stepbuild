<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesDailyReports;
use App\Http\Resources\DailyReportResource;
use App\Models\Collaborator;
use App\Models\DailyReport;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Grille « Salaire » d'un rapport : présence des collaborateurs et cellules d'heures.
 */
class DailyReportHourController extends Controller
{
    use AuthorizesDailyReports;

    /**
     * Ajoute un collaborateur au rapport (ligne de présence, sans heures).
     */
    public function addCollaborator(Request $request, DailyReport $report): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        $data = $request->validate(['collaborator_id' => ['required', 'integer', Rule::exists('collaborators', 'id')->whereNull('deleted_at')]]);

        if (! $report->hours()->where('collaborator_id', $data['collaborator_id'])->exists()) {
            $collaborator = Collaborator::findOrFail($data['collaborator_id']);
            $report->hours()->create(['collaborator_id' => $collaborator->id, 'quantity' => 0, 'hourly_cost' => $collaborator->hourly_cost]);
        }

        return DailyReportResource::make($report->load(DailyReport::FULL));
    }

    /**
     * Retire un collaborateur du rapport avec toutes ses heures.
     */
    public function removeCollaborator(Request $request, DailyReport $report, Collaborator $collaborator): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        $report->hours()->where('collaborator_id', $collaborator->id)->delete();

        return DailyReportResource::make($report->recalculate()->load(DailyReport::FULL));
    }

    /**
     * Enregistre une cellule : { collaborator_id, document_step_id | work_type_id, quantity }.
     * Une quantité nulle efface la cellule ; le collaborateur reste présent dans le rapport.
     */
    public function setCell(Request $request, DailyReport $report): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        $data = $request->validate([
            'collaborator_id' => ['required', 'integer', Rule::exists('collaborators', 'id')->whereNull('deleted_at')],
            'document_step_id' => ['nullable', 'integer', 'required_without:work_type_id', Rule::exists('document_steps', 'id')->where('document_id', $report->document_id)],
            'work_type_id' => ['nullable', 'integer', 'required_without:document_step_id', Rule::exists('work_types', 'id')],
            'quantity' => ['nullable', 'numeric', 'min:0', 'max:999'],
        ]);

        $collaborator = Collaborator::findOrFail($data['collaborator_id']);
        $stepId = $data['document_step_id'] ?? null;
        $typeId = $stepId ? null : ($data['work_type_id'] ?? null);
        $quantity = (float) ($data['quantity'] ?? 0);

        $cell = $report->hours()
            ->where('collaborator_id', $collaborator->id)
            ->where('document_step_id', $stepId)
            ->where('work_type_id', $typeId)
            ->first();

        if ($quantity <= 0) {
            $cell?->delete();
            // Le collaborateur reste dans la grille.
            if (! $report->hours()->where('collaborator_id', $collaborator->id)->exists()) {
                $report->hours()->create(['collaborator_id' => $collaborator->id, 'quantity' => 0, 'hourly_cost' => $collaborator->hourly_cost]);
            }
        } elseif ($cell) {
            $cell->update(['quantity' => $quantity]);
        } else {
            $report->hours()->create([
                'collaborator_id' => $collaborator->id,
                'document_step_id' => $stepId,
                'work_type_id' => $typeId,
                'quantity' => $quantity,
                'hourly_cost' => $collaborator->hourly_cost,
            ]);
            // La ligne de présence pure devient inutile.
            $report->hours()->where('collaborator_id', $collaborator->id)->whereNull('document_step_id')->whereNull('work_type_id')->delete();
        }

        return DailyReportResource::make($report->recalculate()->load(DailyReport::FULL));
    }
}
