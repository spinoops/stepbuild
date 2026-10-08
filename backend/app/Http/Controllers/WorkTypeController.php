<?php

namespace App\Http\Controllers;

use App\Models\WorkType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Types de travail hors étapes (colonnes supplémentaires de la grille des heures) : gestion.
 */
class WorkTypeController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $type = WorkType::create($this->validated($request) + ['position' => ((int) WorkType::max('position')) + 1]);

        return response()->json(['data' => $this->format($type)], 201);
    }

    public function update(Request $request, WorkType $workType): JsonResponse
    {
        $workType->update($this->validated($request, $workType));

        return response()->json(['data' => $this->format($workType)]);
    }

    /** Un type déjà utilisé dans des rapports est désactivé plutôt que supprimé. */
    public function destroy(WorkType $workType): JsonResponse
    {
        if ($workType->hours()->exists()) {
            $workType->update(['is_active' => false]);

            return response()->json(['message' => 'Type utilisé dans des rapports : désactivé.', 'deactivated' => true]);
        }
        $workType->delete();

        return response()->json(['message' => 'Type de travail supprimé.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?WorkType $current = null): array
    {
        $creating = $current === null;

        return $request->validate([
            'code' => [$creating ? 'required' : 'sometimes', 'string', 'max:20', Rule::unique('work_types', 'code')->ignore($current?->id)],
            'label' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'unit' => ['sometimes', Rule::in(WorkType::UNITS)],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    /** @return array<string, mixed> */
    private function format(WorkType $type): array
    {
        return ['id' => $type->id, 'code' => $type->code, 'label' => $type->label, 'unit' => $type->unit, 'is_active' => $type->is_active, 'position' => $type->position];
    }
}
