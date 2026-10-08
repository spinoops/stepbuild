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
        'app_name' => 'Lachat Construction',
        'app_logo_url' => '',
        'app_color' => '#1d3f9c',
        // Régie : majoration des fournitures sans prix régie (%), heures d'une journée (vacances, absences).
        'regie_markup_percent' => '30',
        'work_day_hours' => '9',
    ];

    /** Réglages réservés à la gestion (jamais exposés avant connexion ni aux ouvriers). */
    public const MANAGEMENT_KEYS = ['regie_markup_percent', 'work_day_hours'];

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
