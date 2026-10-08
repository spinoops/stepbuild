<?php

namespace App\Http\Controllers;

use App\Models\Collaborator;
use App\Models\CollaboratorAbsence;
use App\Support\RegiePricing;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Absences d'un collaborateur (vacances, maladie…), saisies jour par jour ou par période.
 */
class CollaboratorAbsenceController extends Controller
{
    /**
     * Enregistre une absence : { from, to?, type, hours?, note? }. Sur une période, seuls les jours
     * ouvrés sont pris ; 0 heure efface l'absence. Une absence par jour et par collaborateur.
     */
    public function store(Request $request, Collaborator $collaborator): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'type' => ['required', Rule::in(array_keys(CollaboratorAbsence::TYPES))],
            'hours' => ['nullable', 'numeric', 'min:0', 'max:24'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $from = CarbonImmutable::parse($data['from']);
        $to = ! empty($data['to']) ? CarbonImmutable::parse($data['to']) : $from;
        $hours = array_key_exists('hours', $data) && $data['hours'] !== null ? (float) $data['hours'] : RegiePricing::dayHours();
        $range = $to->greaterThan($from);

        $saved = 0;
        for ($day = $from; $day->lessThanOrEqualTo($to); $day = $day->addDay()) {
            if ($range && $day->isWeekend()) {
                continue;
            }
            if ($hours <= 0) {
                $collaborator->absences()->whereDate('date', $day->toDateString())->delete();

                continue;
            }
            $collaborator->absences()->updateOrCreate(
                ['date' => $day->toDateString()],
                ['type' => $data['type'], 'hours' => $hours, 'note' => $data['note'] ?? null],
            );
            $saved++;
        }

        return response()->json([
            'saved' => $saved,
            'data' => $collaborator->absences()->whereBetween('date', [$from->toDateString(), $to->toDateString()])->orderBy('date')->get()
                ->map(fn (CollaboratorAbsence $absence) => ['id' => $absence->id, 'date' => $absence->date->format('Y-m-d'), 'type' => $absence->type, 'hours' => $absence->hours, 'note' => $absence->note]),
        ]);
    }

    public function destroy(Collaborator $collaborator, CollaboratorAbsence $absence): JsonResponse
    {
        abort_unless($absence->collaborator_id === $collaborator->id, 404);
        $absence->delete();

        return response()->json(['message' => 'Absence supprimée.']);
    }
}
