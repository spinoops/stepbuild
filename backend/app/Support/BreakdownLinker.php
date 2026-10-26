<?php

namespace App\Support;

use App\Models\BreakdownTemplateLine;
use App\Models\Concerns\HasSearchText;
use App\Models\PriceElement;
use App\Models\Setting;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Retrouve, pour une ligne de sous-détail type saisie en texte (« Pelle 2.7 t », « Sable de fouille 0/4 »),
 * l'élément de coûts correspondant dans la liste de prix, afin que son prix s'applique directement.
 *
 * - Main-d'œuvre « Main-d'œuvre (2 pers. à 0.5 J) » → Ouvrier qualifié, en heures (jours × heures par jour).
 * - Autres familles : tous les mots du libellé (sans parenthèses ni prix) doivent se trouver dans l'élément,
 *   dans la même famille ; un seul candidat, ou un meilleur candidat net (même unité, libellé qui commence
 *   pareil) → rattaché ; plusieurs candidats équivalents → « à choisir » ; aucun → « sans élément ».
 */
class BreakdownLinker
{
    public const LABOUR_PATTERN = '/(\d+(?:[.,]\d+)?)\s*pers\.?\s*(?:à|a|x|×)\s*(\d+(?:[.,]\d+)?)\s*(j|h)\b/iu';

    /**
     * @return array{status: 'linked'|'ambiguous'|'none', element: PriceElement|null, quantity: float|null, unit: string|null, candidates: Collection<int, PriceElement>}
     */
    public static function match(BreakdownTemplateLine $line): array
    {
        if ((int) $line->family === 1) {
            return self::matchLabour($line);
        }

        $words = self::words($line->label);
        $candidates = self::search((int) $line->family, $words);
        if ($candidates->isEmpty() && count($words) > 2) {
            $candidates = self::search((int) $line->family, array_slice($words, 0, -1));
        }
        if ($candidates->isEmpty()) {
            return self::result('none', null, $candidates);
        }

        // Candidat « sûr » : chaque mot du libellé est un mot entier de l'élément, l'élément n'est pas beaucoup
        // plus précis que le libellé (« Mortier » ≠ « Cermix Cermicem PAG mortier d'aire 25 kg/sac »), et les
        // unités sont compatibles (une ligne en kg ne prend pas un prix au bidon : la quantité serait fausse).
        $lineUnit = self::unitKey($line->unit);
        $sure = $candidates->filter(function (PriceElement $element) use ($words, $lineUnit) {
            $tokens = array_map(fn (string $token) => rtrim($token, 's'), self::tokens($element->description));
            foreach ($words as $word) {
                if (! in_array(rtrim($word, 's'), $tokens, true)) {
                    return false;
                }
            }
            $elementUnit = self::unitKey($element->unit);
            $unitsOk = $lineUnit === '' || $lineUnit === 'forfait' || $elementUnit === '' || $lineUnit === $elementUnit;
            $alpha = array_values(array_filter($tokens, fn (string $token) => ! is_numeric($token)));
            if (count($words) === 1 && (($alpha[0] ?? '') !== rtrim($words[0], 's') || count($alpha) > 2)) {
                return false; // « Vis » ≠ « Cote à vis », « Rouleaux » ≠ « Ficelle (rouleau) »
            }

            return $unitsOk && count($alpha) <= count($words) + 3;
        })->values();

        if ($sure->count() > 1 && count($words) === 1) {
            return self::result('ambiguous', null, $sure->take(5)); // « Pelle » : 1,5 t ou 12 t, à choisir
        }
        if ($sure->count() === 1) {
            return self::result('linked', $sure->first(), $candidates);
        }
        if ($sure->count() > 1) {
            $ranked = $sure->sortBy([
                fn (PriceElement $a, PriceElement $b) => (self::unitKey($b->unit) === $lineUnit) <=> (self::unitKey($a->unit) === $lineUnit),
                fn (PriceElement $a, PriceElement $b) => ((float) ($b->net_price ?? 0) > 0) <=> ((float) ($a->net_price ?? 0) > 0),
                fn (PriceElement $a, PriceElement $b) => count(self::tokens($a->description)) <=> count(self::tokens($b->description)),
            ])->values();
            $first = $ranked[0];
            $second = $ranked[1];
            $tie = self::unitKey($first->unit) === self::unitKey($second->unit)
                && count(self::tokens($first->description)) === count(self::tokens($second->description));
            if (! $tie) {
                return self::result('linked', $first, $ranked);
            }

            return self::result('ambiguous', null, $ranked->take(5));
        }

        return self::result('ambiguous', null, $candidates->take(5));
    }

    /** Mots entiers d'une désignation (sans accents ni casse). @return list<string> */
    private static function tokens(string $text): array
    {
        return array_values(array_filter(preg_split('/[^a-z0-9]+/', HasSearchText::normalizeSearch($text)) ?: []));
    }

