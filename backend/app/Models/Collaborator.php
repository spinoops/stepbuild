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
 * Collaborateur de l'entreprise (ouvrier, chef de chantier…) : saisi dans les rapports journaliers,
 * avec son tarif horaire de base (coût) et sa position régie (tarif vendu). Peut être relié à un
 * compte de connexion (rôle ouvrier).
 */
class Collaborator extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    protected $fillable = ['number', 'last_name', 'first_name', 'hourly_cost', 'regie_element_id', 'regie_price', 'user_id', 'is_active'];

    protected function casts(): array
    {
        return ['hourly_cost' => 'float', 'regie_price' => 'float', 'is_active' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /** Position régie : élément de coûts « Salaire » (libellé et tarif régie vendus au client). */
    public function regieElement(): BelongsTo
    {
        return $this->belongsTo(PriceElement::class, 'regie_element_id')->withTrashed();
    }

    public function absences(): HasMany
    {
        return $this->hasMany(CollaboratorAbsence::class);
    }

    /** Tarif régie horaire effectif : prix propre, sinon celui de la position régie. */
    public function regiePrice(): ?float
    {
        return $this->regie_price ?? $this->regieElement?->regie_price;
    }

    public function getNameAttribute(): string
    {
        return trim("{$this->last_name} {$this->first_name}");
    }

    public function searchableFields(): array
    {
        return ['number', 'last_name', 'first_name'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
