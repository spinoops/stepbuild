<?php

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use App\Models\Document;
use App\Models\Project;
use App\Models\QuoteTemplate;

function templateProject(): Project
{
    $client = Address::factory()->create(['last_name' => 'Dupont']);

    return Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Salle de bain', 'client_id' => $client->id, 'status' => 'en_cours']);
}

/** Deux chapitres, dont un avec deux articles chiffrés. */
function templateChapters(): array
{
    $demolition = CatalogChapter::create(['code' => '03', 'label' => 'DEMONTAGE']);
    $tiling = CatalogChapter::create(['code' => '12', 'label' => 'CARRELAGE']);
    CatalogArticle::create(['catalog_chapter_id' => $tiling->id, 'code' => '025', 'description' => 'Carrelage sol', 'unit' => 'M2', 'sale_price' => 120]);
    CatalogArticle::create(['catalog_chapter_id' => $tiling->id, 'code' => '030', 'description' => 'Carrelage murs', 'unit' => 'M2', 'sale_price' => 130]);

    return [$demolition, $tiling];
}

it('interdit les modèles de devis à un ouvrier', function () {
    actingAsRole('ouvrier');

    $this->getJson('/api/quote-templates')->assertForbidden();
});

it('crée un modèle avec ses étapes, le met à jour et gère le modèle par défaut', function () {
    actingAsRole('responsable');
    [$demolition, $tiling] = templateChapters();

    $id = $this->postJson('/api/quote-templates', [
        'name' => 'Rénovation standard',
        'is_default' => true,
        'steps' => [
            ['catalog_chapter_id' => $demolition->id],
            ['catalog_chapter_id' => $tiling->id, 'with_articles' => false],
            ['code' => '99', 'label' => 'Nettoyage final'],
        ],
    ])
        ->assertCreated()
        ->assertJsonPath('data.is_default', true)
        ->assertJsonCount(3, 'data.steps')
        ->assertJsonPath('data.steps.0.label', 'DEMONTAGE')   // repris du chapitre
        ->assertJsonPath('data.steps.1.with_articles', false)
        ->assertJsonPath('data.steps.2.label', 'Nettoyage final')
        ->json('data.id');

    // Un second modèle par défaut retire le drapeau au premier.
    $second = $this->postJson('/api/quote-templates', ['name' => 'Construction neuve', 'is_default' => true])->json('data.id');
    expect(QuoteTemplate::find($id)->is_default)->toBeFalse();
    expect(QuoteTemplate::find($second)->is_default)->toBeTrue();

    // Mise à jour : les étapes envoyées remplacent les anciennes.
    $this->putJson("/api/quote-templates/{$id}", ['name' => 'Rénovation', 'steps' => [['catalog_chapter_id' => $tiling->id]]])
        ->assertOk()->assertJsonPath('data.name', 'Rénovation')->assertJsonCount(1, 'data.steps');

    $this->postJson('/api/quote-templates', ['name' => '', 'steps' => [['code' => '', 'label' => '']]])->assertStatus(422);

    $this->deleteJson("/api/quote-templates/{$id}")->assertOk();
    $this->assertSoftDeleted('quote_templates', ['id' => $id]);
});

it('crée un devis avec les étapes du modèle choisi, ou du modèle par défaut', function () {
    actingAsRole('responsable');
    [$demolition, $tiling] = templateChapters();
    $project = templateProject();
    $template = QuoteTemplate::create(['name' => 'Standard', 'is_default' => true]);
    $template->steps()->create(['catalog_chapter_id' => $demolition->id, 'code' => '03', 'label' => 'DEMONTAGE', 'position' => 1]);
    $template->steps()->create(['catalog_chapter_id' => $tiling->id, 'code' => '12', 'label' => 'CARRELAGE', 'with_articles' => true, 'position' => 2]);
    $empty = QuoteTemplate::create(['name' => 'Vide']);

    // Modèle par défaut appliqué d'office.
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'devis'])
        ->assertCreated()
        ->assertJsonCount(2, 'data.steps')
        ->assertJsonPath('data.steps.1.code', '12')
        ->assertJsonCount(2, 'data.steps.1.positions')
        ->assertJsonPath('data.steps.1.positions.0.unit_price', 120);

    // Modèle explicite (ici sans étapes) ; une facture n'applique jamais de modèle.
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'devis', 'quote_template_id' => $empty->id])
        ->assertCreated()->assertJsonCount(0, 'data.steps');
    $this->postJson("/api/projects/{$project->id}/documents", ['type' => 'facture'])->assertJsonCount(0, 'data.steps');
});

it('applique un modèle à un devis existant sans dupliquer les chapitres déjà présents', function () {
    actingAsRole('responsable');
    [$demolition, $tiling] = templateChapters();
    $document = Document::createForProject(templateProject(), 'devis');
    $document->steps()->create(['catalog_chapter_id' => $tiling->id, 'code' => '12', 'label' => 'CARRELAGE', 'position' => 1]);
    $template = QuoteTemplate::create(['name' => 'Standard']);
    $template->steps()->create(['catalog_chapter_id' => $demolition->id, 'code' => '03', 'label' => 'DEMONTAGE', 'position' => 1]);
    $template->steps()->create(['catalog_chapter_id' => $tiling->id, 'code' => '12', 'label' => 'CARRELAGE', 'position' => 2]);
    $template->steps()->create(['code' => '99', 'label' => 'Nettoyage', 'position' => 3]);

    $this->postJson("/api/quote-templates/{$template->id}/apply/{$document->id}")
        ->assertOk()
        ->assertJsonCount(3, 'data.steps')   // carrelage existant + démontage + nettoyage
        ->assertJsonPath('data.steps.0.code', '12')
        ->assertJsonPath('data.steps.1.code', '03')
        ->assertJsonPath('data.steps.2.label', 'Nettoyage');
});

it('enregistre les étapes d\'un devis comme nouveau modèle', function () {
    actingAsRole('responsable');
    [$demolition] = templateChapters();
    $document = Document::createForProject(templateProject(), 'devis');
    $document->steps()->create(['catalog_chapter_id' => $demolition->id, 'code' => '03', 'label' => 'DEMONTAGE', 'position' => 1]);
    $document->steps()->create(['code' => '99', 'label' => 'Nettoyage', 'position' => 2]);

    $this->postJson("/api/documents/{$document->id}/save-as-template", ['name' => 'Depuis le devis'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Depuis le devis')
        ->assertJsonCount(2, 'data.steps')
        ->assertJsonPath('data.steps.0.catalog_chapter_id', $demolition->id);

    $this->getJson('/api/quote-templates')->assertOk()->assertJsonCount(1, 'data');
});
