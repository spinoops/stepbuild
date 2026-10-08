<?php

use App\Services\BackupService;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    config(['backup.disk' => 'local', 'backup.path' => 'backups', 'backup.keep' => 2]);
});

it('liste les sauvegardes existantes, de la plus récente à la plus ancienne', function () {
    Storage::disk('local')->put('backups/backup-2026-01-01_000000.sql.gz', 'a');
    Storage::disk('local')->put('backups/backup-2026-02-01_000000.sql.gz', 'b');
    Storage::disk('local')->put('backups/notes.txt', 'ignoré');

    $list = app(BackupService::class)->list();

    expect($list)->toHaveCount(2)
        ->and($list[0]['name'])->toBe('backup-2026-02-01_000000.sql.gz')
        ->and($list[0])->toHaveKeys(['name', 'size', 'created_at']);
});

it('applique la rotation en ne gardant que les N plus récentes', function () {
    foreach (['01', '02', '03', '04'] as $month) {
        Storage::disk('local')->put("backups/backup-2026-{$month}-01_000000.sql.gz", $month);
    }

    $deleted = app(BackupService::class)->rotate(2);

    expect($deleted)->toBe(2)
        ->and(app(BackupService::class)->list())->toHaveCount(2);
    Storage::disk('local')->assertMissing('backups/backup-2026-01-01_000000.sql.gz');
    Storage::disk('local')->assertExists('backups/backup-2026-04-01_000000.sql.gz');
});

it('refuse proprement de sauvegarder une base autre que MySQL', function () {
    // Les tests tournent sur SQLite : la commande doit l'expliquer, pas planter.
    $this->artisan('backup:run')
        ->expectsOutputToContain('MySQL')
        ->assertFailed();
})->skip(fn () => in_array(config('database.connections.'.config('database.default').'.driver'), ['mysql', 'mariadb'], true), 'Vérifie le refus hors MySQL : sans objet quand la CI tourne sur MySQL.');

it('sauvegarde une base MySQL en un fichier compressé', function () {
    $this->artisan('backup:run')->assertSuccessful();

    $files = Storage::disk('local')->files('backups');
    expect($files)->toHaveCount(1)
        ->and($files[0])->toEndWith('.sql.gz');
    $sql = gzdecode(Storage::disk('local')->get($files[0]));
    expect($sql)->toContain('CREATE TABLE')->toContain('users');
})->skip(fn () => ! in_array(config('database.connections.'.config('database.default').'.driver'), ['mysql', 'mariadb'], true), 'Sauvegarde réelle : seulement quand les tests tournent sur MySQL.');
