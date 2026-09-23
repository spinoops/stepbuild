<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cellule de la grille « Salaire » : heures d'un collaborateur sur une étape du devis, ou quantité
 * d'un type de travail (repas, kilomètres…). Sans étape ni type : simple présence dans le rapport.
 */
class DailyReportHour extends Model
{
    protected $fillable = ['daily_report_id', 'collaborator_id', 'document_step_id', 'work_type_id', 'quantity', 'hourly_cost'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'hourly_cost' => 'float', 'amount' => 'float'];
    }

    protected static function booted(): void
    {
        static::saving(function (self $line) {
            $hours = $line->document_step_id !== null || ($line->work_type_id !== null && ($line->workType?->isHours() ?? false));
            $line->amount = $hours ? round($line->quantity * (float) $line->hourly_cost, 2) : 0;
        });
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function collaborator(): BelongsTo
    {
        return $this->belongsTo(Collaborator::class)->withTrashed();
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(DocumentStep::class, 'document_step_id');
    }

    public function workType(): BelongsTo
    {
        return $this->belongsTo(WorkType::class);
    }
}
