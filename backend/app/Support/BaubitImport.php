<?php

namespace App\Support;

use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use App\Models\Collaborator;
use App\Models\PriceElement;
use App\Models\Unit;
use RuntimeException;

/**
 * Reprise du catalogue d'articles et des éléments de coûts depuis une sauvegarde BauBit.
 *
 * Source : fichiers JSON exportés de la base SQL Server restaurée (voir CLAUDE.md, « Reprise
 * BauBit ») : elements.json (CostElement + CostElementPrices + tarif régie), regie_positions.json
 * (RegiePosition, dont les salaires 1.010.xxx absents des éléments), users.json (Users + fonction
 * dominante), catalog_chapters.json (FreeChapter) et catalog_positions.json (FreePosition + prix).
 *
 * Correspondances :
 *  - élément de coût → price_elements : famille = CEL_SubTypeCode (1 salaire … 6 tiers), groupe =
 *    lettre de famille + CEL_Group (« M92 »), prix fournisseur / net / régie (tarif de vente de la
 *    position régie de même code), code régie, facteur d'unité ;
 *  - catalogue « racine » (FCH_Code = $rootCatalog, « Devis - prix H., M1, M2, M3 ») : chaque groupe
 *    Code_1 (00 ARCHITECTURE … 18 DIVERS) devient un **chapitre racine** = modèle d'étape ;
 *  - autres catalogues BauBit : un chapitre racine par catalogue, un chapitre enfant par groupe ;
 *  - position → article : code = Code_2, sous-code = Code_3[.Code_4], description = texte brut,
 *    vente = catégorie de prix « Vente », achat = « Achat » ; une position qui a des sous-positions
 *    est un sous-titre (is_title).
 * Idempotent : la clé BauBit est gardée dans `baubit_id` ; à défaut, chapitre retrouvé par code et
 * article par (chapitre, code, sous-code).
 */
class BaubitImport
{
    /** @var array<int, string> Lettre de groupe par famille (affichage BauBit : « M92 »). */
    private const FAMILY_LETTER = [1 => 'S', 2 => 'M', 3 => 'M', 4 => 'M', 5 => 'O', 6 => 'T'];

    /** @var array<int, string> Groupe BauBit habituel de chaque famille (positions régie sans élément). */
    private const FAMILY_GROUP = [1 => '10', 2 => '92', 3 => '93', 4 => '94', 5 => '95', 6 => '96'];

    /** @var array<string, string> Unités du catalogue libre écrites autrement que dans la table des unités. */
    private const UNIT_ALIASES = ['h' => 'H.', 'ml' => 'M1', 'm' => 'M1', 't' => 'To', 'j' => 'Jour', 'forf.' => 'Forfait', 'gl' => 'Gl', 'l' => 'L', 'bid.' => 'Bidon', 'fr' => 'Fr.', 'boîte' => 'Bte', 'boite' => 'Bte', 'pal' => 'Pal.', 'forf' => 'Forfait'];

    /** @var array<string, int> */
    public array $stats = [];

    /** Appelé toutes les 500 lignes traitées : fn (string $step, int $done, int $total). */
    public ?\Closure $onProgress = null;

    /** @var array<string, string> code d'unité normalisé (minuscules) → code de la table units */
    private array $unitCodes = [];

