<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProjectPhotoResource;
use App\Models\Project;
use App\Models\ProjectPhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Photos de présentation d'un projet : envoi (plusieurs à la fois), légende, couverture, suppression.
 */
class ProjectPhotoController extends Controller
{
    public function store(Request $request, Project $project): AnonymousResourceCollection
    {
        $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:12'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:10240'], // 10 Mo par photo
        ], [
            'photos.*.mimes' => 'Formats acceptés : JPG, PNG, WebP.',
            'photos.*.max' => 'Une photo ne peut pas dépasser 10 Mo.',
        ]);

        // La première photo d'un projet est sa couverture (position 0), les suivantes s'ajoutent à la fin.
        $next = $project->photos()->exists() ? ((int) $project->photos()->max('position')) + 1 : 0;
        $created = [];

        foreach ($request->file('photos') as $file) {
            $created[] = $project->photos()->create([
                'path' => $file->store("projects/{$project->id}", ProjectPhoto::DISK),
                'original_name' => $file->getClientOriginalName(),
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
                'position' => $next++,
            ]);
        }

        return ProjectPhotoResource::collection(collect($created));
    }

    /**
     * Met à jour la légende et/ou désigne la photo de couverture (?cover=1).
     */
    public function update(Request $request, Project $project, ProjectPhoto $photo): ProjectPhotoResource
    {
        abort_unless($photo->project_id === $project->id, 404);

        $data = $request->validate([
            'caption' => ['nullable', 'string', 'max:255'],
            'cover' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('caption', $data)) {
            $photo->caption = $data['caption'];
        }

        if ($request->boolean('cover')) {
            // La couverture prend la position 0, les autres se décalent.
            $project->photos()->whereKeyNot($photo->id)->increment('position');
            $photo->position = 0;
        }

        $photo->save();

        return ProjectPhotoResource::make($photo);
    }

    public function destroy(Project $project, ProjectPhoto $photo): JsonResponse
    {
        abort_unless($photo->project_id === $project->id, 404);
        $photo->delete(); // le fichier est supprimé par l'événement du modèle

        return response()->json(['message' => 'Photo supprimée.']);
    }

    /**
     * Sert le fichier via un lien signé temporaire (route hors auth, middleware signed).
     */
    public function file(ProjectPhoto $photo): StreamedResponse
    {
        abort_unless(Storage::disk(ProjectPhoto::DISK)->exists($photo->path), 404);

        return Storage::disk(ProjectPhoto::DISK)->response($photo->path, $photo->original_name, [
            'Cache-Control' => 'private, max-age=21600',
        ]);
    }
}
