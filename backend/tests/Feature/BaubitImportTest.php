<?php

use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use App\Models\Collaborator;
use App\Models\PriceElement;
use App\Models\Unit;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    Unit::seedDefaults();
    $this->dir = storage_path('app/testing/baubit');
    File::ensureDirectoryExists($this->dir);
    $write = fn (string $name, array $rows) => file_put_contents($this->dir."/{$name}.json", "\xEF\xBB\xBF".json_encode($rows, JSON_UNESCAPED_UNICODE));

    $write('elements', [
        ['id' => 13622, 'family' => 2, 'group' => '92', 'number' => '020000', 'name' => '3M 2012 chiffon microfibre bleu (10 pcs) paquet', 'name_d' => null, 'unit' => 'Paquet', 'unit_regie' => 'Paquet', 'regie_code' => '2.020.000', 'remark' => null, 'active' => true, 'supplier_price' => 18.80, 'net_price' => 18.80, 'discount_percent' => null, 'discount_amount' => null, 'unit_factor' => 1.0, 'price_date' => '2024-10-07 11:00:39', 'supplier_ref' => null, 'regie_name' => '3M 2012 chiffon', 'regie_price' => 24.44],
        ['id' => 20001, 'family' => 5, 'group' => '95', 'number' => '361796', 'name' => null, 'name_d' => 'Accu 36 volts Bosch', 'unit' => 'pce', 'unit_regie' => null, 'regie_code' => null, 'remark' => null, 'active' => true, 'supplier_price' => 100, 'net_price' => null, 'discount_percent' => null, 'discount_amount' => null, 'unit_factor' => null, 'price_date' => null, 'supplier_ref' => null, 'regie_name' => null, 'regie_price' => null],
        ['id' => 20002, 'family' => 2, 'group' => '92', 'number' => '099.999', 'name' => 'Inactif', 'name_d' => null, 'unit' => 'Pce', 'unit_regie' => null, 'regie_code' => null, 'remark' => null, 'active' => false, 'supplier_price' => 1, 'net_price' => 1, 'discount_percent' => null, 'discount_amount' => null, 'unit_factor' => 1, 'price_date' => null, 'supplier_ref' => null, 'regie_name' => null, 'regie_price' => null],
    ]);
    $write('regie_positions', [
        ['id' => 501, 'code' => '1.010.010', 'name' => "Chef d'équipe", 'unit' => 'H.', 'price' => 95.00, 'price_purchase' => null, 'has_element' => 0],
        ['id' => 502, 'code' => '2.020.000', 'name' => '3M 2012 chiffon', 'unit' => 'Paquet', 'price' => 24.44, 'price_purchase' => null, 'has_element' => 1],
    ]);
    $write('users', [
        ['id' => 3, 'first_name' => 'David', 'last_name' => 'Lachat', 'initials' => 'DL', 'department' => 'Directeur', 'profession' => null, 'hourly_cost' => 52.78, 'active' => true, 'visible' => true, 'has_login' => true, 'external' => false, 'subcontractor' => false, 'email' => 'dl@lachat-bat.ch', 'function_code' => 'CE', 'function_label' => "Chef d'équipe", 'regie_code' => '1.010.010', 'function_lines' => 99, 'hours_lines' => 99, 'last_hours' => '2026-07-15'],
        ['id' => 21, 'first_name' => 'Léo', 'last_name' => 'Bätscher', 'initials' => null, 'department' => 'Gros-oeuvre', 'profession' => null, 'hourly_cost' => 50, 'active' => false, 'visible' => true, 'has_login' => false, 'external' => false, 'subcontractor' => false, 'email' => null, 'function_code' => 'MAC', 'function_label' => 'Maçon', 'regie_code' => '1.010.020', 'function_lines' => 93, 'hours_lines' => 93, 'last_hours' => '2023-08-18'],
        ['id' => 1, 'first_name' => null, 'last_name' => 'Admin', 'initials' => null, 'department' => null, 'profession' => null, 'hourly_cost' => null, 'active' => true, 'visible' => true, 'has_login' => true, 'external' => false, 'subcontractor' => false, 'email' => null, 'function_code' => null, 'function_label' => null, 'regie_code' => null, 'function_lines' => null, 'hours_lines' => 0, 'last_hours' => null],
        ['id' => 2, 'first_name' => null, 'last_name' => 'BBXSuperAdmin', 'initials' => null, 'department' => null, 'profession' => null, 'hourly_cost' => null, 'active' => true, 'visible' => false, 'has_login' => true, 'external' => false, 'subcontractor' => false, 'email' => null, 'function_code' => null, 'function_label' => null, 'regie_code' => null, 'function_lines' => null, 'hours_lines' => 0, 'last_hours' => null],
    ]);
    $write('catalog_chapters', [
        ['id' => 14, 'code' => '1', 'name' => 'Devis - prix H., M1, M2, M3'],
        ['id' => 9, 'code' => '4', 'name' => 'Facture - Lachat Construction Sàrl'],
    ]);
    $write('catalog_positions', [
        ['id' => 1, 'chapter_id' => 14, 'code1' => '12', 'code2' => null, 'code3' => null, 'code4' => null, 'name' => 'CARRELAGE', 'unit' => null, 'price_sale' => null, 'price_purchase' => null, 'job' => null],
        ['id' => 2, 'chapter_id' => 14, 'code1' => '12', 'code2' => '025', 'code3' => null, 'code4' => null, 'name' => 'Fourniture et pose carrelage sol', 'unit' => 'm2', 'price_sale' => 120, 'price_purchase' => 70, 'job' => null],
        ['id' => 3, 'chapter_id' => 14, 'code1' => '13', 'code2' => null, 'code3' => null, 'code4' => null, 'name' => 'PEINTURE', 'unit' => null, 'price_sale' => null, 'price_purchase' => null, 'job' => null],
        ['id' => 4, 'chapter_id' => 14, 'code1' => '13', 'code2' => '005', 'code3' => null, 'code4' => null, 'name' => 'Murs,', 'unit' => null, 'price_sale' => null, 'price_purchase' => null, 'job' => null],
        ['id' => 5, 'chapter_id' => 14, 'code1' => '13', 'code2' => '005', 'code3' => '005', 'code4' => null, 'name' => 'sur enduit neuf, 2 couches', 'unit' => 'M2', 'price_sale' => 28.5, 'price_purchase' => null, 'job' => null],
        ['id' => 6, 'chapter_id' => 14, 'code1' => '18', 'code2' => '005', 'code3' => null, 'code4' => null, 'name' => 'Ouvrier qualifié', 'unit' => 'h', 'price_sale' => 90, 'price_purchase' => 52.78, 'job' => null],
        ['id' => 7, 'chapter_id' => 9, 'code1' => '100', 'code2' => null, 'code3' => null, 'code4' => null, 'name' => "MAIN D'OEUVRE", 'unit' => null, 'price_sale' => null, 'price_purchase' => null, 'job' => null],
        ['id' => 8, 'chapter_id' => 9, 'code1' => '100', 'code2' => '010', 'code3' => '005', 'code4' => '001', 'name' => 'Maçon', 'unit' => 'H.', 'price_sale' => 95, 'price_purchase' => null, 'job' => null],
        ['id' => 9, 'chapter_id' => 9, 'code1' => '200', 'code2' => '010', 'code3' => null, 'code4' => null, 'name' => 'Sans titre de groupe', 'unit' => 'Pce', 'price_sale' => 1, 'price_purchase' => null, 'job' => null],
    ]);
});

