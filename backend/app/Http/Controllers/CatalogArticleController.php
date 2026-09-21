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
