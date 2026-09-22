<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Position d'un devis : article chiffré (item), sous-titre (title) ou texte libre (text).
 */
class DocumentPosition extends Model
{
    public const KINDS = ['item', 'title', 'text'];

    /** Valeurs par défaut connues du modèle dès la création (le montant en dépend). */
    protected $attributes = ['kind' => 'item', 'is_optional' => false, 'price_per_dimension' => false];

    protected $fillable = [
        'document_id', 'document_step_id', 'catalog_article_id', 'kind', 'code', 'description', 'unit',
        'quantity', 'unit_price', 'cost_price', 'is_optional', 'internal_remark', 'position',
        'dimension', 'dimension_unit', 'price_per_dimension', 'calculated_price',
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
            'dimension' => 'float',
            'price_per_dimension' => 'boolean',
            'calculated_price' => 'float',
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

    /** Sous-détail de prix (lignes de coûts par famille). */
    public function costs(): HasMany
    {
        return $this->hasMany(DocumentPositionCost::class)->orderBy('family')->orderBy('position')->orderBy('id');
    }

    /**
     * Remplace le sous-détail de prix : les lignes reçues avec un id sont mises à jour, les autres créées,
     * celles absentes supprimées. Puis coût et prix calculé de la position sont recalculés.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    public function syncBreakdown(array $lines): self
    {
        $keep = [];
        foreach (array_values($lines) as $index => $line) {
            $attributes = [...collect($line)->except('id')->all(), 'position' => $index + 1];
            $existing = isset($line['id']) ? $this->costs()->find($line['id']) : null;
            $cost = $existing ? $existing->fill($attributes) : $this->costs()->make($attributes);
            $cost->compute($this->dimension)->save();
            if (! $existing && $cost->price_element_id) {
                PriceElement::whereKey($cost->price_element_id)->increment('usage_count'); // les plus utilisés d'abord
            }
            $keep[] = $cost->id;
        }
        $this->costs()->whereNotIn('id', $keep)->delete();

        return $this->recomputeBreakdown();
    }

    /**
     * Totaux du sous-détail → prix de revient (`cost_price`) et prix de vente calculé (`calculated_price`),
     * ramenés à l'unité de dimension si le prix de la position s'entend par m², par heure…
     * Sans sous-détail, les deux champs ne sont pas touchés (prix d'achat de l'article).
     */
    public function recomputeBreakdown(): self
    {
        $costs = $this->costs()->get();
        if ($costs->isEmpty()) {
            $this->forceFill(['calculated_price' => null])->save();

            return $this;
        }

        foreach ($costs as $cost) {
            $cost->compute($this->dimension)->save();
        }

        $divisor = $this->price_per_dimension && $this->dimension > 0 ? $this->dimension : 1.0;
        $this->forceFill([
            'cost_price' => round($costs->sum('cost') / $divisor, 2),
            'calculated_price' => round($costs->sum('sale') / $divisor, 2),
        ])->save();

        return $this;
    }
}
