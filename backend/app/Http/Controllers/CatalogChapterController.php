<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveCatalogChapterRequest;
use App\Http\Resources\CatalogChapterResource;
use App\Models\CatalogChapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CatalogChapterController extends Controller
{
    /**
     * Tous les chapitres (liste à plat, le front reconstruit l'arbre via parent_id).
     * Non paginé : l'arborescence reste petite (quelques dizaines à centaines de nœuds).
     */
    public function index(): AnonymousResourceCollection
    {
        $chapters = CatalogChapter::withCount('articles')
            ->orderBy('position')
            ->orderBy('code')
            ->get();

        return CatalogChapterResource::collection($chapters);
    }

    public function store(SaveCatalogChapterRequest $request): JsonResponse
    {
        $chapter = CatalogChapter::create($request->validated());

        return CatalogChapterResource::make($chapter->loadCount('articles'))->response()->setStatusCode(201);
    }

    public function update(SaveCatalogChapterRequest $request, CatalogChapter $chapter): CatalogChapterResource
    {
        $chapter->update($request->validated());

        return CatalogChapterResource::make($chapter->loadCount('articles'));
    }

    /**
     * Suppression refusée tant que le chapitre contient des articles ou des sous-chapitres.
     */
    public function destroy(CatalogChapter $chapter): JsonResponse
    {
        if ($chapter->articles()->exists() || $chapter->children()->exists()) {
            return response()->json([
                'message' => 'Ce chapitre contient encore des articles ou des sous-chapitres.',
            ], 422);
        }

        $chapter->delete();

        return response()->json(['message' => 'Chapitre supprimé.']);
    }
}
