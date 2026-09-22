<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveQuoteTemplateRequest;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\QuoteTemplateResource;
use App\Models\CatalogChapter;
use App\Models\Document;
use App\Models\QuoteTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Modèles de devis : jeux d'étapes prêts à l'emploi.
 */
class QuoteTemplateController extends Controller
{
    private const WITH = ['steps.chapter:id,code,label'];

    public function index(): AnonymousResourceCollection
    {
        return QuoteTemplateResource::collection(
            QuoteTemplate::with(self::WITH)->orderByDesc('is_default')->orderBy('position')->orderBy('name')->get()
        );
    }

    public function store(SaveQuoteTemplateRequest $request): JsonResponse
    {
        $template = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $template = QuoteTemplate::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'position' => (int) QuoteTemplate::max('position') + 1,
            ]);
            $this->syncSteps($template, $data['steps'] ?? []);
            if ($request->boolean('is_default')) {
                $template->makeDefault();
            }

            return $template;
        });

        return QuoteTemplateResource::make($template->load(self::WITH))->response()->setStatusCode(201);
    }

    public function update(SaveQuoteTemplateRequest $request, QuoteTemplate $template): QuoteTemplateResource
    {
        DB::transaction(function () use ($request, $template) {
            $data = $request->validated();
            $template->update(['name' => $data['name'], 'description' => $data['description'] ?? null]);
            if (array_key_exists('steps', $data)) {
                $this->syncSteps($template, $data['steps']);
            }
            if ($request->has('is_default')) {
                if ($request->boolean('is_default')) {
                    $template->makeDefault();
                } else {
                    $template->forceFill(['is_default' => false])->save();
                }
            }
        });

        return QuoteTemplateResource::make($template->fresh()->load(self::WITH));
    }

    public function destroy(QuoteTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json(['message' => 'Modèle supprimé.']);
    }

    /**
     * Crée un modèle à partir des étapes d'un devis existant.
     */
    public function fromDocument(Request $request, Document $document): JsonResponse
    {
        $name = $request->validate(['name' => ['required', 'string', 'max:255']])['name'];
        $template = QuoteTemplate::fromDocument($document->load('steps'), $name);

        return QuoteTemplateResource::make($template->load(self::WITH))->response()->setStatusCode(201);
    }

    /**
     * Ajoute les étapes d'un modèle à un devis existant (chapitres déjà présents ignorés).
     */
    public function apply(QuoteTemplate $template, Document $document): DocumentResource
    {
        DB::transaction(fn () => $template->applyTo($document));

        return DocumentResource::make($document->load(DocumentController::FULL));
    }

    /**
     * Remplace les étapes du modèle. Une étape liée à un chapitre reprend son code et son libellé.
     *
     * @param  array<int, array<string, mixed>>  $steps
     */
    private function syncSteps(QuoteTemplate $template, array $steps): void
    {
        $template->steps()->delete();

        foreach (array_values($steps) as $index => $step) {
            $chapter = ! empty($step['catalog_chapter_id']) ? CatalogChapter::find($step['catalog_chapter_id']) : null;
            $template->steps()->create([
                'catalog_chapter_id' => $chapter?->id,
                'code' => $chapter?->code ?? $step['code'],
                'label' => $chapter?->label ?? $step['label'],
                'with_articles' => $step['with_articles'] ?? true,
                'position' => $index + 1,
            ]);
        }
    }
}
