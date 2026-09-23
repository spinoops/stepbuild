<?php

use App\Models\Collaborator;
use App\Models\DailyReport;
use App\Models\DailyReportFile;
use App\Models\Document;
use App\Models\PriceElement;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/** Projet avec un devis (deux étapes) et deux collaborateurs. */
function reportFixture(): array
{
    $project = Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Salle de bain', 'status' => 'en_cours']);
    $quote = Document::createForProject($project, 'devis');
    $demolition = $quote->steps()->create(['code' => '03', 'label' => 'DEMONTAGE', 'position' => 1]);
    $tiling = $quote->steps()->create(['code' => '12', 'label' => 'CARRELAGE', 'position' => 2]);
    $pierre = Collaborator::create(['number' => '101', 'last_name' => 'Martin', 'first_name' => 'Pierre', 'hourly_cost' => 52.78]);
    $luca = Collaborator::create(['number' => '102', 'last_name' => 'Rossi', 'first_name' => 'Luca', 'hourly_cost' => 50]);

    return compact('project', 'quote', 'demolition', 'tiling', 'pierre', 'luca');
}

it('crée un rapport numéroté, rattaché au devis du projet, et calcule les heures et le coût', function () {
    actingAsRole('responsable');
    ['project' => $project, 'quote' => $quote, 'demolition' => $demolition, 'pierre' => $pierre, 'luca' => $luca] = reportFixture();
    $meal = WorkType::create(['code' => '1110', 'label' => 'Repas', 'unit' => 'nb']);

    $report = $this->postJson("/api/projects/{$project->id}/daily-reports", ['date' => '2026-08-27'])
        ->assertCreated()
        ->assertJsonPath('data.number', '001')
        ->assertJsonPath('data.document_id', $quote->id)
        ->assertJsonPath('data.status', 'en_cours')
        ->assertJsonPath('data.can_edit', true)
        ->assertJsonCount(2, 'data.steps')
        ->json('data');

    $url = "/api/daily-reports/{$report['id']}";
    // 8.5 h de démontage pour Luca (50.-/h) et un repas (hors heures et hors coût).
    $this->putJson("$url/hours", ['collaborator_id' => $luca->id, 'document_step_id' => $demolition->id, 'quantity' => 8.5])->assertOk();
    $this->putJson("$url/hours", ['collaborator_id' => $luca->id, 'work_type_id' => $meal->id, 'quantity' => 1])->assertOk();
    $data = $this->putJson("$url/hours", ['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 1])->assertOk()->json('data');

    expect($data['total_hours'])->toEqual(9.5)
        ->and($data['total_amount'])->toEqual(477.78)   // 8.5 × 50 + 1 × 52.78
        ->and($data['hours'])->toHaveCount(3)
        ->and(collect($data['hours'])->firstWhere('work_type_id', $meal->id)['amount'])->toEqual(0);

    // Effacer la cellule garde le collaborateur présent ; le retirer supprime tout.
    $data = $this->putJson("$url/hours", ['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 0])->assertOk()->json('data');
    expect(collect($data['hours'])->where('collaborator_id', $pierre->id)->count())->toBe(1)
        ->and($data['total_amount'])->toEqual(425);
    $data = $this->deleteJson("$url/collaborators/{$pierre->id}")->assertOk()->json('data');
    expect(collect($data['hours'])->where('collaborator_id', $pierre->id)->count())->toBe(0);

    // Le second rapport prend le numéro suivant et reprend l'équipe du précédent.
    $second = $this->postJson("/api/projects/{$project->id}/daily-reports", ['date' => '2026-08-28'])->assertCreated()->assertJsonPath('data.number', '002')->json('data');
    $data = $this->postJson("/api/daily-reports/{$second['id']}/copy-team")->assertOk()->json('data');
    expect(collect($data['hours'])->pluck('collaborator_id')->unique()->values()->all())->toBe([$luca->id]);
});

it('refuse les heures sur une étape étrangère au devis du rapport', function () {
    actingAsRole('responsable');
    ['project' => $project, 'luca' => $luca] = reportFixture();
    $other = Project::create(['number' => '2800-001', 'designation1' => 'Autre', 'status' => 'en_cours']);
    $foreignStep = Document::createForProject($other, 'devis')->steps()->create(['code' => '01', 'label' => 'X', 'position' => 1]);
    $report = DailyReport::createForProject($project, null);

    $this->putJson("/api/daily-reports/{$report->id}/hours", ['collaborator_id' => $luca->id, 'document_step_id' => $foreignStep->id, 'quantity' => 2])
        ->assertStatus(422);
});

it('ajoute des ressources depuis les éléments de coûts et des fichiers', function () {
    Storage::fake('local');
    actingAsRole('responsable');
    ['project' => $project, 'tiling' => $tiling] = reportFixture();
    $element = PriceElement::create(['family' => 2, 'number' => 'M001', 'description' => 'Colle Weber', 'unit' => 'kg', 'net_price' => 1.2]);
    $report = DailyReport::createForProject($project, null);
    $url = "/api/daily-reports/{$report->id}";

    $data = $this->postJson("$url/items", ['family' => 2, 'price_element_id' => $element->id, 'document_step_id' => $tiling->id, 'quantity' => 40])
        ->assertCreated()->json('data');
    expect($data['items'][0]['label'])->toBe('Colle Weber')
        ->and($data['items'][0]['amount'])->toEqual(48)
        ->and($data['total_amount'])->toEqual(48)
        ->and($element->refresh()->usage_count)->toBe(1);

    $itemId = $data['items'][0]['id'];
    $this->putJson("$url/items/$itemId", ['quantity' => 10, 'unit_cost' => 2])->assertOk()->assertJsonPath('data.total_amount', 20);
    $this->postJson("$url/items", ['family' => 5, 'label' => 'Carrelette', 'quantity' => 1, 'unit_cost' => 45])->assertCreated()->assertJsonPath('data.total_amount', 65);
    $this->deleteJson("$url/items/$itemId")->assertOk()->assertJsonPath('data.total_amount', 45);

    $data = $this->post("$url/files", ['files' => [UploadedFile::fake()->image('chantier.jpg', 800, 600), UploadedFile::fake()->create('plan.pdf', 100, 'application/pdf')]])
        ->assertOk()->json('data');
    expect($data['files'])->toHaveCount(2)
        ->and($data['files'][0]['is_image'])->toBeTrue()
        ->and($data['files'][1]['is_image'])->toBeFalse();
    Storage::disk('local')->assertExists(DailyReportFile::first()->path);
    $this->deleteJson("$url/files/{$data['files'][0]['id']}")->assertOk()->assertJsonCount(1, 'data.files');
});

it('applique le workflow : un rapport facturé est verrouillé sauf changement de statut', function () {
    actingAsRole('responsable');
    ['project' => $project, 'luca' => $luca, 'demolition' => $demolition] = reportFixture();
    $report = DailyReport::createForProject($project, null);
    $url = "/api/daily-reports/{$report->id}";

    $this->putJson($url, ['status' => 'en_controle', 'remark' => 'Contrôlé'])->assertOk()->assertJsonPath('data.status', 'en_controle');
    $this->putJson($url, ['status' => 'facture'])->assertOk()->assertJsonPath('data.can_edit', false);
    $this->putJson($url, ['remark' => 'Trop tard'])->assertForbidden();
    $this->putJson("$url/hours", ['collaborator_id' => $luca->id, 'document_step_id' => $demolition->id, 'quantity' => 1])->assertForbidden();
    $this->putJson($url, ['status' => 'en_controle'])->assertOk()->assertJsonPath('data.can_edit', true);
});

it('limite l’ouvrier à ses rapports, sans aucun montant', function () {
    ['project' => $project, 'luca' => $luca, 'demolition' => $demolition, 'pierre' => $pierre] = reportFixture();
    $manager = User::factory()->create();
    $foreign = DailyReport::createForProject($project, $manager, ['date' => '2026-08-20']);
    $foreign->hours()->create(['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 4, 'hourly_cost' => 52.78]);

    $worker = actingAsRole('ouvrier');
    $luca->update(['user_id' => $worker->id]);

    // Invisible : ni créé par lui, ni ses heures.
    $this->getJson("/api/daily-reports/{$foreign->id}")->assertNotFound();
    expect($this->getJson('/api/daily-reports')->assertOk()->json('meta.total'))->toBe(0);

    // Il crée le sien : il en est le responsable par défaut, saisit les heures de l'équipe, sans voir de prix.
    $mine = $this->postJson("/api/projects/{$project->id}/daily-reports", [])->assertCreated()
        ->assertJsonPath('data.responsible_id', $luca->id)
        ->json('data');
    expect($mine)->not->toHaveKey('total_amount');
    $data = $this->putJson("/api/daily-reports/{$mine['id']}/hours", ['collaborator_id' => $pierre->id, 'document_step_id' => $demolition->id, 'quantity' => 3])
        ->assertOk()->json('data');
    expect($data['hours'][0])->not->toHaveKey('amount')->not->toHaveKey('hourly_cost')
        ->and($data['total_hours'])->toEqual(3);
    expect($this->getJson('/api/daily-reports')->assertOk()->json('meta.total'))->toBe(1);
    expect($this->getJson('/api/collaborators')->assertOk()->json('data.0'))->not->toHaveKey('hourly_cost');

    // Il passe le rapport en contrôle, puis ne peut plus le modifier ni le facturer.
    $this->putJson("/api/daily-reports/{$mine['id']}", ['status' => 'facture'])->assertStatus(422);
    $this->putJson("/api/daily-reports/{$mine['id']}", ['status' => 'en_controle'])->assertOk()->assertJsonPath('data.can_edit', false);
    $this->putJson("/api/daily-reports/{$mine['id']}", ['remark' => 'x'])->assertForbidden();
    $this->postJson("/api/daily-reports/{$mine['id']}/items", ['family' => 2, 'label' => 'Colle'])->assertForbidden();
    // Le coût unitaire n'est jamais accepté d'un ouvrier.
    $this->postJson("/api/daily-reports/{$mine['id']}/items", ['family' => 2, 'label' => 'Colle', 'unit_cost' => 5])->assertStatus(422);
    $this->postJson('/api/collaborators', ['last_name' => 'X'])->assertForbidden();
});

it('adjuge le projet quand son devis est accepté', function () {
    actingAsRole('responsable');
    ['project' => $project, 'quote' => $quote] = reportFixture();

    $this->putJson("/api/documents/{$quote->id}", ['status' => 'accepte', 'date' => '2026-09-01', 'vat_rate' => 8.1])->assertOk();
    expect($project->refresh()->status)->toBe('adjuge');
});
