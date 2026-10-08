<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Mouvement de stock (entrée, sortie, inventaire) : variation signée et quantité résultante. */
class StockMovement extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'type', 'quantity', 'quantity_after', 'note', 'created_at'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'quantity_after' => 'float', 'created_at' => 'datetime'];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(StockItem::class, 'stock_item_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
