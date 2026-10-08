<?php

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use App\Models\Document;
use App\Models\Project;

function quoteProject(): Project
{
    $client = Address::factory()->create([
        'title' => 'Madame', 'last_name' => 'Dupont', 'first_name' => 'Marie',
        'street' => 'Rue de la Gare', 'street_no' => '12', 'zip' => '2800', 'city' => 'Delémont',
    ]);

    return Project::create([
        'number' => '2853-055', 'designation1' => 'Dupont - Rénovation salle de bain',
        'client_id' => $client->id, 'status' => 'en_cours',
    ]);
}

/** Chapitre « 12 CARRELAGE » avec un titre et deux articles chiffrés. */
function tilingChapter(): CatalogChapter
{
    $chapter = CatalogChapter::create(['code' => '12', 'label' => 'CARRELAGE']);
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'description' => 'CARRELAGE', 'is_title' => true]);
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'code' => '025', 'description' => 'Carrelage sol', 'unit' => 'M2', 'purchase_price' => 70, 'sale_price' => 120]);
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'code' => '030', 'description' => 'Carrelage murs', 'unit' => 'M2', 'purchase_price' => 75, 'sale_price' => 130]);

    return $chapter;
}

it('interdit les devis à un ouvrier (prix)', function () {
    actingAsRole('ouvrier');
    $project = quoteProject();

    $this->getJson('/api/documents')->assertForbidden();
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'devis'])->assertForbidden();
    $this->getJson('/api/catalog-articles/picker')->assertForbidden();
});

it('crée un devis numéroté avec le client du projet comme destinataire', function () {
    actingAsRole('responsable');
    $project = quoteProject();

    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'devis'])
        ->assertCreated()
        ->assertJsonPath('data.number', '2853-055-DE.1')
        ->assertJsonPath('data.status', 'en_cours')
        ->assertJsonPath('data.recipient_name', 'Dupont')
        ->assertJsonPath('data.recipient_city', 'Delémont')
        ->assertJsonPath('data.vat_rate', 8.1)
        ->assertJsonPath('data.project.number', '2853-055');

    // Le second devis du même projet prend le numéro suivant ; une facture a sa propre séquence.
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'devis'])->assertJsonPath('data.number', '2853-055-DE.2');
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'facture'])->assertJsonPath('data.number', '2853-055-FA.1');
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'bon'])->assertStatus(422);
});

it('ajoute une étape depuis un modèle avec ses articles, ou une étape libre', function () {
    actingAsRole('responsable');
    $document = Document::createForProject(quoteProject(), 'devis');
    $chapter = tilingChapter();

    $steps = $this->postJson("/api/documents/{$document->id}/steps", ['catalog_chapter_id' => $chapter->id])
        ->assertCreated()->json('data.steps');

    expect($steps)->toHaveCount(1);
    expect($steps[0]['code'])->toBe('12');
    expect($steps[0]['label'])->toBe('CARRELAGE');
    expect($steps[0]['positions'])->toHaveCount(2); // le titre de chapitre n'est pas importé
    expect($steps[0]['positions'][0]['code'])->toBe('12.025');
    expect($steps[0]['positions'][0]['unit_price'])->toBe(120);
    expect($steps[0]['positions'][0]['quantity'])->toBeNull();

    $this->postJson("/api/documents/{$document->id}/steps", ['catalog_chapter_id' => $chapter->id, 'with_articles' => false])
        ->assertJsonCount(0, 'data.steps.1.positions');
    $this->postJson("/api/documents/{$document->id}/steps", ['code' => '99', 'label' => 'Travaux spéciaux'])
        ->assertJsonPath('data.steps.2.label', 'Travaux spéciaux');
    $this->postJson("/api/documents/{$document->id}/steps", [])->assertStatus(422);
});