    public function __construct(private readonly string $dir)
    {
        if (! is_dir($dir)) {
            throw new RuntimeException("Dossier introuvable : {$dir}");
        }
        foreach (Unit::pluck('code') as $code) {
            $this->unitCodes[mb_strtolower($code)] = $code;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function read(string $name): array
    {
        $path = $this->dir.DIRECTORY_SEPARATOR.$name.'.json';
        if (! is_file($path)) {
            throw new RuntimeException("Fichier manquant : {$path}");
        }
        $json = (string) file_get_contents($path);
        $json = preg_replace('/^\xEF\xBB\xBF/', '', $json) ?? $json; // BOM éventuel de bcp
        $data = json_decode(trim($json), true);
        if (! is_array($data)) {
            throw new RuntimeException("JSON illisible : {$path} (".json_last_error_msg().')');
        }

        return $data;
    }

    private function count(string $key, bool $created): void
    {
        $this->stats[$key.($created ? '_created' : '_updated')] = ($this->stats[$key.($created ? '_created' : '_updated')] ?? 0) + 1;
    }

    private function progress(string $step, int $done, int $total): void
    {
        if ($this->onProgress && ($done % 500 === 0 || $done === $total)) {
            ($this->onProgress)($step, $done, $total);
        }
    }

    // ------------------------------------------------------------------ éléments de coûts

    public function importElements(): void
    {
        $rows = $this->read('elements');
        $total = count($rows);
        foreach ($rows as $i => $row) {
            $this->progress('elements', $i + 1, $total);
            if (isset($row['active']) && ! $row['active']) {
                continue;
            }
            $family = (int) $row['family'];
            if ($family < 1 || $family > 6) {
                continue;
            }
            $element = $this->element('CEL-'.$row['id']);
            $element->fill([
                'family' => $family,
                'group_code' => (self::FAMILY_LETTER[$family] ?? '').trim((string) ($row['group'] ?? self::FAMILY_GROUP[$family])),
                'number' => $this->number($row['number'] ?? null, $row['regie_code'] ?? null),
                'description' => mb_substr(trim((string) ($row['name'] ?: ($row['name_d'] ?? ''))), 0, 500),
                'unit' => $this->unit($row['unit'] ?? null, true),
                'unit_regie' => $this->unit($row['unit_regie'] ?? ($row['unit'] ?? null), true),
                'supplier_price' => $this->price($row['supplier_price'] ?? null),
                'net_price' => $this->price($row['net_price'] ?? null) ?? $this->price($row['supplier_price'] ?? null),
                'regie_price' => $this->price($row['regie_price'] ?? null),
                'regie_code' => $row['regie_code'] ?: null,
                'unit_factor' => $this->price($row['unit_factor'] ?? null) ?: 1,
                'discount_amount' => $this->price($row['discount_amount'] ?? null),
                'discount_percent' => $this->price($row['discount_percent'] ?? null),
                'price_updated_at' => ! empty($row['price_date']) ? $row['price_date'] : null,
            ]);
            $created = ! $element->exists;
            $element->deleted_at = null;
            $element->save();
            $this->count('elements', $created);
        }

        // Positions du tarif régie sans élément de coût : les salaires (1.010.xxx) et quelques tarifs.
        $rows = $this->read('regie_positions');
        $total = count($rows);
        foreach ($rows as $i => $row) {
            $this->progress('regie_positions', $i + 1, $total);
            if (! empty($row['has_element'])) {
                continue;
            }
            $code = trim((string) $row['code']);
            $family = (int) substr($code, 0, 1);
            if ($family < 1 || $family > 6 || ! str_contains($code, '.')) {
                continue;
            }
            $element = $this->element('RPO-'.$row['id']);
            $element->fill([
                'family' => $family,
                'group_code' => self::FAMILY_LETTER[$family].self::FAMILY_GROUP[$family],
                'number' => substr($code, strpos($code, '.') + 1),
                'description' => mb_substr(trim((string) $row['name']), 0, 500),
                'unit' => $this->unit($row['unit'] ?? null, true),
                'unit_regie' => $this->unit($row['unit'] ?? null, true),
                'supplier_price' => $this->price($row['price_purchase'] ?? null),
                'net_price' => $this->price($row['price_purchase'] ?? null),
                'regie_price' => $this->price($row['price'] ?? null),
                'regie_code' => $code,
                'unit_factor' => 1,
            ]);
            $created = ! $element->exists;
            $element->deleted_at = null;
            $element->save();
            $this->count('regie_positions', $created);
        }
    }

    /** Élément existant (clé BauBit, corbeille comprise) ou nouveau ; `baubit_id` n'est pas assignable en masse. */
    private function element(string $baubitId): PriceElement
    {
        $element = PriceElement::withTrashed()->where('baubit_id', $baubitId)->first() ?? new PriceElement;
        $element->baubit_id = $baubitId;

        return $element;
    }

    // ------------------------------------------------------------------ employés

    /**
     * Comptes BauBit (table Users) → collaborateurs : nom, prénom, coût horaire (USE_SalaryPerHour),
     * actif, et position régie déduite de la fonction la plus utilisée dans ses rapports
     * (UserFunction → RegiePosition « 1.010.010 »). Les comptes techniques et invisibles sont ignorés ;
     * les employés partis sont repris inactifs (l'historique des rapports en aura besoin).
     */
    public function importCollaborators(): void
    {
        $rows = $this->read('users');
        $total = count($rows);
        foreach ($rows as $i => $row) {
            $this->progress('users', $i + 1, $total);
            $last = trim((string) ($row['last_name'] ?? ''));
            if ($last === '' || empty($row['visible']) || in_array(mb_strtolower($last), ['admin', 'bbxsuperadmin'], true)) {
                continue;
            }
            $regieCode = trim((string) ($row['regie_code'] ?? ''));
            // L'élément repris de BauBit d'abord (baubit_id), avant un éventuel élément de même code saisi à la main.
            $regieElement = $regieCode === '' ? null : PriceElement::where('family', 1)->where('regie_code', $regieCode)
                ->orderByRaw('baubit_id is null')->orderBy('id')->first();

            $collaborator = Collaborator::withTrashed()->where('baubit_id', 'USE-'.$row['id'])->first() ?? new Collaborator;
            $created = ! $collaborator->exists;
            $collaborator->fill([
                'last_name' => mb_substr($last, 0, 255),
                'first_name' => mb_substr(trim((string) ($row['first_name'] ?? '')), 0, 255) ?: null,
                'hourly_cost' => $this->price($row['hourly_cost'] ?? null),
                'regie_element_id' => $regieElement?->id ?? ($created ? null : $collaborator->regie_element_id),
                'is_active' => ! empty($row['active']),
            ]);
            $collaborator->baubit_id = 'USE-'.$row['id'];
            $collaborator->deleted_at = null;
            $collaborator->save();
            $this->count('collaborators', $created);
        }
    }

    // ------------------------------------------------------------------ catalogue

    /**
     * @param  string  $rootCatalog  FCH_Code du catalogue dont les groupes deviennent des chapitres racine
     */
    public function importCatalog(string $rootCatalog = '1'): void
    {
        $positions = $this->read('catalog_positions');

        // Positions groupées par catalogue puis par Code_1 ; la ligne « seul Code_1 » est le titre du groupe.
        $groups = [];
        foreach ($positions as $row) {
            $groups[(int) $row['chapter_id']][trim((string) $row['code1'])][] = $row;
        }

        $done = 0;
        foreach ($this->read('catalog_chapters') as $index => $catalog) {
            $catalogId = (int) $catalog['id'];
            $isRoot = trim((string) $catalog['code']) === $rootCatalog;
            $parent = null;
            if (! $isRoot) {
                $parent = $this->chapter('FCH-'.$catalogId, null, trim((string) $catalog['code']), trim((string) $catalog['name']), 100 + $index);
            }

            $groupIndex = 0;
            foreach ($groups[$catalogId] ?? [] as $code1 => $rows) {
                $title = collect($rows)->first(fn ($r) => $r['code2'] === null || $r['code2'] === '');
                $label = $title ? trim((string) $title['name']) : 'Groupe '.$code1;
                $chapter = $this->chapter(
                    $title ? 'FPO-'.$title['id'] : 'FCH-'.$catalogId.'-'.$code1,
                    $parent?->id,
                    (string) $code1,
                    $label,
                    $isRoot ? $groupIndex : $groupIndex,
                );
                $groupIndex++;

                foreach ($rows as $row) {
                    if ($row['code2'] === null || $row['code2'] === '') {
                        continue;
                    }
                    $this->article($chapter, $row, $rows);
                    $this->progress('catalog', ++$done, count($positions));
                }
            }
        }
    }

    private function chapter(string $baubitId, ?int $parentId, string $code, string $label, int $position): CatalogChapter
    {
        $chapter = CatalogChapter::withTrashed()->where('baubit_id', $baubitId)->first()
            ?? CatalogChapter::withTrashed()->where('parent_id', $parentId)->where('code', $code)->first()
            ?? new CatalogChapter;
        $created = ! $chapter->exists;
        $chapter->fill(['parent_id' => $parentId, 'code' => mb_substr($code, 0, 20), 'label' => mb_substr($label, 0, 255), 'position' => $position]);
        $chapter->baubit_id = $baubitId;
        $chapter->deleted_at = null;
        $chapter->save();
        $this->count('chapters', $created);

        return $chapter;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  list<array<string, mixed>>  $siblings
     */
    private function article(CatalogChapter $chapter, array $row, array $siblings): void
    {
        $code2 = trim((string) $row['code2']);
        $code3 = trim((string) ($row['code3'] ?? ''));
        $code4 = trim((string) ($row['code4'] ?? ''));
        $subCode = $code3 === '' ? null : ($code4 === '' ? $code3 : $code3.'.'.$code4);

        // Sous-titre = une position dont d'autres positions prolongent le code.
        $isTitle = collect($siblings)->contains(function ($other) use ($row, $code2, $code3, $code4) {
            if ($other['id'] === $row['id'] || trim((string) $other['code2']) !== $code2) {
                return false;
            }
            if ($code3 === '') {
                return trim((string) ($other['code3'] ?? '')) !== '';
            }

            return $code4 === '' && trim((string) ($other['code3'] ?? '')) === $code3 && trim((string) ($other['code4'] ?? '')) !== '';
        });

        $article = CatalogArticle::withTrashed()->where('baubit_id', 'FPO-'.$row['id'])->first()
            ?? CatalogArticle::withTrashed()->where('catalog_chapter_id', $chapter->id)->where('code', $code2)->where('sub_code', $subCode)->where('is_title', $isTitle)->first()
            ?? new CatalogArticle;
        $created = ! $article->exists;
        $article->fill([
            'catalog_chapter_id' => $chapter->id,
            'code' => $code2,
            'sub_code' => $subCode,
            'description' => trim((string) $row['name']) ?: '—',
            'unit' => $this->unit($row['unit'] ?? null, true),
            'purchase_price' => $this->price($row['price_purchase'] ?? null),
            'sale_price' => $this->price($row['price_sale'] ?? null),
            'work_type' => mb_substr((string) $chapter->code, 0, 20),
            'is_title' => $isTitle,
        ]);
        $article->baubit_id = 'FPO-'.$row['id'];
        $article->deleted_at = null;
        $article->save();
        $this->count('articles', $created);
    }

    // ------------------------------------------------------------------ outils

    private function price(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 4);
    }

    /**
     * Numéro d'élément tel qu'affiché dans BauBit (« 020.000 ») : la base le stocke sans point
     * (« 020000 ») ; le code régie « 2.020.000 » le contient avec.
     */
    private function number(?string $raw, ?string $regieCode): string
    {
        $raw = trim((string) $raw);
        if ($regieCode && preg_match('/^\d\.(.+)$/', trim($regieCode), $m)) {
            return $m[1];
        }
        if (preg_match('/^\d{6}$/', $raw)) {
            return substr($raw, 0, 3).'.'.substr($raw, 3);
        }

        return $raw;
    }

    /** Code d'unité : aligné sur la table des unités quand il ne diffère que par la casse (ou un alias connu). */
    private function unit(?string $raw, bool $aliases): ?string
    {
        $raw = trim((string) $raw);
        if ($raw === '' || $raw === '-') {
            return null;
        }
        $key = mb_strtolower($raw);
        if (isset($this->unitCodes[$key])) {
            return $this->unitCodes[$key];
        }
        if ($aliases && isset(self::UNIT_ALIASES[$key])) {
            return self::UNIT_ALIASES[$key];
        }

        return mb_substr($raw, 0, 20);
    }
}
