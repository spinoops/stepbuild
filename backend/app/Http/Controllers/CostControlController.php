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
}
