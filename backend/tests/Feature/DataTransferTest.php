<?php

use App\Models\Address;
use App\Models\PriceElement;
use App\Models\StockItem;
use App\Models\User;
use App\Support\DataTransfer;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->file = storage_path('app/transfer/test-donnees.sql');
    File::ensureDirectoryExists(dirname($this->file));
    File::delete($this->file);
});

afterEach(function () {
    File::delete($this->file);
});

it('exporte puis réimporte les données métier à l\'identique, comptes de démo à la corbeille', function () {
    $this->seed(DatabaseSeeder::class);
    Address::factory()->count(3)->create(['remark' => "Ligne 1\nLigne 2 — avec « guillemets » et l'apostrophe"]);
    $before = Address::orderBy('id')->get()->toArray();
    // Les stocks voyagent avec les éléments de coûts qu'ils référencent.
    $element = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '020.000', 'description' => 'Chiffon', 'unit' => 'Paquet']);
    $stock = StockItem::create(['price_element_id' => $element->id, 'min_quantity' => 2]);
    $stock->apply('inventaire', 9, null, 'Comptage');

    $this->artisan('stepbuild:export-data', ['--output' => $this->file])->assertSuccessful();
    expect(file_get_contents($this->file))->toContain(DataTransfer::MIGRATIONS_PREFIX)->toContain('INSERT INTO `addresses`');

    // La base cible a d'autres données : elles sont remplacées.
    Address::query()->forceDelete();
    Address::factory()->create(['designation' => 'À remplacer']);
    DB::table('personal_access_tokens')->insert([
        'tokenable_type' => User::class, 'tokenable_id' => 1, 'name' => 't', 'token' => str_repeat('a', 64), 'abilities' => '[]',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->artisan('stepbuild:import-data', ['file' => $this->file, '--force' => true, '--no-backup' => true])->assertSuccessful();

    expect(Address::orderBy('id')->get()->toArray())->toEqual($before)
        ->and(StockItem::count())->toBe(1)
        ->and(StockItem::first()->price_element_id)->toBe($element->id)
        ->and(StockItem::first()->quantity)->toBe(9.0)
        ->and(StockItem::first()->movements()->count())->toBe(1)
        ->and(DB::table('personal_access_tokens')->count())->toBe(0)
        ->and(User::withTrashed()->where('email', 'admin@chantier.test')->first()->trashed())->toBeTrue()
        ->and(User::count())->toBe(0);
    $this->postJson('/api/login', ['email' => 'admin@chantier.test', 'password' => 'password'])->assertUnprocessable();
});

it('garde les comptes de démo actifs avec --keep-demo-accounts', function () {
    $this->seed(DatabaseSeeder::class);
    $this->artisan('stepbuild:export-data', ['--output' => $this->file])->assertSuccessful();

    $this->artisan('stepbuild:import-data', ['file' => $this->file, '--force' => true, '--no-backup' => true, '--keep-demo-accounts' => true])
        ->assertSuccessful();

    expect(User::count())->toBe(3)
        ->and(User::where('email', 'admin@chantier.test')->first()->hasRole('admin'))->toBeTrue();
});

it('refuse un fichier exporté avec d\'autres migrations, sauf --ignore-schema', function () {
    $this->seed(DatabaseSeeder::class);
    $this->artisan('stepbuild:export-data', ['--output' => $this->file])->assertSuccessful();
    file_put_contents($this->file, str_replace(DataTransfer::MIGRATIONS_PREFIX, DataTransfer::MIGRATIONS_PREFIX.'9999_99_99_000000_autre,', file_get_contents($this->file)));

    $this->artisan('stepbuild:import-data', ['file' => $this->file, '--force' => true, '--no-backup' => true])
        ->expectsOutputToContain('Le schéma diffère')
        ->assertFailed();
    $this->artisan('stepbuild:import-data', ['file' => $this->file, '--force' => true, '--no-backup' => true, '--ignore-schema' => true])
        ->assertSuccessful();
});

it('signale un fichier introuvable', function () {
    $this->artisan('stepbuild:import-data', ['file' => 'nexiste-pas.sql', '--force' => true])->assertFailed();
});
