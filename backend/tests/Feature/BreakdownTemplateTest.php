<?php

use App\Models\BreakdownTemplate;
use App\Models\PriceElement;
use App\Support\BreakdownLinker;
use Database\Seeders\BreakdownTemplateSeeder;

it('charge les sous-détails types du métreur et les calcule comme dans son document', function () {
    actingAsRole('responsable');
    (new BreakdownTemplateSeeder)->run();

    expect(BreakdownTemplate::count())->toBeGreaterThan(90);
    $list = $this->getJson('/api/breakdown-templates?search=carrelage')->assertOk()->json('data');
    expect(collect($list)->pluck('name'))->toContain('Pose carrelage + fourniture');

    $template = BreakdownTemplate::where('name', 'Pose carrelage + fourniture')->first();
    $data = $this->getJson("/api/breakdown-templates/{$template->id}")->assertOk()->json('data');
    expect($data['dimension'])->toEqual(112)
        ->and($data['price_per_dimension'])->toBeTrue()
        ->and($data['lines'])->toHaveCount(6)
        ->and($data['lines'][0])->toMatchArray(['family' => 1, 'unit_cost' => 40, 'markup_percent' => 30, 'per_dimension' => true]);

    // Relance : rien n'est dupliqué.
    (new BreakdownTemplateSeeder)->run();
    expect(BreakdownTemplate::where('name', 'Pose carrelage + fourniture')->count())->toBe(1);
});

it('crée, modifie et supprime un sous-détail type (gestion seulement)', function () {
    actingAsRole('responsable');

    $created = $this->postJson('/api/breakdown-templates', [
        'group' => 'Carrelage', 'name' => 'Test', 'dimension' => 9, 'dimension_unit' => 'm²',
        'lines' => [
            ['family' => 1, 'label' => 'Pose', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 40, 'markup_percent' => 30],
            ['family' => 5, 'label' => 'Carrelette', 'quantity' => 1, 'unit_cost' => 45],
        ],
    ])->assertCreated()->json('data');
    expect($created['lines'])->toHaveCount(2);

    $kept = $created['lines'][0]['id'];
    $updated = $this->putJson("/api/breakdown-templates/{$created['id']}", [
        'name' => 'Test 2',
        'lines' => [['id' => $kept, 'family' => 1, 'label' => 'Pose', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 45, 'markup_percent' => 30]],
    ])->assertOk()->json('data');
    expect($updated['name'])->toBe('Test 2')
        ->and($updated['lines'])->toHaveCount(1)
        ->and($updated['lines'][0]['id'])->toBe($kept)
        ->and($updated['lines'][0]['unit_cost'])->toEqual(45);

    $this->postJson("/api/breakdown-templates/{$created['id']}/used")->assertOk()->assertJsonPath('data.usage_count', 1);
    $this->deleteJson("/api/breakdown-templates/{$created['id']}")->assertOk();
    $this->getJson("/api/breakdown-templates/{$created['id']}")->assertNotFound();
});

it('interdit les sous-détails types à un ouvrier', function () {
    actingAsRole('ouvrier');
    $this->getJson('/api/breakdown-templates')->assertForbidden();
});

it('applique le prix de l’élément de coûts rattaché, et le suit quand il change', function () {
    actingAsRole('responsable');
    $element = PriceElement::create(['family' => 2, 'group_code' => 'M92', 'number' => '068.755', 'description' => 'Sable de fouille 0/4', 'unit' => 'M3', 'net_price' => 10, 'regie_price' => 13]);

    // Le coût envoyé (999) est ignoré : prix net de l'élément, unité de l'élément, majoration régie / net.
    $created = $this->postJson('/api/breakdown-templates', [
        'name' => 'Fouille', 'dimension_unit' => 'm3',
        'lines' => [['family' => 2, 'price_element_id' => $element->id, 'label' => 'Sable', 'unit' => 'kg', 'quantity' => 1.1, 'unit_cost' => 999, 'markup_percent' => 0]],
    ])->assertCreated()->json('data');
    expect($created['lines'][0])->toMatchArray(['unit_cost' => 10, 'unit' => 'M3', 'markup_percent' => 30, 'label' => 'Sable'])
        ->and($created['lines'][0]['element'])->toMatchArray(['number' => '068.755', 'net_price' => 10]);

    // Le prix de l'élément change : la fiche et le chargement dans un devis donnent le nouveau prix.
    $element->update(['net_price' => 12, 'regie_price' => 15.6]);
    $this->getJson("/api/breakdown-templates/{$created['id']}")->assertOk()->assertJsonPath('data.lines.0.unit_cost', 12);
    $this->postJson("/api/breakdown-templates/{$created['id']}/used")->assertOk()->assertJsonPath('data.lines.0.unit_cost', 12)->assertJsonPath('data.lines.0.markup_percent', 30);
});

it('retrouve l’élément de coûts d’une ligne saisie en texte (rattachement automatique)', function () {
    PriceElement::create(['family' => 5, 'number' => '364.550', 'description' => 'Malaxeur', 'unit' => 'H.', 'regie_price' => 45]);
    PriceElement::create(['family' => 2, 'number' => '050.740', 'description' => 'Cote à vis', 'unit' => 'Pce', 'net_price' => 30]);
    PriceElement::create(['family' => 3, 'number' => '340.135', 'description' => 'Pelle 1,5 tonnes', 'unit' => 'H.', 'regie_price' => 95]);
    PriceElement::create(['family' => 3, 'number' => '340.140', 'description' => 'Pelle 12 tonnes', 'unit' => 'H.', 'regie_price' => 125]);
    PriceElement::create(['family' => 1, 'number' => '010.000', 'description' => 'Ouvrier qualifié', 'unit' => 'H.', 'net_price' => 52.78, 'regie_price' => 90]);
    $template = BreakdownTemplate::create(['name' => 'Test']);
    $line = fn (int $family, string $label, string $unit, float $quantity) => $template->lines()->create(['family' => $family, 'label' => $label, 'unit' => $unit, 'quantity' => $quantity, 'unit_cost' => 1, 'position' => 1]);

    expect(BreakdownLinker::match($line(5, 'Malaxeur', 'forfait', 1))['element']?->number)->toBe('364.550')
        ->and(BreakdownLinker::match($line(2, 'Vis', 'forfait', 1))['status'])->toBe('ambiguous')      // « Cote à vis » n'est pas des vis
        ->and(BreakdownLinker::match($line(3, 'Pelle 2.7 t', 'forfait', 1))['status'])->toBe('ambiguous') // 1,5 t ou 12 t : à choisir
        ->and(BreakdownLinker::match($line(6, 'Bennes', 'pce', 3))['status'])->toBe('none');

    // Main-d'œuvre : Ouvrier qualifié, en heures (jours × heures par jour).
    $labour = BreakdownLinker::match($line(1, "Main-d'œuvre (2 pers. à 0.5 J)", 'J', 1));
    expect($labour['element']?->number)->toBe('010.000')->and($labour['quantity'])->toEqual(9)->and($labour['unit'])->toBe('H.');
    $saved = BreakdownLinker::applyTo($line(1, "Main-d'œuvre (2 pers. à 0.5 J)", 'J', 1), $labour['element'], $labour['quantity'], $labour['unit']);
    expect($saved->unit_cost)->toEqual(52.78)->and($saved->markup_percent)->toEqual(70.5)->and($saved->note)->toBe("Main-d'œuvre (2 pers. à 0.5 J)");
});
