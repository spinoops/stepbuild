<?php

namespace App\Support;

use App\Models\Collaborator;
use App\Models\PriceElement;
use App\Models\Setting;

/**
 * Trois niveaux de prix de la régie : brut (coût), régie (tarif majoré de l'entreprise), client.
 *
 * - Heures : le tarif régie vient du collaborateur (son prix propre, sinon celui de sa position régie
 *   dans les éléments de coûts « Salaire »).
 * - Ressources : prix régie de l'élément de coûts, sinon coût brut majoré du pourcentage configuré
 *   (30 % par défaut, convention du métreur), arrondi à 5 centimes.
 * - Le prix client part du prix régie ; la gestion peut le modifier ligne par ligne jusqu'à la facturation.
 */
class RegiePricing
{
    public static function markupPercent(): float
    {
        return (float) (Setting::allAsArray()['regie_markup_percent'] ?? 30);
    }

    /** Heures d'une journée de travail (vacances, absences). */
    public static function dayHours(): float
    {
        return (float) (Setting::allAsArray()['work_day_hours'] ?? 9);
    }

    public static function forCollaborator(?Collaborator $collaborator): ?float
    {
        if (! $collaborator) {
            return null;
        }

        return $collaborator->regie_price ?? $collaborator->regieElement?->regie_price;
    }

    public static function forElement(?PriceElement $element, ?float $cost): ?float
    {
        if ($element?->regie_price !== null) {
            return $element->regie_price;
        }

        return self::markup($cost);
    }

    /** Coût brut majoré, arrondi à 5 centimes. */
    public static function markup(?float $cost): ?float
    {
        if ($cost === null) {
            return null;
        }

        return round($cost * (1 + self::markupPercent() / 100) * 20) / 20;
    }
}
