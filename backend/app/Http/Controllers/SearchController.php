<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\PriceElement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Recherche instantanée globale (Ctrl+K) : adresses, articles du catalogue, éléments de coûts.
 * Dès 2 caractères, insensible aux accents et à la casse, les plus utilisés en premier.
 */
class SearchController extends Controller
{
    private const LIMIT = 8;

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
