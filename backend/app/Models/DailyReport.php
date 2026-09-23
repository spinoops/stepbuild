<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Rapport journalier d'un projet : les heures se saisissent sur les étapes du devis de rattachement,
 * les ressources par famille. Workflow : en cours → en contrôle → facturé en régie.
 */
class DailyReport extends Model
{
    use LogsActivity, SoftDeletes;

    public const STATUSES = ['en_cours', 'en_controle', 'facture'];

    public const WEATHERS = ['Ensoleillé', 'Partiellement nuageux', 'Couvert', 'Pluie, couvert', 'Orage', 'Neige', 'Brouillard'];

    protected $fillable = [
        'project_id', 'document_id', 'sequence', 'number', 'date', 'status', 'is_regie', 'responsible_id',
        'created_by', 'remark', 'events', 'weather', 'temp_min', 'temp_max',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'sequence' => 'integer',
            'is_regie' => 'boolean',
            'temp_min' => 'integer',
            'temp_max' => 'integer',
            'total_hours' => 'float',
            'total_amount' => 'float',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class)->withTrashed();
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(Collaborator::class, 'responsible_id')->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function hours(): HasMany
    {
        return $this->hasMany(DailyReportHour::class)->orderBy('id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DailyReportItem::class)->orderBy('family')->orderBy('position')->orderBy('id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DailyReportFile::class)->orderBy('position')->orderBy('id');
    }

    /** Relations chargées pour la fiche complète. */
    public const FULL = ['project', 'document.steps', 'responsible', 'hours', 'items', 'files'];

    /**
     * Crée le rapport suivant d'un projet : numéro 001, 002…, rattaché au devis accepté du projet
     * (sinon au plus récent), daté du jour par défaut.
     */
    public static function createForProject(Project $project, ?User $user, array $attributes = []): self
    {
        $sequence = ((int) self::withTrashed()->where('project_id', $project->id)->max('sequence')) + 1;

        return self::create(array_merge([
            'project_id' => $project->id,
            'document_id' => self::defaultDocumentId($project),
            'sequence' => $sequence,
            'number' => str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            'date' => now()->toDateString(),
            'status' => 'en_cours',
            'is_regie' => true,
            'created_by' => $user?->id,
            'responsible_id' => $user ? Collaborator::where('user_id', $user->id)->value('id') : null,
        ], $attributes));
    }

    public static function defaultDocumentId(Project $project): ?int
    {
        $quotes = Document::where('project_id', $project->id)->where('type', 'devis');

        return (clone $quotes)->where('status', 'accepte')->orderByDesc('sequence')->value('id')
            ?? $quotes->orderByDesc('sequence')->value('id');
    }

    /**
     * Totaux : heures productives (sur les étapes du devis + types de travail en heures) et coût brut
     * (heures × tarif + ressources).
     */
    public function recalculate(): self
    {
        $hours = $this->hours()->with('workType')->get();
        $productive = $hours->filter(fn (DailyReportHour $line) => $line->document_step_id !== null || ($line->workType?->isHours() ?? false));

        $this->forceFill([
            'total_hours' => round((float) $productive->sum('quantity'), 2),
            'total_amount' => round((float) $hours->sum('amount') + (float) $this->items()->sum('amount'), 2),
        ])->saveQuietly();

        return $this;
    }

    /** Rapports visibles par un utilisateur : tout pour la gestion, les siens pour un ouvrier. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->canSeePrices()) {
            return $query;
        }
        $collaboratorId = Collaborator::where('user_id', $user->id)->value('id');

        return $query->where(function (Builder $q) use ($user, $collaboratorId) {
            $q->where('created_by', $user->id);
            if ($collaboratorId) {
                $q->orWhere('responsible_id', $collaboratorId)
                    ->orWhereHas('hours', fn (Builder $h) => $h->where('collaborator_id', $collaboratorId));
            }
        });
    }

    public function isVisibleTo(User $user): bool
    {
        return self::query()->whereKey($this->id)->visibleTo($user)->exists();
    }

    /** Modifiable : la gestion tant que le rapport n'est pas facturé, l'ouvrier tant qu'il est en cours. */
    public function isEditableBy(User $user): bool
    {
        if ($user->canSeePrices()) {
            return $this->status !== 'facture';
        }

        return $this->status === 'en_cours' && $this->isVisibleTo($user);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
