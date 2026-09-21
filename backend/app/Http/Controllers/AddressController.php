<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SaveAddressRequest;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AddressController extends Controller
{
    use HandlesGridQuery;

    private const COLUMNS = ['type', 'title', 'last_name', 'first_name', 'street', 'street_no', 'zip', 'city', 'phone', 'email'];

    /**
     * Liste paginée. Filtres : ?type=client, ?active=1, plus les paramètres de grille.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Address::query()
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->query('type')))
            ->when($request->boolean('active'), fn ($q) => $q->where('is_active', true));

        return AddressResource::collection(
            $this->paginateGrid($query, $request, self::COLUMNS, self::COLUMNS, 'last_name')
        );
    }

    public function show(Address $address): AddressResource
    {
        return AddressResource::make($address);
    }

    public function store(SaveAddressRequest $request): JsonResponse
    {
        $address = Address::create($request->validated());

        return AddressResource::make($address->refresh())->response()->setStatusCode(201);
    }

    public function update(SaveAddressRequest $request, Address $address): AddressResource
    {
        $address->update($request->validated());

        return AddressResource::make($address);
    }

    public function destroy(Address $address): JsonResponse
    {
        $address->delete();

        return response()->json(['message' => 'Adresse supprimée.']);
    }
}
