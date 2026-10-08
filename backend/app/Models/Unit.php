<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Unité de mesure (code imprimé + libellé), proposée dans les devis, le catalogue et les listes de prix.
 * Liste gérée dans les réglages ; les documents conservent le code en texte.
 */
class Unit extends Model
{
    /** Unités livrées par défaut (codes BauBit du devis type Lachat) : [code, libellé]. */
    public const DEFAULTS = [
        ['M1', 'Mètre linéaire'],
        ['M2', 'Mètre carré'],
        ['M3', 'Mètre cube'],
        ['H.', 'Heure'],
        ['Jour', 'Journée'],
        ['Pce', 'Pièce'],
        ['Kg', 'Kilogramme'],
        ['To', 'Tonne'],
        ['L', 'Litre'],
        ['Bloc', 'Bloc'],
        ['MS', 'Mètre superficiel (sablage)'],
        ['Sac', 'Sac'],
        ['Paquet', 'Paquet'],
        ['Rlx', 'Rouleau'],
        ['Forfait', 'Forfait'],
        ['Gl', 'Global'],
    ];

    protected $fillable = ['code', 'label', 'position', 'is_active'];

    protected function casts(): array
    {
        return ['position' => 'integer', 'is_active' => 'boolean'];
    }

    /** Crée les unités par défaut manquantes (jamais écrasées une fois présentes). */
    public static function seedDefaults(): void
    {
        foreach (self::DEFAULTS as $position => [$code, $label]) {
            self::firstOrCreate(['code' => $code], ['label' => $label, 'position' => $position + 1]);
        }
    }
}
