<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Élément de coût d'une liste de prix (salaire, matériaux, machines, outillage, tiers).
 */
class PriceElement extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    /** @var array<int, string> */
    public const FAMILIES = [
        1 => 'Salaire',
        2 => 'Matériaux',
        3 => 'Machines/Engins',
        4 => 'Matériaux exploitation',
        5 => 'Outillage',
        6 => 'Tiers',
    ];

    protected $fillable = [
        'family', 'group_code', 'number', 'description', 'unit', 'unit_regie',
        'supplier_price', 'net_price', 'regie_price', 'regie_code', 'unit_factor',
        'discount_amount', 'discount_percent', 'price_updated_at',
    ];

    /** Un prix qui change date l'élément (« Mutation de » dans BauBit), sauf date fournie explicitement. */
    protected static function booted(): void
    {
        // Un élément suivi en stock ne disparaît jamais physiquement (la corbeille, elle, est permise).
        static::deleting(function (self $element) {
            if ($element->isForceDeleting() && $element->stockItem()->exists()) {
                throw new \RuntimeException("L'élément {$element->number} est suivi en stock : il ne peut pas être supprimé définitivement.");
            }
        });
        static::saving(function (self $element) {
            if ($element->isDirty(['supplier_price', 'net_price', 'regie_price']) && ! $element->isDirty('price_updated_at')) {
                $element->price_updated_at = now();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'family' => 'integer',
            'supplier_price' => 'float',
            'net_price' => 'float',
            'regie_price' => 'float',
            'unit_factor' => 'float',
            'discount_amount' => 'float',
            'discount_percent' => 'float',
            'price_updated_at' => 'datetime',
            'usage_count' => 'integer',
        ];
    }

    /** Suivi de stock de cet élément, s'il est en stock. */
    public function stockItem(): HasOne
    {
        return $this->hasOne(StockItem::class, 'price_element_id');
    }

    public function searchableFields(): array
    {
        return ['group_code', 'number', 'description', 'unit'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
