<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Recherche instantanée : chaque modèle tient à jour une colonne `search_text`
 * (minuscules, sans accents) construite depuis ses champs cherchables. La recherche
 * est ainsi insensible à la casse et aux accents sur n'importe quel SGBD.
 */
trait HasSearchText
{
    /**
     * Champs concaténés dans `search_text`.
     *
     * @return list<string>
     */
    abstract public function searchableFields(): array;

    public static function bootHasSearchText(): void
    {
        static::saving(function ($model) {
            $parts = array_map(fn (string $field) => (string) $model->{$field}, $model->searchableFields());
            $model->search_text = self::normalizeSearch(implode(' ', array_filter($parts)));
        });
    }

    public static function normalizeSearch(?string $value): string
    {
        return Str::of(Str::ascii((string) $value))->lower()->squish()->value();
    }

    /**
     * Tous les mots saisis doivent être présents (dans n'importe quel ordre).
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $words = array_filter(explode(' ', self::normalizeSearch($term)));

        foreach ($words as $word) {
            $query->where('search_text', 'like', '%'.addcslashes($word, '%_\\').'%');
        }

        return $query;
    }
}
