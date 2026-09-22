<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteTemplateStep extends Model
{
    protected $fillable = ['quote_template_id', 'catalog_chapter_id', 'code', 'label', 'with_articles', 'position'];

    protected function casts(): array
    {
        return ['with_articles' => 'boolean', 'position' => 'integer'];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(QuoteTemplate::class, 'quote_template_id');
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(CatalogChapter::class, 'catalog_chapter_id');
    }
}
