<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\CatalogArticle;
use App\Models\CatalogChapter;
use App\Models\Collaborator;
use App\Models\CollaboratorAbsence;
use App\Models\DailyReport;
use App\Models\Document;
use App\Models\PriceElement;
use App\Models\Project;
use App\Models\QuoteTemplate;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Database\Seeder;

/**
 * Données d'exemple FICTIVES pour le développement local (idempotent).
 * Les vraies données viendront de la reprise BauBit (phase 6).
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAddresses();
        $this->seedCatalog();
        $this->seedPriceElements();
        $this->seedProjects();
        $this->seedQuoteTemplate();
        $this->seedQuote();
        $this->seedCollaborators();
        $this->seedDailyReports();
        $this->seedRegie();
    }

    private function seedCollaborators(): void
    {
        foreach (WorkType::DEFAULTS as $position => [$code, $label, $unit]) {
            WorkType::updateOrCreate(['code' => $code], ['label' => $label, 'unit' => $unit, 'position' => $position]);
        }

        // Positions régie = éléments de coûts « Salaire » (tarif vendu au client).
        $regie = PriceElement::where('family', 1)->pluck('id', 'number');

        // [numéro, nom, prénom, tarif horaire (coût), position régie, compte de connexion]
        $rows = [
            ['101', 'Martin', 'Pierre', 52.78, '010.010', 'responsable@chantier.test'],
            ['102', 'Rossi', 'Luca', 50.00, '010.000', 'ouvrier@chantier.test'],
            ['103', 'Keller', 'Anna', 52.78, '010.000', null],
            ['104', 'Nguyen', 'Thi', 50.00, '010.005', null],
            ['105', 'Favre', 'Jean', 55.00, '010.010', null],
            ['106', 'Bernard', 'Léa', 48.50, '010.005', null],
        ];
        foreach ($rows as [$number, $last, $first, $cost, $position, $email]) {
            Collaborator::updateOrCreate(
                ['number' => $number],
                [
                    'last_name' => $last, 'first_name' => $first, 'hourly_cost' => $cost,
                    'regie_element_id' => $regie[$position] ?? null,
                    'user_id' => $email ? User::where('email', $email)->value('id') : null, 'is_active' => true,
                ],
            );
        }
    }

    /**
     * Régie et contrôle des heures : un second chantier avec devis et rapports sur tout le mois d'août,
     * des ressources sur un rapport, des absences ; les tarifs régie sont appliqués aux lignes qui n'en ont pas.
     */
    private function seedRegie(): void
    {
        $project = Project::where('number', '2822-001')->first();
        $who = Collaborator::all()->keyBy('number');
        $user = User::where('email', 'responsable@chantier.test')->first();

        if ($project && ! Document::where('project_id', $project->id)->exists()) {
            $quote = Document::createForProject($project, 'devis', null, ['title' => 'Aménagements extérieurs', 'status' => 'accepte']);
            foreach (['04', '07', '18'] as $index => $code) {
                $chapter = CatalogChapter::where('code', $code)->whereNull('parent_id')->first();
                $quote->steps()->create(['catalog_chapter_id' => $chapter?->id, 'code' => $code, 'label' => $chapter?->label ?? "Étape $code", 'position' => $index + 1]);
            }
            $quote->recalculate();
            $steps = $quote->steps()->get()->keyBy('code');

            // [date, statut, lignes [collaborateur, étape, heures]]
            $reports = [
                ['2026-08-03', 'facture', [['102', '04', 9], ['104', '04', 9]]],
                ['2026-08-04', 'facture', [['102', '04', 9], ['104', '04', 9]]],
                ['2026-08-05', 'en_controle', [['102', '04', 9], ['104', '04', 9], ['105', '04', 4]]],
                ['2026-08-10', 'en_controle', [['101', '07', 9], ['102', '07', 9]]],
                ['2026-08-11', 'en_controle', [['101', '07', 9], ['102', '07', 9]]],
                ['2026-08-12', 'en_controle', [['101', '07', 9], ['102', '07', 9]]],
                ['2026-08-13', 'en_cours', [['101', '07', 9], ['102', '07', 9]]],
                ['2026-08-17', 'en_cours', [['101', '18', 9], ['103', '18', 9]]],
                ['2026-08-18', 'en_cours', [['101', '18', 9], ['103', '18', 2.5]]],
                ['2026-08-19', 'en_cours', [['101', '18', 6.5], ['103', '18', 6.5]]],
            ];
            $materials = PriceElement::where('family', 2)->orderBy('number')->take(2)->get();
            $machine = PriceElement::where('family', 3)->orderBy('number')->first();

            foreach ($reports as $index => [$date, $status, $lines]) {
                $report = DailyReport::createForProject($project, $user, [
                    'document_id' => $quote->id, 'date' => $date, 'status' => $status, 'weather' => 'Ensoleillé',
                    'remark' => 'Aménagements extérieurs : terrassement, maçonnerie et finitions.', 'responsible_id' => $who['101']->id,
                ]);
                foreach ($lines as [$number, $code, $hours]) {
                    $report->hours()->create([
                        'collaborator_id' => $who[$number]->id, 'document_step_id' => $steps[$code]->id,
                        'quantity' => $hours, 'hourly_cost' => $who[$number]->hourly_cost,
                    ]);
                }
                if ($index === 3) {
                    foreach ($materials as $position => $element) {
                        $report->items()->create([
                            'family' => 2, 'document_step_id' => $steps['07']->id, 'price_element_id' => $element->id,
                            'label' => $element->description, 'unit' => $element->unit, 'quantity' => 10 * ($position + 1),
                            'unit_cost' => $element->net_price ?? $element->supplier_price, 'position' => $position + 1,
                        ]);
                    }
                    if ($machine) {
                        $report->items()->create([
                            'family' => 3, 'document_step_id' => $steps['07']->id, 'price_element_id' => $machine->id,
                            'label' => $machine->description, 'unit' => $machine->unit, 'quantity' => 4,
                            'unit_cost' => $machine->net_price ?? $machine->supplier_price, 'position' => 1,
                        ]);
                    }
                    $report->items()->create(['family' => 6, 'document_step_id' => $steps['07']->id, 'label' => 'Sanitaire Exemple Sàrl - raccordement', 'unit' => 'Fr.', 'quantity' => 850, 'unit_cost' => 1, 'position' => 1]);
                }
                $report->recalculate();
            }
        }

        // Absences : une semaine de vacances pour Pierre Martin, un jour férié pour tous (1er août).
        if (isset($who['101']) && ! CollaboratorAbsence::exists()) {
            foreach (['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'] as $date) {
                $who['101']->absences()->create(['date' => $date, 'type' => 'vacances', 'hours' => 9]);
            }
            $who['104']->absences()->create(['date' => '2026-08-20', 'type' => 'maladie', 'hours' => 9]);
        }

        // Lignes créées avant la phase 5 : tarifs régie appliqués une fois.
        DailyReport::whereHas('hours', fn ($q) => $q->whereNull('regie_price'))->orWhereHas('items', fn ($q) => $q->whereNull('regie_price'))
            ->get()->each->applyTariffs();
    }

    /** Trois rapports sur le devis d'exemple : séance sur place, démontage, carrelage. */
    private function seedDailyReports(): void
    {
        $project = Project::where('number', '2800-001')->first();
        $quote = $project ? Document::where('project_id', $project->id)->where('type', 'devis')->first() : null;
        if (! $project || ! $quote || DailyReport::where('project_id', $project->id)->exists()) {
            return;
        }

        $steps = $quote->steps()->get()->keyBy('code');
        $who = Collaborator::all()->keyBy('number');
        $user = User::where('email', 'responsable@chantier.test')->first();
        $meal = WorkType::where('code', '1110')->first();

        $reports = [
            ['2026-08-26', 'en_controle', 'Partiellement nuageux', 21, 28, "RAPPORT :\n\nSuivi de chantier : séance sur place pour voir travaux à faire", [['101', '02', 1], ['103', '02', 1]]],
            ['2026-08-27', 'en_controle', 'Couvert', 18, 24, "RAPPORT 2 :\n\nDémontage : démontage sol carrelage", [['102', '03', 8.5], ['104', '03', 8.5]]],
            ['2026-08-28', 'en_cours', 'Pluie, couvert', 17, 20, "RAPPORT 3 :\n\nDémontage : démontage sol carrelage\n\nCarrelage : pose couche de fond et pose carrelage", [['102', '12', 5], ['105', '03', 3], ['104', '12', 5]]],
        ];

        foreach ($reports as [$date, $status, $weather, $min, $max, $remark, $lines]) {
            $report = DailyReport::createForProject($project, $user, [
                'document_id' => $quote->id, 'date' => $date, 'status' => $status, 'weather' => $weather,
                'temp_min' => $min, 'temp_max' => $max, 'remark' => $remark, 'responsible_id' => $who['101']->id,
            ]);
            foreach ($lines as [$number, $code, $hours]) {
                $report->hours()->create([
                    'collaborator_id' => $who[$number]->id, 'document_step_id' => $steps[$code]->id,
                    'quantity' => $hours, 'hourly_cost' => $who[$number]->hourly_cost,
                ]);
                if ($hours >= 8 && $meal) {
                    $report->hours()->create(['collaborator_id' => $who[$number]->id, 'work_type_id' => $meal->id, 'quantity' => 1, 'hourly_cost' => $who[$number]->hourly_cost]);
                }
            }
            $report->recalculate();
        }
    }

    private function seedAddresses(): void
    {
        $rows = [
            ['client', 'Madame', 'Dupont', 'Marie', 'Rue de la Gare', '12', '2800', 'Delémont', '032 000 00 01', 'marie.dupont@exemple.ch', true],
            ['client', 'Monsieur', 'Muller', 'Hans', 'Rue des Vergers', '3', '2854', 'Bassecourt', '032 000 00 02', 'hans.muller@exemple.ch', true],
            ['client', 'Monsieur', 'Rossi', 'Luca', 'Chemin des Prés', '4', '2822', 'Courroux', '032 000 00 03', null, true],
            ['client', 'Monsieur', 'Favre', 'Jean', 'Rue de la Gravière', '8', '2855', 'Glovelier', null, null, true],
            ['client', 'Madame', 'Bernard', 'Léa', 'Rue Berlincourt', '21', '2854', 'Bassecourt', null, null, true],
            ['client', 'Madame', 'Keller', 'Anna', 'Rue Principale', '55', '2802', 'Develier', null, null, false],
            ['fournisseur', 'Entreprise', 'Matériaux Exemple SA', null, 'Zone industrielle', '5', '2800', 'Delémont', '032 000 00 10', 'vente@materiaux-exemple.ch', true],
            ['sous_traitant', 'Entreprise', 'Sanitaire Exemple Sàrl', null, 'Rue du Stand', '9', '2854', 'Bassecourt', '032 000 00 11', null, true],
            ['sous_traitant', 'Entreprise', 'Électricité Exemple SA', null, 'Rue Principale', '30', '2802', 'Develier', '032 000 00 12', null, true],
            ['contact', 'Monsieur', 'Architecte', 'Paul', 'Avenue de la Gare', '2', '2800', 'Delémont', '032 000 00 20', 'paul@archi-exemple.ch', true],
        ];

        foreach ($rows as [$type, $title, $last, $first, $street, $no, $zip, $city, $phone, $email, $active]) {
            Address::updateOrCreate(
                ['last_name' => $last, 'first_name' => $first],
                [
                    'type' => $type, 'title' => $title, 'street' => $street, 'street_no' => $no,
                    'zip' => $zip, 'city' => $city, 'phone' => $phone, 'email' => $email, 'is_active' => $active,
                ],
            );
        }
    }

    private function seedCatalog(): void
    {
        $chapters = [
            '00' => 'ARCHITECTURE', '01' => 'INGENIERIE', '02' => 'SUIVI ET INSTALLATION DE CHANTIER',
            '03' => 'DEMONTAGE', '04' => 'TERRASSEMENT ET ALENTOURS', '05' => 'CANALISATIONS',
            '06' => 'GROS-OEUVRE', '07' => 'MAÇONNERIE', '08' => 'CREPISSAGES', '09' => 'CHAPES',
            '10' => 'MENUISERIE', '11' => 'PLÂTRERIE', '12' => 'CARRELAGE', '13' => 'PEINTURE',
            '14' => 'SABLAGE', '15' => 'TAPIS DE PIERRE', '16' => 'VENTILATION',
            '17' => 'SOUS-TRAITANTS', '18' => 'DIVERS ET IMPREVUS',
        ];

        $ids = [];
        $position = 0;
        foreach ($chapters as $code => $label) {
            $ids[$code] = CatalogChapter::updateOrCreate(
                ['code' => $code, 'parent_id' => null],
                ['label' => $label, 'position' => $position++],
            )->id;
        }

        // [chapitre, code, sous-code, description, unité, achat, vente, titre ?]
        $articles = [
            ['00', null, null, 'ARCHITECTURE', null, null, null, true],
            ['00', '001', null, 'Architecture (pré-projet, projet, demandes d’offres, devis estimatif, plans et demande de permis, plans de construction …)', null, null, null, false],
            ['01', null, null, 'INGENIERIE', null, null, null, true],
            ['01', '001', null, 'Ingénieur : calculations des portées, étude sismique, listes armatures, plans de coffrage et ferraillage, contrôles avant bétonnage …', null, null, null, false],
            ['02', null, null, 'SUIVI ET INSTALLATION DE CHANTIER', null, null, null, true],
            ['02', '003', null, 'Suivi et installation de chantier y compris transports personnels, outillages et matériaux. Mise en œuvre, manutention et administration', 'Jour', null, 95, false],
            ['02', '007', null, 'Location tableau électrique', 'MS', 320, 500, false],
            ['02', '009', null, 'Fourniture et pose barrières chantier (longueur 2.5 m, y compris 1 plot)', 'm1', 9, 15, false],
            ['02', '014', null, 'Montage grue y compris transports', 'Bloc', null, 2000, false],
            ['02', '020', null, 'Location grue par mois', 'MS', null, 1500, false],
            ['02', '050', '005', 'Fourniture et pose échafaudage (location 2 mois)', 'M2', 18, 30, false],
            ['02', '075', '005', 'Protections et calfeutrages pour toutes les opérations du chantier', 'Bloc', null, 350, false],
            ['02', '075', '010', 'Protection de sol avec géotextile', 'M2', 2.5, 5, false],
            ['03', null, null, 'DEMONTAGE', null, null, null, true],
            ['03', '005', null, 'Démontage (…) y compris évacuation et taxe de décharge', 'Bloc', null, 1200, false],
            ['04', null, null, 'TERRASSEMENT ET ALENTOURS', null, null, null, true],
            ['04', '010', null, 'Terrassement en pleine masse y compris évacuation', 'M3', 38, 65, false],
            ['04', '050', null, 'Fourniture et pose bordures béton', 'M1', 48, 85, false],
            ['12', null, null, 'CARRELAGE', null, null, null, true],
            ['12', '005', null, 'Habillage prêt à carreler', 'Pce', 260, 400, false],
            ['12', '025', null, 'Fourniture et pose carrelage sol y compris étude, équerrages, coupes, encollage et jointoyages', 'M2', 70, 120, false],
            ['12', '030', null, 'Fourniture et pose carrelage murs y compris étude, équerrages, coupes, encollage et jointoyages', 'M2', 75, 130, false],
            ['12', '040', null, 'Fourniture et pose baguette d’angle inox ou autre y compris angles', 'M1', 22, 45, false],
            ['12', '100', null, 'Fourniture et pose acryls et/ou silicones', 'M1', 5, 12, false],
            ['17', null, null, 'SOUS-TRAITANTS', null, null, null, true],
            ['17', '005', null, 'Sanitaire - chauffagiste', null, null, null, false],
            ['17', '010', null, 'Électricité', null, null, null, false],
            ['18', null, null, 'DIVERS ET IMPREVUS', null, null, null, true],
            ['18', '005', null, 'Ouvrier qualifié', 'H.', 52.78, 90, false],
            ['18', '010', null, 'En régie (ouvrier qualifié)', 'H.', 52.78, 95, false],
        ];

        foreach ($articles as [$chapter, $code, $sub, $description, $unit, $purchase, $sale, $isTitle]) {
            CatalogArticle::updateOrCreate(
                ['catalog_chapter_id' => $ids[$chapter], 'code' => $code, 'sub_code' => $sub, 'is_title' => $isTitle],
                [
                    'description' => $description, 'unit' => $unit, 'purchase_price' => $purchase,
                    'sale_price' => $sale, 'work_type' => $isTitle ? null : $chapter,
                ],
            );
        }
    }

    private function seedPriceElements(): void
    {
        // [famille, groupe, numéro, description, unité, prix fournisseur, prix régie]
        $rows = [
            [1, 'S10', '010.000', 'Ouvrier qualifié', 'H.', 52.78, 90],
            [1, 'S10', '010.005', 'Ouvrier non qualifié', 'H.', 48.50, 82],
            [1, 'S10', '010.010', 'Chef d’équipe', 'H.', 58.00, 98],
            [1, 'S10', '010.015', 'Apprenti', 'H.', 22.00, 45],
            [2, 'M92', '020.000', 'Chiffon microfibre bleu (10 pcs) paquet', 'Paquet', 18.80, 24.45],
            [2, 'M92', '020.001', 'Chiffon de nettoyage couleur', 'Sac', 13.85, 18.00],
            [2, 'M92', '020.015', 'Demi-masque kit avec filtres A2 set', 'Pce', 92.00, 119.60],
            [2, 'M92', '020.030', 'Disque de nettoyage ø 115 mm, fin', 'Pce', 16.70, 21.70],
            [2, 'M92', '020.040', 'Film de masquage 2500 mm × 27 m, plié sur 30 cm', 'Rlx', 21.28, 27.65],
            [2, 'M92', '020.075', 'Lunette de protection claire', 'Pce', 23.10, 30.05],
            [2, 'M10', '100.000', 'Ciment CEM II 25 kg', 'Sac', 9.90, 12.90],
            [2, 'M10', '100.010', 'Sable 0-4 mm', 'To', 38.00, 49.40],
            [3, 'E10', '300.000', 'Mini-pelle 1.8 t', 'H.', 35.00, 55],
            [3, 'E10', '300.005', 'Dumper 1.5 t', 'H.', 22.00, 38],
            [3, 'E20', '300.100', 'Camion nacelle jusqu’à 16 m', 'H.', 65.00, 95],
            [4, 'X10', '400.000', 'Carburant diesel', 'L', 1.85, 2.40],
            [5, 'O10', '500.000', 'Marteau-piqueur électrique', 'Jour', 25.00, 40],
            [5, 'O10', '500.005', 'Scie à carrelage', 'Jour', 18.00, 30],
            [6, 'T10', '600.000', 'Sanitaire (sous-traitant)', 'H.', 95.00, 110],
            [6, 'T10', '600.005', 'Électricien (sous-traitant)', 'H.', 98.00, 115],
        ];

        foreach ($rows as [$family, $group, $number, $description, $unit, $supplier, $regie]) {
            PriceElement::updateOrCreate(
                ['family' => $family, 'number' => $number],
                [
                    'group_code' => $group, 'description' => $description, 'unit' => $unit, 'unit_regie' => $unit,
                    'supplier_price' => $supplier, 'net_price' => $supplier, 'regie_price' => $regie,
                    'regie_code' => "{$family}.{$number}", 'unit_factor' => 1,
                ],
            );
        }
    }

    private function seedProjects(): void
    {
        // [numéro, désignation, nom du client, rue, n°, NPA, lieu, statut]
        $rows = [
            ['2800-001', 'Exemple Dupont - Rénovation salle de bain', 'Dupont', 'Rue de la Gare', '12', '2800', 'Delémont', 'en_cours'],
            ['2854-001', 'Exemple Muller - Démolition et maçonnerie', 'Muller', 'Rue des Vergers', '3', '2854', 'Bassecourt', 'adjuge'],
            ['2822-001', 'Exemple Rossi - Aménagements extérieurs', 'Rossi', 'Chemin des Prés', '4', '2822', 'Courroux', 'adjuge'],
            ['2855-001', 'Exemple Favre - Création mur de soutènement', 'Favre', 'Rue de la Gravière', '8', '2855', 'Glovelier', 'adjuge'],
            ['2854-002', 'Exemple Bernard - Remplacement fenêtres', 'Bernard', 'Rue Berlincourt', '21', '2854', 'Bassecourt', 'termine'],
            ['2802-001', 'Exemple Keller - Extension buanderie', 'Keller', 'Rue Principale', '55', '2802', 'Develier', 'refuse'],
        ];

        foreach ($rows as [$number, $designation, $client, $street, $no, $zip, $city, $status]) {
            $project = Project::updateOrCreate(
                ['number' => $number],
                [
                    'designation1' => $designation,
                    'client_id' => Address::where('last_name', $client)->value('id'),
                    'street' => $street, 'street_no' => $no, 'zip' => $zip, 'city' => $city,
                    'status' => $status, 'is_active' => true,
                ],
            );

            if ($number === '2800-001' && ! $project->addresses()->exists()) {
                $project->addresses()->create([
                    'label' => 'Architecte',
                    'address_id' => Address::where('last_name', 'Architecte')->value('id'),
                    'name' => 'Architecte Paul', 'city' => 'Delémont', 'phone' => '032 000 00 20',
                ]);
            }
        }
    }

    /** Un devis d'exemple sur le premier projet : étapes issues des modèles, quelques quantités. */
    private function seedQuote(): void
    {
        $project = Project::where('number', '2800-001')->first();
        if (! $project || Document::where('project_id', $project->id)->exists()) {
            return;
        }

        $quote = Document::createForProject($project, 'devis', null, ['title' => 'Rénovation salle de bain']);
        $quantities = ['02.003' => 3, '03.005' => 1, '12.005' => 1, '12.025' => 12, '12.030' => 30, '12.040' => 8, '12.100' => 20, '18.005' => 10];

        foreach (['02', '03', '12', '18'] as $index => $code) {
            $chapter = CatalogChapter::where('code', $code)->whereNull('parent_id')->first();
            $step = $quote->steps()->create([
                'catalog_chapter_id' => $chapter->id, 'code' => $chapter->code, 'label' => $chapter->label, 'position' => $index + 1,
            ]);

            $articles = CatalogArticle::where('catalog_chapter_id', $chapter->id)->where('is_title', false)->orderBy('code')->orderBy('sub_code')->get();
            foreach ($articles as $position => $article) {
                $fullCode = implode('.', array_filter([$code, $article->code, $article->sub_code]));
                $step->positions()->create([
                    'document_id' => $quote->id, 'catalog_article_id' => $article->id, 'code' => $fullCode,
                    'description' => $article->description, 'unit' => $article->unit,
                    'quantity' => $quantities[$fullCode] ?? null,
                    'unit_price' => $article->sale_price, 'cost_price' => $article->purchase_price,
                    'position' => $position + 1,
                ]);
            }
        }

        $quote->recalculate();
    }

    /** Modèle de devis standard : les étapes générales d'un chantier de rénovation. */
    private function seedQuoteTemplate(): void
    {
        if (QuoteTemplate::where('name', 'Rénovation standard')->exists()) {
            return;
        }

        $template = QuoteTemplate::create([
            'name' => 'Rénovation standard',
            'description' => 'Étapes générales d’un chantier de rénovation, avec les articles du catalogue.',
            'is_default' => true,
            'position' => 1,
        ]);

        foreach (['00', '02', '03', '12', '17', '18'] as $index => $code) {
            $chapter = CatalogChapter::where('code', $code)->whereNull('parent_id')->first();
            $template->steps()->create([
                'catalog_chapter_id' => $chapter->id, 'code' => $chapter->code, 'label' => $chapter->label,
                'with_articles' => true, 'position' => $index + 1,
            ]);
        }
    }
}
