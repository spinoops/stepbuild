<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Produit suivi en stock : un élément de coûts, sa quantité, son seuil d'alerte, son emplacement.
 * Toute variation passe par apply() qui enregistre un mouvement.
 */
class StockItem extends Model
{
    public const TYPES = ['entree', 'sortie', 'inventaire'];

    protected $fillable = ['price_element_id', 'quantity', 'min_quantity', 'location', 'note', 'counted_at', 'counted_by'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'min_quantity' => 'float', 'counted_at' => 'datetime'];
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(PriceElement::class, 'price_element_id')->withTrashed();
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    public function countedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counted_by')->withTrashed();
    }

    /** rupture (≤ 0), bas (≤ seuil) ou ok. */
    public function status(): string
    {
        if ($this->quantity <= 0) {
            return 'rupture';
        }
        if ($this->min_quantity !== null && $this->quantity <= $this->min_quantity) {
            return 'bas';
        }

        return 'ok';
    }

    /**
     * Applique un mouvement : entrée (+q), sortie (−q) ou inventaire (q = nouvelle quantité comptée).
     */
    public function apply(string $type, float $quantity, ?User $user = null, ?string $note = null): StockMovement
    {
        $delta = match ($type) {
            'entree' => $quantity,
            'sortie' => -$quantity,
            default => $quantity - (float) $this->quantity,
        };

        $this->quantity = round((float) $this->quantity + $delta, 2);
        $this->counted_at = now();
        $this->counted_by = $user?->id;
        $this->save();

        return $this->movements()->create([
            'user_id' => $user?->id,
            'type' => $type,
            'quantity' => round($delta, 2),
            'quantity_after' => $this->quantity,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}
