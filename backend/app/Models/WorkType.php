<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Type de travail hors étapes du devis : colonne supplémentaire de la grille des heures
 * (travail du samedi, repas, kilomètres, formation…). Seules les unités « h » entrent dans le coût.
 */
class WorkType extends Model
{
    public const UNITS = ['h', 'nb', 'km'];

    /** Types livrés par défaut (code, libellé, unité). */
    public const DEFAULTS = [
        ['1011', 'Travail du samedi', 'h'],
        ['1110', 'Repas', 'nb'],
        ['1120', 'Kilomètres', 'km'],
        ['1150', 'Formation', 'h'],
    ];

    protected $fillable = ['code', 'label', 'unit', 'is_active', 'position'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'position' => 'integer'];
    }

    public function hours(): HasMany
    {
        return $this->hasMany(DailyReportHour::class);
    }

    public function isHours(): bool
    {
        return $this->unit === 'h';
    }
}
