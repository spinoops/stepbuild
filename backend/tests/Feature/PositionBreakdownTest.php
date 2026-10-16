<?php

use App\Models\Document;
use App\Models\PriceElement;
use App\Models\Project;
use App\Support\DocumentPrint;

/** Devis avec une étape « 12 CARRELAGE » et une position « Carrelage sol » de 9 m². */
function breakdownPosition(): array
{
    $project = Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Salle de bain', 'status' => 'en_cours']);
    $document = Document::createForProject($project, 'devis');
    $step = $document->steps()->create(['code' => '12', 'label' => 'CARRELAGE', 'position' => 1]);
    $position = $step->positions()->create([
        'document_id' => $document->id, 'code' => '12.025', 'description' => 'Carrelage sol',
        'unit' => 'm²', 'quantity' => 9, 'unit_price' => 1195, 'position' => 1,
    ]);

    return [$document, $position];
}

it('calcule le sous-détail comme le métreur : lignes × quantité, conditionnement, majoration, prix à l’unité', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();

    $response = $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", [
        'lines' => [
            // MO : 40.-/m² + 30 % = 52.-/m² × 9 m² = 468.-
            ['family' => 1, 'label' => 'Pose carrelage', 'unit' => 'm²', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 40, 'markup_percent' => 30],
            // MAT : 4.2 kg/m² × 9 = 37.8 kg × 1.00 = 37.80
            ['family' => 2, 'label' => 'Weber 800 pro S1', 'unit' => 'kg', 'quantity' => 4.2, 'per_dimension' => true, 'unit_cost' => 1],
            // MAT : joint 0.22 kg/m² × 9 = 1.98 kg → 2 kg entiers × 3.- = 6.-
            ['family' => 2, 'label' => 'Joint 3 mm', 'unit' => 'kg', 'quantity' => 0.22, 'per_dimension' => true, 'pack_size' => 1, 'unit_cost' => 3],
            // OUT : forfait
            ['family' => 5, 'label' => 'Carrelette', 'quantity' => 1, 'unit_cost' => 45],
        ],
    ])->assertOk();

    // Le sous-détail chiffre la ligne entière (556.80 pour 9 m²) ; le prix unitaire en découle.
    $data = $response->json('data.steps.0.positions.0');
    expect($data['costs'])->toHaveCount(4)
        ->and($data['costs'][0]['cost'])->toEqual(360)
        ->and($data['costs'][0]['sale'])->toEqual(468)
        ->and($data['costs'][1]['cost'])->toEqual(37.8)
        ->and($data['costs'][2]['cost'])->toEqual(6)
        ->and($data['cost_price'])->toEqual(49.87)         // (360 + 37.8 + 6 + 45) / 9
        ->and($data['calculated_price'])->toEqual(61.87)   // (468 + 37.8 + 6 + 45) / 9
        ->and($data['unit_price'])->toEqual(61.87)
        ->and($data['amount'])->toEqual(556.83);           // 61.87 × 9
});

