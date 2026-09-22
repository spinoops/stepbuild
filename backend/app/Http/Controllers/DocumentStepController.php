<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Models\CatalogChapter;
use App\Models\Document;
use App\Models\DocumentStep;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Étapes d'un devis. Toutes les actions renvoient le document complet (totaux à jour).
 */
class DocumentStepController extends Controller
{
    /**
     * Ajoute une étape : depuis un modèle (chapitre du catalogue, avec ou sans ses articles) ou libre.
     */
    public function store(Request $request, Document $document): JsonResponse
    {
        $data = $request->validate([
            'catalog_chapter_id' => ['nullable', 'integer', Rule::exists('catalog_chapters', 'id')->whereNull('deleted_at')],
            'code' => ['required_without:catalog_chapter_id', 'nullable', 'string', 'max:20'],
            'label' => ['required_without:catalog_chapter_id', 'nullable', 'string', 'max:255'],
            'with_articles' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($data, $document, $request) {
            $chapter = isset($data['catalog_chapter_id']) ? CatalogChapter::find($data['catalog_chapter_id']) : null;

            $step = $document->steps()->create([
                'catalog_chapter_id' => $chapter?->id,
                'code' => $data['code'] ?? $chapter->code,
                'label' => $data['label'] ?? $chapter->label,
                'position' => ((int) $document->steps()->max('position')) + 1,
            ]);

            if ($chapter && $request->boolean('with_articles', true)) {
                $step->importArticles($chapter);
            }
        });

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL))->response()->setStatusCode(201);
    }

    public function update(Request $request, Document $document, DocumentStep $step): DocumentResource
    {
        abort_unless($step->document_id === $document->id, 404);

        $step->update($request->validate([
            'code' => ['required', 'string', 'max:20'],
            'label' => ['required', 'string', 'max:255'],
        ]));

        return DocumentResource::make($document->load(DocumentController::FULL));
    }

    public function destroy(Document $document, DocumentStep $step): DocumentResource
    {
        abort_unless($step->document_id === $document->id, 404);
        $step->delete(); // supprime aussi ses positions (clé étrangère en cascade)

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL));
    }

    /**
     * Réordonne les étapes : { "ids": [3, 1, 2] }.
     */
    public function reorder(Request $request, Document $document): DocumentResource
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        foreach (array_values($ids) as $index => $id) {
            $document->steps()->whereKey($id)->update(['position' => $index + 1]);
        }

        return DocumentResource::make($document->load(DocumentController::FULL));
    }
}
