<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Position d'un devis : article chiffré (item), sous-titre (title) ou texte libre (text).
 */
class DocumentPosition extends Model
{
    public const KINDS = ['item', 'title', 'text'];

    /** Valeurs par défaut connues du modèle dès la création (le montant en dépend). */
    protected $attributes = ['kind' => 'item', 'is_optional' => false];

    protected $fillable = [
        'document_id', 'document_step_id', 'catalog_article_id', 'kind', 'code', 'description', 'unit',
        'quantity', 'unit_price', 'cost_price', 'is_optional', 'internal_remark', 'position',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_price' => 'float',
            'cost_price' => 'float',
            'amount' => 'float',
            'is_optional' => 'boolean',
            'position' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Montant = quantité × prix, uniquement pour une position chiffrée complète.
        static::saving(function (self $position) {
            $complete = $position->kind === 'item' && $position->quantity !== null && $position->unit_price !== null;
            $position->amount = $complete ? round($position->quantity * $position->unit_price, 2) : null;
        });
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(DocumentStep::class, 'document_step_id');
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(CatalogArticle::class, 'catalog_article_id')->withTrashed();
    }
}
