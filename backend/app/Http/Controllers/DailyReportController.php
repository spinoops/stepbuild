<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesDailyReports;
use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SaveDailyReportRequest;
use App\Http\Resources\DailyReportResource;
use App\Models\Collaborator;
use App\Models\DailyReport;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Rapports journaliers d'un projet. Chaque action renvoie le rapport complet (totaux à jour).
 */
class DailyReportController extends Controller
{
    use AuthorizesDailyReports, HandlesGridQuery;

    private const COLUMNS = ['number', 'date', 'status', 'total_hours'];

    /**
     * Liste paginée. Filtres : ?project_id=, ?status=, ?month=2026-08, ?collaborator_id=.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = DailyReport::query()
            ->visibleTo($request->user())
            ->with(['project', 'responsible'])
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', (int) $request->query('project_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->filled('month') && preg_match('/^\d{4}-\d{2}$/', (string) $request->query('month')), function ($q) use ($request) {
                [$year, $month] = explode('-', (string) $request->query('month'));
                $q->whereYear('date', (int) $year)->whereMonth('date', (int) $month);
            })
            ->when($request->filled('collaborator_id'), fn ($q) => $q->whereHas('hours', fn ($h) => $h->where('collaborator_id', (int) $request->query('collaborator_id'))));

        return DailyReportResource::collection(
            $this->paginateGrid($query, $request, self::COLUMNS, self::COLUMNS, 'date', 'desc')
        );
    }

    /**
     * Nouveau rapport du projet (numéro suivant, devis accepté ou dernier devis, date du jour).
     */
    public function store(SaveDailyReportRequest $request, Project $project): JsonResponse
    {
        $report = DailyReport::createForProject($project, $request->user(), $request->validated());

        return DailyReportResource::make($report->load(DailyReport::FULL))->response()->setStatusCode(201);
    }

    public function show(Request $request, DailyReport $report): DailyReportResource
    {
        $this->authorizeView($request, $report);

        return DailyReportResource::make($report->load(DailyReport::FULL));
    }

    public function update(SaveDailyReportRequest $request, DailyReport $report): DailyReportResource
    {
        $this->authorizeView($request, $report);
        $data = $request->validated();

        // Un rapport verrouillé ne change que de statut (retour en arrière par la gestion).
        if (! $report->isEditableBy($request->user())) {
            abort_unless($request->user()->canSeePrices() && array_keys($data) === ['status'], 403, 'Ce rapport ne peut plus être modifié.');
        }

        $report->update($data);

        return DailyReportResource::make($report->refresh()->load(DailyReport::FULL));
    }

    public function destroy(Request $request, DailyReport $report): JsonResponse
    {
        $this->authorizeEdit($request, $report);
        $report->delete();

        return response()->json(['message' => 'Rapport supprimé.']);
    }

    /**
     * Reprend l'équipe du rapport précédent du projet (collaborateurs présents, sans leurs heures).
     */
    public function copyTeam(Request $request, DailyReport $report): DailyReportResource
    {
        $this->authorizeEdit($request, $report);

        $previous = DailyReport::where('project_id', $report->project_id)
            ->whereKeyNot($report->id)
            ->where(fn ($q) => $q->where('date', '<', $report->date)->orWhere(fn ($q2) => $q2->where('date', $report->date)->where('sequence', '<', $report->sequence)))
            ->orderByDesc('date')->orderByDesc('sequence')
            ->first();

        if ($previous) {
            $present = $report->hours()->pluck('collaborator_id')->unique();
            $ids = $previous->hours()->pluck('collaborator_id')->unique()->diff($present);
            foreach (Collaborator::whereIn('id', $ids)->get() as $collaborator) {
                $report->hours()->create(['collaborator_id' => $collaborator->id, 'quantity' => 0, 'hourly_cost' => $collaborator->hourly_cost]);
            }
        }

        return DailyReportResource::make($report->load(DailyReport::FULL));
    }
}
