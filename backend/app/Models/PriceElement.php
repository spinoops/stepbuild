<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
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
        'discount_amount', 'discount_percent',
    ];

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
            'usage_count' => 'integer',
        ];
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
