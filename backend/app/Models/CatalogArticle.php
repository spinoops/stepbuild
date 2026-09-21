<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CatalogArticle extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    protected $fillable = [
        'catalog_chapter_id', 'code', 'sub_code', 'description', 'unit',
        'purchase_price', 'sale_price', 'work_type', 'category', 'is_title',
    ];

    protected function casts(): array
    {
        return [
            'purchase_price' => 'float',
            'sale_price' => 'float',
            'is_title' => 'boolean',
            'usage_count' => 'integer',
        ];
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(CatalogChapter::class, 'catalog_chapter_id');
    }

    public function searchableFields(): array
    {
        return ['code', 'sub_code', 'description', 'unit', 'category'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
