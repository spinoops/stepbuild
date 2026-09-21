<?php

use App\Models\Address;

it('interdit les adresses à un ouvrier', function () {
    actingAsRole('ouvrier');

    $this->getJson('/api/addresses')->assertForbidden();
    $this->postJson('/api/addresses', ['type' => 'client', 'last_name' => 'X'])->assertForbidden();
});

it('liste les adresses paginées pour un responsable', function () {
    actingAsRole('responsable');
    Address::factory()->count(3)->create();

    $this->getJson('/api/addresses')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure(['data' => [['id', 'type', 'last_name', 'city', 'is_active']], 'meta', 'links']);
});

it('crée, modifie et supprime une adresse', function () {
    actingAsRole('responsable');

    $id = $this->postJson('/api/addresses', [
        'type' => 'client',
        'title' => 'Madame',
        'last_name' => 'Dupont',
        'first_name' => 'Marie',
        'zip' => '2800',
        'city' => 'Delémont',
    ])->assertCreated()->assertJsonPath('data.is_active', true)->json('data.id');

    $this->putJson("/api/addresses/{$id}", [
        'type' => 'client',
        'last_name' => 'Dupont',
        'first_name' => 'Marie',
        'city' => 'Bassecourt',
    ])->assertOk()->assertJsonPath('data.city', 'Bassecourt');

    $this->deleteJson("/api/addresses/{$id}")->assertOk();
    $this->assertSoftDeleted('addresses', ['id' => $id]);
});

it('valide le type et le nom (422)', function () {
    actingAsRole('admin');

    $this->postJson('/api/addresses', ['type' => 'inconnu', 'last_name' => ''])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['type', 'last_name']);
});

it('recherche sans tenir compte des accents ni de la casse', function () {
    actingAsRole('responsable');
    Address::factory()->create(['last_name' => 'Électricité Exemple SA', 'first_name' => null, 'city' => 'Develier']);
    Address::factory()->create(['last_name' => 'Muller', 'city' => 'Bassecourt']);

    $this->getJson('/api/addresses?search=electricite')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.city', 'Develier');

    // Plusieurs mots, dans n'importe quel ordre.
    $this->getJson('/api/addresses?search=develier+exemple')->assertJsonCount(1, 'data');
});

it('filtre par colonne, par type et par statut actif', function () {
    actingAsRole('responsable');
    Address::factory()->create(['last_name' => 'Alpha', 'city' => 'Delémont', 'type' => 'client']);
    Address::factory()->create(['last_name' => 'Beta', 'city' => 'Bassecourt', 'type' => 'fournisseur']);
    Address::factory()->create(['last_name' => 'Gamma', 'city' => 'Bassecourt', 'type' => 'client', 'is_active' => false]);

    $this->getJson('/api/addresses?filter[city]=basse')->assertJsonCount(2, 'data');
    $this->getJson('/api/addresses?type=fournisseur')->assertJsonCount(1, 'data');
    $this->getJson('/api/addresses?active=1')->assertJsonCount(2, 'data');
    $this->getJson('/api/addresses?sort=last_name&dir=desc')->assertJsonPath('data.0.last_name', 'Gamma');
});

it('journalise la création d\'une adresse', function () {
    actingAsRole('admin');

    $id = $this->postJson('/api/addresses', ['type' => 'client', 'last_name' => 'Journal'])->json('data.id');

    $this->assertDatabaseHas('activity_log', ['subject_type' => Address::class, 'subject_id' => $id, 'event' => 'created']);
});
