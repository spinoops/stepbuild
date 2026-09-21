<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\PriceElement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Recherche globale : adresses, articles du catalogue, éléments de coûts.
 * - index()    : index compact pour la recherche en mémoire du front (Ctrl+K).
 * - __invoke() : recherche côté serveur (API, futur mobile), dès 2 caractères,
 *                insensible aux accents et à la casse, les plus utilisés en premier.
 */
class SearchController extends Controller
{
    private const LIMIT = 8;

    /**
     * Index compact chargé une fois par le navigateur : la recherche instantanée se fait
     * ensuite en mémoire, sans aller-retour réseau (objectif < 100 ms dès la 2ème lettre).
     * Chaque élément : [id, libellé, sous-libellé, nombre d'utilisations, texte cherchable en plus].
     */
    public function index(): JsonResponse
    {
        $addresses = Address::where('is_active', true)
            ->orderBy('last_name')
            ->get(['id', 'last_name', 'first_name', 'zip', 'city', 'street', 'email', 'phone'])
            ->map(fn (Address $a) => [
                $a->id,
                trim("{$a->last_name} {$a->first_name}"),
                trim("{$a->zip} {$a->city}"),
                0,
                trim("{$a->street} {$a->email} {$a->phone}"),
            ]);

        $articles = CatalogArticle::with('chapter:id,code')
            ->where('is_title', false)
            ->get(['id', 'catalog_chapter_id', 'code', 'sub_code', 'description', 'unit', 'usage_count'])
            ->map(fn (CatalogArticle $a) => [
                $a->id,
                $a->description,
                trim(implode('.', array_filter([$a->chapter?->code, $a->code, $a->sub_code])).' · '.($a->unit ?? ''), ' ·'),
                $a->usage_count,
                '',
            ]);

        $elements = PriceElement::query()
            ->get(['id', 'family', 'number', 'description', 'group_code', 'usage_count'])
            ->map(fn (PriceElement $e) => [
                $e->id,
                $e->description,
                trim("{$e->number} · ".(PriceElement::FAMILIES[$e->family] ?? ''), ' ·'),
                $e->usage_count,
                (string) $e->group_code,
            ]);

        return response()->json([
            'groups' => [
                ['key' => 'addresses', 'title' => 'Adresses', 'path' => '/clients', 'items' => $addresses],
                ['key' => 'articles', 'title' => 'Catalogue', 'path' => '/catalogue', 'items' => $articles],
                ['key' => 'price_elements', 'title' => 'Éléments de coûts', 'path' => '/listes-prix', 'items' => $elements],
            ],
        ]);
    }

    public function __invoke(Request $request): JsonResponse
    {
        $started = microtime(true);
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json(['query' => $term, 'groups' => [], 'took_ms' => 0]);
        }

        $addresses = Address::search($term)
            ->where('is_active', true)
            ->orderBy('last_name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Address $a) => [
                'id' => $a->id,
                'label' => trim("{$a->last_name} {$a->first_name}"),
                'sublabel' => trim("{$a->zip} {$a->city}"),
            ]);

        $articles = CatalogArticle::search($term)
            ->with('chapter')
            ->where('is_title', false)
            ->orderByDesc('usage_count')
            ->orderBy('code')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (CatalogArticle $a) => [
                'id' => $a->id,
                'label' => $a->description,
                'sublabel' => trim(implode('.', array_filter([$a->chapter?->code, $a->code, $a->sub_code])).' · '.($a->unit ?? ''), ' ·'),
            ]);

        $elements = PriceElement::search($term)
            ->orderByDesc('usage_count')
            ->orderBy('number')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (PriceElement $e) => [
                'id' => $e->id,
                'label' => $e->description,
                'sublabel' => trim("{$e->number} · ".(PriceElement::FAMILIES[$e->family] ?? ''), ' ·'),
            ]);

        $groups = collect([
            ['key' => 'addresses', 'title' => 'Adresses', 'path' => '/clients', 'items' => $addresses],
            ['key' => 'articles', 'title' => 'Catalogue', 'path' => '/catalogue', 'items' => $articles],
            ['key' => 'price_elements', 'title' => 'Éléments de coûts', 'path' => '/listes-prix', 'items' => $elements],
        ])->filter(fn ($group) => $group['items']->isNotEmpty())->values();

        return response()->json([
            'query' => $term,
            'groups' => $groups,
            'took_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);
    }
}
