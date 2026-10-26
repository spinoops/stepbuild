<?php

namespace App\Support;

use App\Models\PriceElement;

/**
 * Ligne de sous-détail rattachée à un élément de coûts : c'est le prix de l'élément qui s'applique.
 * Coût unitaire = prix net (sinon prix fournisseur, sinon tarif régie) ; majoration = tarif régie sur
 * prix net quand les deux existent (Ouvrier qualifié 52.78 → 90.- : 70.5 %), sinon celle de la ligne ;
 * unité = celle de l'élément. Le libellé reste celui de la ligne (modifiable), sauf s'il est vide.
 */
class BreakdownElements
{
    /**
     * Valeurs d'une ligne tirées de l'élément.
     *
     * @return array{unit: string|null, unit_cost: float, markup_percent: float|null}
     */
    public static function values(PriceElement $element): array
    {
        $net = (float) ($element->net_price ?? 0);
        $supplier = (float) ($element->supplier_price ?? 0);
        $regie = (float) ($element->regie_price ?? 0);

        $cost = $net > 0 ? $net : ($supplier > 0 ? $supplier : $regie);
        $markup = $cost > 0 && $regie > 0 && $net > 0 ? round(($regie / $cost - 1) * 100, 1) : null;

        return ['unit' => $element->unit, 'unit_cost' => round($cost, 2), 'markup_percent' => $markup];
    }

    /**
     * Applique l'élément à des attributs de ligne (avant enregistrement). Sans élément (ou élément
     * introuvable) : les attributs sont rendus tels quels.
     *
     * @param  array<string, mixed>  $line
     * @return array<string, mixed>
     */
    public static function apply(array $line, ?PriceElement $element = null): array
    {
        $element ??= ! empty($line['price_element_id']) ? PriceElement::withTrashed()->find($line['price_element_id']) : null;
        if (! $element) {
            return $line;
        }
        $values = self::values($element);
        $line['unit'] = $values['unit'] ?? ($line['unit'] ?? null);
        $line['unit_cost'] = $values['unit_cost'];
        if ($values['markup_percent'] !== null) {
            $line['markup_percent'] = $values['markup_percent'];
        }
        if (trim((string) ($line['label'] ?? '')) === '') {
            $line['label'] = $element->description;
        }

        return $line;
    }

    /**
     * Élément tel qu'il est renvoyé avec une ligne (fiche du modèle, sous-détail d'une position).
     *
     * @return array<string, mixed>
     */
    public static function summary(PriceElement $element): array
    {
        return [
            'id' => $element->id,
            'group_code' => $element->group_code,
            'number' => $element->number,
            'description' => $element->description,
            'unit' => $element->unit,
            'net_price' => $element->net_price,
            'regie_price' => $element->regie_price,
            'price_updated_at' => $element->price_updated_at?->toDateString(),
        ];
    }
}
