<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Réglages d'identité exposés à l'app, avec leurs valeurs par défaut.
     * Toute nouvelle clé ajoutée ici devient disponible automatiquement.
     *
     * @var array<string, string>
     */
    public const DEFAULTS = [
        'app_name' => 'Chantier',
        'app_logo_url' => '',
        'app_color' => '#ea580c',
    ];

    /**
     * Tous les réglages sous forme clé => valeur, complétés par les défauts.
     *
     * @return array<string, string>
     */
    public static function allAsArray(): array
    {
        return array_merge(self::DEFAULTS, self::query()->pluck('value', 'key')->all());
    }

    /**
     * Crée ou met à jour une liste de réglages.
     *
     * @param  array<string, string|null>  $values
     */
    public static function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            self::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
