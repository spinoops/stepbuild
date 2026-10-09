<?php

use App\Models\PriceElement;
use App\Models\StockItem;

function makeProduct(array $attributes = []): PriceElement
{
    return PriceElement::create(array_merge([
        'family' => 2, 'group_code' => 'M92', 'number' => '020.000', 'description' => 'Chiffon microfibre bleu',
        'unit' => 'Paquet', 'supplier_price' => 18.80, 'regie_price' => 24.45,
    ], $attributes));
}

it('réserve les stocks aux rôles admin, responsable et stock', function () {
    actingAsRole('ouvrier');
    $this->getJson('/api/stock/items')->assertForbidden();

    actingAsRole('stock');
    $this->getJson('/api/stock/items')->assertOk()->assertJsonCount(0, 'data');

    actingAsRole('responsable');
    $this->getJson('/api/stock/items')->assertOk();
});

it('ne laisse au rôle stock que la vue des stocks : ni projets, ni prix, ni rapports', function () {
    actingAsRole('stock');

    $this->getJson('/api/projects')->assertForbidden();
    $this->getJson('/api/price-elements')->assertForbidden();
    $this->getJson('/api/daily-reports')->assertForbidden();
    $this->getJson('/api/collaborators')->assertForbidden();
    $this->getJson('/api/search/index')->assertForbidden();
    $this->getJson('/api/user')->assertOk()->assertJsonPath('roles.0', 'stock');
});

it('propose les produits pas encore suivis, sans aucun prix', function () {
    actingAsRole('stock');
    $chiffon = makeProduct();
    makeProduct(['number' => '020.001', 'description' => 'Chiffon de nettoyage couleur']);
    makeProduct(['family' => 1, 'number' => '010.000', 'description' => 'Ouvrier qualifié']);   // salaire : jamais stocké
    StockItem::create(['price_element_id' => $chiffon->id]);

    $res = $this->getJson('/api/stock/products?search=chiffon')->assertOk()->assertJsonCount(1, 'data');
    expect($res->json('data.0.description'))->toBe('Chiffon de nettoyage couleur')
        ->and($res->json('data.0'))->not->toHaveKeys(['supplier_price', 'regie_price', 'net_price']);
    $this->getJson('/api/stock/products?search=ouvrier')->assertJsonCount(0, 'data');
});

it('filtre les produits libres par famille et groupe, et liste les groupes avec leur nombre', function () {
    actingAsRole('stock');
    makeProduct(['number' => '020.001', 'description' => 'Chiffon de nettoyage couleur']);
    makeProduct(['number' => '020.002', 'description' => 'Seau', 'group_code' => 'M95']);
    makeProduct(['family' => 5, 'group_code' => 'O95', 'number' => '361.796', 'description' => 'Accu 36 volts']);
    StockItem::create(['price_element_id' => makeProduct(['number' => '020.003', 'description' => 'Déjà suivi'])->id]);

    $this->getJson('/api/stock/products?family=2&sort=number&limit=300')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.number', '020.001');
    $this->getJson('/api/stock/products?family=2&group=M95')->assertJsonCount(1, 'data')->assertJsonPath('data.0.description', 'Seau');
    $this->getJson('/api/stock/products?family=5')->assertJsonCount(1, 'data');

    $this->getJson('/api/stock/products/groups?family=2')->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.code', 'M92')->assertJsonPath('data.0.total', 1)
        ->assertJsonPath('data.1.code', 'M95')->assertJsonPath('data.1.total', 1);
});

it('met un produit en stock, applique entrées, sorties et inventaire avec l\'historique', function () {
    $user = actingAsRole('stock');
    $product = makeProduct();

    $res = $this->postJson('/api/stock/items', ['price_element_id' => $product->id, 'quantity' => 10, 'min_quantity' => 4, 'location' => 'Étagère B'])
        ->assertCreated()
        ->assertJsonPath('data.quantity', 10)
        ->assertJsonPath('data.status', 'ok')
        ->assertJsonPath('data.counted_by', $user->name);
    expect($res->json('data'))->not->toHaveKeys(['supplier_price', 'regie_price']);
    $id = $res->json('data.id');

    $this->postJson('/api/stock/items', ['price_element_id' => $product->id])->assertUnprocessable();

    $this->postJson("/api/stock/items/{$id}/movements", ['type' => 'sortie', 'quantity' => 7])
        ->assertOk()->assertJsonPath('item.quantity', 3)->assertJsonPath('item.status', 'bas')->assertJsonPath('movement.quantity', -7);
    $this->postJson("/api/stock/items/{$id}/movements", ['type' => 'sortie', 'quantity' => 3])
        ->assertOk()->assertJsonPath('item.status', 'rupture');
    $this->postJson("/api/stock/items/{$id}/movements", ['type' => 'entree', 'quantity' => 12.5, 'note' => 'Livraison Hasler'])
        ->assertOk()->assertJsonPath('item.quantity', 12.5)->assertJsonPath('item.status', 'ok');
    $this->postJson("/api/stock/items/{$id}/movements", ['type' => 'inventaire', 'quantity' => 11])
        ->assertOk()->assertJsonPath('item.quantity', 11)->assertJsonPath('movement.quantity', -1.5);

    $this->postJson("/api/stock/items/{$id}/movements", ['type' => 'sortie', 'quantity' => 0])->assertUnprocessable();
    $this->postJson("/api/stock/items/{$id}/movements", ['type' => 'vol', 'quantity' => 1])->assertUnprocessable();

    $history = $this->getJson("/api/stock/items/{$id}/movements")->assertOk()->assertJsonCount(5, 'data');
    expect($history->json('data.0.type'))->toBe('inventaire')
        ->and($history->json('data.0.quantity_after'))->toBe(11)
        ->and($history->json('data.1.note'))->toBe('Livraison Hasler')
        ->and($history->json('data.4.note'))->toBe('Mise en stock');

    $this->putJson("/api/stock/items/{$id}", ['min_quantity' => 20, 'location' => 'Camion 2'])
        ->assertOk()->assertJsonPath('data.status', 'bas')->assertJsonPath('data.location', 'Camion 2');

    $this->getJson('/api/stock/items')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.number', '020.000');

    $this->deleteJson("/api/stock/items/{$id}")->assertOk();
    expect(StockItem::count())->toBe(0);
});

it('garde le produit en stock quand son élément part à la corbeille et refuse sa suppression définitive', function () {
    actingAsRole('responsable');
    $product = makeProduct();
    $item = StockItem::create(['price_element_id' => $product->id]);
    $item->apply('inventaire', 5);

    $this->deleteJson("/api/price-elements/{$product->id}")->assertOk();   // corbeille
    $this->getJson('/api/stock/items')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.quantity', 5);

    expect(fn () => $product->fresh()->forceDelete())->toThrow(RuntimeException::class);
    expect(StockItem::count())->toBe(1);
});

it('trie les produits en stock par désignation', function () {
    actingAsRole('responsable');
    StockItem::create(['price_element_id' => makeProduct(['description' => 'Zinc en plaque', 'number' => '1', 'price_updated_at' => '2025-03-15'])->id]);
    StockItem::create(['price_element_id' => makeProduct(['description' => 'Ardoise', 'number' => '2'])->id]);

    $this->getJson('/api/stock/items')->assertJsonPath('data.0.description', 'Ardoise')->assertJsonPath('data.1.description', 'Zinc en plaque')
        ->assertJsonPath('data.0.status', 'a_compter') // mis en stock sans comptage
        ->assertJsonPath('data.1.price_updated_at', '2025-03-15'); // date de mutation de prix, pour le filtre par année
});
