<?php

namespace App\Models;

use App\Support\RegiePricing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cellule de la grille « Salaire » : heures d'un collaborateur sur une étape du devis, ou quantité
 * d'un type de travail (repas, kilomètres…). Sans étape ni type : simple présence dans le rapport.
 * Chaque cellule porte les trois niveaux de prix de la régie (brut, régie, client).
 */
class DailyReportHour extends Model
{
    protected $fillable = [
        'daily_report_id', 'collaborator_id', 'document_step_id', 'work_type_id', 'quantity',
        'hourly_cost', 'regie_price', 'client_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float', 'hourly_cost' => 'float', 'regie_price' => 'float', 'client_price' => 'float',
            'amount' => 'float', 'regie_amount' => 'float', 'client_amount' => 'float',
        ];
    }

    protected static function booted(): void
    {
        // Trois niveaux de prix : brut (tarif du collaborateur), régie (sa position régie), client (= régie
        // tant que la gestion ne l'a pas modifié). Seules les heures ont un montant.
        static::saving(function (self $line) {
            if ($line->regie_price === null) {
                $line->regie_price = RegiePricing::forCollaborator($line->collaborator);
            }
            if ($line->client_price === null) {
                $line->client_price = $line->regie_price;
            }
            $hours = $line->isHours();
            $line->amount = $hours ? round($line->quantity * (float) $line->hourly_cost, 2) : 0;
            $line->regie_amount = $hours ? round($line->quantity * (float) $line->regie_price, 2) : 0;
            $line->client_amount = $hours ? round($line->quantity * (float) $line->client_price, 2) : 0;
        });
    }

    /** Heures productives (étape du devis) ou type de travail compté en heures. */
    public function isHours(): bool
    {
        return $this->document_step_id !== null || ($this->work_type_id !== null && ($this->workType?->isHours() ?? false));
    }

    /** Reprend les tarifs actuels (brut et régie) et remet le prix client au prix régie. */
    public function applyTariffs(): void
    {
        $this->hourly_cost = $this->collaborator?->hourly_cost ?? $this->hourly_cost;
        $this->regie_price = RegiePricing::forCollaborator($this->collaborator);
        $this->client_price = $this->regie_price;
        $this->save();
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
