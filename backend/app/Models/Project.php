<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Un projet = un chantier. Tout le reste (devis, rapports, régie, factures) s'y rattache.
 */
class Project extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    public const STATUSES = ['en_cours', 'adjuge', 'termine', 'refuse'];

    protected $fillable = [
        'number', 'designation1', 'designation2', 'client_id', 'status', 'is_active', 'is_template',
        'street', 'street_no', 'zip', 'city', 'country', 'phone', 'mobile',
        'contract_no', 'cost_unit', 'invoice_instructions', 'remark',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_template' => 'boolean'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'client_id')->withTrashed();
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(ProjectAddress::class)->orderBy('position')->orderBy('id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ProjectPhoto::class)->orderBy('position')->orderBy('id');
    }

    public function cover(): HasOne
    {
        return $this->hasOne(ProjectPhoto::class)->orderBy('position')->orderBy('id');
    }

    /** Nom du client, inclus dans le texte de recherche. */
    public function getClientLabelAttribute(): string
    {
        $client = $this->client;

        return $client ? trim("{$client->last_name} {$client->first_name}") : '';
    }

    public function searchableFields(): array
    {
        return ['number', 'designation1', 'designation2', 'client_label', 'street', 'zip', 'city', 'contract_no'];
    }

    /**
     * Prochain numéro pour un NPA : « 2853-055 » → « 2853-056 » (séquence sur 3 chiffres).
     */
    public static function nextNumber(string $zip): string
    {
        $max = self::withTrashed()
            ->where('number', 'like', $zip.'-%')
            ->pluck('number')
            ->map(fn (string $number) => (int) preg_replace('/\D.*$/', '', substr($number, strlen($zip) + 1)))
            ->max() ?? 0;

        return sprintf('%s-%03d', $zip, $max + 1);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
