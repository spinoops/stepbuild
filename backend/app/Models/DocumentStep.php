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
}
