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

/**
 * Stocks : produits suivis (éléments de coûts), quantités, seuils, mouvements.
 * Accès admin, responsable et rôle « stock » (qui ne voit que cette vue, sans aucun prix).
 */
class StockController extends Controller
{
    /** Familles d'éléments qui peuvent être stockées (pas les salaires ni les tiers). */
    private const STOCKABLE_FAMILIES = [2, 3, 4, 5];

    /** Tous les produits suivis : la vue cherche et filtre en mémoire. */
    public function index(): AnonymousResourceCollection
    {
        $items = StockItem::with('element', 'countedBy')->get()
            ->sortBy(fn (StockItem $item) => mb_strtolower((string) $item->element?->description))
            ->values();

        return StockItemResource::collection($items);
    }

    /** Produits du catalogue d'éléments pas encore suivis, pour en ajouter un (recherche serveur, sans prix). */
    public function products(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('search', ''));
        $limit = min(max((int) $request->query('limit', 30), 1), 100);

        $elements = PriceElement::query()
            ->whereIn('family', self::STOCKABLE_FAMILIES)
            ->whereNotIn('id', StockItem::query()->select('price_element_id'))
            ->when($term !== '', fn ($q) => $q->search($term))
            ->orderByDesc('usage_count')->orderBy('number')
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
