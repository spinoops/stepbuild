<?php

use App\Models\CatalogArticle;
use App\Models\CatalogChapter;

function makeChapter(string $code = '12', string $label = 'CARRELAGE', ?int $parentId = null): CatalogChapter
{
    return CatalogChapter::create(['code' => $code, 'label' => $label, 'parent_id' => $parentId]);
}

it('interdit le catalogue à un ouvrier (prix)', function () {
    actingAsRole('ouvrier');

    $this->getJson('/api/catalog-chapters')->assertForbidden();
    $this->getJson('/api/catalog-articles')->assertForbidden();
});

it('liste les chapitres avec leur nombre d\'articles', function () {
    actingAsRole('responsable');
    $chapter = makeChapter();
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'code' => '025', 'description' => 'Carrelage sol']);

    $this->getJson('/api/catalog-chapters')
        ->assertOk()
        ->assertJsonPath('data.0.code', '12')
        ->assertJsonPath('data.0.articles_count', 1);
});

it('crée un chapitre et refuse sa suppression tant qu\'il contient des articles', function () {
    actingAsRole('responsable');

    $id = $this->postJson('/api/catalog-chapters', ['code' => '03', 'label' => 'DEMONTAGE'])
        ->assertCreated()->json('data.id');

    $articleId = $this->postJson('/api/catalog-articles', [
        'catalog_chapter_id' => $id,
        'code' => '005',
        'description' => 'Démontage y compris évacuation',
        'unit' => 'Bloc',
        'sale_price' => 1200,
    ])->assertCreated()->assertJsonPath('data.sale_price', 1200)->json('data.id');

    $this->deleteJson("/api/catalog-chapters/{$id}")->assertStatus(422);

    $this->deleteJson("/api/catalog-articles/{$articleId}")->assertOk();
    $this->deleteJson("/api/catalog-chapters/{$id}")->assertOk();
});

it('limite les articles au chapitre demandé et à ses sous-chapitres', function () {
    actingAsRole('responsable');
    $parent = makeChapter('18', 'DIVERS');
    $child = makeChapter('005', 'Ouvrier qualifié', $parent->id);
    $other = makeChapter('12', 'CARRELAGE');
    CatalogArticle::create(['catalog_chapter_id' => $parent->id, 'description' => 'Article parent']);
    CatalogArticle::create(['catalog_chapter_id' => $child->id, 'description' => 'Article enfant']);
    CatalogArticle::create(['catalog_chapter_id' => $other->id, 'description' => 'Autre']);

    $this->getJson("/api/catalog-articles?chapter_id={$parent->id}")->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/catalog-articles')->assertJsonCount(3, 'data');
});

it('valide un article (422)', function () {
    actingAsRole('admin');

    $this->postJson('/api/catalog-articles', ['catalog_chapter_id' => 999, 'description' => '', 'sale_price' => -1])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['catalog_chapter_id', 'description', 'sale_price']);
});

it('recherche un article sans accents', function () {
    actingAsRole('responsable');
    $chapter = makeChapter();
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'description' => 'Fourniture et pose échafaudage']);
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'description' => 'Location grue']);

    $this->getJson('/api/catalog-articles?search=echafaudage')->assertJsonCount(1, 'data');
});
