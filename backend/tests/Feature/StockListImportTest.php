<?php

use App\Models\PriceElement;
use App\Models\StockItem;
use App\Models\Unit;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    Unit::seedDefaults();
    $this->file = storage_path('app/testing/materiaux.json');
    File::ensureDirectoryExists(dirname($this->file));

    // Déjà connus : un chiffon à jour, un disque dont le prix a changé depuis (date plus récente dans le
    // fichier), un film dont le prix du fichier est plus ancien, et deux doublons BauBit de même code.
    $this->chiffon = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '020.000', 'description' => 'Chiffon microfibre bleu', 'unit' => 'Paquet', 'supplier_price' => 18.80, 'net_price' => 18.80, 'regie_code' => '2.020.000', 'price_updated_at' => '2024-10-07']);
    $this->disque = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '020.030', 'description' => 'Disque de nettoyage fin', 'unit' => 'Pce', 'supplier_price' => 16.70, 'net_price' => 16.70, 'regie_code' => '2.020.030', 'price_updated_at' => '2024-10-04']);
    $this->film = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '020.040', 'description' => 'Film de masquage', 'unit' => 'Rlx', 'supplier_price' => 25.00, 'net_price' => 25.00, 'regie_code' => '2.020.040', 'price_updated_at' => '2026-09-30']);
    $this->dupA = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '044.335', 'description' => 'Vis A', 'unit' => 'Pce', 'supplier_price' => 1, 'net_price' => 1, 'regie_code' => '2.044.335', 'price_updated_at' => '2025-01-01']);
    $this->dupB = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '044.335', 'description' => 'Vis B', 'unit' => 'Pce', 'supplier_price' => 2, 'net_price' => 2, 'regie_code' => '2.044.335', 'price_updated_at' => '2025-01-01']);

    file_put_contents($this->file, json_encode([
        ['family' => 2, 'group' => '92', 'number' => '020.000', 'name' => 'Chiffon microfibre bleu', 'unit' => 'Paquet', 'unit_regie' => 'Paquet', 'supplier_price' => 18.80, 'net_price' => 18.80, 'regie_code' => '2.020.000', 'unit_factor' => 1, 'price_date' => '2024-10-07', 'active' => true],
        ['family' => 2, 'group' => '92', 'number' => '020.030', 'name' => 'Disque de nettoyage fin', 'unit' => 'Pce', 'unit_regie' => 'Pce', 'supplier_price' => 17.90, 'net_price' => 17.90, 'regie_code' => '2.020.030', 'unit_factor' => 1, 'price_date' => '2026-09-15', 'active' => true],
        ['family' => 2, 'group' => '92', 'number' => '020.040', 'name' => 'Film de masquage', 'unit' => 'Rlx', 'unit_regie' => 'Rlx', 'supplier_price' => 21.28, 'net_price' => 21.28, 'regie_code' => '2.020.040', 'unit_factor' => 1, 'price_date' => '2024-10-04', 'active' => true],
        ['family' => 2, 'group' => '92', 'number' => '044.335', 'name' => 'Vis B', 'unit' => 'Pce', 'unit_regie' => 'Pce', 'supplier_price' => 2.5, 'net_price' => 2.5, 'regie_code' => '2.044.335', 'unit_factor' => 1, 'price_date' => '2026-10-01', 'active' => true],
        ['family' => 2, 'group' => '92', 'number' => '058.839', 'name' => '0042 - Chape 0/4, 350kg/m³ (Lachat SA)', 'unit' => 'm3', 'unit_regie' => 'M3', 'supplier_price' => 171.56, 'net_price' => 171.56, 'regie_code' => '2.058.839', 'unit_factor' => 1, 'price_date' => '2026-09-10', 'active' => true],
        ['family' => 2, 'group' => '92', 'number' => '', 'name' => 'Ligne vide', 'unit' => null, 'unit_regie' => null, 'supplier_price' => null, 'net_price' => null, 'regie_code' => null, 'unit_factor' => 1, 'price_date' => null, 'active' => true],
    ], JSON_UNESCAPED_UNICODE));
});

afterEach(function () {
    File::delete($this->file);
});

it('met la liste en stock, crée les éléments inconnus et rafraîchit les prix plus récents', function () {
    $this->artisan('stepbuild:import-stock-list', ['file' => $this->file])->assertSuccessful();

    // 5 lignes valables → 5 produits en stock, à compter.
    expect(StockItem::count())->toBe(5)
        ->and(StockItem::whereNotNull('counted_at')->count())->toBe(0);

    // Disque : prix plus récent dans le fichier → mis à jour et daté.
    $disque = $this->disque->fresh();
    expect($disque->supplier_price)->toBe(17.9)->and($disque->price_updated_at->toDateString())->toBe('2026-09-15');
    // Film : le fichier est plus ancien → prix conservé.
    expect($this->film->fresh()->supplier_price)->toBe(25.0);
    // Chiffon : identique → rien.
    expect($this->chiffon->fresh()->price_updated_at->toDateString())->toBe('2024-10-07');
    // Doublons : la ligne « Vis B » met à jour le bon doublon seulement.
    expect($this->dupA->fresh()->supplier_price)->toBe(1.0)->and($this->dupB->fresh()->supplier_price)->toBe(2.5);

    // Chape : inconnue → créée avec la clé du fichier, unité alignée sur la table.
    $chape = PriceElement::where('baubit_id', 'XLS-2.058.839')->firstOrFail();
    expect($chape->family)->toBe(2)->and($chape->group_code)->toBe('M92')->and($chape->unit)->toBe('M3')
        ->and($chape->supplier_price)->toBe(171.56)->and($chape->price_updated_at->toDateString())->toBe('2026-09-10')
        ->and(StockItem::where('price_element_id', $chape->id)->exists())->toBeTrue();

    expect(PriceElement::count())->toBe(6);
});

it('est relançable sans doublon et respecte --no-prices, --no-stock et --dry-run', function () {
    $this->artisan('stepbuild:import-stock-list', ['file' => $this->file, '--dry-run' => true])->expectsOutputToContain('Simulation')->assertSuccessful();
    expect(StockItem::count())->toBe(0)->and(PriceElement::count())->toBe(5);

    $this->artisan('stepbuild:import-stock-list', ['file' => $this->file, '--no-prices' => true])->assertSuccessful();
    expect($this->disque->fresh()->supplier_price)->toBe(16.7)->and(StockItem::count())->toBe(5);

    $this->artisan('stepbuild:import-stock-list', ['file' => $this->file])->assertSuccessful();
    $this->artisan('stepbuild:import-stock-list', ['file' => $this->file, '--no-stock' => true])->assertSuccessful();
    expect(StockItem::count())->toBe(5)->and(PriceElement::count())->toBe(6)->and($this->disque->fresh()->supplier_price)->toBe(17.9);
});

it('signale un fichier introuvable', function () {
    $this->artisan('stepbuild:import-stock-list', ['file' => 'nexiste-pas.json'])->assertFailed();
});
