<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Position d'un devis : article chiffré (item), sous-titre (title), texte libre (text)
 * ou saut de page à l'impression (pagebreak).
 */
class DocumentPosition extends Model
{
    public const KINDS = ['item', 'title', 'text', 'pagebreak'];

    /** Valeurs par défaut connues du modèle dès la création (le montant en dépend). */
    protected $attributes = ['kind' => 'item', 'is_optional' => false, 'price_per_dimension' => false];

    /** Recalcul du sous-détail en cours : ses propres enregistrements ne le relancent pas. */
    public bool $recomputing = false;

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
            if ($position->kind === 'pagebreak') {
                $position->description = '';
            }
            $complete = $position->kind === 'item' && $position->quantity !== null && $position->unit_price !== null;
            $position->amount = $complete ? round($position->quantity * $position->unit_price, 2) : null;
        });

        // Le sous-détail chiffre la ligne entière : si la quantité change, le prix calculé suit (total ÷ quantité),
        // et le prix unitaire avec lui tant qu'il n'a pas été corrigé à la main.
        static::saved(function (self $position) {
            if ($position->wasChanged('quantity') && ! $position->recomputing && $position->costs()->exists()) {
                $position->syncOriginal(); // l'enregistrement en cours n'a pas encore synchronisé l'original : sans cela, le montant recalculé ne serait pas vu comme modifié
                $position->recomputeBreakdown(false);
            }
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

    /** La position a un sous-détail de prix : son prix unitaire en découle. */
    public function hasBreakdown(): bool
    {
        return $this->costs()->exists();
    }

    /**
     * Quantité de référence du sous-détail = quantité de la ligne (les lignes « × Qté » y sont rapportées,
     * le total est divisé par elle). Une ligne sans quantité compte pour 1.
     */
    public function breakdownQuantity(): float
    {
        return $this->quantity !== null && $this->quantity > 0 ? (float) $this->quantity : 1.0;
    }

    /**
     * Remplace le sous-détail de prix : les lignes reçues avec un id sont mises à jour, les autres créées,
     * celles absentes supprimées. Puis coût et prix de la position sont recalculés.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    public function syncBreakdown(array $lines): self
    {
        $keep = [];
        $quantity = $this->breakdownQuantity();
        foreach (array_values($lines) as $index => $line) {
            $attributes = [...collect($line)->except('id')->all(), 'position' => $index + 1];
            $existing = isset($line['id']) ? $this->costs()->find($line['id']) : null;
            $cost = $existing ? $existing->fill($attributes) : $this->costs()->make($attributes);
            $cost->compute($quantity)->save();
            if (! $existing && $cost->price_element_id) {
                PriceElement::whereKey($cost->price_element_id)->increment('usage_count'); // les plus utilisés d'abord
            }
            $keep[] = $cost->id;
        }
        $this->costs()->whereNotIn('id', $keep)->delete();

        return $this->recomputeBreakdown();
    }

    /**
     * Le sous-détail est toujours le calcul complet de la ligne : ses totaux donnent le prix de revient
     * (`cost_price`) et le prix de vente calculé (`calculated_price`) **à l'unité**, c'est-à-dire divisés
     * par la quantité de la ligne (1 000.- pour 10 m² → 100.-/m²).
     * `$applyPrice` : le prix calculé est reporté dans `unit_price` (édition du sous-détail) ; sinon il ne
     * l'est que si le prix suivait déjà le sous-détail — un prix ou un total corrigés à la main sont conservés.
     * Sans sous-détail, les champs de prix ne sont pas touchés (prix d'achat de l'article).
     */
    public function recomputeBreakdown(bool $applyPrice = true): self
    {
        $this->recomputing = true;
        try {
            $costs = $this->costs()->get();
            if ($costs->isEmpty()) {
                $this->forceFill(['calculated_price' => null, 'dimension' => null, 'price_per_dimension' => false])->save();

                return $this;
            }

            $quantity = $this->breakdownQuantity();
            foreach ($costs as $cost) {
                $cost->compute($quantity)->save();
            }

            $price = round($costs->sum('sale') / $quantity, 2);
            $followed = $this->unit_price === null || $this->calculated_price === null || abs($this->unit_price - $this->calculated_price) < 0.005;
            $this->forceFill([
                'dimension' => $quantity,
                'dimension_unit' => $this->unit,
                'price_per_dimension' => true,
                'cost_price' => round($costs->sum('cost') / $quantity, 2),
                'calculated_price' => $price,
                ...($applyPrice || $followed ? ['unit_price' => $price] : []),
            ])->save();

            return $this;
        } finally {
            $this->recomputing = false;
        }
    }
}