it('divise le total du sous-détail par la quantité de la ligne, et suit un changement de quantité', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();
    $url = "/api/documents/{$document->id}/positions/{$position->id}/breakdown";

    // Forfait de 1 000.- pour la ligne : à 10 m², le prix est de 100.-/m².
    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}", ['quantity' => 10])->assertOk();
    $first = $this->putJson($url, [
        'lines' => [['family' => 6, 'label' => 'Sous-traitant', 'quantity' => 1, 'unit_cost' => 1000]],
    ])->assertOk()->json('data.steps.0.positions.0');
    expect($first['calculated_price'])->toEqual(100)
        ->and($first['unit_price'])->toEqual(100)
        ->and($first['amount'])->toEqual(1000);

    // La quantité passe à 4 : le même forfait vaut 250.-/m² ; le prix saisi par la ligne est ignoré.
    $changed = $this->putJson("/api/documents/{$document->id}/positions/{$position->id}", ['quantity' => 4, 'unit_price' => 1])
        ->assertOk()->json('data.steps.0.positions.0');
    expect($changed['unit_price'])->toEqual(250)
        ->and($changed['calculated_price'])->toEqual(250)
        ->and($changed['amount'])->toEqual(1000);

    // Une ligne « × Qté » suit aussi la quantité : 40.- + 30 % par m² → 52.-/m² quelle que soit la quantité.
    $keptId = $first['costs'][0]['id'];
    $second = $this->putJson($url, [
        'lines' => [
            ['id' => $keptId, 'family' => 6, 'label' => 'Sous-traitant', 'quantity' => 1, 'unit_cost' => 1000],
            ['family' => 1, 'label' => 'Pose', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 40, 'markup_percent' => 30],
        ],
    ])->assertOk()->json('data.steps.0.positions.0');
    expect($second['costs'])->toHaveCount(2)
        ->and($second['costs'][1]['id'])->toBe($keptId)   // rangées par famille : MO avant ST
        ->and($second['costs'][0]['sale'])->toEqual(208)   // 52 × 4
        ->and($second['calculated_price'])->toEqual(302)   // (1000 + 208) / 4
        ->and($position->costs()->count())->toBe(2);

    // La ligne du devis ne peut plus écraser le prix de revient ni le prix de vente issus du sous-détail.
    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}", ['description' => 'Carrelage sol', 'cost_price' => 1, 'unit_price' => 2])
        ->assertOk()
        ->assertJsonPath('data.steps.0.positions.0.cost_price', 290)
        ->assertJsonPath('data.steps.0.positions.0.unit_price', 302);

    // Sans ligne : le prix calculé disparaît, le prix redevient libre.
    $this->putJson($url, ['lines' => []])->assertOk()->assertJsonPath('data.steps.0.positions.0.calculated_price', null);
    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}", ['unit_price' => 2])
        ->assertOk()->assertJsonPath('data.steps.0.positions.0.unit_price', 2);
});

it('reprend un élément de coûts et copie le sous-détail avec la nouvelle version du devis', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();
    $element = PriceElement::create(['family' => 2, 'number' => 'M001', 'description' => 'Colle Weber', 'unit' => 'kg', 'net_price' => 1]);

    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", [
        'lines' => [['family' => 2, 'price_element_id' => $element->id, 'label' => 'Colle Weber', 'unit' => 'kg', 'quantity' => 4.2, 'per_dimension' => true, 'unit_cost' => 1]],
    ])->assertOk();
    expect($element->refresh()->usage_count)->toBe(1);

    $copy = $this->postJson("/api/documents/{$document->id}/duplicate")->assertCreated()->json('data');
    expect($copy['number'])->toBe('2853-055-DE.2')
        ->and($copy['steps'][0]['positions'][0]['costs'])->toHaveCount(1)
        ->and($copy['steps'][0]['positions'][0]['costs'][0]['price_element_id'])->toBe($element->id)
        ->and($copy['steps'][0]['positions'][0]['cost_price'])->toEqual(4.2);   // 37.80 pour 9 m²
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

it('imprime les sous-détails et sans prix sur demande, et respecte les sauts de page', function () {
    actingAsRole('responsable');
    [$document, $position] = breakdownPosition();
    $this->putJson("/api/documents/{$document->id}/positions/{$position->id}/breakdown", [
        'lines' => [['family' => 1, 'label' => 'Pose carrelage', 'unit' => 'm²', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 40, 'markup_percent' => 30]],
    ])->assertOk();
    $this->postJson("/api/documents/{$document->id}/positions", ['document_step_id' => $position->document_step_id, 'kind' => 'pagebreak', 'description' => '-'])
        ->assertCreated()->assertJsonPath('data.steps.0.positions.1.kind', 'pagebreak');

    $steps = DocumentPrint::steps($document->fresh(), true);
    expect($steps[0]['rows'][0]['costs'][0])->toMatchArray(['family' => 'MO', 'label' => 'Pose carrelage', 'quantity' => 9.0, 'sale' => 468.0])
        ->and($steps[0]['rows'][1]['kind'])->toBe('pagebreak');

    $plain = $this->get("/api/documents/{$document->id}/pdf")->assertOk();
    $detailed = $this->get("/api/documents/{$document->id}/pdf?breakdown=1&prices=0")->assertOk();
    expect($plain->headers->get('content-type'))->toBe('application/pdf')
        ->and($detailed->headers->get('content-type'))->toBe('application/pdf');
});
