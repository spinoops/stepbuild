<?php

use App\Models\Collaborator;

beforeEach(function () {
    Collaborator::create(['number' => '101', 'last_name' => 'Martin', 'first_name' => 'Pierre', 'hourly_cost' => 52.78]);
    Collaborator::create(['number' => '102', 'last_name' => 'Rossi', 'first_name' => 'Luca', 'hourly_cost' => 48]);
    Collaborator::create(['number' => '103', 'last_name' => 'Aubry', 'first_name' => 'Marc', 'hourly_cost' => 61.5]);
});

it('ne laisse pas un ouvrier deviner les tarifs par filtre ou tri sur hourly_cost', function () {
    actingAsRole('ouvrier');

    // Le filtre sur une colonne de prix est ignoré : tout le monde reste listé.
    $filtered = $this->getJson('/api/collaborators?filter[hourly_cost]=52')->assertOk()->json('data');
    expect($filtered)->toHaveCount(3);

    // Le tri sur une colonne de prix est ignoré : ordre par nom (défaut), pas par tarif croissant.
    $sorted = $this->getJson('/api/collaborators?sort=hourly_cost&dir=asc')->assertOk()->json('data.*.last_name');
    expect($sorted)->toBe(['Aubry', 'Martin', 'Rossi']);

    // Et aucun montant dans la réponse.
    expect($filtered[0])->not->toHaveKey('hourly_cost')->not->toHaveKey('regie_price');
});

it('laisse la gestion filtrer et trier sur le tarif horaire', function () {
    actingAsRole('responsable');

    expect($this->getJson('/api/collaborators?filter[hourly_cost]=52')->assertOk()->json('data.*.last_name'))->toBe(['Martin']);
    expect($this->getJson('/api/collaborators?sort=hourly_cost&dir=asc')->assertOk()->json('data.*.last_name'))->toBe(['Rossi', 'Martin', 'Aubry']);
});
