<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;

function actingAsAdmin(): User
{
    Role::findOrCreate('admin');
    Role::findOrCreate('user');
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    return $admin;
}

it('révoque les connexions du compte quand un admin change le mot de passe ou les rôles', function () {
    actingAsAdmin();
    Role::findOrCreate('ouvrier', 'web');
    $user = User::factory()->create();
    $user->assignRole('user');
    $user->createToken('téléphone');
    $user->createToken('bureau');

    // Nom seul : rien ne change pour ses appareils.
    $this->putJson("/api/users/{$user->id}", ['name' => 'Renommé', 'email' => $user->email, 'roles' => ['user']])->assertOk();
    expect($user->tokens()->count())->toBe(2);

    // Nouveau mot de passe : tout le monde doit se reconnecter.
    $this->putJson("/api/users/{$user->id}", ['name' => 'Renommé', 'email' => $user->email, 'password' => 'nouveau-mdp-1', 'roles' => ['user']])->assertOk();
    expect($user->tokens()->count())->toBe(0);

    // Changement de rôles : idem.
    $user->createToken('téléphone');
    $this->putJson("/api/users/{$user->id}", ['name' => 'Renommé', 'email' => $user->email, 'roles' => ['ouvrier']])->assertOk();
    expect($user->tokens()->count())->toBe(0);
});

it('garde la connexion en cours de cet admin qui change son propre mot de passe, pas les autres', function () {
    Role::findOrCreate('admin');
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $admin->createToken('autre appareil');
    $token = $admin->createToken('courant')->plainTextToken;

    $this->withToken($token)
        ->putJson("/api/users/{$admin->id}", ['name' => $admin->name, 'email' => $admin->email, 'password' => 'nouveau-mdp-2', 'roles' => ['admin']])
        ->assertOk();

    expect($admin->tokens()->pluck('name')->all())->toBe(['courant']);
    $this->withToken($token)->getJson('/api/user')->assertOk();
});

it('supprime les connexions du compte supprimé', function () {
    Role::findOrCreate('admin');
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $user = User::factory()->create();
    $token = $user->createToken('téléphone')->plainTextToken;

    $this->withToken($admin->createToken('admin')->plainTextToken)->deleteJson("/api/users/{$user->id}")->assertOk();

    expect($user->tokens()->count())->toBe(0);
    $this->app['auth']->forgetGuards(); // l'utilisateur résolu par la requête précédente ne doit pas être réutilisé
    $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
});

it('interdit la liste des utilisateurs à un non-admin', function () {
    Role::findOrCreate('user');
    $user = User::factory()->create();
    $user->assignRole('user');
    Sanctum::actingAs($user);

    $this->getJson('/api/users')->assertForbidden();
});

it('permet à un admin de lister les utilisateurs (paginé)', function () {
    actingAsAdmin();

    $this->getJson('/api/users')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'name', 'email', 'roles']],
            'meta',
            'links',
        ]);
});

it('permet à un admin de créer un utilisateur avec un rôle', function () {
    actingAsAdmin();

    $this->postJson('/api/users', [
        'name' => 'Nouveau',
        'email' => 'nouveau@example.com',
        'password' => 'secret123',
        'roles' => ['user'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.roles', ['user']);

    $this->assertDatabaseHas('users', ['email' => 'nouveau@example.com']);
});

it('valide les données à la création (422)', function () {
    actingAsAdmin();

    $this->postJson('/api/users', [
        'name' => '',
        'email' => 'invalide',
        'password' => '123',
        'roles' => [],
    ])->assertStatus(422);
});

it('empêche un admin de supprimer son propre compte', function () {
    $admin = actingAsAdmin();

    $this->deleteJson("/api/users/{$admin->id}")->assertStatus(422);
});

it('supprime un autre utilisateur en soft delete et l\'exclut des listes', function () {
    actingAsAdmin();
    $other = User::factory()->create();

    $this->deleteJson("/api/users/{$other->id}")->assertOk();

    // Soft delete : la ligne existe encore avec deleted_at renseigné...
    $this->assertSoftDeleted('users', ['id' => $other->id]);

    // ...mais l'utilisateur n'apparaît plus dans la liste.
    $this->getJson('/api/users')
        ->assertOk()
        ->assertJsonMissing(['email' => $other->email]);
});

it('journalise la création d\'un utilisateur (activity log)', function () {
    actingAsAdmin();

    $id = $this->postJson('/api/users', [
        'name' => 'Journalisé',
        'email' => 'journal@example.com',
        'password' => 'secret123',
        'roles' => ['user'],
    ])->assertCreated()->json('data.id');

    $this->assertDatabaseHas('activity_log', [
        'subject_type' => User::class,
        'subject_id' => $id,
        'event' => 'created',
    ]);
});
