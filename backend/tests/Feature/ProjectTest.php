<?php

use App\Models\Address;
use App\Models\Project;
use App\Models\ProjectPhoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function makeProject(array $attributes = []): Project
{
    return Project::create(array_merge([
        'number' => '2853-001',
        'designation1' => 'Exemple - Rénovation salle de bain',
        'status' => 'en_cours',
        'zip' => '2853',
        'city' => 'Courfaivre',
    ], $attributes));
}

it('laisse un ouvrier consulter les projets mais pas les modifier', function () {
    actingAsRole('ouvrier');
    $project = makeProject();

    $this->getJson('/api/projects')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/projects/{$project->id}")->assertOk()->assertJsonPath('data.number', '2853-001');
    $this->getJson('/api/projects/stats')->assertOk();

    $this->postJson('/api/projects', ['number' => 'X', 'designation1' => 'Y', 'status' => 'en_cours'])->assertForbidden();
    $this->putJson("/api/projects/{$project->id}", ['number' => 'X', 'designation1' => 'Y', 'status' => 'en_cours'])->assertForbidden();
    $this->deleteJson("/api/projects/{$project->id}")->assertForbidden();
    $this->getJson('/api/projects/next-number?zip=2853')->assertForbidden();
});

it('crée, modifie et supprime un projet avec son client', function () {
    actingAsRole('responsable');
    $client = Address::factory()->create(['last_name' => 'Dupont', 'first_name' => 'Marie']);

    $id = $this->postJson('/api/projects', [
        'number' => '2800-116',
        'designation1' => 'Dupont - Travaux de maçonnerie',
        'client_id' => $client->id,
        'status' => 'adjuge',
        'street' => 'Rue de la Préfecture',
        'zip' => '2800',
        'city' => 'Delémont',
    ])
        ->assertCreated()
        ->assertJsonPath('data.client.label', 'Dupont Marie')
        ->assertJsonPath('data.is_active', true)
        ->json('data.id');

    $this->putJson("/api/projects/{$id}", [
        'number' => '2800-116',
        'designation1' => 'Dupont - Travaux de maçonnerie',
        'status' => 'termine',
    ])->assertOk()->assertJsonPath('data.status', 'termine');

    $this->deleteJson("/api/projects/{$id}")->assertOk();
    $this->assertSoftDeleted('projects', ['id' => $id]);
});

it('refuse un numéro déjà utilisé et un statut inconnu (422)', function () {
    actingAsRole('responsable');
    makeProject();

    $this->postJson('/api/projects', ['number' => '2853-001', 'designation1' => 'Doublon', 'status' => 'en_cours'])
        ->assertStatus(422)->assertJsonValidationErrors(['number']);

    $this->postJson('/api/projects', ['number' => '2853-002', 'designation1' => '', 'status' => 'perdu'])
        ->assertStatus(422)->assertJsonValidationErrors(['designation1', 'status']);
});

it('autorise de garder son propre numéro à la mise à jour', function () {
    actingAsRole('responsable');
    $project = makeProject();

    $this->putJson("/api/projects/{$project->id}", [
        'number' => '2853-001', 'designation1' => 'Nouveau libellé', 'status' => 'en_cours',
    ])->assertOk()->assertJsonPath('data.designation1', 'Nouveau libellé');
});

it('propose le prochain numéro par NPA', function () {
    actingAsRole('responsable');
    makeProject(['number' => '2853-054']);
    makeProject(['number' => '2853-055']);
    makeProject(['number' => '2854-117B']);

    $this->getJson('/api/projects/next-number?zip=2853')->assertOk()->assertJsonPath('number', '2853-056');
    $this->getJson('/api/projects/next-number?zip=2854')->assertJsonPath('number', '2854-118');
    $this->getJson('/api/projects/next-number?zip=2900')->assertJsonPath('number', '2900-001');
    $this->getJson('/api/projects/next-number')->assertStatus(422);
});