    /** @return array{status: 'linked'|'ambiguous'|'none', element: PriceElement|null, quantity: float|null, unit: string|null, candidates: Collection<int, PriceElement>} */
    private static function matchLabour(BreakdownTemplateLine $line): array
    {
        $isLabour = Str::contains(HasSearchText::normalizeSearch($line->label), ['main-d', 'main d', "main-d'oeuvre", 'ouvrier', 'chef']);
        if (! $isLabour) {
            return self::result('none', null, collect());
        }
        $wanted = Str::contains(HasSearchText::normalizeSearch($line->label), 'chef') ? 'chef d' : 'ouvrier qualifie';
        $element = PriceElement::where('family', 1)
            ->where('search_text', 'like', '%'.$wanted.'%')
            ->where('search_text', 'not like', '%non qualifie%')
            ->orderByRaw('CASE WHEN net_price IS NULL OR net_price = 0 THEN 1 ELSE 0 END')
            ->orderBy('id')
            ->first();
        if (! $element) {
            return self::result('none', null, collect());
        }

        $hours = null;
        if (preg_match(self::LABOUR_PATTERN, $line->label, $m)) {
            $persons = (float) str_replace(',', '.', $m[1]);
            $amount = (float) str_replace(',', '.', $m[2]);
            $hours = round($persons * $amount * (strtolower($m[3]) === 'j' ? self::workDayHours() : 1), 2);
        } elseif (self::unitKey($line->unit) === 'j') {
            $hours = round((float) $line->quantity * self::workDayHours(), 2);
        } elseif (self::unitKey($line->unit) === 'h') {
            $hours = (float) $line->quantity;
        }

        return self::result('linked', $element, collect([$element]), $hours, $hours !== null ? ($element->unit ?: 'H.') : null);
    }

    /**
     * Applique un rattachement à la ligne (sans enregistrer) : élément, prix, unité ; pour la main-d'œuvre,
     * la quantité en heures. L'ancien libellé est gardé en remarque.
     */
    public static function applyTo(BreakdownTemplateLine $line, PriceElement $element, ?float $quantity = null, ?string $unit = null): BreakdownTemplateLine
    {
        $original = $line->label;
        $attributes = BreakdownElements::apply([
            'price_element_id' => $element->id,
            'label' => $element->description,
            'unit' => $unit ?? $line->unit,
            'unit_cost' => $line->unit_cost,
            'markup_percent' => $line->markup_percent,
        ], $element);
        $line->fill($attributes);
        if ($quantity !== null) {
            $line->quantity = $quantity;
        }
        if ($unit !== null) {
            $line->unit = $unit;
        }
        if (! $line->note && $original !== $element->description) {
            $line->note = $original;
        }

        return $line;
    }

    /** @return list<string> */
    public static function words(string $label): array
    {
        $clean = preg_replace('/\([^)]*\)/u', ' ', $label) ?? $label;          // parenthèses
        $clean = preg_replace('/\d+(?:[.,]\d+)?\s*\.?-?\s*\/\s*\w+/u', ' ', $clean) ?? $clean; // 12.-/ml, 25.-/m2
        $clean = preg_replace('/[+×*=:]|(?<=\d)\s*x\s*(?=\d)/u', ' ', $clean) ?? $clean; // 12.5×12.5, 2 x 3 (pas le x de Malaxeur)
        $words = array_values(array_filter(
            preg_split('/[^a-z0-9]+/', HasSearchText::normalizeSearch($clean)) ?: [],
            fn (string $word) => mb_strlen($word) >= 2 && ! is_numeric($word) && ! in_array($word, ['de', 'du', 'la', 'le', 'et', 'ou', 'en', 'au', 'des', 'les', 'pour', 'avec', 'sans', 'env', 'selon', 'par'], true),
        ));

        return array_slice($words, 0, 6);
    }

    /** @return Collection<int, PriceElement> */
    private static function search(int $family, array $words): Collection
    {
        if ($words === []) {
            return collect();
        }
        $query = PriceElement::where('family', $family)->whereNull('deleted_at');
        foreach ($words as $word) {
            $query->where('search_text', 'like', '%'.addcslashes($word, '%_\\').'%');
        }

        return $query->orderBy('number')->limit(12)->get();
    }

    private static function unitKey(?string $unit): string
    {
        $key = HasSearchText::normalizeSearch((string) $unit);
        $key = str_replace(['.', '²', '³'], ['', '2', '3'], $key);

        return match ($key) {
            'pce', 'piece', 'pieces', 'pc' => 'pce',
            'to', 'tonne', 'tonnes', 't' => 'to',
            'ml', 'm1' => 'm1',
            'h', 'heure', 'heures' => 'h',
            'j', 'jour', 'jours' => 'j',
            default => $key,
        };
    }

    private static function workDayHours(): float
    {
        return (float) (Setting::allAsArray()['work_day_hours'] ?? 9);
    }

    /**
     * @param  Collection<int, PriceElement>  $candidates
     * @return array{status: 'linked'|'ambiguous'|'none', element: PriceElement|null, quantity: float|null, unit: string|null, candidates: Collection<int, PriceElement>}
     */
    private static function result(string $status, ?PriceElement $element, Collection $candidates, ?float $quantity = null, ?string $unit = null): array
    {
        return ['status' => $status, 'element' => $element, 'quantity' => $quantity, 'unit' => $unit, 'candidates' => $candidates];
    }
}