it('chiffre les positions et tient les totaux à jour (rabais, TVA, arrondi, options)', function () {
    actingAsRole('responsable');
    $document = Document::createForProject(quoteProject(), 'devis');
    $stepId = $this->postJson("/api/documents/{$document->id}/steps", ['code' => '12', 'label' => 'CARRELAGE'])->json('data.steps.0.id');

    $add = fn (array $data) => $this->postJson("/api/documents/{$document->id}/positions", ['document_step_id' => $stepId, ...$data])->assertCreated();

    $add(['description' => 'Carrelage sol', 'unit' => 'M2', 'quantity' => 12.5, 'unit_price' => 120.33]); // 1504.13
    $add(['description' => 'Baguette', 'unit' => 'M1', 'quantity' => 8, 'unit_price' => 45]);              //  360.00
    $add(['description' => 'Plus-value grand format', 'quantity' => 10, 'unit_price' => 25, 'is_optional' => true]);
    $response = $add(['description' => 'Y compris protections', 'kind' => 'text']);

    $response
        ->assertJsonPath('data.steps.0.positions.0.amount', 1504.13)
        ->assertJsonPath('data.steps.0.positions.2.amount', 250)   // option : montant affiché…
        ->assertJsonPath('data.steps.0.positions.3.amount', null)  // texte : pas de montant
        ->assertJsonPath('data.steps.0.total', 1864.13)            // …mais hors total
        ->assertJsonPath('data.total_net', 1864.13);

    // Rabais 5 % puis TVA 8.1 % : 1864.13 − 93.21 = 1770.92 ; TVA 143.44 ; 1914.36 → arrondi 1914.35.
    $header = ['date' => '2026-09-21', 'status' => 'envoye', 'vat_rate' => 8.1, 'discount_percent' => 5];
    $this->putJson("/api/documents/{$document->id}", $header)
        ->assertOk()
        ->assertJsonPath('data.discount_amount', 93.21)
        ->assertJsonPath('data.total_vat', 143.44)
        ->assertJsonPath('data.rounding', -0.01)
        ->assertJsonPath('data.total_gross', 1914.35)
        ->assertJsonPath('data.status', 'envoye');
});

it('insère un article du catalogue, compte son utilisation, puis modifie et supprime la position', function () {
    actingAsRole('responsable');
    $document = Document::createForProject(quoteProject(), 'devis');
    $chapter = tilingChapter();
    $article = CatalogArticle::where('code', '030')->first();
    $steps = $this->postJson("/api/documents/{$document->id}/steps", ['catalog_chapter_id' => $chapter->id])->json('data.steps');
    $first = $steps[0]['positions'][0]['id'];

    // Insertion juste après la première position, avec la quantité déjà saisie.
    $response = $this->postJson("/api/documents/{$document->id}/positions", [
        'document_step_id' => $steps[0]['id'], 'catalog_article_id' => $article->id, 'after_id' => $first, 'quantity' => 30,
    ])->assertCreated();

    $positions = $response->json('data.steps.0.positions');
    expect($positions)->toHaveCount(3);
    expect($positions[1]['id'])->toBe($response->json('created_position_id'));
    expect($positions[1]['description'])->toBe('Carrelage murs');
    expect($positions[1]['cost_price'])->toBe(75);
    expect($positions[1]['amount'])->toBe(3900);
    expect($article->fresh()->usage_count)->toBe(1);

    $id = $positions[1]['id'];
    $this->putJson("/api/documents/{$document->id}/positions/{$id}", ['description' => 'Carrelage murs 30×60', 'quantity' => 28.5, 'unit_price' => 135])
        ->assertOk()->assertJsonPath('data.total_net', 3847.5);

    $this->deleteJson("/api/documents/{$document->id}/positions/{$id}")->assertOk()->assertJsonPath('data.total_net', 0);

    // Une position ne se manipule que via son propre document.
    $other = Document::createForProject($document->project, 'devis');
    $this->deleteJson("/api/documents/{$other->id}/positions/{$first}")->assertNotFound();
});

