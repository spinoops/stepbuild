<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Sous-détail de prix type d'un ouvrage : lignes de coûts par famille, rapportées à une dimension
 * de référence. Chargé dans le sous-détail d'une position de devis, où il se recalcule avec la
 * dimension du chantier.
 */
class BreakdownTemplate extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    protected $fillable = ['group', 'name', 'catalog_article_id', 'dimension', 'dimension_unit', 'price_per_dimension', 'note'];

    protected function casts(): array
    {
        return ['dimension' => 'float', 'price_per_dimension' => 'boolean', 'usage_count' => 'integer'];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(BreakdownTemplateLine::class)->orderBy('family')->orderBy('position')->orderBy('id');
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(CatalogArticle::class, 'catalog_article_id')->withTrashed();
    }

    /**
     * Remplace les lignes (même principe que DocumentPosition::syncBreakdown).
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    public function syncLines(array $lines): self
    {
        $keep = [];
        foreach (array_values($lines) as $index => $line) {
            $attributes = [...collect($line)->except('id')->all(), 'position' => $index + 1];
            $existing = isset($line['id']) ? $this->lines()->find($line['id']) : null;
            $model = $existing ? tap($existing)->update($attributes) : $this->lines()->create($attributes);
            $keep[] = $model->id;
        }
        $this->lines()->whereNotIn('id', $keep)->delete();

        return $this;
    }

    public function searchableFields(): array
    {
        return ['group', 'name'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
