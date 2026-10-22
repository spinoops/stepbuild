<?php

use App\Models\Collaborator;
use App\Models\DailyReport;
use App\Models\Document;
use App\Models\Project;
use App\Models\WorkType;

it('compare le devis aux rapports journaliers étape par étape, en vert ou en rouge', function () {
    actingAsRole('responsable');
    $project = Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Salle de bain', 'status' => 'adjuge']);
    $quote = Document::createForProject($project, 'devis', null, ['status' => 'accepte']);
    $demolition = $quote->steps()->create(['code' => '03', 'label' => 'DEMONTAGE', 'position' => 1]);
    $tiling = $quote->steps()->create(['code' => '12', 'label' => 'CARRELAGE', 'position' => 2]);
    $painting = $quote->steps()->create(['code' => '13', 'label' => 'PEINTURE', 'position' => 3]);
    // DEMONTAGE : 10 h vendues 90.-, prix de revient 55.- → budget 550.- (prix de revient), 10 h prévues.
    $demolition->positions()->create(['document_id' => $quote->id, 'description' => 'Ouvrier qualifié', 'unit' => 'H.', 'quantity' => 10, 'unit_price' => 90, 'cost_price' => 55, 'position' => 1]);
    // CARRELAGE : sans prix de revient → budget = vente 1 200.- ; sous-détail de 9 h MO → heures prévues 9.
    $pose = $tiling->positions()->create(['document_id' => $quote->id, 'description' => 'Pose carrelage', 'unit' => 'm²', 'quantity' => 9, 'unit_price' => 100, 'position' => 1]);
    $tiling->positions()->create(['document_id' => $quote->id, 'description' => 'Option', 'unit' => 'm²', 'quantity' => 1, 'unit_price' => 300, 'is_optional' => true, 'position' => 2]);
    $pose->syncBreakdown([['family' => 1, 'label' => 'Carreleur', 'unit' => 'h', 'quantity' => 1, 'per_dimension' => true, 'unit_cost' => 60]]);
    $quote->recalculate();
    $pierre = Collaborator::create(['number' => '101', 'last_name' => 'Martin', 'first_name' => 'Pierre', 'hourly_cost' => 50, 'regie_price' => 50]);
    $saturday = WorkType::create(['code' => '1100', 'label' => 'Samedi', 'unit' => 'h']);

    $first = DailyReport::createForProject($project, null, ['date' => '2026-08-10']);
    $first->hours()->create(['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 8, 'hourly_cost' => 50]);
    $first->hours()->create(['collaborator_id' => $pierre->id, 'work_type_id' => $saturday->id, 'quantity' => 2, 'hourly_cost' => 50]);
    $first->items()->create(['family' => 2, 'document_step_id' => $tiling->id, 'label' => 'Colle', 'unit' => 'kg', 'quantity' => 2, 'unit_cost' => 10]);
    $first->recalculate();
    $second = DailyReport::createForProject($project, null, ['date' => '2026-08-11', 'status' => 'en_controle']);
    $second->hours()->create(['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 4, 'hourly_cost' => 50]);
    $second->recalculate();

    $data = $this->getJson("/api/cost-control?project_id={$project->id}")->assertOk()->json();
    expect($data['document']['number'])->toBe('2853-055-DE.1')
        ->and($data['reports']['count'])->toBe(2)
        ->and(collect($data['steps'])->pluck('label')->all())->toBe(['DEMONTAGE', 'CARRELAGE', 'PEINTURE']);

    // DEMONTAGE : 12 h × 50 = 600.- de coût brut pour un budget de 550.- → dépassé.
    $row = $data['steps'][0];
    expect($row['planned'])->toMatchArray(['sale' => 900, 'cost' => 550, 'hours' => 10, 'budget' => 550, 'budget_basis' => 'cost'])
        ->and($row['actual'])->toMatchArray(['hours' => 12, 'cost' => 600])
        ->and($row['variance'])->toEqual(-50)
        ->and($row['percent'])->toEqual(109.1)
        ->and($row['status'])->toBe('over')
        ->and($row['reports'])->toHaveCount(2)
        ->and($row['reports'][0])->toMatchArray(['number' => '001', 'hours' => 8, 'cost' => 400]);

    // CARRELAGE : budget = vente hors option (sous-détail reporté : 540.-), 9 h prévues, 20.- de colle → ok.
    $row = $data['steps'][1];
    expect($row['planned']['hours'])->toEqual(9)
        ->and($row['planned']['budget_basis'])->toBe('cost')   // le sous-détail a donné un prix de revient
        ->and($row['actual'])->toMatchArray(['hours' => 0, 'cost' => 20])
        ->and($row['status'])->toBe('ok');

    // PEINTURE : rien de prévu, rien de dépensé.
    expect($data['steps'][2]['status'])->toBe('none');

    // Le samedi (type de travail) est hors devis ; les totaux consolident tout.
    expect($data['others'])->toHaveCount(1)
        ->and($data['others'][0]['actual']['hours'])->toEqual(2)
        ->and($data['others'][0]['status'])->toBe('over')
        ->and($data['totals']['actual']['hours'])->toEqual(14)
        ->and($data['totals']['actual']['cost'])->toEqual(720)
        ->and($data['totals']['planned']['hours'])->toEqual(19);

    // Filtre sur les rapports en contrôle : seules les 4 h du second rapport restent.
    $filtered = $this->getJson("/api/cost-control?project_id={$project->id}&status=en_controle")->assertOk()->json();
    expect($filtered['steps'][0]['actual']['hours'])->toEqual(4)->and($filtered['steps'][0]['status'])->toBe('ok');

    // Marge sur une étape : prix client = coût brut + 40 %, arrondi à 5 ct ; le rapport facturé reste verrouillé.
    expect($data['steps'][0]['margin_percent'])->toEqual(0.0);   // tarif régie = coût brut : client = brut tant que rien n'est fixé
    $second->update(['status' => 'facture']);
    $applied = $this->postJson('/api/cost-control/margin', ['project_id' => $project->id, 'scope' => 'step', 'document_step_id' => $demolition->id, 'markup_percent' => 40])
        ->assertOk()->json();
    expect($applied['updated'])->toBe(1)->and($applied['locked'])->toBe(1)
        ->and($first->hours()->where('document_step_id', $demolition->id)->value('client_price'))->toEqual(70)   // 50 × 1.4
        ->and($applied['report']['steps'][0]['actual']['client'])->toEqual(8 * 70 + 4 * 50)
        ->and($applied['report']['steps'][0]['locked_cost'])->toEqual(200)
        ->and($applied['report']['steps'][0]['margin_percent'])->toEqual(26.7);  // (760 − 600) / 600
    // Sur tout le chantier (hors devis compris) : la colle passe à 10 × 1.3 = 13.-, le samedi à 65.-.
    $all = $this->postJson('/api/cost-control/margin', ['project_id' => $project->id, 'scope' => 'all', 'markup_percent' => 30])->assertOk()->json();
    expect($all['updated'])->toBe(3)
        ->and($first->items()->first()->client_price)->toEqual(13)
        ->and($all['report']['others'][0]['actual']['client'])->toEqual(130);
    $this->postJson('/api/cost-control/margin', ['project_id' => $project->id, 'scope' => 'step', 'markup_percent' => 10])->assertStatus(422);

    // Réservé à la gestion ; projet obligatoire.
    $this->getJson('/api/cost-control')->assertStatus(422);
    actingAsRole('ouvrier');
    $this->getJson("/api/cost-control?project_id={$project->id}")->assertForbidden();
    $this->postJson('/api/cost-control/margin', ['project_id' => $project->id, 'scope' => 'all', 'markup_percent' => 10])->assertForbidden();
});
