<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Étape d'un devis (= étape du chantier). Créée depuis un modèle (chapitre du catalogue) ou librement.
 */
class DocumentStep extends Model
{
    protected $fillable = ['document_id', 'catalog_chapter_id', 'code', 'label', 'position'];

    protected function casts(): array
    {
        return ['position' => 'integer'];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(CatalogChapter::class, 'catalog_chapter_id')->withTrashed();
    }

    public function positions(): HasMany
    {
        return $this->hasMany(DocumentPosition::class)->orderBy('position')->orderBy('id');
    }

    /**
     * Recopie les articles du chapitre (et de ses sous-chapitres) comme positions à chiffrer.
     */
    public function importArticles(CatalogChapter $chapter): void
    {
        $chapterIds = CatalogChapter::where('parent_id', $chapter->id)->pluck('id')->push($chapter->id);

        $articles = CatalogArticle::with('chapter:id,code')
            ->whereIn('catalog_chapter_id', $chapterIds)
            ->where('is_title', false)
            ->orderBy('code')->orderBy('sub_code')->orderBy('id')
            ->get();

        $offset = (int) $this->positions()->max('position');
        foreach ($articles as $index => $article) {
            $this->positions()->create([
                'document_id' => $this->document_id,
                'catalog_article_id' => $article->id,
                'kind' => 'item',
                'code' => implode('.', array_filter([$article->chapter?->code, $article->code, $article->sub_code])),
                'description' => $article->description,
                'unit' => $article->unit,
                'unit_price' => $article->sale_price,
                'cost_price' => $article->purchase_price,
                'position' => $offset + $index + 1,
            ]);
        }
    }
}