it('filtre par statut, recherche sur le client et compte par statut', function () {
    actingAsRole('responsable');
    $client = Address::factory()->create(['last_name' => 'Schaffter', 'first_name' => null]);
    makeProject(['number' => '2852-033', 'designation1' => 'Aménagements extérieurs', 'client_id' => $client->id, 'status' => 'adjuge']);
    makeProject(['number' => '2853-001', 'status' => 'en_cours']);
    makeProject(['number' => '2853-002', 'status' => 'refuse', 'is_active' => false]);
    makeProject(['number' => 'MODELE-1', 'designation1' => 'Modèle villa', 'is_template' => true]);

    $this->getJson('/api/projects?status=adjuge')->assertJsonCount(1, 'data');
    $this->getJson('/api/projects?search=schaffter')->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', '2852-033');
    $this->getJson('/api/projects?active=1')->assertJsonCount(2, 'data');
    $this->getJson('/api/projects')->assertJsonCount(3, 'data');           // les modèles sont à part
    $this->getJson('/api/projects?templates=1')->assertJsonCount(1, 'data');

    $this->getJson('/api/projects/stats')
        ->assertJsonPath('data.adjuge', 1)
        ->assertJsonPath('data.en_cours', 1)
        ->assertJsonPath('data.refuse', 0) // inactif, non compté
        ->assertJsonPath('total', 2);
});

it('gère les adresses nommées d\'un projet', function () {
    actingAsRole('responsable');
    $project = makeProject();
    $other = makeProject(['number' => '2853-002']);

    $id = $this->postJson("/api/projects/{$project->id}/addresses", [
        'label' => 'Facturation', 'name' => 'Régie Exemple SA', 'city' => 'Delémont',
    ])->assertCreated()->assertJsonPath('data.position', 0)->json('data.id');

    $this->putJson("/api/projects/{$project->id}/addresses/{$id}", ['label' => 'Facturation', 'city' => 'Porrentruy'])
        ->assertOk()->assertJsonPath('data.city', 'Porrentruy');

    $this->getJson("/api/projects/{$project->id}")->assertJsonCount(1, 'data.addresses');

    // Une adresse ne se manipule que via son propre projet.
    $this->deleteJson("/api/projects/{$other->id}/addresses/{$id}")->assertNotFound();
    $this->deleteJson("/api/projects/{$project->id}/addresses/{$id}")->assertOk();
    $this->postJson("/api/projects/{$project->id}/addresses", ['label' => ''])->assertStatus(422);
});

it('envoie des photos, sert le fichier par lien signé et nettoie à la suppression', function () {
    Storage::fake(ProjectPhoto::DISK);
    actingAsRole('responsable');
    $project = makeProject();

    $photos = $this->post("/api/projects/{$project->id}/photos", [
        'photos' => [
            UploadedFile::fake()->create('facade.jpg', 200, 'image/jpeg'),
            UploadedFile::fake()->create('cuisine.png', 300, 'image/png'),
        ],
    ], ['Accept' => 'application/json'])->assertOk()->assertJsonCount(2, 'data')->json('data');

    expect($photos[0]['position'])->toBe(0);
    expect($photos[1]['position'])->toBe(1);
    $path = ProjectPhoto::find($photos[0]['id'])->path;
    Storage::disk(ProjectPhoto::DISK)->assertExists($path);

    // Lien signé : accessible sans token ; lien non signé : refusé.
    $this->get($photos[0]['url'])->assertOk();
    $this->get("/api/project-photos/{$photos[0]['id']}/file")->assertForbidden();

    // Couverture et légende.
    $this->putJson("/api/projects/{$project->id}/photos/{$photos[1]['id']}", ['caption' => 'Cuisine avant travaux', 'cover' => true])
        ->assertOk()->assertJsonPath('data.position', 0)->assertJsonPath('data.caption', 'Cuisine avant travaux');
    expect(ProjectPhoto::find($photos[0]['id'])->position)->toBe(1);

    $this->deleteJson("/api/projects/{$project->id}/photos/{$photos[0]['id']}")->assertOk();
    Storage::disk(ProjectPhoto::DISK)->assertMissing($path);
});

it('refuse un fichier qui n\'est pas une image', function () {
    Storage::fake(ProjectPhoto::DISK);
    actingAsRole('responsable');
    $project = makeProject();

    $this->post("/api/projects/{$project->id}/photos", [
        'photos' => [UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream')],
    ], ['Accept' => 'application/json'])->assertStatus(422);
});

it('inclut les projets actifs dans l\'index de recherche', function () {
    actingAsRole('responsable');
    makeProject(['number' => '2852-033', 'designation1' => 'Schaffter - Aménagements extérieurs']);
    makeProject(['number' => '2853-009', 'is_active' => false]);

    $groups = collect($this->getJson('/api/search/index')->json('groups'))->keyBy('key');

    expect($groups['projects']['items'])->toHaveCount(1);
    expect($groups['projects']['items'][0][1])->toBe('2852-033 · Schaffter - Aménagements extérieurs');
    expect($groups['projects']['path'])->toBe('/projets');
});
