<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Ligne d'un sous-détail type (mêmes champs qu'une ligne de sous-détail de position). */
class BreakdownTemplateLine extends Model
{
    protected $fillable = [
        'breakdown_template_id', 'family', 'price_element_id', 'label', 'unit', 'quantity', 'per_dimension',
        'pack_size', 'unit_cost', 'markup_percent', 'note', 'position',
    ];

    protected function casts(): array
    {
        return [
            'family' => 'integer',
            'quantity' => 'float',
            'per_dimension' => 'boolean',
            'pack_size' => 'float',
            'unit_cost' => 'float',
            'markup_percent' => 'float',
            'position' => 'integer',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(BreakdownTemplate::class, 'breakdown_template_id');
    }
}
