<?php

use App\Models\BreakdownTemplate;
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
