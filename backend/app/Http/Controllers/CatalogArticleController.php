<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SaveCatalogArticleRequest;
use App\Http\Resources\CatalogArticleResource;
use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CatalogArticleController extends Controller
{
    use HandlesGridQuery;

    private const COLUMNS = ['code', 'sub_code', 'description', 'unit', 'purchase_price', 'sale_price', 'work_type', 'category'];

    /**
     * Liste paginée. ?chapter_id= limite au chapitre et à ses sous-chapitres.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = CatalogArticle::query()->with('chapter');

        if ($request->filled('chapter_id')) {
            $chapterId = (int) $request->query('chapter_id');
            $ids = CatalogChapter::where('parent_id', $chapterId)->pluck('id')->push($chapterId);
            $query->whereIn('catalog_chapter_id', $ids);
        }

        // Tri par défaut : ordre du catalogue (chapitre, code, sous-code).
        if (! $request->filled('sort')) {
            $query->orderBy(
                CatalogChapter::select('code')->whereColumn('catalog_chapters.id', 'catalog_articles.catalog_chapter_id')
            )->orderByDesc('is_title');
        }

        return CatalogArticleResource::collection(
            $this->paginateGrid($query, $request, self::COLUMNS, self::COLUMNS, 'code')
        );
    }

    /**
     * Liste compacte de tous les articles chiffrables, chargée une fois par l'éditeur de devis
     * pour une recherche en mémoire. Élément : [id, code complet, description, unité, vente, achat, utilisations].
     */
    public function picker(): JsonResponse
    {
        $items = CatalogArticle::with('chapter:id,code')
            ->where('is_title', false)
            ->get(['id', 'catalog_chapter_id', 'code', 'sub_code', 'description', 'unit', 'sale_price', 'purchase_price', 'usage_count'])
            ->map(fn (CatalogArticle $a) => [
                $a->id,
                implode('.', array_filter([$a->chapter?->code, $a->code, $a->sub_code])),
                $a->description,
                $a->unit,
                $a->sale_price,
                $a->purchase_price,
                $a->usage_count,
                $a->catalog_chapter_id,
            ]);

        return response()->json(['data' => $items]);
    }

    public function show(CatalogArticle $article): CatalogArticleResource
    {
        return CatalogArticleResource::make($article->load('chapter'));
    }

    public function store(SaveCatalogArticleRequest $request): JsonResponse
    {
        $article = CatalogArticle::create($request->validated());

        return CatalogArticleResource::make($article->refresh()->load('chapter'))->response()->setStatusCode(201);
    }

    public function update(SaveCatalogArticleRequest $request, CatalogArticle $article): CatalogArticleResource
    {
        $article->update($request->validated());

        return CatalogArticleResource::make($article->load('chapter'));
    }

    public function destroy(CatalogArticle $article): JsonResponse
    {
        $article->delete();

        return response()->json(['message' => 'Article supprimé.']);
    }
}
