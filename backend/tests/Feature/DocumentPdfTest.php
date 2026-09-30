<?php

use App\Models\Address;
use App\Models\Document;
use App\Models\Project;
use App\Support\DocumentPrint;

/** Devis avec deux étapes, un sous-titre, un texte, une option et une ligne sans quantité. */
function printableQuote(): Document
{
    $client = Address::factory()->create(['title' => 'Madame', 'last_name' => 'Dupont', 'first_name' => 'Marie', 'street' => 'Rue de la Gare', 'street_no' => '12', 'zip' => '2800', 'city' => 'Delémont']);
    $project = Project::create(['number' => '2853-055', 'designation1' => 'Dupont - Rénovation salle de bain', 'client_id' => $client->id, 'status' => 'en_cours', 'street' => 'Chemin de la Tuilerie', 'street_no' => '20', 'zip' => '2853', 'city' => 'Courfaivre']);
    $quote = Document::createForProject($project, 'devis', null, ['date' => '2026-08-27', 'initials' => 'AF']);

    $tiling = $quote->steps()->create(['code' => '12', 'label' => 'CARRELAGE', 'position' => 1]);
    $subs = $quote->steps()->create(['code' => '17', 'label' => 'SOUS-TRAITANTS', 'position' => 2]);
    $line = fn ($step, array $data, int $position) => $step->positions()->create([...$data, 'document_id' => $quote->id, 'position' => $position]);

    $line($tiling, ['description' => 'Habillage Combi-fix prêt à carreler', 'unit' => 'Pce', 'quantity' => 1, 'unit_price' => 495], 1);
    $line($tiling, ['kind' => 'text', 'description' => 'Fourniture à choisir à notre showroom'], 2);
    $line($tiling, ['description' => 'Carrelage murs', 'unit' => 'Bloc', 'quantity' => 1, 'unit_price' => 1295, 'is_optional' => true], 3);
    $line($tiling, ['description' => 'Ouvrier qualifié', 'unit' => 'H.', 'unit_price' => 90], 4);
    $line($subs, ['kind' => 'title', 'description' => 'SANITAIRE - CHAUFFAGISTE'], 1);
    $line($subs, ['description' => 'Démontage appareils sanitaires', 'unit' => 'Bloc', 'quantity' => 1, 'unit_price' => 3995], 2);
    $line($subs, ['kind' => 'title', 'description' => 'ELECTRICITE'], 3);
    $line($subs, ['description' => 'Adaptation électricité', 'unit' => 'Bloc', 'quantity' => 1, 'unit_price' => 995], 4);

    return $quote->recalculate();
}

it('numérote les positions en continu comme sur le devis Lachat', function () {
    $steps = DocumentPrint::steps(printableQuote());

    expect(collect($steps)->pluck('number')->all())->toBe(['1', '2'])
        ->and(collect($steps[0]['rows'])->pluck('number')->all())->toBe(['1.1', '', '1.2', '1.3'])
        ->and($steps[0]['total'])->toEqual(495)                // option hors total
        ->and(collect($steps[1]['rows'])->pluck('number')->all())->toBe(['2.1', '2.1.1', '2.2', '2.2.1'])
        ->and($steps[1]['total'])->toEqual(4990)
        ->and(DocumentPrint::money(12420.69))->toBe("12'420.69");
});

it('produit le PDF du devis pour la gestion seulement', function () {
    actingAsRole('responsable');
    $quote = printableQuote();

    $response = $this->get("/api/documents/{$quote->id}/pdf")->assertOk();
    expect($response->headers->get('content-type'))->toBe('application/pdf')
        ->and($response->headers->get('content-disposition'))->toContain('inline')
        ->and(substr($response->getContent(), 0, 5))->toBe('%PDF-')
        ->and(strlen($response->getContent()))->toBeGreaterThan(5000);

    $download = $this->get("/api/documents/{$quote->id}/pdf?download=1")->assertOk();
    expect($download->headers->get('content-disposition'))->toContain('attachment');
});

it('refuse le PDF à un ouvrier', function () {
    actingAsRole('ouvrier');
    $quote = printableQuote();

    $this->getJson("/api/documents/{$quote->id}/pdf")->assertForbidden();
});

it('retire les lignes sans quantité, par étape ou pour tout le devis', function () {
    actingAsRole('responsable');
    $quote = printableQuote();
    [$tiling, $subs] = $quote->steps()->get()->all();
    $subs->positions()->create(['document_id' => $quote->id, 'description' => 'Peinture', 'unit' => 'm2', 'unit_price' => 30, 'position' => 9]);

    // Une seule étape : la ligne « Ouvrier qualifié » sans quantité part, le texte et le reste restent.
    $this->postJson("/api/documents/{$quote->id}/positions/prune", ['step_id' => $tiling->id])
        ->assertOk()
        ->assertJsonPath('removed', 1)
        ->assertJsonCount(3, 'data.steps.0.positions')
        ->assertJsonCount(5, 'data.steps.1.positions');

    // Tout le devis : les sous-titres sont conservés.
    $this->postJson("/api/documents/{$quote->id}/positions/prune")
        ->assertOk()
        ->assertJsonPath('removed', 1)
        ->assertJsonCount(4, 'data.steps.1.positions')
        ->assertJsonPath('data.total_net', 5485);
});
