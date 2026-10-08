<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Unités de mesure : liste pour tous les rôles, gestion (ajout, modification, suppression) réservée.
 */
class UnitController extends Controller
{
    /** Unités actives dans l'ordre d'affichage ; ?all=1 inclut les inactives (réglages). */
    public function index(Request $request): JsonResponse
    {
        $units = Unit::query()
            ->when(! $request->boolean('all'), fn ($q) => $q->where('is_active', true))
            ->orderBy('position')->orderBy('code')
            ->get()
            ->map(fn (Unit $unit) => $this->format($unit));

        return response()->json(['data' => $units]);
    }

    public function store(Request $request): JsonResponse
    {
        $unit = Unit::create($this->validated($request) + ['position' => ((int) Unit::max('position')) + 1]);

        return response()->json(['data' => $this->format($unit)], 201);
    }

    public function update(Request $request, Unit $unit): JsonResponse
    {
        $unit->update($this->validated($request, $unit));

        return response()->json(['data' => $this->format($unit)]);
    }

    /** Les positions et articles gardent le code en texte : supprimer une unité ne les modifie pas. */
    public function destroy(Unit $unit): JsonResponse
    {
        $unit->delete();

        return response()->json(['message' => 'Unité supprimée.']);
    }

    /** Réordonne : { ids: [...] } dans l'ordre voulu. */
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);
        foreach ($data['ids'] as $position => $id) {
            Unit::whereKey($id)->update(['position' => $position + 1]);
        }

        return $this->index($request->merge(['all' => 1]));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Unit $current = null): array
    {
        $creating = $current === null;

        return $request->validate([
            'code' => [$creating ? 'required' : 'sometimes', 'string', 'max:20', Rule::unique('units', 'code')->ignore($current?->id)],
            'label' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    /** @return array<string, mixed> */
    private function format(Unit $unit): array
    {
        return ['id' => $unit->id, 'code' => $unit->code, 'label' => $unit->label, 'position' => $unit->position, 'is_active' => $unit->is_active];
    }
}
