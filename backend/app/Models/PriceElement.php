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

    /**
     * Prochain numéro libre d'une famille (et d'un groupe) : le premier multiple de 5 au-dessus du plus grand
     * numéro existant, sur six chiffres « PPP.NNN » comme dans BauBit (020.000, 020.005…). Sans élément dans le
     * groupe : 010.000 pour les salaires, sinon « F00.000 » (F = famille).
     */
    public static function nextNumber(int $family, ?string $group = null): string
    {
        $query = self::where('family', $family)->when($group, fn ($q) => $q->where('group_code', $group));
        $max = $query->get(['number'])->map(fn ($e) => (int) preg_replace('/\D/', '', (string) $e->number))->filter(fn ($n) => $n > 0)->max();
        $next = $max ? (intdiv($max, 5) + 1) * 5 : ($family === 1 ? 10000 : $family * 100000);
        while (self::withTrashed()->where('family', $family)->where('number', self::formatNumber($next))->exists()) {
            $next += 5;
        }

        return self::formatNumber($next);
    }

    /** 20005 → « 020.005 ». */
    public static function formatNumber(int $value): string
    {
        $digits = str_pad((string) $value, 6, '0', STR_PAD_LEFT);

        return substr($digits, 0, -3).'.'.substr($digits, -3);
    }
}
