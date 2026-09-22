<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Modèle de devis : jeu d'étapes ordonné (chapitres du catalogue ou étapes libres).
 */
class QuoteTemplate extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = ['name', 'description', 'is_default', 'position'];

    protected function casts(): array
    {
        return ['is_default' => 'boolean', 'position' => 'integer'];
    }

    public function steps(): HasMany
    {
        return $this->hasMany(QuoteTemplateStep::class)->orderBy('position')->orderBy('id');
    }

    /** Un seul modèle par défaut à la fois. */
    public function makeDefault(): void
    {
        self::where('id', '!=', $this->id)->update(['is_default' => false]);
        $this->forceFill(['is_default' => true])->save();
    }

    public static function default(): ?self
    {
        return self::where('is_default', true)->first();
    }

    /**
     * Ajoute les étapes du modèle à la fin d'un document. Les chapitres déjà présents sont ignorés.
     */
    public function applyTo(Document $document): void
    {
        $existing = $document->steps()->whereNotNull('catalog_chapter_id')->pluck('catalog_chapter_id')->all();
        $position = (int) $document->steps()->max('position');

        foreach ($this->steps()->with('chapter')->get() as $templateStep) {
            $chapter = $templateStep->chapter;
            if ($chapter && in_array($chapter->id, $existing, true)) {
                continue;
            }
            $step = $document->steps()->create([
                'catalog_chapter_id' => $chapter?->id,
                'code' => $chapter?->code ?? $templateStep->code,
                'label' => $chapter?->label ?? $templateStep->label,
                'position' => ++$position,
            ]);
            if ($chapter && $templateStep->with_articles) {
                $step->importArticles($chapter);
            }
        }

        $document->recalculate();
    }

    /**
     * Crée un modèle à partir des étapes d'un devis existant.
     */
    public static function fromDocument(Document $document, string $name): self
    {
        $template = self::create(['name' => $name, 'position' => (int) self::max('position') + 1]);

        foreach ($document->steps as $index => $step) {
            $template->steps()->create([
                'catalog_chapter_id' => $step->catalog_chapter_id,
                'code' => $step->code,
                'label' => $step->label,
                'with_articles' => true,
                'position' => $index + 1,
            ]);
        }

        return $template;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
