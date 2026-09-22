<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Requests\SaveDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\Project;
use App\Models\QuoteTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    use HandlesGridQuery;

    private const COLUMNS = ['number', 'title', 'date', 'status', 'recipient_name', 'recipient_city', 'total_net', 'total_gross'];

    /** Relations d'un document complet (renvoyé après chaque modification, totaux à jour). */
    public const FULL = ['project', 'steps.positions'];

    /**
     * Explorateur de documents (tous projets). Filtres : ?type=, ?status=, ?project_id=.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Document::query()
            ->with('project')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->query('type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', (int) $request->query('project_id')));

        return DocumentResource::collection(
            $this->paginateGrid($query, $request, self::COLUMNS, self::COLUMNS, 'date', 'desc')
        );
    }

    /**
     * Crée un document pour le projet : numéro automatique, destinataire = client du projet.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(Document::TYPES))],
            'title' => ['nullable', 'string', 'max:255'],
            'quote_template_id' => ['nullable', 'integer', Rule::exists('quote_templates', 'id')->whereNull('deleted_at')],
        ]);

        $document = Document::createForProject($project, $data['type'], $request->user(), [
            'title' => $data['title'] ?? null,
        ]);

        // Devis : les étapes du modèle choisi (ou du modèle par défaut) sont créées d'emblée.
        if ($data['type'] === 'devis') {
            $template = isset($data['quote_template_id']) ? QuoteTemplate::find($data['quote_template_id']) : QuoteTemplate::default();
            $template?->applyTo($document);
        }

        return DocumentResource::make($document->refresh()->load(self::FULL))->response()->setStatusCode(201);
    }

    public function show(Document $document): DocumentResource
    {
        return DocumentResource::make($document->load(self::FULL));
    }

    public function update(SaveDocumentRequest $request, Document $document): DocumentResource
    {
        $document->update($request->validated());

        return DocumentResource::make($document->recalculate()->load(self::FULL));
    }

    public function destroy(Document $document): JsonResponse
    {
        $document->delete();

        return response()->json(['message' => 'Document supprimé.']);
    }

    /**
     * Nouvelle version (DE.1 → DE.2) avec étapes et positions.
     */
    public function duplicate(Request $request, Document $document): JsonResponse
    {
        $copy = $document->duplicate($request->user());

        return DocumentResource::make($copy->load(self::FULL))->response()->setStatusCode(201);
    }
}
