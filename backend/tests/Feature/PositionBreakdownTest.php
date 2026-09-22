<?php

use App\Models\Document;
use App\Models\PriceElement;
use App\Models\Project;

/** Devis avec une étape « 12 CARRELAGE » et une position « Carrelage sol, bloc 9 m² ». */
function breakdownPosition(): array
{
    $project = Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Salle de bain', 'status' => 'en_cours']);
    $document = Document::createForProject($project, 'devis');
    $step = $document->steps()->create(['code' => '12', 'label' => 'CARRELAGE', 'position' => 1]);
    $position = $step->positions()->create([
        'document_id' => $document->id, 'code' => '12.025', 'description' => 'Carrelage sol, bloc 9 m²',
        'unit' => 'pce', 'quantity' => 1, 'unit_price' => 1195, 'position' => 1,
    ]);

    return [$document, $position];
}

it('calcule le sous-détail de prix comme le métreur (dimension, conditionnement, majoration)', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();

    $response = $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", [
        'dimension' => 9, 'dimension_unit' => 'm²',
        'lines' => [
            // MO : 40.-/m² + 30 % = 52.-/m² × 9 = 468.-
            ['family' => 1, 'label' => 'Pose carrelage', 'unit' => 'm²', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 40, 'markup_percent' => 30],
            // MAT : 4.2 kg/m² × 9 = 37.8 kg × 1.00 = 37.80
            ['family' => 2, 'label' => 'Weber 800 pro S1', 'unit' => 'kg', 'quantity' => 4.2, 'per_dimension' => true, 'unit_cost' => 1],
            // MAT : joint 0.22 kg/m² × 9 = 1.98 kg → 2 kg entiers × 3.- = 6.-
            ['family' => 2, 'label' => 'Joint 3 mm', 'unit' => 'kg', 'quantity' => 0.22, 'per_dimension' => true, 'pack_size' => 1, 'unit_cost' => 3],
            // OUT : forfait
            ['family' => 5, 'label' => 'Carrelette', 'quantity' => 1, 'unit_cost' => 45],
        ],
    ])->assertOk();

    $data = $response->json('data.steps.0.positions.0');
    expect($data['costs'])->toHaveCount(4)
        ->and($data['costs'][0]['cost'])->toEqual(360)
        ->and($data['costs'][0]['sale'])->toEqual(468)
        ->and($data['costs'][1]['cost'])->toEqual(37.8)
        ->and($data['costs'][2]['cost'])->toEqual(6)
        ->and($data['cost_price'])->toEqual(448.8)          // 360 + 37.8 + 6 + 45
        ->and($data['calculated_price'])->toEqual(556.8)    // 468 + 37.8 + 6 + 45
        ->and($data['unit_price'])->toEqual(1195);        // le prix saisi n'est pas modifié sans apply_price
});

it('reporte le prix calculé, ramené à la dimension si demandé, et remplace les lignes', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();
    $url = "/api/documents/{$document->id}/positions/{$position->id}/breakdown";

    $first = $this->putJson($url, [
        'dimension' => 9, 'dimension_unit' => 'm²', 'price_per_dimension' => true, 'apply_price' => true,
        'lines' => [
            ['family' => 1, 'label' => 'Pose', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 40, 'markup_percent' => 30],
            ['family' => 5, 'label' => 'Carrelette', 'quantity' => 1, 'unit_cost' => 45],
        ],
    ])->assertOk()->json('data.steps.0.positions.0');

    // (468 + 45) / 9 = 57.- par m² ; coût (360 + 45) / 9 = 45.-
    expect($first['calculated_price'])->toEqual(57)
        ->and($first['unit_price'])->toEqual(57)
        ->and($first['cost_price'])->toEqual(45);

    // Une seule ligne conservée (mise à jour par id), l'autre supprimée.
    $keptId = $first['costs'][0]['id'];
    $second = $this->putJson($url, [
        'dimension' => 9, 'price_per_dimension' => true,
        'lines' => [['id' => $keptId, 'family' => 1, 'label' => 'Pose', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 50, 'markup_percent' => 0]],
    ])->assertOk()->json('data.steps.0.positions.0');

    expect($second['costs'])->toHaveCount(1)
        ->and($second['costs'][0]['id'])->toBe($keptId)
        ->and($second['calculated_price'])->toEqual(50)
        ->and($position->costs()->count())->toBe(1);

    // La modification de la ligne du devis ne peut plus écraser le prix de revient issu du sous-détail.
    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}", ['description' => 'Carrelage sol', 'cost_price' => 1])
        ->assertOk()->assertJsonPath('data.steps.0.positions.0.cost_price', 50);

    // Sans ligne : le prix calculé disparaît.
    $this->putJson($url, ['lines' => []])->assertOk()->assertJsonPath('data.steps.0.positions.0.calculated_price', null);
});

it('reprend un élément de coûts et copie le sous-détail avec la nouvelle version du devis', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();
    $element = PriceElement::create(['family' => 2, 'number' => 'M001', 'description' => 'Colle Weber', 'unit' => 'kg', 'net_price' => 1]);

    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", [
        'dimension' => 9,
        'lines' => [['family' => 2, 'price_element_id' => $element->id, 'label' => 'Colle Weber', 'unit' => 'kg', 'quantity' => 4.2, 'per_dimension' => true, 'unit_cost' => 1]],
    ])->assertOk();
    expect($element->refresh()->usage_count)->toBe(1);

    $copy = $this->postJson("/api/documents/{$document->id}/duplicate")->assertCreated()->json('data');
    expect($copy['number'])->toBe('2853-055-DE.2')
        ->and($copy['steps'][0]['positions'][0]['costs'])->toHaveCount(1)
        ->and($copy['steps'][0]['positions'][0]['costs'][0]['price_element_id'])->toBe($element->id)
        ->and($copy['steps'][0]['positions'][0]['cost_price'])->toEqual(37.8);
});

it('refuse le sous-détail sur une position non chiffrée et valide les familles', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();
    $title = $document->steps()->first()->positions()->create(['document_id' => $document->id, 'kind' => 'title', 'description' => 'Sols', 'position' => 2]);

    $this->putJson("/api/documents/{$document->id}/positions/{$title->id}/breakdown", ['lines' => []])->assertNotFound();
    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", ['lines' => [['family' => 9, 'label' => 'x', 'quantity' => 1, 'unit_cost' => 1]]])
        ->assertStatus(422);
});

it('interdit le sous-détail de prix à un ouvrier', function () {
    actingAsRole('ouvrier');
    [$document, $position] = breakdownPosition();

    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", ['lines' => []])->assertForbidden();
});
