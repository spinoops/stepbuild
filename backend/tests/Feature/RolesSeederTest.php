<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Spatie\Permission\Models\Role;

it('crée les trois rôles applicatifs et les comptes de démo', function () {
    $this->seed(DatabaseSeeder::class);

    foreach (['admin', 'responsable', 'ouvrier'] as $role) {
        expect(Role::where('name', $role)->exists())->toBeTrue();
    }

    expect(User::where('email', 'admin@chantier.test')->first()?->hasRole('admin'))->toBeTrue();
    expect(User::where('email', 'responsable@chantier.test')->first()?->hasRole('responsable'))->toBeTrue();
    expect(User::where('email', 'ouvrier@chantier.test')->first()?->hasRole('ouvrier'))->toBeTrue();
});

it('est idempotent : relancer le seeder ne duplique rien', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(Role::count())->toBe(3);
    expect(User::whereIn('email', [
        'admin@chantier.test',
        'responsable@chantier.test',
        'ouvrier@chantier.test',
    ])->count())->toBe(3);
});
