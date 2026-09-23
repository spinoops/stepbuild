<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveBreakdownTemplateRequest;
use App\Http\Resources\BreakdownTemplateResource;
use App\Models\BreakdownTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Sous-détails de prix types (gestion). La liste complète est légère (nom, groupe, unité) et se
 * charge une fois dans le devis ; les lignes viennent avec la fiche.
 */
class BreakdownTemplateController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = BreakdownTemplate::query()
            ->withCount('lines')
            ->when($request->filled('search'), fn ($q) => $q->search($request->query('search')))
            ->orderBy('group')->orderBy('name');

        return BreakdownTemplateResource::collection($query->get());
    }

    public function show(BreakdownTemplate $template): BreakdownTemplateResource
    {
        return BreakdownTemplateResource::make($template->load('lines'));
    }

    public function store(SaveBreakdownTemplateRequest $request): JsonResponse
    {
        $data = $request->validated();
        $template = DB::transaction(function () use ($data) {
            $template = BreakdownTemplate::create(collect($data)->except('lines')->all());
            $template->syncLines($data['lines'] ?? []);

            return $template;
        });

        return BreakdownTemplateResource::make($template->load('lines'))->response()->setStatusCode(201);
    }

    public function update(SaveBreakdownTemplateRequest $request, BreakdownTemplate $template): BreakdownTemplateResource
    {
        $data = $request->validated();
        DB::transaction(function () use ($data, $template) {
            $template->update(collect($data)->except('lines')->all());
            if (array_key_exists('lines', $data)) {
                $template->syncLines($data['lines']);
            }
        });

        return BreakdownTemplateResource::make($template->refresh()->load('lines'));
    }

    public function destroy(BreakdownTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json(['message' => 'Modèle supprimé.']);
    }

    /** Un modèle vient d'être chargé dans un devis : les plus utilisés remontent en premier. */
    public function used(BreakdownTemplate $template): BreakdownTemplateResource
    {
        $template->increment('usage_count');

        return BreakdownTemplateResource::make($template->load('lines'));
    }
}
