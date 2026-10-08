<?php

namespace App\Support;

use App\Models\PriceElement;
use App\Models\StockItem;
use App\Models\Unit;
use RuntimeException;

/**
 * Liste d'articles en stock fournie par le client : un export Excel de la liste « Éléments de
 * coûts » de BauBit, converti en JSON par database/baubit/elements_xlsx_to_json.py.
 *
 * Pour chaque ligne : l'élément de coûts est retrouvé (code régie + numéro + désignation, puis
 * code régie seul, puis famille + numéro + désignation), créé s'il n'existe pas (clé
 * `XLS-<code régie>`), ses prix sont mis à jour quand la « mutation de prix » du fichier est plus
 * récente que celle connue, et il est mis en stock (quantité à compter) s'il ne l'était pas.
 */
class StockListImport
{
    /** @var array<string, int> */
    public array $stats = ['matched' => 0, 'created' => 0, 'prices_updated' => 0, 'stock_added' => 0, 'stock_existing' => 0, 'skipped' => 0];

    /** @var array<string, string> */
    private array $unitCodes = [];

    public function __construct(private readonly bool $updatePrices = true, private readonly bool $addToStock = true)
    {
        foreach (Unit::pluck('code') as $code) {
            $this->unitCodes[mb_strtolower($code)] = $code;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function read(string $path): array
    {
        if (! is_file($path)) {
            throw new RuntimeException("Fichier introuvable : {$path}");
        }
        $json = (string) file_get_contents($path);
        $json = preg_replace('/^\xEF\xBB\xBF/', '', $json) ?? $json;
        $data = json_decode(trim($json), true);
        if (! is_array($data)) {
            throw new RuntimeException("JSON illisible : {$path} (".json_last_error_msg().')');
        }

        return $data;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    public function run(array $rows): void
    {
        foreach ($rows as $row) {
            $number = trim((string) ($row['number'] ?? ''));
            $name = trim((string) ($row['name'] ?? ''));
            if ($number === '' || $name === '' || (isset($row['active']) && ! $row['active'])) {
                $this->stats['skipped']++;

                continue;
            }

            $element = $this->find($row, $number, $name);
            if ($element === null) {
                $element = $this->create($row, $number, $name);
                $this->stats['created']++;
            } else {
                $this->stats['matched']++;
                if ($this->updatePrices && $this->refreshPrices($element, $row)) {
                    $this->stats['prices_updated']++;
                }
            }

            if ($this->addToStock) {
                if (StockItem::where('price_element_id', $element->id)->exists()) {
                    $this->stats['stock_existing']++;
                } else {
                    StockItem::create(['price_element_id' => $element->id]);
                    $this->stats['stock_added']++;
                }
            }
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function find(array $row, string $number, string $name): ?PriceElement
    {
        $family = (int) ($row['family'] ?? 2);
        $code = trim((string) ($row['regie_code'] ?? ''));
        $base = PriceElement::query()->where('family', $family)->orderByRaw('baubit_id is null')->orderBy('id');

        if ($code !== '') {
            $exact = (clone $base)->where('regie_code', $code)->where('number', $number)->where('description', $name)->first();
            if ($exact) {
                return $exact;
            }
            $byCode = (clone $base)->where('regie_code', $code)->get();
            if ($byCode->count() === 1) {
                return $byCode->first();
            }
            $sameNumber = $byCode->first(fn (PriceElement $e) => $e->number === $number);
            if ($sameNumber) {
                return $sameNumber;
            }
        }

        return (clone $base)->where('number', $number)->where('description', $name)->first();
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function create(array $row, string $number, string $name): PriceElement
    {
        $family = (int) ($row['family'] ?? 2);
        $code = trim((string) ($row['regie_code'] ?? ''));
        $letter = [1 => 'S', 2 => 'M', 3 => 'M', 4 => 'M', 5 => 'O', 6 => 'T'][$family] ?? 'M';

        $element = new PriceElement([
            'family' => $family,
            'group_code' => $letter.trim((string) ($row['group'] ?? '')),
            'number' => $number,
            'description' => mb_substr($name, 0, 500),
            'unit' => $this->unit($row['unit'] ?? null),
            'unit_regie' => $this->unit($row['unit_regie'] ?? ($row['unit'] ?? null)),
            'supplier_price' => $this->price($row['supplier_price'] ?? null),
            'net_price' => $this->price($row['net_price'] ?? null) ?? $this->price($row['supplier_price'] ?? null),
            'regie_code' => $code ?: null,
            'unit_factor' => $this->price($row['unit_factor'] ?? null) ?: 1,
            'price_updated_at' => $row['price_date'] ?? null,
        ]);
        $element->baubit_id = $code !== '' ? 'XLS-'.$code : null;
        $element->save();

        return $element;
    }

    /**
     * Met à jour les prix si la date de mutation du fichier est plus récente (ou si l'élément n'est pas daté).
     *
     * @param  array<string, mixed>  $row
     */
    private function refreshPrices(PriceElement $element, array $row): bool
    {
        $supplier = $this->price($row['supplier_price'] ?? null);
        $net = $this->price($row['net_price'] ?? null) ?? $supplier;
        if ($supplier === null) {
            return false;
        }
        $same = abs(($element->supplier_price ?? 0) - $supplier) < 0.005 && abs(($element->net_price ?? 0) - $net) < 0.005;
        if ($same) {
            return false;
        }
        $fileDate = $row['price_date'] ?? null;
        $known = $element->price_updated_at?->toDateString();
        if ($known !== null && ($fileDate === null || $fileDate < $known)) {
            return false;
        }

        $element->fill(['supplier_price' => $supplier, 'net_price' => $net, 'price_updated_at' => $fileDate ?? now()]);
        $element->save();

        return true;
    }

    private function price(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 4);
    }

    private function unit(?string $raw): ?string
    {
        $raw = trim((string) $raw);
        if ($raw === '' || $raw === '-') {
            return null;
        }

        return $this->unitCodes[mb_strtolower($raw)] ?? mb_substr($raw, 0, 20);
    }
}
