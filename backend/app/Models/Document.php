<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Document commercial d'un projet. Le devis fixe les étapes du chantier ; rapports journaliers,
 * régie et factures s'y rattachent.
 */
class Document extends Model
{
    use HasSearchText, LogsActivity, SoftDeletes;

    /** Type → code utilisé dans le numéro (2853-055-DE.1). */
    public const TYPES = ['devis' => 'DE', 'acompte' => 'AC', 'facture' => 'FA'];

    public const STATUSES = ['en_cours', 'envoye', 'accepte', 'refuse'];

    protected $fillable = [
        'project_id', 'type', 'sequence', 'number', 'title', 'date', 'status',
        'address_id', 'recipient_title', 'recipient_name', 'recipient_first_name', 'recipient_street',
        'recipient_street_no', 'recipient_zip', 'recipient_city', 'recipient_email',
        'user_id', 'initials', 'header_text', 'footer_text', 'vat_rate', 'discount_percent',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'sequence' => 'integer',
            'vat_rate' => 'float',
            'discount_percent' => 'float',
            'total_net' => 'float',
            'discount_amount' => 'float',
            'total_vat' => 'float',
            'rounding' => 'float',
            'total_gross' => 'float',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function steps(): HasMany
    {
        return $this->hasMany(DocumentStep::class)->orderBy('position')->orderBy('id');
    }

    public function positions(): HasMany
    {
        return $this->hasMany(DocumentPosition::class)->orderBy('position')->orderBy('id');
    }

    public function getProjectLabelAttribute(): string
    {
        return (string) $this->project?->designation1;
    }

    public function searchableFields(): array
    {
        return ['number', 'title', 'project_label', 'recipient_name', 'recipient_first_name', 'recipient_city'];
    }

    /**
     * Crée un document pour un projet : numéro automatique, destinataire repris du client du projet.
     */
    public static function createForProject(Project $project, string $type, ?User $user = null, array $attributes = []): self
    {
        $sequence = ((int) self::withTrashed()->where('project_id', $project->id)->where('type', $type)->max('sequence')) + 1;
        $client = $project->client;

        return self::create(array_merge([
            'project_id' => $project->id,
            'type' => $type,
            'sequence' => $sequence,
            'number' => sprintf('%s-%s.%d', $project->number, self::TYPES[$type], $sequence),
            'date' => now()->toDateString(),
            'status' => 'en_cours',
            'address_id' => $client?->id,
            'recipient_title' => $client?->title,
            'recipient_name' => $client?->last_name,
            'recipient_first_name' => $client?->first_name,
            'recipient_street' => $client?->street ?? $project->street,
            'recipient_street_no' => $client?->street_no ?? $project->street_no,
            'recipient_zip' => $client?->zip ?? $project->zip,
            'recipient_city' => $client?->city ?? $project->city,
            'recipient_email' => $client?->email,
            'user_id' => $user?->id,
            'initials' => $user ? self::initialsOf($user->name) : null,
            'vat_rate' => 8.10,
        ], $attributes));
    }

    public static function initialsOf(string $name): string
    {
        return collect(preg_split('/\s+/', trim($name)))->take(2)->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))->implode('');
    }

    /**
     * Recalcule les totaux : net (hors options), rabais, TVA, arrondi à 5 centimes, TTC.
     */
    public function recalculate(): self
    {
        $net = round((float) $this->positions()->where('is_optional', false)->sum('amount'), 2);
        $discount = round($net * ((float) $this->discount_percent) / 100, 2);
        $base = $net - $discount;
        $vat = round($base * ((float) $this->vat_rate) / 100, 2);
        $exact = $base + $vat;
        $gross = round($exact * 20) / 20;

        $this->forceFill([
            'total_net' => $net,
            'discount_amount' => $discount,
            'total_vat' => $vat,
            'rounding' => round($gross - $exact, 2),
            'total_gross' => $gross,
        ])->saveQuietly();

        return $this;
    }

    /**
     * Nouvelle version du document (DE.1 → DE.2) avec ses étapes et positions.
     */
    public function duplicate(?User $user = null): self
    {
        return DB::transaction(function () use ($user) {
            $copy = self::createForProject($this->project, $this->type, $user, $this->only([
                'title', 'address_id', 'recipient_title', 'recipient_name', 'recipient_first_name', 'recipient_street',
                'recipient_street_no', 'recipient_zip', 'recipient_city', 'recipient_email',
                'header_text', 'footer_text', 'vat_rate', 'discount_percent',
            ]));

            foreach ($this->steps()->with('positions.costs')->get() as $step) {
                $newStep = $copy->steps()->create($step->only(['catalog_chapter_id', 'code', 'label', 'position']));
                foreach ($step->positions as $position) {
                    $newPosition = $newStep->positions()->create([
                        ...$position->only([
                            'catalog_article_id', 'kind', 'code', 'description', 'unit', 'quantity', 'unit_price',
                            'cost_price', 'is_optional', 'internal_remark', 'position',
                            'dimension', 'dimension_unit', 'price_per_dimension', 'calculated_price',
                        ]),
                        'document_id' => $copy->id,
                    ]);
                    foreach ($position->costs as $cost) {
                        $newPosition->costs()->create($cost->only([
                            'family', 'price_element_id', 'label', 'unit', 'quantity', 'per_dimension', 'pack_size',
                            'unit_cost', 'markup_percent', 'cost', 'sale', 'note', 'position',
                        ]));
                    }
                }
            }

            return $copy->recalculate();
        });
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnly(['total_net', 'total_gross'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
