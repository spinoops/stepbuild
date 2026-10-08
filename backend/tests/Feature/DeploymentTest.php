<?php

use App\Models\Unit;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

it('ne crée en production que les rôles, les unités et les sous-détails types, sans compte de démo', function () {
    app()->detectEnvironment(fn () => 'production');

    // Appel direct : `db:seed` demanderait une confirmation en production.
    app(DatabaseSeeder::class)->setContainer(app())->__invoke();

    expect(Role::pluck('name')->sort()->values()->all())->toBe(['admin', 'ouvrier', 'responsable'])
        ->and(User::count())->toBe(0)
        ->and(Unit::count())->toBeGreaterThan(0);
});

it('répond sur /api/health en indiquant l\'état de la base', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('database', 'ok');
});

it('crée le premier admin avec un mot de passe généré, affiché une seule fois', function () {
    Notification::fake();

    $this->artisan('chantier:admin', ['email' => 'Login@Step-One.ch', '--name' => 'Step One'])
        ->expectsOutputToContain('Mot de passe généré')
        ->assertSuccessful();

    $user = User::where('email', 'login@step-one.ch')->firstOrFail();
    expect($user->name)->toBe('Step One')
        ->and($user->hasRole('admin'))->toBeTrue()
        ->and($user->email_verified_at)->not->toBeNull();
    Notification::assertNothingSent();
});

it('crée le compte admin avec le mot de passe donné et permet la connexion', function () {
    $this->artisan('chantier:admin', ['email' => 'admin@lachat.test', '--password' => 'motdepasse-solide'])->assertSuccessful();

    $this->postJson('/api/login', ['email' => 'admin@lachat.test', 'password' => 'motdepasse-solide'])->assertOk();
    expect(Hash::check('motdepasse-solide', User::where('email', 'admin@lachat.test')->first()->password))->toBeTrue();

    // Relancer sur un compte existant le promeut sans le dupliquer.
    $this->artisan('chantier:admin', ['email' => 'admin@lachat.test'])->assertSuccessful();
    expect(User::where('email', 'admin@lachat.test')->count())->toBe(1);
});

it('envoie le lien pour définir le mot de passe avec --mail', function () {
    Notification::fake();

    $this->artisan('chantier:admin', ['email' => 'chef@lachat.test', '--mail' => true])->assertSuccessful();

    Notification::assertSentTo(User::where('email', 'chef@lachat.test')->firstOrFail(), ResetPassword::class);
});

it('refuse une adresse invalide ou un mot de passe trop court pour le compte admin', function () {
    $this->artisan('chantier:admin', ['email' => 'pas-une-adresse'])->assertFailed();
    $this->artisan('chantier:admin', ['email' => 'ok@lachat.test', '--password' => 'court'])->assertFailed();
    expect(User::count())->toBe(0);
});

it('protège l\'URL de la tâche planifiée par le jeton CRON_TOKEN', function () {
    config(['cron.token' => '']);
    $this->getJson('/api/cron/run/nimporte')->assertNotFound();

    config(['cron.token' => 'secret-de-test']);
    $this->getJson('/api/cron/run/mauvais')->assertNotFound();
});

it('lance la sauvegarde par l\'URL de la tâche planifiée', function () {
    config(['cron.token' => 'secret-de-test']);

    $res = $this->getJson('/api/cron/run/secret-de-test');

    // La sauvegarde exige MySQL : en test (SQLite) elle échoue proprement (500 expliqué).
    expect($res->json('output'))->toContain('Sauvegarde')
        ->and($res->status())->toBeIn([200, 500]);
});

it('sert l\'interface React pour toute adresse hors /api une fois le front copié', function () {
    $index = public_path('index.html');
    $existed = is_file($index);
    if (! $existed) {
        file_put_contents($index, '<!doctype html><title>Chantier</title><div id="root"></div>');
    }

    try {
        $res = $this->get('/projets?id=12&projet=12')->assertOk();
        expect($res->baseResponse)->toBeInstanceOf(BinaryFileResponse::class)
            ->and($res->baseResponse->getFile()->getPathname())->toBe($index);
        $this->getJson('/api/route-inexistante')->assertNotFound();
    } finally {
        if (! $existed) {
            unlink($index);
        }
    }
});
