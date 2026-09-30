<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveDocumentPositionRequest;
use App\Http\Requests\SavePositionBreakdownRequest;
use App\Http\Resources\DocumentResource;
use App\Models\CatalogArticle;
use App\Models\Document;
use App\Models\DocumentPosition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Positions d'un devis. Toutes les actions renvoient le document complet (totaux à jour).
 */
class DocumentPositionController extends Controller
{
    /**
     * Ajoute une position : depuis un article du catalogue (prix repris) ou en saisie libre.
     * `after_id` l'insère juste après une position existante, sinon en fin d'étape.
     */
    public function store(SaveDocumentPositionRequest $request, Document $document): JsonResponse
    {
        $data = $request->validated();
        $step = $document->steps()->findOrFail($data['document_step_id']);

        $position = DB::transaction(function () use ($data, $document, $step) {
            $attributes = collect($data)->except(['after_id', 'document_step_id'])->all();

            if (! empty($data['catalog_article_id'])) {
                $article = CatalogArticle::with('chapter:id,code')->findOrFail($data['catalog_article_id']);
                $attributes = array_merge([
                    'kind' => 'item',
                    'code' => implode('.', array_filter([$article->chapter?->code, $article->code, $article->sub_code])),
                    'description' => $article->description,
                    'unit' => $article->unit,
                    'unit_price' => $article->sale_price,
                    'cost_price' => $article->purchase_price,
                ], array_filter($attributes, fn ($value) => $value !== null));
                $article->increment('usage_count'); // les plus utilisés remontent dans la recherche
            }

            $after = isset($data['after_id']) ? $step->positions()->find($data['after_id']) : null;
            if ($after) {
                $step->positions()->where('position', '>', $after->position)->increment('position');
                $attributes['position'] = $after->position + 1;
            } else {
                $attributes['position'] = ((int) $step->positions()->max('position')) + 1;
            }

            return $step->positions()->create([...$attributes, 'document_id' => $document->id]);
        });

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL))
            ->additional(['created_position_id' => $position->id])
            ->response()
            ->setStatusCode(201);
    }

    public function update(SaveDocumentPositionRequest $request, Document $document, DocumentPosition $position): DocumentResource
    {
        abort_unless($position->document_id === $document->id, 404);

        $data = collect($request->validated())->except(['after_id'])->all();
        if (isset($data['document_step_id'])) {
            $document->steps()->findOrFail($data['document_step_id']); // l'étape doit appartenir au document
        }
        if ($position->costs()->exists()) {
            unset($data['cost_price']); // le prix de revient vient du sous-détail
        }
        $position->update($data);

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL));
    }

    /**
     * Sous-détail de prix de la position : dimension, lignes de coûts (remplacement complet),
     * et report facultatif du prix calculé dans le prix de vente.
     */
    public function breakdown(SavePositionBreakdownRequest $request, Document $document, DocumentPosition $position): DocumentResource
    {
        abort_unless($position->document_id === $document->id && $position->kind === 'item', 404);
        $data = $request->validated();

        DB::transaction(function () use ($data, $position) {
            $position->fill(collect($data)->only(['dimension', 'dimension_unit', 'price_per_dimension', 'internal_remark'])->all())->save();
            $position->syncBreakdown($data['lines']);
            if (! empty($data['apply_price']) && $position->calculated_price !== null) {
                $position->update(['unit_price' => $position->calculated_price]);
            }
        });

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL));
    }

    public function destroy(Document $document, DocumentPosition $position): DocumentResource
    {
        abort_unless($position->document_id === $document->id, 404);
        $position->delete();

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL));
    }

    /**
     * Retire les positions chiffrables restées sans quantité (articles importés d'un modèle et non retenus).
     * { "step_id": 4 } limite à une étape. Sous-titres et textes sont conservés.
     */
    public function prune(Request $request, Document $document): JsonResponse
    {
        $data = $request->validate(['step_id' => ['nullable', 'integer']]);

        $removed = $document->positions()
            ->where('kind', 'item')
            ->whereNull('quantity')
            ->when($data['step_id'] ?? null, fn ($q, $stepId) => $q->where('document_step_id', $stepId))
            ->delete();

        return DocumentResource::make($document->recalculate()->load(DocumentController::FULL))
            ->additional(['removed' => $removed])
            ->response();
    }

    /**
     * Réordonne les positions d'une étape : { "step_id": 4, "ids": [9, 7, 8] }.
     */
    public function reorder(Request $request, Document $document): DocumentResource
    {
        $data = $request->validate([
            'step_id' => ['required', 'integer'],
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);
        $step = $document->steps()->findOrFail($data['step_id']);

        foreach (array_values($data['ids']) as $index => $id) {
            $step->positions()->whereKey($id)->update(['position' => $index + 1]);
        }

        return DocumentResource::make($document->load(DocumentController::FULL));
    }
}
