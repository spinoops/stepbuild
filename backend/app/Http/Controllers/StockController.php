<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStockItemRequest;
use App\Http\Requests\StoreStockMovementRequest;
use App\Http\Requests\UpdateStockItemRequest;
use App\Http\Resources\StockItemResource;
use App\Http\Resources\StockMovementResource;
use App\Models\PriceElement;
use App\Models\StockItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Stocks : produits suivis (éléments de coûts), quantités, seuils, mouvements.
 * Accès admin, responsable et rôle « stock » (qui ne voit que cette vue, sans aucun prix).
 */
class StockController extends Controller
{
    /** Familles d'éléments qui peuvent être stockées (pas les salaires ni les tiers). */
    private const STOCKABLE_FAMILIES = [2, 3, 4, 5];

    /**
     * Tous les produits suivis : la vue cherche et filtre en mémoire. Requête brute (une jointure,
     * pas d'hydratation Eloquent) : 10 000 produits en quelques dizaines de millisecondes. Même
     * forme que StockItemResource.
     */
    public function index(): JsonResponse
    {
        $rows = DB::table('stock_items as s')
            ->join('price_elements as e', 'e.id', '=', 's.price_element_id')
            ->leftJoin('users as u', 'u.id', '=', 's.counted_by')
            ->orderBy('e.description')->orderBy('s.id')
            ->get([
                's.id', 's.price_element_id', 'e.number', 'e.description', 'e.unit', 'e.group_code', 'e.family',
                's.quantity', 's.min_quantity', 's.location', 's.note', 's.counted_at', 'u.name as counted_by', 's.updated_at',
            ]);

        $data = [];
        foreach ($rows as $row) {
            $quantity = (float) $row->quantity;
            $min = $row->min_quantity === null ? null : (float) $row->min_quantity;
            $data[] = [
                'id' => (int) $row->id,
                'price_element_id' => (int) $row->price_element_id,
                'number' => $row->number,
                'description' => $row->description,
                'unit' => $row->unit,
                'group_code' => $row->group_code,
                'family' => $row->family === null ? null : (int) $row->family,
                'quantity' => $quantity,
                'min_quantity' => $min,
                'location' => $row->location,
                'note' => $row->note,
                'status' => StockItem::statusFor($row->counted_at !== null, $quantity, $min),
                'counted_at' => $row->counted_at ? Carbon::parse($row->counted_at)->toIso8601String() : null,
                'counted_by' => $row->counted_by,
                'updated_at' => $row->updated_at ? Carbon::parse($row->updated_at)->toIso8601String() : null,
            ];
        }

        return response()->json(['data' => $data]);
    }

    /** Éléments stockables pas encore suivis (base des recherches de la fenêtre et du champ d'ajout). */
    private function availableProducts(Request $request)
    {
        return PriceElement::query()
            ->whereIn('family', self::STOCKABLE_FAMILIES)
            ->whereNotIn('id', StockItem::query()->select('price_element_id'))
            ->when($request->filled('family'), fn ($q) => $q->where('family', (int) $request->query('family')))
            ->when($request->filled('group'), fn ($q) => $q->where('group_code', (string) $request->query('group')));
    }

    /**
     * Produits du catalogue d'éléments pas encore suivis, pour en ajouter un (recherche serveur, sans prix).
     * Paramètres : search, family, group, limit (300 max) ; sort=number pour la fenêtre de recherche.
     */
    public function products(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('search', ''));
        $limit = min(max((int) $request->query('limit', 30), 1), 300);

        $elements = $this->availableProducts($request)
            ->when($term !== '', fn ($q) => $q->search($term))
            ->when($request->query('sort') === 'number', fn ($q) => $q->orderBy('number'), fn ($q) => $q->orderByDesc('usage_count')->orderBy('number'))
            ->limit($limit)
            ->get(['id', 'family', 'group_code', 'number', 'description', 'unit']);

        return response()->json(['data' => $elements->map(fn (PriceElement $e) => [
            'id' => $e->id,
            'family' => $e->family,
            'group_code' => $e->group_code,
            'number' => $e->number,
            'description' => $e->description,
            'unit' => $e->unit,
        ])]);
    }

    /** Groupes (M92…) des produits pas encore suivis, avec leur nombre, pour la fenêtre de recherche. */
    public function productGroups(Request $request): JsonResponse
    {
        $groups = $this->availableProducts($request)
            ->whereNotNull('group_code')
            ->selectRaw('group_code as code, count(*) as total')
            ->groupBy('group_code')
            ->orderBy('group_code')
            ->get()
            ->map(fn ($row) => ['code' => $row->code, 'total' => (int) $row->total]);

        return response()->json(['data' => $groups]);
    }

    public function store(StoreStockItemRequest $request): JsonResponse
    {
        $data = $request->validated();
        $item = StockItem::create([
            'price_element_id' => $data['price_element_id'],
            'min_quantity' => $data['min_quantity'] ?? null,
            'location' => $data['location'] ?? null,
            'note' => $data['note'] ?? null,
        ]);
        if (($data['quantity'] ?? 0) > 0) {
            $item->apply('inventaire', (float) $data['quantity'], $request->user(), 'Mise en stock');
        }

        return StockItemResource::make($item->load('element', 'countedBy'))->response()->setStatusCode(201);
    }

    public function update(UpdateStockItemRequest $request, StockItem $item): StockItemResource
    {
        $item->update($request->validated());

        return StockItemResource::make($item->load('element', 'countedBy'));
    }

    public function destroy(StockItem $item): JsonResponse
    {
        $item->delete();

        return response()->json(['message' => 'Produit retiré du stock.']);
    }

    /** Entrée, sortie ou inventaire : renvoie le produit mis à jour et le mouvement créé. */
    public function move(StoreStockMovementRequest $request, StockItem $item): JsonResponse
    {
        $data = $request->validated();
        $movement = $item->apply($data['type'], (float) $data['quantity'], $request->user(), $data['note'] ?? null);

        return response()->json([
            'item' => StockItemResource::make($item->load('element', 'countedBy')),
            'movement' => StockMovementResource::make($movement->load('user')),
        ]);
    }

    /** Derniers mouvements d'un produit. */
    public function movements(StockItem $item): AnonymousResourceCollection
    {
        return StockMovementResource::collection($item->movements()->with('user')->limit(50)->get());
    }
}
