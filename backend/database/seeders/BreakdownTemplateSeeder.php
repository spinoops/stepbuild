<?php

namespace Database\Seeders;

use App\Models\BreakdownTemplate;
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
            if (BreakdownTemplate::withTrashed()->where('name', $entry['name'])->exists()) {
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
                $template->lines()->create([
                    'family' => $family,
                    'label' => $label,
                    'unit' => $unit,
                    'quantity' => $quantity,
                    'per_dimension' => (bool) $perDimension,
                    'pack_size' => $packSize,
                    'unit_cost' => $unitCost,
                    'markup_percent' => $markup,
                    'note' => $note,
                    'position' => $index + 1,
                ]);
            }
        }
    }
}
