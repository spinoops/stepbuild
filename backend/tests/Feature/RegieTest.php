<?php

use App\Models\Collaborator;
use App\Models\CollaboratorAbsence;
use App\Models\DailyReport;
use App\Models\Document;
use App\Models\PriceElement;
use App\Models\Project;
use App\Models\Setting;
use App\Models\WorkType;

/** Projet avec devis accepté (deux étapes), position régie « Chef d'équipe », deux collaborateurs. */
function regieFixture(): array
{
    $project = Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Salle de bain', 'status' => 'adjuge']);
    $quote = Document::createForProject($project, 'devis', null, ['status' => 'accepte']);
    $demolition = $quote->steps()->create(['code' => '03', 'label' => 'DEMONTAGE', 'position' => 1]);
    $tiling = $quote->steps()->create(['code' => '12', 'label' => 'CARRELAGE', 'position' => 2]);
    $foreman = PriceElement::create(['family' => 1, 'number' => '010.010', 'description' => 'Chef d’équipe', 'unit' => 'H.', 'supplier_price' => 58, 'regie_price' => 98]);
    $worker = PriceElement::create(['family' => 1, 'number' => '010.000', 'description' => 'Ouvrier qualifié', 'unit' => 'H.', 'supplier_price' => 52.78, 'regie_price' => 90]);
    $pierre = Collaborator::create(['number' => '101', 'last_name' => 'Martin', 'first_name' => 'Pierre', 'hourly_cost' => 52.78, 'regie_element_id' => $foreman->id]);
    $luca = Collaborator::create(['number' => '102', 'last_name' => 'Rossi', 'first_name' => 'Luca', 'hourly_cost' => 50, 'regie_element_id' => $worker->id, 'regie_price' => 85]);

    return compact('project', 'quote', 'demolition', 'tiling', 'pierre', 'luca', 'foreman', 'worker');
}

