<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\Project;
use App\Support\CostControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Rapport de régie (contrôle des coûts) d'un projet : devis contre rapports journaliers, étape par étape.
 * Réservé à la gestion (prix).
 */
class CostControlController extends Controller
{
    /**
     * ?project_id= (obligatoire), ?document_id= (devis à comparer, sinon le devis accepté ou le dernier),
     * ?status= (rapports d'un statut), ?from= / ?to= (dates des rapports).
     */
    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'integer', Rule::exists('projects', 'id')->whereNull('deleted_at')],
            'document_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(DailyReport::STATUSES)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        return response()->json(CostControl::build(Project::findOrFail($data['project_id']), $data));
    }

    /**
     * Applique une marge sur le coût brut (prix client) aux lignes d'une étape, du « hors devis » ou de tout le
     * chantier : { project_id, scope: step|other|all, document_step_id?, markup_percent, document_id?, status?, from?, to? }.
     * Les rapports facturés ne sont pas touchés. Renvoie le rapport recalculé.
     */
    public function applyMargin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'integer', Rule::exists('projects', 'id')->whereNull('deleted_at')],
            'scope' => ['required', Rule::in(['step', 'other', 'all'])],
            'document_step_id' => ['required_if:scope,step', 'nullable', 'integer'],
            'markup_percent' => ['required', 'numeric', 'min:-100', 'max:500'],
            'document_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(DailyReport::STATUSES)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);
        $project = Project::findOrFail($data['project_id']);
        $result = CostControl::applyMargin($project, $data['scope'], isset($data['document_step_id']) ? (int) $data['document_step_id'] : null, (float) $data['markup_percent'], $data);

        return response()->json([...$result, 'report' => CostControl::build($project, $data)]);
    }
}
