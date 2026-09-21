<?php

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use App\Models\PriceElement;

beforeEach(function () {
    $chapter = CatalogChapter::create(['code' => '12', 'label' => 'CARRELAGE']);
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'code' => '025', 'description' => 'Fourniture et pose carrelage sol', 'unit' => 'M2']);
    CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'description' => 'CARRELAGE', 'is_title' => true]);
    PriceElement::create(['family' => 5, 'number' => '500.005', 'description' => 'Scie à carrelage', 'unit' => 'Jour']);
    Address::factory()->create(['last_name' => 'Carrelages Exemple SA', 'first_name' => null, 'city' => 'Delémont']);
    Address::factory()->create(['last_name' => 'Ancien Carreleur', 'is_active' => false]);
});

it('interdit la recherche globale à un ouvrier', function () {
    actingAsRole('ouvrier');

    $this->getJson('/api/search?q=carrelage')->assertForbidden();
});

it('ne cherche pas en dessous de deux caractères', function () {
    actingAsRole('responsable');

    $this->getJson('/api/search?q=c')->assertOk()->assertJsonCount(0, 'groups');
});

it('renvoie les résultats groupés, sans titres de chapitre ni adresses inactives', function () {
    actingAsRole('responsable');

    $response = $this->getJson('/api/search?q=carrel')->assertOk();

    $groups = collect($response->json('groups'))->keyBy('key');
    expect($groups->keys()->all())->toBe(['addresses', 'articles', 'price_elements']);
    expect($groups['addresses']['items'])->toHaveCount(1);
    expect($groups['articles']['items'])->toHaveCount(1);
    expect($groups['articles']['items'][0]['sublabel'])->toBe('12.025 · M2');
    expect($groups['price_elements']['items'][0]['label'])->toBe('Scie à carrelage');
});

it('classe les articles les plus utilisés en premier', function () {
    actingAsRole('responsable');
    $chapter = CatalogChapter::first();
    $popular = CatalogArticle::create(['catalog_chapter_id' => $chapter->id, 'code' => '030', 'description' => 'Fourniture et pose carrelage murs']);
    $popular->forceFill(['usage_count' => 25])->save();

    $items = $this->getJson('/api/search?q=pose+carrelage')->json('groups.0.items');

    expect($items[0]['id'])->toBe($popular->id);
});

it('fournit un index compact pour la recherche en mémoire, sans titres ni adresses inactives', function () {
    actingAsRole('responsable');

    $groups = collect($this->getJson('/api/search/index')->assertOk()->json('groups'))->keyBy('key');

    expect($groups['addresses']['items'])->toHaveCount(1);
    expect($groups['articles']['items'])->toHaveCount(1);
    expect($groups['articles']['items'][0][1])->toBe('Fourniture et pose carrelage sol');
    expect($groups['articles']['items'][0][2])->toBe('12.025 · M2');
    expect($groups['price_elements']['items'][0][1])->toBe('Scie à carrelage');
});

it('interdit l\'index de recherche à un ouvrier', function () {
    actingAsRole('ouvrier');

    $this->getJson('/api/search/index')->assertForbidden();
});