it('fixe les trois niveaux de prix des lignes : brut, régie (tarifs), client', function () {
    actingAsRole('responsable');
    ['project' => $project, 'demolition' => $demolition, 'pierre' => $pierre, 'luca' => $luca] = regieFixture();
    $glue = PriceElement::create(['family' => 2, 'number' => 'M001', 'description' => 'Colle', 'unit' => 'kg', 'net_price' => 10, 'regie_price' => 14]);
    $sand = PriceElement::create(['family' => 2, 'number' => 'M002', 'description' => 'Sable', 'unit' => 'To', 'net_price' => 38.1]);

    $report = DailyReport::createForProject($project, null, ['date' => '2026-08-10']);
    $url = "/api/daily-reports/{$report->id}";
    // Pierre : position régie 98.- ; Luca : tarif propre 85.- prioritaire sur sa position (90.-).
    $this->putJson("$url/hours", ['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 2])->assertOk();
    $data = $this->putJson("$url/hours", ['collaborator_id' => $luca->id, 'document_step_id' => $demolition->id, 'quantity' => 1])->assertOk()->json('data');
    $pierreLine = collect($data['hours'])->firstWhere('collaborator_id', $pierre->id);
    expect($pierreLine['hourly_cost'])->toEqual(52.78)
        ->and($pierreLine['regie_price'])->toEqual(98)
        ->and($pierreLine['client_price'])->toEqual(98)
        ->and($pierreLine['regie_amount'])->toEqual(196)
        ->and(collect($data['hours'])->firstWhere('collaborator_id', $luca->id)['regie_price'])->toEqual(85)
        ->and($data['total_amount'])->toEqual(155.56)   // 2 × 52.78 + 50
        ->and($data['total_regie'])->toEqual(281)       // 196 + 85
        ->and($data['total_client'])->toEqual(281);

    // Colle : prix régie de l'élément ; sable : coût brut + 30 % arrondi à 5 ct (38.1 × 1.3 = 49.53 → 49.55).
    $this->postJson("$url/items", ['family' => 2, 'price_element_id' => $glue->id, 'quantity' => 2])->assertCreated();
    $data = $this->postJson("$url/items", ['family' => 2, 'price_element_id' => $sand->id, 'quantity' => 1])->assertCreated()->json('data');
    expect($data['items'][0]['regie_price'])->toEqual(14)
        ->and($data['items'][1]['regie_price'])->toEqual(49.55)
        ->and($data['total_regie'])->toEqual(281 + 28 + 49.55);

    // La majoration se règle dans la configuration.
    Setting::setMany(['regie_markup_percent' => '50']);
    $data = $this->postJson("$url/items", ['family' => 5, 'label' => 'Carrelette', 'quantity' => 1, 'unit_cost' => 10])->assertCreated()->json('data');
    expect($data['items'][2]['regie_price'])->toEqual(15);
});

it('liste les lignes de régie du projet et permet de modifier chaque niveau jusqu’à la facturation', function () {
    actingAsRole('responsable');
    ['project' => $project, 'demolition' => $demolition, 'pierre' => $pierre] = regieFixture();
    $meal = WorkType::create(['code' => '1110', 'label' => 'Repas', 'unit' => 'nb']);
    $report = DailyReport::createForProject($project, null, ['date' => '2026-08-10']);
    $report->hours()->create(['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 8, 'hourly_cost' => 52.78]);
    $report->hours()->create(['collaborator_id' => $pierre->id, 'work_type_id' => $meal->id, 'quantity' => 1, 'hourly_cost' => 52.78]);
    $item = $report->items()->create(['family' => 2, 'label' => 'Colle', 'unit' => 'kg', 'quantity' => 2, 'unit_cost' => 10]);
    $report->recalculate();
    $other = DailyReport::createForProject($project, null, ['date' => '2026-08-11', 'is_regie' => false]);
    $other->hours()->create(['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 1, 'hourly_cost' => 52.78]);

    // Les repas (hors heures) et les rapports hors régie ne sont pas listés.
    $response = $this->getJson("/api/regie/lines?project_id={$project->id}")->assertOk();
    expect($response->json('data'))->toHaveCount(2)
        ->and($response->json('data.0.kind'))->toBe('hour')
        ->and($response->json('data.0.label'))->toBe('Martin Pierre')
        ->and($response->json('data.0.regie_label'))->toBe('Chef d’équipe')
        ->and($response->json('data.0.regie_price'))->toEqual(98)
        ->and($response->json('data.1.regie_price'))->toEqual(13)
        ->and($response->json('totals.hours'))->toEqual(8)
        ->and($response->json('totals.cost'))->toEqual(442.24)
        ->and($response->json('totals.regie'))->toEqual(784 + 26)
        ->and($response->json('reports'))->toHaveCount(1);
    expect($this->getJson("/api/regie/lines?project_id={$project->id}&all=1")->json('data'))->toHaveCount(3);

    // Le prix client suit le prix régie tant qu'il n'a pas été fixé à part.
    $hourId = $response->json('data.0.id');
    $this->putJson("/api/regie/lines/hour/$hourId", ['regie_price' => 100])->assertOk()
        ->assertJsonPath('data.client_price', 100)
        ->assertJsonPath('data.client_amount', 800)
        ->assertJsonPath('report.total_client', 826);
    $this->putJson("/api/regie/lines/hour/$hourId", ['client_price' => 95])->assertOk()->assertJsonPath('data.client_price', 95);
    $this->putJson("/api/regie/lines/hour/$hourId", ['regie_price' => 110])->assertOk()->assertJsonPath('data.client_price', 95);
    $this->putJson("/api/regie/lines/item/{$item->id}", ['cost_price' => 12, 'client_price' => 20])->assertOk()
        ->assertJsonPath('data.cost_amount', 24)
        ->assertJsonPath('data.client_amount', 40);
    expect($report->refresh()->total_client)->toEqual(760 + 40);

    // Retour aux tarifs : régie et client repartent des tarifs actuels.
    $pierre->update(['regie_price' => 99]);
    $this->postJson('/api/regie/apply-tariffs', ['project_id' => $project->id])->assertOk()->assertJsonPath('updated', 2);
    $this->getJson("/api/regie/lines?project_id={$project->id}")->assertOk()
        ->assertJsonPath('data.0.regie_price', 99)
        ->assertJsonPath('data.0.client_price', 99);

    // Facturé : verrouillé.
    $report->update(['status' => 'facture']);
    $this->putJson("/api/regie/lines/hour/$hourId", ['client_price' => 1])->assertForbidden();
    $this->postJson('/api/regie/apply-tariffs', ['project_id' => $project->id])->assertOk()->assertJsonPath('updated', 1);

    // Jamais pour un ouvrier.
    actingAsRole('ouvrier');
    $this->getJson("/api/regie/lines?project_id={$project->id}")->assertForbidden();
    $this->getJson('/api/hours-control')->assertForbidden();
});

it('construit le contrôle des heures : matrice projets × jours, absences, validation du mois', function () {
    actingAsRole('responsable');
    ['project' => $project, 'demolition' => $demolition, 'tiling' => $tiling, 'pierre' => $pierre, 'luca' => $luca] = regieFixture();
    $other = Project::create(['number' => '2800-001', 'designation1' => 'Muller - Maçonnerie', 'status' => 'adjuge']);
    $otherStep = Document::createForProject($other, 'devis')->steps()->create(['code' => '07', 'label' => 'MAÇONNERIE', 'position' => 1]);
    $training = WorkType::create(['code' => '1150', 'label' => 'Formation', 'unit' => 'h']);
    $meal = WorkType::create(['code' => '1110', 'label' => 'Repas', 'unit' => 'nb']);

    $make = function (Project $p, string $date, string $status, array $lines) {
        $report = DailyReport::createForProject($p, null, ['date' => $date, 'status' => $status]);
        foreach ($lines as [$collaborator, $step, $type, $hours]) {
            $report->hours()->create(['collaborator_id' => $collaborator->id, 'document_step_id' => $step?->id, 'work_type_id' => $type?->id, 'quantity' => $hours, 'hourly_cost' => 50]);
        }

        return $report->recalculate();
    };
    $make($project, '2026-08-10', 'en_controle', [[$pierre, $demolition, null, 4], [$pierre, $tiling, null, 5], [$luca, $demolition, null, 9]]);
    $make($project, '2026-08-11', 'en_cours', [[$pierre, $demolition, null, 9], [$pierre, null, $meal, 1]]);
    $make($other, '2026-08-11', 'facture', [[$pierre, $otherStep, null, 2]]);
    $make($other, '2026-08-12', 'en_cours', [[$pierre, null, $training, 8]]);
    $make($other, '2026-09-01', 'en_cours', [[$pierre, $otherStep, null, 9]]);

    // Absences : une semaine de vacances (jours ouvrés seulement), puis un jour effacé.
    $this->postJson("/api/collaborators/{$pierre->id}/absences", ['from' => '2026-08-17', 'to' => '2026-08-23', 'type' => 'vacances'])
        ->assertOk()->assertJsonPath('saved', 5);
    $this->postJson("/api/collaborators/{$pierre->id}/absences", ['from' => '2026-08-19', 'type' => 'vacances', 'hours' => 0])->assertOk()->assertJsonPath('saved', 0);
    expect(CollaboratorAbsence::where('collaborator_id', $pierre->id)->count())->toBe(4)
        ->and(CollaboratorAbsence::first()->hours)->toEqual(9);

    $summary = $this->getJson('/api/hours-control?month=2026-08')->assertOk();
    $pierreRow = collect($summary->json('data'))->firstWhere('id', $pierre->id);
    expect($pierreRow['hours'])->toEqual(28)        // 4 + 5 + 9 + 2 + 8 (septembre exclu, repas exclu)
        ->and($pierreRow['pending'])->toBe(2)
        ->and($pierreRow['absence_hours'])->toEqual(36)
        ->and(collect($summary->json('data'))->firstWhere('id', $luca->id)['hours'])->toEqual(9);

    $matrix = $this->getJson("/api/hours-control/{$pierre->id}?month=2026-08")->assertOk()->json('data');
    expect($matrix['days'])->toBe(31)
        ->and($matrix['projects'])->toHaveCount(2)
        ->and($matrix['projects'][0]['number'])->toBe('2800-001')
        ->and($matrix['projects'][1]['cells']['10']['hours'])->toEqual(9)
        ->and($matrix['projects'][1]['cells']['10']['status'])->toBe('en_controle')
        ->and($matrix['projects'][1]['cells']['11']['status'])->toBe('en_cours')
        ->and($matrix['projects'][0]['cells']['11']['status'])->toBe('facture')
        ->and($matrix['projects'][0]['cells']['12']['hours'])->toEqual(8)
        ->and($matrix['projects'][0]['total'])->toEqual(10)
        ->and($matrix['absences'])->toHaveCount(4)
        ->and($matrix['absences']['17']['type'])->toBe('vacances');

    // Validation : les rapports en cours du mois où Pierre a des heures passent en contrôle.
    $this->postJson("/api/hours-control/{$pierre->id}/validate?month=2026-08")->assertOk()->assertJsonPath('updated', 2);
    expect(DailyReport::where('status', 'en_cours')->count())->toBe(1);   // celui de septembre
    $this->getJson('/api/hours-control?month=2026-13')->assertStatus(422);
});

it('gère les types de travail de la grille des heures', function () {
    actingAsRole('responsable');
    $type = $this->postJson('/api/work-types', ['code' => '1011', 'label' => 'Travail du samedi', 'unit' => 'h'])->assertCreated()->json('data');
    $this->postJson('/api/work-types', ['code' => '1011', 'label' => 'Doublon'])->assertStatus(422);
    $this->putJson("/api/work-types/{$type['id']}", ['label' => 'Samedi', 'unit' => 'xx'])->assertStatus(422);
    $this->putJson("/api/work-types/{$type['id']}", ['label' => 'Samedi', 'is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
    expect($this->getJson('/api/work-types')->json('data'))->toHaveCount(0)
        ->and($this->getJson('/api/work-types?all=1')->json('data'))->toHaveCount(1);
    $this->deleteJson("/api/work-types/{$type['id']}")->assertOk();
    expect(WorkType::count())->toBe(0);
});

it('réserve les réglages de régie à la gestion', function () {
    expect($this->getJson('/api/settings')->assertOk()->json())->not->toHaveKey('regie_markup_percent');
    actingAsRole('responsable');
    expect($this->getJson('/api/settings')->json('regie_markup_percent'))->toBe('30');
    actingAsRole('ouvrier');
    expect($this->getJson('/api/settings')->json())->not->toHaveKey('work_day_hours');
});
