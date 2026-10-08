<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Absence d'un collaborateur un jour donné (vacances, maladie, accident, férié, école, autre),
 * en heures : ligne « Vacances / absences » du contrôle des heures et des synthèses annuelles.
 */
class CollaboratorAbsence extends Model
{
    /** @var array<string, string> */
    public const TYPES = [
        'vacances' => 'Vacances',
        'maladie' => 'Maladie',
        'accident' => 'Accident',
        'ferie' => 'Jour férié',
        'ecole' => 'École / formation',
        'militaire' => 'Service militaire / PC',
        'autre' => 'Autre absence',
    ];

    protected $fillable = ['collaborator_id', 'date', 'type', 'hours', 'note'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'hours' => 'float'];
    }

    public function collaborator(): BelongsTo
    {
        return $this->belongsTo(Collaborator::class);
    }
}
