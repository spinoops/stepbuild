<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SavePriceElementRequest;
use App\Http\Resources\PriceElementResource;
use App\Models\PriceElement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PriceElementController extends Controller
{
    use HandlesGridQuery;

    private const COLUMNS = [
        'group_code', 'number', 'description', 'unit', 'unit_regie',
        'supplier_price', 'net_price', 'regie_price', 'regie_code',
    ];

    /**
     * Liste paginée. Filtres : ?family=2, ?group=M92, plus les paramètres de grille.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PriceElement::query()
            ->when($request->filled('family'), fn ($q) => $q->where('family', (int) $request->query('family')))
            ->when($request->filled('group'), fn ($q) => $q->where('group_code', $request->query('group')));

        if (! $request->filled('sort')) {
            $query->orderBy('family');
        }

        return PriceElementResource::collection(
            $this->paginateGrid($query, $request, self::COLUMNS, self::COLUMNS, 'number')
        );
    }

    /**
     * Groupes existants (panneau latéral), avec le nombre d'éléments. ?family= optionnel.
     */
    public function groups(Request $request): JsonResponse
    {
        $groups = PriceElement::query()
            ->when($request->filled('family'), fn ($q) => $q->where('family', (int) $request->query('family')))
            ->whereNotNull('group_code')
            ->selectRaw('group_code, count(*) as total')
            ->groupBy('group_code')
            ->orderBy('group_code')
            ->get()
            ->map(fn ($row) => ['code' => $row->group_code, 'total' => (int) $row->total]);

        return response()->json(['data' => $groups]);
    }

    public function show(PriceElement $element): PriceElementResource
    {
        return PriceElementResource::make($element);
    }

    public function store(SavePriceElementRequest $request): JsonResponse
    {
        $element = PriceElement::create($request->validated());

        return PriceElementResource::make($element->refresh())->response()->setStatusCode(201);
    }

    public function update(SavePriceElementRequest $request, PriceElement $element): PriceElementResource
    {
        $element->update($request->validated());

        return PriceElementResource::make($element);
    }

    public function destroy(PriceElement $element): JsonResponse
    {
        $element->delete();

        return response()->json(['message' => 'Élément supprimé.']);
    }
}
