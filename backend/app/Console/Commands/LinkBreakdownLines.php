<?php

namespace App\Console\Commands;

use App\Models\BreakdownTemplate;
use App\Models\BreakdownTemplateLine;
use App\Support\BreakdownLinker;
use Illuminate\Console\Command;

/**
 * Rattache les lignes des sous-détails types (saisies en texte depuis le document du métreur) aux
 * éléments de coûts correspondants : leur prix s'applique alors directement.
 *
 *   php artisan stepbuild:link-breakdown-lines --dry-run     # rapport seulement
 *   php artisan stepbuild:link-breakdown-lines               # rattache ce qui est sûr
 *   php artisan stepbuild:link-breakdown-lines --write-json  # … et reporte les rattachements dans
 *                                                            #   database/data/breakdown_templates.json
 *                                                            #   (clé BauBit de l'élément) pour les autres environnements
 */
class LinkBreakdownLines extends Command
{
    protected $signature = 'stepbuild:link-breakdown-lines {--dry-run : Afficher sans rien modifier} {--write-json : Reporter les rattachements dans le fichier de données} {--all : Reprendre aussi les lignes déjà rattachées}';

    protected $description = 'Rattache les lignes des sous-détails types aux éléments de coûts correspondants';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $counts = ['linked' => 0, 'ambiguous' => 0, 'none' => 0, 'kept' => 0];
        $rows = [];

        $templates = BreakdownTemplate::with('lines')->orderBy('group')->orderBy('name')->get();
        foreach ($templates as $template) {
            foreach ($template->lines as $line) {
                if ($line->price_element_id && ! $this->option('all')) {
                    $counts['kept']++;

                    continue;
                }
                $match = BreakdownLinker::match($line);
                $counts[$match['status']]++;
                $element = $match['element'];
                $rows[] = [
                    $template->name,
                    $line->family,
                    mb_strimwidth($line->label, 0, 45, '…'),
                    match ($match['status']) {
                        'linked' => 'rattaché',
                        'ambiguous' => 'à choisir',
                        default => 'sans élément',
                    },
                    $element ? "{$element->number} {$element->description}" : $match['candidates']->map(fn ($c) => $c->number.' '.mb_strimwidth($c->description, 0, 30, '…'))->implode(' | '),
                    $element ? ($match['quantity'] ?? $line->quantity).' '.($match['unit'] ?? $line->unit).' × '.number_format((float) ($element->net_price ?: $element->regie_price), 2) : '',
                ];

                if ($element && ! $dry) {
                    BreakdownLinker::applyTo($line, $element, $match['quantity'], $match['unit'])->save();
                }
            }
        }

        $this->table(['Modèle', 'Fam.', 'Ligne', 'Résultat', 'Élément / candidats', 'Quantité × prix'], $rows);
        $this->info(sprintf(
            '%d rattachées, %d à choisir, %d sans élément, %d déjà rattachées%s.',
            $counts['linked'], $counts['ambiguous'], $counts['none'], $counts['kept'], $dry ? ' (simulation, rien modifié)' : '',
        ));

        if ($this->option('write-json') && ! $dry) {
            $this->writeJson();
        }

        return self::SUCCESS;
    }

    /** Reporte les rattachements dans le fichier de données (relu par le seeder dans les autres environnements). */
    private function writeJson(): void
    {
        $path = database_path('data/breakdown_templates.json');
        $data = json_decode((string) file_get_contents($path), true);
        $updated = 0;

        foreach ($data['templates'] as &$entry) {
            $template = BreakdownTemplate::where('name', $entry['name'])->with('lines.priceElement')->first();
            if (! $template || $template->lines->count() !== count($entry['lines'])) {
                continue; // retouché dans le logiciel : le fichier n'est plus le reflet du modèle
            }
            foreach ($template->lines->values() as $index => $line) {
                /** @var BreakdownTemplateLine $line */
                if (! $line->priceElement) {
                    continue;
                }
                $element = $line->priceElement;
                $entry['lines'][$index] = [
                    $line->family, $line->label, $line->unit, $line->quantity, $line->per_dimension ? 1 : 0, $line->pack_size,
                    $line->unit_cost, $line->markup_percent, $line->note,
                    ['baubit_id' => $element->baubit_id, 'group_code' => $element->group_code, 'number' => $element->number, 'description' => $element->description],
                ];
                $updated++;
            }
        }
        unset($entry);

        file_put_contents($path, self::encode($data));
        $this->info("$updated lignes reportées dans breakdown_templates.json.");
    }

    /** Même mise en page que le fichier d'origine : un modèle par bloc, une ligne de sous-détail par ligne. */
    private static function encode(array $data): string
    {
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
        $scalar = fn ($value) => json_encode($value, $flags);
        $object = fn (array $values) => '{'.implode(', ', array_map(fn ($key) => $scalar($key).': '.(is_array($values[$key]) ? '['.implode(', ', array_map($scalar, $values[$key])).']' : $scalar($values[$key])), array_keys($values))).'}';
        $line = fn (array $items) => '['.implode(', ', array_map(fn ($item) => is_array($item) ? $object($item) : $scalar($item), $items)).']';

        $templates = array_map(function (array $entry) use ($object, $line) {
            $head = substr($object(array_diff_key($entry, ['lines' => 1])), 0, -1);
            $lines = implode(",\n", array_map(fn (array $items) => '      '.$line($items), $entry['lines']));

            return '    '.$head.', "lines": ['."\n".$lines.']}';
        }, $data['templates']);

        return "{\n  \"_\": ".json_encode($data['_'], $flags).",\n  \"templates\": [\n".implode(",\n", $templates)."\n  ]\n}\n";
    }
}
