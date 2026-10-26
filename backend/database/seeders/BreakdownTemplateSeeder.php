<?php

namespace Database\Seeders;

use App\Models\BreakdownTemplate;
use App\Models\PriceElement;
use App\Support\BreakdownElements;
use Illuminate\Database\Seeder;

/**
 * Sous-détails de prix types du métreur (database/data/breakdown_templates.json).
 * Idempotent : un modèle déjà présent (même nom) n'est pas touché, pour conserver les retouches faites
 * dans le logiciel. Données réelles du client : chargées dans tous les environnements.
 */
class BreakdownTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode((string) file_get_contents(database_path('data/breakdown_templates.json')), true);

        foreach ($data['templates'] as $entry) {
            $existing = BreakdownTemplate::withTrashed()->where('name', $entry['name'])->first();
            if ($existing) {
                $this->linkElements($existing, $entry);

                continue;
            }

            $template = BreakdownTemplate::create([
                'group' => $entry['group'] ?? null,
                'name' => $entry['name'],
                'dimension' => $entry['dimension'] ?? null,
                'dimension_unit' => $entry['dimension_unit'] ?? null,
                'price_per_dimension' => (bool) ($entry['price_per_dimension'] ?? false),
                'note' => $entry['note'] ?? null,
            ]);

            foreach ($entry['lines'] as $index => [$family, $label, $unit, $quantity, $perDimension, $packSize, $unitCost, $markup, $note]) {
                $element = self::findElement($entry['lines'][$index][9] ?? null);
                $template->lines()->create(BreakdownElements::apply([
                    'family' => $family,
                    'price_element_id' => $element?->id,
                    'label' => $label,
                    'unit' => $unit,
                    'quantity' => $quantity,
                    'per_dimension' => (bool) $perDimension,
                    'pack_size' => $packSize,
                    'unit_cost' => $unitCost,
                    'markup_percent' => $markup,
                    'note' => $note,
                    'position' => $index + 1,
                ], $element));
            }
        }
    }

    /**
     * Modèle déjà présent (chargé avant les rattachements) : ses lignes encore sans élément reçoivent celui
     * du fichier, avec les valeurs qui vont avec (main-d'œuvre en heures…). Un modèle retouché dans le
     * logiciel (nombre de lignes différent, ou déjà un rattachement) n'est pas touché.
     *
     * @param  array<string, mixed>  $entry
     */
    private function linkElements(BreakdownTemplate $template, array $entry): void
    {
        $lines = $template->lines()->get()->values();
        if ($lines->count() !== count($entry['lines']) || $lines->whereNotNull('price_element_id')->isNotEmpty()) {
            return;
        }
        foreach ($entry['lines'] as $index => $data) {
            $element = self::findElement($data[9] ?? null);
            if (! $element) {
                continue;
            }
            [, $label, $unit, $quantity, , , $unitCost, $markup, $note] = $data;
            $lines[$index]->fill(BreakdownElements::apply([
                'price_element_id' => $element->id, 'label' => $label, 'unit' => $unit, 'quantity' => $quantity,
                'unit_cost' => $unitCost, 'markup_percent' => $markup, 'note' => $note,
            ], $element))->save();
        }
    }

    /**
     * Élément de coûts désigné dans le fichier : par clé BauBit, sinon par groupe + numéro + désignation.
     *
     * @param  array<string, mixed>|null  $ref
     */
    public static function findElement(?array $ref): ?PriceElement
    {
        if (! $ref) {
            return null;
        }
        $element = ! empty($ref['baubit_id']) ? PriceElement::where('baubit_id', $ref['baubit_id'])->first() : null;

        return $element ?? PriceElement::where('group_code', $ref['group_code'] ?? null)
            ->where('number', $ref['number'] ?? '')
            ->where('description', $ref['description'] ?? '')
            ->orderByRaw('CASE WHEN net_price IS NULL OR net_price = 0 THEN 1 ELSE 0 END')
            ->first();
    }
}
