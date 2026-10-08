<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\Document;
use App\Models\PriceElement;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // Catalogue et éléments de coûts : plus de 13 000 lignes depuis la reprise BauBit → requêtes
        // brutes (pas d'hydratation Eloquent), sinon l'index met plusieurs secondes à se construire.
        $articles = DB::table('catalog_articles as a')
            ->leftJoin('catalog_chapters as c', 'c.id', '=', 'a.catalog_chapter_id')
            ->whereNull('a.deleted_at')
            ->where('a.is_title', false)
            ->orderBy('a.id')
            ->get(['a.id', 'c.code as chapter_code', 'a.code', 'a.sub_code', 'a.description', 'a.unit', 'a.usage_count'])
            ->map(fn ($a) => [
                (int) $a->id,
                (string) $a->description,
                trim(implode('.', array_filter([$a->chapter_code, $a->code, $a->sub_code])).' · '.($a->unit ?? ''), ' ·'),
                (int) $a->usage_count,
                '',
            ]);

        $elements = DB::table('price_elements')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'family', 'number', 'description', 'group_code', 'usage_count'])
            ->map(fn ($e) => [
                (int) $e->id,
                (string) $e->description,
                trim("{$e->number} · ".(PriceElement::FAMILIES[(int) $e->family] ?? ''), ' ·'),
                (int) $e->usage_count,
                (string) $e->group_code,
            ]);

        $projects = Project::with('client:id,last_name,first_name')
            ->where('is_active', true)
            ->where('is_template', false)
            ->orderByDesc('number')
            ->get(['id', 'number', 'designation1', 'designation2', 'client_id', 'street', 'zip', 'city', 'contract_no'])
            ->map(fn (Project $p) => [
                $p->id,
                "{$p->number} · {$p->designation1}",
                trim("{$p->zip} {$p->city}"),
                0,
                trim("{$p->designation2} {$p->client_label} {$p->street} {$p->contract_no}"),
            ]);

        $documents = Document::with('project:id,number,designation1')
            ->orderByDesc('date')
            ->get(['id', 'project_id', 'number', 'title', 'recipient_name', 'recipient_first_name', 'recipient_city'])
            ->map(fn (Document $d) => [
                $d->id,
                trim("{$d->number} · ".($d->title ?: $d->project?->designation1)),
                trim("{$d->recipient_name} {$d->recipient_first_name}"),
                0,
                (string) $d->recipient_city,
            ]);

        return response()->json([
            'groups' => [
                ['key' => 'projects', 'title' => 'Projets', 'path' => '/projets', 'items' => $projects],
                ['key' => 'documents', 'title' => 'Documents', 'path' => '/documents', 'items' => $documents],
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
