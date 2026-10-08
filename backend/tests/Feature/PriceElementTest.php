<?php

use App\Models\PriceElement;

function makeElement(array $attributes = []): PriceElement
{
    return PriceElement::create(array_merge([
        'family' => 2,
        'group_code' => 'M10',
        'number' => '100.000',
        'description' => 'Ciment CEM II 25 kg',
        'unit' => 'Sac',
        'supplier_price' => 9.90,
    ], $attributes));
}

it('interdit les listes de prix à un ouvrier', function () {
    actingAsRole('ouvrier');

    $this->getJson('/api/price-elements')->assertForbidden();
    $this->getJson('/api/price-elements/groups')->assertForbidden();
});

it('filtre par famille et par groupe', function () {
    actingAsRole('responsable');
    makeElement();
    makeElement(['number' => '100.010', 'description' => 'Sable 0-4 mm', 'group_code' => 'M20']);
    makeElement(['family' => 1, 'group_code' => 'S10', 'number' => '010.000', 'description' => 'Ouvrier qualifié']);

    $this->getJson('/api/price-elements?family=2')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/price-elements?family=2&group=M20')->assertJsonCount(1, 'data');
    $this->getJson('/api/price-elements/groups?family=2')
        ->assertOk()
        ->assertJsonPath('data.0.code', 'M10')
        ->assertJsonPath('data.0.total', 1)
        ->assertJsonCount(2, 'data');
});

it('crée, modifie et supprime un élément de coût', function () {
    actingAsRole('responsable');

    $id = $this->postJson('/api/price-elements', [
        'family' => 3,
        'group_code' => 'E10',
        'number' => '300.000',
        'description' => 'Mini-pelle 1.8 t',
        'unit' => 'H.',
        'supplier_price' => 35,
        'regie_price' => 55,
    ])->assertCreated()->assertJsonPath('data.unit_factor', 1)->json('data.id');

    $this->putJson("/api/price-elements/{$id}", [
        'family' => 3,
        'number' => '300.000',
        'description' => 'Mini-pelle 1.8 t',
        'regie_price' => 60,
    ])->assertOk()->assertJsonPath('data.regie_price', 60);

    $this->deleteJson("/api/price-elements/{$id}")->assertOk();
    $this->assertSoftDeleted('price_elements', ['id' => $id]);
});

it('valide la famille et les prix (422)', function () {
    actingAsRole('admin');

    $this->postJson('/api/price-elements', ['family' => 9, 'number' => '', 'description' => '', 'supplier_price' => 'abc'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['family', 'number', 'description', 'supplier_price']);
});

it('journalise un changement de prix', function () {
    actingAsRole('admin');
    $element = makeElement();

    $this->putJson("/api/price-elements/{$element->id}", [
        'family' => 2, 'number' => '100.000', 'description' => 'Ciment CEM II 25 kg', 'supplier_price' => 11.50,
    ])->assertOk();

    $this->assertDatabaseHas('activity_log', [
        'subject_type' => PriceElement::class, 'subject_id' => $element->id, 'event' => 'updated',
    ]);
});

it('date l\'élément à chaque changement de prix (« Prix du »)', function () {
    $this->travelTo('2026-10-08 10:00:00');
    $element = makeElement();
    expect($element->price_updated_at?->toDateString())->toBe('2026-10-08');

    $this->travelTo('2026-11-02 10:00:00');
    $element->update(['description' => 'Autre libellé']);
    expect($element->fresh()->price_updated_at->toDateString())->toBe('2026-10-08');

    $element->update(['regie_price' => 12.9]);
    expect($element->fresh()->price_updated_at->toDateString())->toBe('2026-11-02');

    actingAsRole('responsable');
    $this->getJson('/api/price-elements?family=2')->assertOk()->assertJsonPath('data.0.price_updated_at', '2026-11-02');
});