it('réordonne les étapes et les positions', function () {
    actingAsRole('responsable');
    $document = Document::createForProject(quoteProject(), 'devis');
    $a = $this->postJson("/api/documents/{$document->id}/steps", ['code' => '03', 'label' => 'DEMONTAGE'])->json('data.steps.0.id');
    $b = $this->postJson("/api/documents/{$document->id}/steps", ['code' => '12', 'label' => 'CARRELAGE'])->json('data.steps.1.id');

    $this->postJson("/api/documents/{$document->id}/steps/reorder", ['ids' => [$b, $a]])
        ->assertOk()->assertJsonPath('data.steps.0.code', '12')->assertJsonPath('data.steps.1.code', '03');

    $p1 = $this->postJson("/api/documents/{$document->id}/positions", ['document_step_id' => $a, 'description' => 'Un'])->json('created_position_id');
    $p2 = $this->postJson("/api/documents/{$document->id}/positions", ['document_step_id' => $a, 'description' => 'Deux'])->json('created_position_id');

    $this->postJson("/api/documents/{$document->id}/positions/reorder", ['step_id' => $a, 'ids' => [$p2, $p1]])
        ->assertOk()->assertJsonPath('data.steps.1.positions.0.description', 'Deux');
});

it('supprime une étape avec ses positions et recalcule', function () {
    actingAsRole('responsable');
    $document = Document::createForProject(quoteProject(), 'devis');
    $stepId = $this->postJson("/api/documents/{$document->id}/steps", ['code' => '12', 'label' => 'CARRELAGE'])->json('data.steps.0.id');
    $this->postJson("/api/documents/{$document->id}/positions", ['document_step_id' => $stepId, 'description' => 'X', 'quantity' => 2, 'unit_price' => 50]);

    $this->deleteJson("/api/documents/{$document->id}/steps/{$stepId}")
        ->assertOk()->assertJsonCount(0, 'data.steps')->assertJsonPath('data.total_net', 0);
    $this->assertDatabaseCount('document_positions', 0);
});

it('duplique un devis en nouvelle version', function () {
    actingAsRole('responsable');
    $document = Document::createForProject(quoteProject(), 'devis', null, ['title' => 'Salle de bain']);
    $stepId = $this->postJson("/api/documents/{$document->id}/steps", ['code' => '12', 'label' => 'CARRELAGE'])->json('data.steps.0.id');
    $this->postJson("/api/documents/{$document->id}/positions", ['document_step_id' => $stepId, 'description' => 'Sol', 'quantity' => 10, 'unit_price' => 120]);
    $this->putJson("/api/documents/{$document->id}", ['date' => '2026-09-01', 'status' => 'refuse', 'vat_rate' => 8.1]);

    $this->postJson("/api/documents/{$document->id}/duplicate")
        ->assertCreated()
        ->assertJsonPath('data.number', '2853-055-DE.2')
        ->assertJsonPath('data.title', 'Salle de bain')
        ->assertJsonPath('data.status', 'en_cours')
        ->assertJsonPath('data.steps.0.positions.0.amount', 1200)
        ->assertJsonPath('data.total_net', 1200);
});

it('liste les documents d\'un projet et fournit les articles pour la saisie rapide', function () {
    actingAsRole('responsable');
    $project = quoteProject();
    Document::createForProject($project, 'devis');
    Document::createForProject(Project::create(['number' => '2800-001', 'designation1' => 'Autre', 'status' => 'en_cours']), 'devis');
    tilingChapter();

    $this->getJson("/api/documents?project_id={$project->id}")->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/documents?search=dupont')->assertJsonCount(1, 'data');
    $this->getJson('/api/documents')->assertJsonCount(2, 'data');

    $picker = $this->getJson('/api/catalog-articles/picker')->assertOk()->json('data');
    expect($picker)->toHaveCount(2);
    expect(array_slice($picker[0], 0, 7))->toBe([$picker[0][0], '12.025', 'Carrelage sol', 'M2', 120, 70, 0])
        ->and($picker[0][7])->toBeInt();   // chapitre, pour la fenêtre de recherche

    $groups = collect($this->getJson('/api/search/index')->json('groups'))->keyBy('key');
    expect($groups['documents']['items'])->toHaveCount(2);
});
