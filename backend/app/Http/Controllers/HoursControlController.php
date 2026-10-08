<?php

namespace App\Http\Controllers;

use App\Models\Collaborator;
use App\Models\CollaboratorAbsence;
use App\Models\DailyReport;
use App\Models\DailyReportHour;
use App\Support\RegiePricing;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Contrôle des heures : vue mensuelle par collaborateur croisant projets et jours, à partir des
 * heures des rapports journaliers ; absences ; validation (rapports en cours → en contrôle).
 */
class HoursControlController extends Controller
{
    /**
     * Collaborateurs du mois (?month=2026-08) : heures saisies, rapports encore en cours, absences.
     */
    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->period($request);

        $hours = $this->hoursQuery($from, $to)
            ->select('daily_report_hours.collaborator_id')
            ->selectRaw('sum(daily_report_hours.quantity) as hours, count(distinct case when daily_reports.status = ? then daily_reports.id end) as pending', ['en_cours'])
            ->groupBy('daily_report_hours.collaborator_id')
            ->get()
            ->keyBy('collaborator_id');
        $absences = CollaboratorAbsence::whereBetween('date', [$from, $to])
            ->selectRaw('collaborator_id, sum(hours) as hours')
            ->groupBy('collaborator_id')
            ->pluck('hours', 'collaborator_id');

        $collaborators = Collaborator::query()
            ->where(fn (Builder $q) => $q->where('is_active', true)->orWhereIn('id', $hours->keys()))
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(fn (Collaborator $collaborator) => [
                'id' => $collaborator->id,
                'number' => $collaborator->number,
                'name' => $collaborator->name,
                'last_name' => $collaborator->last_name,
                'first_name' => $collaborator->first_name,
                'is_active' => $collaborator->is_active,
                'hours' => round((float) ($hours[$collaborator->id]->hours ?? 0), 2),
                'pending' => (int) ($hours[$collaborator->id]->pending ?? 0),
                'absence_hours' => round((float) ($absences[$collaborator->id] ?? 0), 2),
            ])
            ->values();

        return response()->json([
            'data' => $collaborators,
            'month' => $from->format('Y-m'),
            'day_hours' => RegiePricing::dayHours(),
        ]);
    }

    /**
     * Matrice d'un collaborateur : une ligne par projet, une cellule par jour { hours, status, report_ids },
     * plus ses absences du mois.
     */
    public function show(Request $request, Collaborator $collaborator): JsonResponse
    {
        [$from, $to] = $this->period($request);

        $lines = $this->hoursQuery($from, $to)
            ->select('daily_report_hours.*')
            ->where('daily_report_hours.collaborator_id', $collaborator->id)
            ->with(['report.project'])
            ->get();

        $projects = [];
        foreach ($lines->groupBy(fn (DailyReportHour $line) => $line->report->project_id) as $projectId => $group) {
            $project = $group->first()->report->project;
            $cells = [];
            foreach ($group->groupBy(fn (DailyReportHour $line) => (int) $line->report->date->format('j')) as $day => $dayLines) {
                $statuses = $dayLines->map(fn (DailyReportHour $line) => $line->report->status)->unique();
                $cells[$day] = [
                    'hours' => round((float) $dayLines->sum('quantity'), 2),
                    // Un seul rapport encore en cours suffit à signaler la cellule comme non validée.
                    'status' => $statuses->contains('en_cours') ? 'en_cours' : ($statuses->contains('en_controle') ? 'en_controle' : 'facture'),
                    'report_ids' => $dayLines->pluck('daily_report_id')->unique()->values(),
                ];
            }
            $projects[] = [
                'id' => $project->id,
                'number' => $project->number,
                'designation1' => $project->designation1,
                'status' => $project->status,
                'total' => round((float) $group->sum('quantity'), 2),
                'cells' => $cells,
            ];
        }
        usort($projects, fn ($a, $b) => strcmp($a['number'], $b['number']));

        $absences = $collaborator->absences()->whereBetween('date', [$from, $to])->orderBy('date')->get()
            ->mapWithKeys(fn (CollaboratorAbsence $absence) => [(int) $absence->date->format('j') => [
                'id' => $absence->id,
                'type' => $absence->type,
                'hours' => $absence->hours,
                'note' => $absence->note,
            ]]);

        return response()->json([
            'data' => [
                'collaborator' => ['id' => $collaborator->id, 'number' => $collaborator->number, 'name' => $collaborator->name],
                'month' => $from->format('Y-m'),
                'days' => $from->daysInMonth,
                'projects' => $projects,
                'absences' => $absences,
                'day_hours' => RegiePricing::dayHours(),
                'absence_types' => CollaboratorAbsence::TYPES,
            ],
        ]);
    }

    /**
     * Valide les heures du mois : tous les rapports encore en cours où le collaborateur a des heures
     * passent « en contrôle ».
     */
    public function validateMonth(Request $request, Collaborator $collaborator): JsonResponse
    {
        [$from, $to] = $this->period($request);

        $ids = $this->hoursQuery($from, $to)
            ->where('daily_report_hours.collaborator_id', $collaborator->id)
            ->where('daily_reports.status', 'en_cours')
            ->pluck('daily_report_hours.daily_report_id')
            ->unique();
        $updated = DailyReport::whereIn('id', $ids)->get()->each(fn (DailyReport $report) => $report->update(['status' => 'en_controle']))->count();

        return response()->json(['updated' => $updated]);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function period(Request $request): array
    {
        $month = (string) $request->query('month', now()->format('Y-m'));
        abort_unless(preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month), 422, 'Mois invalide (AAAA-MM attendu).');
        $from = CarbonImmutable::createFromFormat('Y-m-d', "$month-01")->startOfDay();

        return [$from, $from->endOfMonth()];
    }

    /** Heures productives (étapes du devis ou types de travail en heures) des rapports de la période. */
    private function hoursQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return DailyReportHour::query()
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_hours.daily_report_id')
            ->whereNull('daily_reports.deleted_at')
            ->whereBetween('daily_reports.date', [$from->toDateString(), $to->toDateString()])
            ->where('daily_report_hours.quantity', '>', 0)
            ->where(fn (Builder $q) => $q->whereNotNull('daily_report_hours.document_step_id')
                ->orWhereHas('workType', fn (Builder $w) => $w->where('unit', 'h')));
    }
}
