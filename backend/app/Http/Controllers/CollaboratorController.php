<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SaveCollaboratorRequest;
use App\Http\Resources\CollaboratorResource;
use App\Models\Collaborator;
use App\Models\WorkType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Collaborateurs (liste pour tous les rôles, sans tarif pour l'ouvrier ; gestion réservée).
 */
class CollaboratorController extends Controller
{
    use HandlesGridQuery;

    private const COLUMNS = ['number', 'last_name', 'first_name'];

    /** Colonnes de prix : filtrables et triables par la gestion seulement (sinon un ouvrier
     * retrouverait les tarifs par ?filter[hourly_cost]=… ou ?sort=hourly_cost). */
    private const PRICE_COLUMNS = ['hourly_cost'];

    /** Liste paginée. ?active=1 pour les seuls collaborateurs actifs. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Collaborator::query()
            ->with('user', 'regieElement')
            ->when($request->boolean('active'), fn ($q) => $q->where('is_active', true));

        $columns = $request->user()?->canSeePrices()
            ? [...self::COLUMNS, ...self::PRICE_COLUMNS]
            : self::COLUMNS;

        return CollaboratorResource::collection(
            $this->paginateGrid($query, $request, $columns, $columns, 'last_name')
        );
    }

    /** Types de travail actifs (colonnes supplémentaires de la grille des heures) ; ?all=1 pour la gestion. */
    public function workTypes(Request $request): JsonResponse
    {
        $all = $request->boolean('all') && ($request->user()?->canSeePrices() ?? false);
        $types = WorkType::query()->when(! $all, fn ($q) => $q->where('is_active', true))->orderBy('position')->orderBy('code')->get()
            ->map(fn (WorkType $type) => ['id' => $type->id, 'code' => $type->code, 'label' => $type->label, 'unit' => $type->unit, 'is_active' => $type->is_active, 'position' => $type->position]);

        return response()->json(['data' => $types]);
    }

    public function show(Collaborator $collaborator): CollaboratorResource
    {
        return CollaboratorResource::make($collaborator->load('user', 'regieElement'));
    }

    public function store(SaveCollaboratorRequest $request): JsonResponse
    {
        $collaborator = Collaborator::create($request->validated());

        return CollaboratorResource::make($collaborator->refresh()->load('user', 'regieElement'))->response()->setStatusCode(201);
    }

    public function update(SaveCollaboratorRequest $request, Collaborator $collaborator): CollaboratorResource
    {
        $collaborator->update($request->validated());

        return CollaboratorResource::make($collaborator->load('user', 'regieElement'));
    }

    public function destroy(Collaborator $collaborator): JsonResponse
    {
        $collaborator->delete();

        return response()->json(['message' => 'Collaborateur supprimé.']);
    }
}
