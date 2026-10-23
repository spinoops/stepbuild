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

    /** Type → code utilisé dans le numéro (2853-055-DE.1). `acompte` et `travaux` dérivent d'un devis (`source_document_id`). */
    public const TYPES = ['devis' => 'DE', 'acompte' => 'AC', 'travaux' => 'TE', 'facture' => 'FA'];

    public const STATUSES = ['en_cours', 'envoye', 'accepte', 'refuse'];

    /** Mentions de la ligne complémentaire de l'adresse (usage suisse romand). L'ordre compte : cf. recipientLines(). */
    public const EXTRA_LABELS = ["À l'attention de", 'p.a.', 'c/o', 'Case postale'];

    protected $fillable = [
        'project_id', 'source_document_id', 'type', 'sequence', 'number', 'title', 'date', 'status',
        'address_id', 'recipient_company', 'recipient_title', 'recipient_name', 'recipient_first_name',
        'recipient_extra_label', 'recipient_extra', 'recipient_street',
        'recipient_street_no', 'recipient_zip', 'recipient_city', 'recipient_email',
        'user_id', 'initials', 'header_text', 'footer_text', 'vat_rate', 'discount_percent', 'advance_percent',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'sequence' => 'integer',
            'vat_rate' => 'float',
            'discount_percent' => 'float',
            'advance_percent' => 'float',
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

    /** Devis dont ce document dérive (demande d'acompte, travaux exécutés). */
    public function source(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_document_id')->withTrashed();
    }

    /** Documents dérivés de ce devis. */
    public function derived(): HasMany
    {
        return $this->hasMany(self::class, 'source_document_id');
    }

    /** Montant net HT (après rabais). */
    public function netAmount(): float
    {
        return round($this->total_net - $this->discount_amount, 2);
    }

    /**
     * Demande d'acompte sur un devis : un pourcentage du net (ou un montant), en une position chiffrée
     * modifiable ensuite comme n'importe quel document. Le destinataire et les textes viennent du devis.
     */
    public static function createAdvance(self $quote, ?User $user = null, ?float $percent = null, ?float $amount = null): self
    {
        return DB::transaction(function () use ($quote, $user, $percent, $amount) {
            $net = $quote->netAmount();
            $value = $percent !== null ? round($net * $percent / 100 * 20) / 20 : round((float) $amount * 20) / 20;
            $document = self::createForProject($quote->project, 'acompte', $user, [
                ...$quote->only(self::INHERITED),
                'source_document_id' => $quote->id,
                'advance_percent' => $percent,
                'title' => $quote->title,
                'header_text' => null,
                'footer_text' => null,
            ]);
            $rank = self::where('source_document_id', $quote->id)->where('type', 'acompte')->count();
            $step = $document->steps()->create(['code' => 'AC', 'label' => "Demande d'acompte", 'position' => 1]);
            $step->positions()->create([
                'document_id' => $document->id,
                'kind' => 'item',
                'description' => sprintf('Acompte n° %d sur le devis N° %s du %s%s', $rank, $quote->number, $quote->date->format('d.m.Y'),
                    $percent !== null ? sprintf(' (%s %% de CHF %s net)', rtrim(rtrim(number_format($percent, 2, '.', ''), '0'), '.'), number_format($net, 2, '.', "'")) : ''),
                'unit' => 'Fr.',
                'quantity' => 1,
                'unit_price' => $value,
                'position' => 1,
            ]);

            return $document->recalculate();
        });
    }

    /**
     * Travaux exécutés : copie des étapes et positions du devis, la quantité du devis gardée dans
     * `quoted_quantity` et la quantité saisie (exécutée) pré-remplie avec elle, à corriger position par position.
     */
    public static function createExecuted(self $quote, ?User $user = null): self
    {
        return DB::transaction(function () use ($quote, $user) {
            $document = self::createForProject($quote->project, 'travaux', $user, [
                ...$quote->only(self::INHERITED),
                'source_document_id' => $quote->id,
                'title' => $quote->title,
                'header_text' => null,
                'footer_text' => null,
            ]);
            foreach ($quote->steps()->with('positions')->get() as $step) {
                $newStep = $document->steps()->create($step->only(['catalog_chapter_id', 'code', 'label', 'position']));
                foreach ($step->positions as $position) {
                    $newStep->positions()->create([
                        ...$position->only(['catalog_article_id', 'kind', 'code', 'description', 'unit', 'quantity', 'unit_price', 'cost_price', 'is_optional', 'position']),
                        'quoted_quantity' => $position->kind === 'item' ? $position->quantity : null,
                        'document_id' => $document->id,
                    ]);
                }
            }

            return $document->recalculate();
        });
    }

    /** Champs d'en-tête repris du devis par les documents dérivés et les nouvelles versions. */
    public const INHERITED = [
        'address_id', 'recipient_company', 'recipient_title', 'recipient_name', 'recipient_first_name',
        'recipient_extra_label', 'recipient_extra', 'recipient_street',
        'recipient_street_no', 'recipient_zip', 'recipient_city', 'recipient_email', 'vat_rate',
    ];

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
        return ['number', 'title', 'project_label', 'recipient_company', 'recipient_name', 'recipient_first_name', 'recipient_city'];
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

    /**
     * Lignes de l'adresse du destinataire telles qu'imprimées, dans l'ordre suisse (directives de La Poste) :
     * entreprise ; titre ; prénom et nom ; ligne complémentaire (« À l'attention de … », « p.a. … », « c/o … ») ;
     * rue et numéro ; case postale ; NPA et localité.
     * « À l'attention de » sans texte vise la personne saisie : « À l'attention de Monsieur Jean Dupont ».
     *
     * @return array<int, string>
     */
    public function recipientLines(): array
    {
        $person = trim(($this->recipient_first_name ?? '').' '.($this->recipient_name ?? ''));
        $label = $this->recipient_extra_label;
        $extra = trim((string) $this->recipient_extra);
        $attention = $label === self::EXTRA_LABELS[0];

        $lines = [$this->recipient_company];
        if ($attention && $extra === '') {
            // La mention remplace les lignes de la personne : « À l'attention de Monsieur Jean Dupont ».
            $lines[] = $person !== '' ? trim($label.' '.trim(($this->recipient_title ?? '').' '.$person)) : null;
        } else {
            $lines[] = $this->recipient_title;
            $lines[] = $person;
            if ($extra !== '' && $label !== self::EXTRA_LABELS[3]) {
                $lines[] = trim(($label ?? '').' '.$extra);
            }
        }
        $lines[] = trim(($this->recipient_street ?? '').' '.($this->recipient_street_no ?? ''));
        if ($label === self::EXTRA_LABELS[3]) {
            $lines[] = trim($label.' '.$extra); // « Case postale 123 » se place après la rue, avant le NPA
        }
        $lines[] = trim(($this->recipient_zip ?? '').' '.($this->recipient_city ?? ''));

        return array_values(array_filter($lines, fn ($line) => $line !== null && trim($line) !== ''));
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
                ...self::INHERITED, 'title', 'header_text', 'footer_text', 'discount_percent', 'source_document_id', 'advance_percent',
            ]));

            foreach ($this->steps()->with('positions.costs')->get() as $step) {
                $newStep = $copy->steps()->create($step->only(['catalog_chapter_id', 'code', 'label', 'position']));
                foreach ($step->positions as $position) {
                    $newPosition = $newStep->positions()->create([
                        ...$position->only([
                            'catalog_article_id', 'kind', 'code', 'description', 'unit', 'quantity', 'quoted_quantity', 'unit_price',
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
