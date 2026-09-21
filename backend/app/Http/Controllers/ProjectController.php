<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SaveProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    use HandlesGridQuery;

    private const COLUMNS = ['number', 'designation1', 'designation2', 'street', 'zip', 'city', 'status', 'contract_no', 'updated_at'];

    /**
     * Liste paginée (tous les rôles). Filtres : ?status=adjuge, ?active=1, ?templates=1.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Project::query()
            ->with(['client', 'cover'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->boolean('active'), fn ($q) => $q->where('is_active', true))
            ->where('is_template', $request->boolean('templates'));

        return ProjectResource::collection(
            $this->paginateGrid($query, $request, self::COLUMNS, self::COLUMNS, 'number', 'desc')
        );
    }

    /**
     * Nombre de projets actifs par statut (liste colorée, tableau de bord).
     */
    public function stats(): JsonResponse
    {
        $counts = Project::where('is_active', true)
            ->where('is_template', false)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $data = [];
        foreach (Project::STATUSES as $status) {
            $data[$status] = (int) ($counts[$status] ?? 0);
        }

        return response()->json(['data' => $data, 'total' => array_sum($data)]);
    }

    /**
     * Prochain numéro proposé pour le NPA du chantier (ex. 2853 → 2853-056).
     */
    public function nextNumber(Request $request): JsonResponse
    {
        $zip = $request->validate(['zip' => ['required', 'string', 'regex:/^[0-9A-Za-z]{3,10}$/']])['zip'];

        return response()->json(['number' => Project::nextNumber($zip)]);
    }

    public function show(Project $project): ProjectResource
    {
        return ProjectResource::make($project->load(['client', 'cover', 'addresses', 'photos']));
    }

    public function store(SaveProjectRequest $request): JsonResponse
    {
        $project = Project::create($request->validated());

        return ProjectResource::make($project->refresh()->load(['client', 'cover', 'addresses', 'photos']))
            ->response()
            ->setStatusCode(201);
    }

    public function update(SaveProjectRequest $request, Project $project): ProjectResource
    {
        $project->update($request->validated());

        return ProjectResource::make($project->load(['client', 'cover', 'addresses', 'photos']));
    }

    public function destroy(Project $project): JsonResponse
    {
        $project->delete();

        return response()->json(['message' => 'Projet supprimé.']);
    }
}
