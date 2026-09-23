<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Collaborateur de l'entreprise (ouvrier, chef de chantier…) : saisi dans les rapports journaliers,
 * avec son tarif horaire de base. Peut être relié à un compte de connexion (rôle ouvrier).
 */
class Collaborator extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    protected $fillable = ['number', 'last_name', 'first_name', 'hourly_cost', 'user_id', 'is_active'];

    protected function casts(): array
    {
        return ['hourly_cost' => 'float', 'is_active' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
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