afterEach(function () {
    File::deleteDirectory($this->dir);
});

it('reprend les éléments de coûts avec prix fournisseur, net et régie, et les salaires du tarif régie', function () {
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir, '--elements' => true])->assertSuccessful();

    $chiffon = PriceElement::where('baubit_id', 'CEL-13622')->firstOrFail();
    expect($chiffon->family)->toBe(2)
        ->and($chiffon->group_code)->toBe('M92')
        ->and($chiffon->number)->toBe('020.000')
        ->and($chiffon->unit)->toBe('Paquet')
        ->and($chiffon->supplier_price)->toBe(18.8)
        ->and($chiffon->net_price)->toBe(18.8)
        ->and($chiffon->regie_price)->toBe(24.44)
        ->and($chiffon->regie_code)->toBe('2.020.000')
        ->and($chiffon->price_updated_at?->toDateString())->toBe('2024-10-07');

    $accu = PriceElement::where('baubit_id', 'CEL-20001')->firstOrFail();
    expect($accu->description)->toBe('Accu 36 volts Bosch')
        ->and($accu->number)->toBe('361.796') // stocké « 361796 » dans BauBit
        ->and($accu->unit)->toBe('Pce') // casse alignée sur la table des unités
        ->and($accu->net_price)->toBe(100.0)
        ->and($accu->group_code)->toBe('O95');

    $chef = PriceElement::where('baubit_id', 'RPO-501')->firstOrFail();
    expect($chef->family)->toBe(1)
        ->and($chef->number)->toBe('010.010')
        ->and($chef->regie_price)->toBe(95.0)
        ->and($chef->group_code)->toBe('S10');

    expect(PriceElement::count())->toBe(3) // l'élément inactif et la position régie déjà couverte sont ignorés
        ->and(CatalogArticle::count())->toBe(0);
});

