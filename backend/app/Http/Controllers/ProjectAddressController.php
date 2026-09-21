<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveProjectAddressRequest;
use App\Http\Resources\ProjectAddressResource;
use App\Models\Project;
use App\Models\ProjectAddress;
use Illuminate\Http\JsonResponse;

/**
 * Adresses nommées d'un projet (facturation, architecte, accès…).
 */
class ProjectAddressController extends Controller
{
    public function store(SaveProjectAddressRequest $request, Project $project): JsonResponse
    {
        $address = $project->addresses()->create([
            ...$request->validated(),
            'position' => $request->integer('position', $project->addresses()->count()),
        ]);

        return ProjectAddressResource::make($address)->response()->setStatusCode(201);
    }

    public function update(SaveProjectAddressRequest $request, Project $project, ProjectAddress $address): ProjectAddressResource
    {
        abort_unless($address->project_id === $project->id, 404);
        $address->update($request->validated());

        return ProjectAddressResource::make($address);
    }

    public function destroy(Project $project, ProjectAddress $address): JsonResponse
    {
        abort_unless($address->project_id === $project->id, 404);
        $address->delete();

        return response()->json(['message' => 'Adresse retirée du projet.']);
    }
}
