<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

it('expose un endpoint health public', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJson(['status' => 'ok']);
});

it('connecte un utilisateur et renvoie un token', function () {
    User::factory()->create([
        'email' => 'jane@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'jane@example.com',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);

    expect($response->json('user.email'))->toBe('jane@example.com');
});

it('refuse des identifiants invalides', function () {
    User::factory()->create([
        'email' => 'jane@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $this->postJson('/api/login', [
        'email' => 'jane@example.com',
        'password' => 'mauvais-mot-de-passe',
    ])->assertStatus(422);
});

it('renvoie l\'utilisateur authentifie via son token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/user')
        ->assertOk()
        ->assertJson(['email' => $user->email]);
});

it('bloque /api/user sans token', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});

it('renvoie 401 JSON meme sans en-tete Accept', function () {
    // Sans Accept: application/json, Laravel tenterait sinon une redirection -> 500.
    $this->get('/api/user', ['Authorization' => 'Bearer token-invalide'])
        ->assertUnauthorized();
});

/**
 * Requête authentifiée par jeton, sans réutiliser l'utilisateur résolu par la requête précédente
 * (le garde Sanctum le garde en mémoire pendant un même test).
 */
function requestWithToken(string $token)
{
    app('auth')->forgetGuards();

    return test()->withToken($token)->getJson('/api/user');
}

it('refuse un token plus vieux que la durée de vie configurée (30 jours), même utilisé régulièrement', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    foreach ([7, 7, 7, 7] as $days) { // jours 7, 14, 21, 28 : toujours valable
        $this->travel($days)->days();
        requestWithToken($token)->assertOk();
    }

    $this->travel(3)->days(); // jour 31, utilisé il y a 3 jours seulement : expiré quand même
    requestWithToken($token)->assertUnauthorized();
});

it('refuse un token inutilisé depuis 14 jours, même sans avoir 30 jours', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->travel(13)->days();
    requestWithToken($token)->assertOk(); // 13 jours sans utilisation : encore valable

    $this->travel(15)->days(); // jour 28 (< 30), mais 15 jours sans ouvrir l'application
    requestWithToken($token)->assertUnauthorized();
});

it('purge les tokens périmés avec la tâche périodique', function () {
    $user = User::factory()->create();
    $user->createToken('vieux');
    $user->tokens()->update(['created_at' => now()->subDays(32)]); // antidaté plutôt que voyage dans le temps :
    $user->createToken('récent');                                   // la date du fichier de sauvegarde, elle, reste réelle

    // Sauvegarde du jour déjà présente : la tâche ne tente pas de dump (impossible sur SQLite).
    Storage::fake('local');
    config(['backup.disk' => 'local', 'backup.path' => 'backups']);
    Storage::disk('local')->put('backups/backup-'.now()->format('Y-m-d_His').'.sql.gz', 'x');

    $this->artisan('stepbuild:cron')->assertSuccessful();

    expect($user->tokens()->pluck('name')->all())->toBe(['récent']);
});

it('deconnecte en revoquant le token courant', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/logout')->assertOk();

    expect($user->fresh()->tokens()->count())->toBe(0);
});