it('reprend les employés avec leur coût horaire et leur position régie, sans les comptes techniques', function () {
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir, '--elements' => true, '--collaborators' => true])->assertSuccessful();

    expect(Collaborator::count())->toBe(2);
    $david = Collaborator::where('baubit_id', 'USE-3')->firstOrFail();
    expect($david->last_name)->toBe('Lachat')->and($david->first_name)->toBe('David')
        ->and($david->hourly_cost)->toBe(52.78)->and($david->is_active)->toBeTrue()
        ->and($david->regieElement?->regie_code)->toBe('1.010.010')
        ->and($david->regiePrice())->toBe(95.0);
    $leo = Collaborator::where('baubit_id', 'USE-21')->firstOrFail();
    expect($leo->is_active)->toBeFalse()->and($leo->regie_element_id)->toBeNull(); // 1.010.020 absent du jeu de test
});

it('reprend le catalogue : groupes du catalogue racine en chapitres racine, autres catalogues en arbre', function () {
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir, '--catalog' => true])->assertSuccessful();

    $carrelage = CatalogChapter::whereNull('parent_id')->where('code', '12')->firstOrFail();
    expect($carrelage->label)->toBe('CARRELAGE')->and($carrelage->baubit_id)->toBe('FPO-1');

    $sol = CatalogArticle::where('baubit_id', 'FPO-2')->firstOrFail();
    expect($sol->catalog_chapter_id)->toBe($carrelage->id)
        ->and($sol->code)->toBe('025')->and($sol->sub_code)->toBeNull()
        ->and($sol->unit)->toBe('M2')->and($sol->sale_price)->toBe(120.0)->and($sol->purchase_price)->toBe(70.0)
        ->and($sol->is_title)->toBeFalse()->and($sol->work_type)->toBe('12');

    $murs = CatalogArticle::where('baubit_id', 'FPO-4')->firstOrFail();
    $enduit = CatalogArticle::where('baubit_id', 'FPO-5')->firstOrFail();
    expect($murs->is_title)->toBeTrue()->and($murs->code)->toBe('005')
        ->and($enduit->is_title)->toBeFalse()->and($enduit->code)->toBe('005')->and($enduit->sub_code)->toBe('005');

    expect(CatalogArticle::where('baubit_id', 'FPO-6')->first()->unit)->toBe('H.'); // alias h → H.

    $facture = CatalogChapter::whereNull('parent_id')->where('code', '4')->firstOrFail();
    $mo = CatalogChapter::where('parent_id', $facture->id)->where('code', '100')->firstOrFail();
    expect($mo->label)->toBe("MAIN D'OEUVRE")
        ->and(CatalogArticle::where('baubit_id', 'FPO-8')->first()->sub_code)->toBe('005.001')
        ->and(CatalogChapter::where('parent_id', $facture->id)->where('code', '200')->first()->label)->toBe('Groupe 200');

    expect(CatalogChapter::count())->toBe(6)->and(CatalogArticle::count())->toBe(6)->and(PriceElement::count())->toBe(0);
});

it('est idempotent et retrouve les chapitres de démo par leur code', function () {
    $existing = CatalogChapter::create(['code' => '12', 'label' => 'CARRELAGE (démo)', 'position' => 0]);
    $demo = CatalogArticle::create(['catalog_chapter_id' => $existing->id, 'code' => '025', 'description' => 'Ancien libellé', 'sale_price' => 1]);

    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir])->assertSuccessful();
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir])->assertSuccessful();

    expect(CatalogChapter::whereNull('parent_id')->where('code', '12')->count())->toBe(1)
        ->and($existing->fresh()->label)->toBe('CARRELAGE')
        ->and($demo->fresh()->description)->toBe('Fourniture et pose carrelage sol')
        ->and(CatalogChapter::count())->toBe(6)
        ->and(CatalogArticle::count())->toBe(6)
        ->and(PriceElement::count())->toBe(3)
        ->and(Collaborator::count())->toBe(2);
});

it('ne modifie rien en simulation (--dry-run)', function () {
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir, '--dry-run' => true])
        ->expectsOutputToContain('Simulation')
        ->assertSuccessful();

    expect(CatalogChapter::count())->toBe(0)->and(CatalogArticle::count())->toBe(0)->and(PriceElement::count())->toBe(0)->and(Collaborator::count())->toBe(0);
});

it('signale un dossier ou un fichier manquant', function () {
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir.'/nexiste-pas'])->assertFailed();
    File::delete($this->dir.'/elements.json');
    $this->artisan('stepbuild:import-baubit', ['dir' => $this->dir, '--elements' => true])->assertFailed();
    expect(PriceElement::count())->toBe(0);
});
