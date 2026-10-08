# CLAUDE.md

Contexte pour Claude Code sur ce dépôt. À lire avant toute intervention.

## Projet
**StepBuild** (dossier local `app-chantier`, dépôt GitHub `spinoops/stepbuild`) — logiciel de gestion de
chantier pour **Lachat Construction Sàrl**, qui remplace BauBit PRO. « StepBuild » est le nom du programme
(titre de l'onglet, page de connexion, `APP_NAME`) ; le nom affiché dans la coque reste le réglage `app_name`
(« Lachat Construction », modifiable par l'admin). Dérivé du template **baseapp** (Laravel 13 API + React SPA).
Les documents de référence sont dans `_construction/` (non versionné) :
- `Offres et plans du logiciel/Plan de création - Logiciel de chantier.docx` — **spécification fonctionnelle** (à relire avant chaque phase).
- `Offres et plans du logiciel/Offre - Logiciel de chantier.docx` — périmètre, phases, planning (mise en production 1er janvier 2027).
- `Captures Baubit/Captures d'écran/` — écrans BauBit à reproduire (projets, rapports journaliers, contrôle des heures, devis, listes de prix).
- `Documents Baubit/` — devis type, tableaux Excel de suivi de facturation et synthèses employés.
- `DataBaubit/Backup/` — sauvegardes SQL Server BauBit (`.bak`) pour la reprise des données (phase 6).

## Phases (ordre revu le 21.09.2026)
Le périmètre de l'offre est inchangé, mais l'ordre a été revu avec le client : **le devis
(étapes + positions) passe juste après les projets**, car les rapports se saisissent sur les
étapes du devis. PDF, acomptes, factures et statistiques restent plus tard. Source de vérité
pour l'affichage : `frontend/src/lib/phases.ts`.
| Phase | Contenu | État |
|-------|---------|------|
| 0 | Socle, rôles, interface (logique BauBit, habillage moderne, charte Lachat) | **fait** |
| 1 | Adresses, catalogue (chapitres = modèles d'étapes), éléments de coûts, recherche instantanée | **fait** (API + front) ; reste : import de listes de prix |
| 2 | Projets : fiche, numérotation par NPA, statuts, adresses nommées, photos ; projet courant de la barre de contexte | **fait** (API + front) |
| 3 | Devis : création depuis le projet, étapes depuis les modèles, saisie rapide des positions, chiffrage, récapitulation, nouvelle version ; création d'article à la volée ; aperçu et PDF | **fait** (API + front) |
| 4 | Rapports journaliers sur les étapes du devis, workflow en cours → en contrôle → facturé ; collaborateurs | **fait** (API + front) |
| 5 | Régie (brut → régie → client sur chaque ligne de rapport), contrôle des heures, absences | **fait** (API + front) |
| 6 | Acomptes, factures, facture finale, export PDF ; statistiques | à faire — **prochaine étape** |
| 7 | Reprise des données BauBit, mise en production Infomaniak | **mécanisme de déploiement prêt** (GitHub Actions → Infomaniak, `DEPLOY.md`) ; **import catalogue + éléments de coûts BauBit prêt** (`stepbuild:import-baubit`) ; reste : mise en ligne effective, reprise adresses / projets / devis / rapports |
| 8 | Vue mobile / tablette (ouvriers) | janvier 2027 |
| 9 | Widget de temps au bureau, stocks | **stocks faits** (rôle `stock`, vue `/stock`) ; widget de temps : janvier 2027 |

Jalons de l'offre inchangés : démo 1 fin octobre, logiciel fonctionnel le 1er décembre 2026,
mise en production le 1er janvier 2027.

**Exigence prioritaire : rapidité de saisie** (recherche < 100 ms dès la 2ème lettre, ligne de
rapport < 10 s au clavier, sauvegarde automatique, création d'article à la volée).

## Flux métier (différence voulue avec BauBit)
1. **Projet** (chantier : client, adresses, statut).
2. **Devis** créé aussitôt après : on y **choisit les étapes** du chantier depuis des **modèles
   d'étapes** (arborescence par corps de métier, avec leurs articles) et on chiffre.
3. **Rapports journaliers** : les heures, matériaux, machines et sous-traitants se saisissent
   **sur les étapes du devis** (pas sur une liste globale de types de travail).
4. **Régie / contrôle des heures** puis **facture** : tout se rattache au devis du projet.
Conséquence pour le modèle de données : `étape` appartient au devis (document), les lignes de
rapport référencent une étape du devis (`daily_report_hours.document_step_id`) ; les « modèles
d'étapes » sont des gabarits réutilisables.

## Rôles
- `admin` : tout (utilisateurs, configuration).
- `responsable` : chantiers, prix, régie, documents, contrôle, statistiques.
- `ouvrier` : ses rapports journaliers et les projets ; **jamais de prix ni de marges**
  (côté API : ne jamais exposer les montants aux ouvriers ; côté front : `canSeePrices()`).
- `stock` : **uniquement la vue des stocks** (`/stock`), sans aucun prix. Un compte qui n'a que ce rôle est servi dans
  une coque réduite (`components/stock/StockShell`, bascule dans `App.tsx` via `isStockOnly()`), toute autre adresse
  renvoie sur `/stock` ; côté API, les routes chantiers/rapports sont `roles:admin,responsable,ouvrier` et les stocks
  `roles:admin,responsable,stock`.

Comptes de démo (seeder, **hors production seulement**) : `admin@chantier.test`, `responsable@chantier.test`,
`ouvrier@chantier.test` — mot de passe `password`.

## Interface : logique BauBit, habillage moderne
Le client veut la **même logique de travail** que BauBit (cf. captures), pas une copie visuelle.
Coque : en-tête anthracite (logo, onglets du **ruban** `lib/ribbon.ts`, recherche), barre d'actions,
**barre Projet / Document** (contexte courant dans `lib/workspaceStore.ts`), **onglets d'espaces de
travail**, contenu, **barre d'état**. Charte Lachat dans `index.css` : `primary` (bleu), `accent`
(rouge, actions principales), `anthracite`. Composants dans `components/shell/` et `components/baubit/` :
- `Workspace` (barre d'outils + `AsidePanel` + contenu ; alimente barre d'état et libellé d'onglet),
- `DataGrid` (filtre par colonne, tri, lignes par statut ; **mode serveur** via `query` / `onQueryChange`), `GridPager`,
- `Form` (`Field`, `BbInput`, `BbSelect`, `BbTextarea`, `BbCheckbox`, `StatusSelect`, `SectionTitle`),
- `TabStrip`, `Toolbar` (`StandardTools` branchable : `onNew`, `formId`, `onUndo`, `onDelete`), `Tree`.

### Modèle d'une page branchée sur l'API (cf. `ClientsPage`, `CatalogPage`, `PriceListsPage`)
- Liste : `useResourceList(resource, gridQuery, filtres)` de `lib/crud.ts` ; la grille remonte ses
  filtres/tri (`GridQuery`), débouncés, traduits en `?filter[col]=…&sort=…` (trait `HandlesGridQuery`).
- Sélection dans l'URL : `useSelection()` → `?id=12` ou `?id=new` (la recherche globale ouvre ainsi une fiche).
- Fiche : react-hook-form + zod dans un composant **clé par id** ; `useEntityForm` assure la
  **sauvegarde automatique** (1,2 s après la frappe pour une fiche existante, 2 s pour créer une nouvelle fiche dès
  qu'elle est valide — validation silencieuse, focus conservé au remontage —, à la sortie du formulaire, Ctrl+S) et
  reporte les erreurs 422 sur les champs. État affiché dans la barre d'état. **Aucun bouton Enregistrer** dans les
  barres d'outils (`StandardTools` garde `formId` sans l'utiliser).
- Prix saisis en texte (`1'042,50` accepté) → `toNumber()`.

### Recherche instantanée (Ctrl+K)
`GET /api/search/index` fournit un index compact, chargé une fois ; `lib/searchIndex.ts` cherche
**en mémoire** (sans réseau) : tous les mots, sans accents ni casse, débuts de mots et éléments les
plus utilisés d'abord, seconde passe tolérante aux fautes via le vocabulaire de l'index.
Mesuré : < 2 ms en recherche normale, < 30 ms au pire sur 10 000 éléments. Les mutations de
`lib/crud.ts` invalident `['search-index']`. `GET /api/search?q=` existe aussi côté serveur (API, mobile).
Tout nouveau module cherchable (projets…) doit être ajouté à `SearchController::index()`.

### Projets (phase 2)
- **Lecture pour tous les rôles**, écriture `roles:admin,responsable`. Front : `canManage` dans `ProjectsPage`
  (fiche en lecture seule pour l'ouvrier).
- **Numéro** = NPA du chantier + séquence sur 3 chiffres (habitude BauBit : `2853-055`).
  `GET /api/projects/next-number?zip=` ; proposé automatiquement à la saisie du NPA, modifiable, unique
  parmi les projets non supprimés.
- Adresse principale du chantier sur `projects` ; adresses supplémentaires **nommées** dans
  `project_addresses` (recopie des coordonnées du carnet, modifiables).
- **Photos** : disque privé `local` (`storage/app/private/projects/{id}`), servies par **lien signé
  temporaire** (`project-photos.file`, 6 h) car une balise `<img>` n'envoie pas le token. Pas besoin de
  `storage:link`. En production : dossier `storage/` inscriptible et inclus dans les sauvegardes ;
  `upload_max_filesize` / `post_max_size` ≥ 10 Mo par photo (12 photos max par envoi).
- Le **projet courant** (`workspaceStore.projectId`, numérique) est reflété dans l'URL (`?projet=12`, composant
  `components/shell/WorkspaceUrlSync` : rechargement, lien collé et bouton Retour le conservent ; sur `/projets` c'est `?id=`).
  Il est choisi dans la barre de contexte ou en
  ouvrant une fiche ; les modules suivants (devis, rapports) doivent s'y rattacher.
- Composants : `components/projects/` (`ProjectForm`, `ProjectAddressesTab`, `ProjectPhotosTab`), hooks `hooks/useProjects.ts`.

### Devis (phase 3)
- `documents` (type `devis` | `acompte` | `facture`, même base pour la phase 6) → `document_steps` →
  `document_positions`. Numéro automatique par projet et par type : `2853-055-DE.1` (`Document::createForProject`).
  Destinataire = **instantané** du client du projet, modifiable sans toucher au carnet.
- **Étape** = étape du chantier. Créée depuis un **modèle** (chapitre du catalogue, `catalog_chapter_id`, avec ou
  sans ses articles) ou libre. Les rapports journaliers (phase 4) devront référencer `document_steps.id`.
- **Position** : `item` (chiffrée), `title`, `text`. Depuis un article du catalogue (prix repris, `usage_count`
  incrémenté) ou libre. `amount = quantité × prix` calculé dans le modèle ; `is_optional` = affichée hors total.
- **Totaux** recalculés côté serveur (`Document::recalculate`) : net hors options, rabais %, TVA (8.1 % par défaut),
  **arrondi à 5 centimes**, TTC. Chaque action d'étape ou de position **renvoie le document complet** ; le front
  remplace le cache (`useDocumentActions` dans `hooks/useDocuments.ts`), sans rechargement.
- **Saisie rapide** (`components/documents/`) : `ArticlePicker` par étape cherche en mémoire dans
  `/api/catalog-articles/picker` ; Entrée insère, puis quantité → Entrée → prix → Entrée → retour au champ d'ajout.
  Sans résultat : ligne libre, ou **création de l'article à la volée** dans le chapitre de l'étape. La loupe du champ ouvre
  `ArticleBrowserDialog` (chapitres en arbre, recherche en mémoire, double-clic ou Entrée insère, « Insérer et
  continuer ») ; même principe pour les éléments de coûts avec `components/shared/ElementBrowserDialog` (groupes,
  recherche serveur) depuis `ElementPicker` (rapports, sous-détail). `DataGrid` a reçu `onActivate` (double-clic).
  `PositionRow` garde un brouillon local (enregistré à la sortie de ligne ou après 1,5 s) : ne pas resynchroniser
  ses champs depuis le serveur pendant la saisie.
  Réordonnancement par **glisser-déposer** natif (poignée `data-handle`, dépose dans l'étape ou vers une autre étape :
  `updatePosition` avec le nouveau `document_step_id` puis `reorderPositions`) ; au clavier, flèches sur la poignée.
- **Sous-détail de prix** par position (fenêtre ouverte depuis la ligne, icône calculatrice) : remplace les formules
  notées en « remarques internes » dans BauBit. `document_position_costs` = lignes par famille (1 MO, 2 MAT, 3 MACH,
  4 MAT EX, 5 OUT, 6 ST = familles des éléments de coûts, `price_element_id` facultatif) : quantité (× `dimension`
  de la position si `per_dimension`, arrondie au conditionnement `pack_size`) × coût unitaire → `cost`, majorée →
  `sale`. La position reçoit `cost_price` (coût, alimente la marge) et `calculated_price` (vente), divisés par la
  dimension si `price_per_dimension`. `PUT /documents/{id}/positions/{pos}/breakdown` remplace tout le sous-détail ;
  `apply_price` reporte le prix calculé dans `unit_price` (sinon le prix reste saisi à la main, écart affiché).
  Front : `CostBreakdownDialog` (autosave 1 s, sauvegardes en file) + `BreakdownLinesTable` (tableau partagé),
  familles et calcul dans `lib/costFamilies.ts`, brouillons de lignes dans `lib/breakdown.ts`.
- **Sous-détails types** (`breakdown_templates` → `breakdown_template_lines`, page `/sous-details-types`) : la
  bibliothèque d'ouvrages du métreur (110 ouvrages transcrits de « Remarques avec calculs devis », dans
  `database/data/breakdown_templates.json`, chargés par `BreakdownTemplateSeeder` dans **tous** les environnements,
  jamais écrasés une fois présents). Conventions du métreur : main-d'œuvre vendue **750.- la personne-jour, 90.-
  l'heure** (lignes MO à prix de vente, majoration 0), prix fournisseurs **+30 %**. Dans la fenêtre du sous-détail,
  `TemplatePicker` charge un modèle (lignes remplacées, DIM saisie conservée, `POST …/used` compte l'usage) ;
  « Enregistrer comme sous-détail type » crée un modèle depuis une position. `catalog_article_id` est prévu pour
  rattacher un modèle à un article à la reprise du catalogue BauBit (chargement automatique à l'insertion).
- **Le détail se présente comme la feuille imprimée** (`DocumentEditor`) : feuille blanche de 869 px sur fond gris, zone
  imprimée de 717 px aux proportions des colonnes du PDF (police Helvetica 14 px, descriptions qui passent à la ligne
  comme sur le papier), **numéro imprimé en direct** (`lib/documentNumbering.ts`, même règle que `DocumentPrint::steps`),
  titres d'étape et sous-titres en gras, textes en italique, total brut en bas. Le code du catalogue n'est plus saisi dans
  la ligne (info-bulle sur le numéro). Outils hors zone imprimée : poignée à gauche ; option, sous-détail, corbeille à
  droite. Attention : `.bb input/textarea/button { font: inherit }` (index.css, hors couche) l'emporte sur les
  utilitaires Tailwind de police → graisse, italique et taille se posent sur la cellule ou un `<span>`, pas sur le champ.
- **Sous-titres et textes** : le champ d'ajout d'une étape propose « Ajouter comme sous-titre » / « comme texte » (`kind`
  `title` | `text`). **Lignes sans quantité** : `POST /documents/{id}/positions/prune` (option `step_id`) retire les
  positions `item` sans quantité ; bouton « − n sans quantité » sur chaque étape et bouton global dans la barre d'outils.
  Une ligne sans quantité mais avec prix (« Ouvrier qualifié H. 90.- ») est légitime sur un devis Lachat : elle s'imprime.
- **Aperçu et PDF** (onglet « Aperçu », `GET /documents/{id}/pdf`, `?download=1`) : `App\Support\DocumentPrint` +
  vue `resources/views/pdf/document.blade.php`, rendus par **dompdf** (`barryvdh/laravel-dompdf`). Calqué sur le devis
  type Lachat : page de garde (logo, destinataire, « Bassecourt, le … /initiales », projet, récapitulation par étape, TVA,
  conditions de paiement, signature du donneur d'ordre), puis détail des positions ; en-têtes et pieds dessinés par
  `page_script` (n° TVA en page 1, rappel du document ensuite, « Page x de n »). **Numérotation continue à l'impression**
  (`DocumentPrint::steps`) : étape 5, positions 5.1, 5.2 ; un sous-titre 6.1 ouvre 6.1.1. Coordonnées et textes par défaut
  de l'entreprise dans `config/company.php` (surchargeables par `COMPANY_*`), logo dans `resources/images/`.
  Remarques internes et sous-détails ne sont jamais imprimés. Pas encore d'options d'impression (sans prix, etc.).
- Marge affichée dans la récapitulation (usage interne, seuil 30 %), calculée sur les positions ayant un prix de revient
  (sous-détail ou prix d'achat).
- Tout le module est réservé à `roles:admin,responsable` (prix). `POST /documents/{id}/duplicate` crée la version suivante.
- **Modèles de devis** (`quote_templates` → `quote_template_steps`, page `/modeles-devis`) : jeu d'étapes
  (chapitres, avec ou sans articles, ou libres), un seul `is_default`. `POST /projects/{id}/documents`
  applique le modèle choisi (`quote_template_id`), sinon le modèle par défaut ; `null` = devis vide.
  `POST /quote-templates/{t}/apply/{doc}` ajoute les étapes manquantes à un devis ;
  `POST /documents/{doc}/save-as-template` crée un modèle depuis un devis. Import des articles :
  `DocumentStep::importArticles()` (partagé par étapes et modèles).

### Rapports journaliers (phase 4)
- **Accès tous rôles** : la gestion voit tout ; l'ouvrier ne voit que **ses** rapports (créés par lui, dont il est
  responsable ou où il a des heures — `DailyReport::scopeVisibleTo`) et **jamais un montant** (`DailyReportResource`
  n'émet `hourly_cost`, `amount`, `unit_cost`, `total_amount` que si `User::canSeePrices()`). Trait
  `AuthorizesDailyReports` : 404 si invisible, 403 si non modifiable.
- **Workflow** `en_cours → en_controle → facture` : la gestion modifie tout sauf un rapport facturé (retour de statut
  possible) ; l'ouvrier modifie ses rapports en cours et peut seulement les passer « en contrôle ».
- `daily_reports` : numéro `001` par projet, rattaché au **devis accepté** du projet sinon au dernier
  (`DailyReport::defaultDocumentId`), responsable = collaborateur lié au compte (`collaborators.user_id`).
  Devis accepté → projet **adjugé** automatiquement (`DocumentController::update`).
- **Heures** (`daily_report_hours`) = cellule collaborateur × étape du devis, ou × type de travail (`work_types` :
  samedi, repas, km, formation ; seule l'unité `h` compte dans les heures et le coût). Une ligne sans étape ni type =
  présence dans le rapport. `PUT /daily-reports/{id}/hours` enregistre une cellule (0 = effacée) ; `copy-team` reprend
  l'équipe du rapport précédent. `hourly_cost` = instantané du tarif du collaborateur.
- **Ressources** (`daily_report_items`, familles 2–6 des éléments de coûts) et **fichiers/photos**
  (`daily_report_files`, disque `local`, lien signé `daily-report-files.file`). Totaux `total_hours` (productives) et
  `total_amount` (coût brut) recalculés par `DailyReport::recalculate()` ; chaque action renvoie le rapport complet.
- Front : `pages/DailyReportsPage` (liste du projet courant, en-tête `ReportHeaderForm` avec autosave, onglets
  BauBit), `components/reports/HoursGrid` (Entrée = ligne suivante, flèches, enregistrement à la sortie de cellule),
  `ReportItemsTab`, `ReportFilesTab`, `components/shared/ElementPicker` (partagé avec le sous-détail de prix).
  Hooks `hooks/useDailyReports.ts`. Collaborateurs : `/collaborateurs` (`CollaboratorsPage`, gestion).
- Reste pour la phase 6 : statut « facturé » alimenté par la facturation (facture finale depuis les rapports validés).

### Régie et contrôle des heures (phase 5)
- **Trois niveaux de prix sur chaque ligne de rapport** (heures `daily_report_hours` et ressources
  `daily_report_items`) : brut = coût (`hourly_cost` / `unit_cost`), **régie** (`regie_price`, tarif majoré de
  l'entreprise), **client** (`client_price`, prix final) ; montants `amount` / `regie_amount` / `client_amount`,
  totaux `total_amount` / `total_regie` / `total_client` sur le rapport. Calcul dans `App\Support\RegiePricing` :
  - heures → **position régie du collaborateur** (`collaborators.regie_element_id` = élément de coûts de la famille
    1 Salaire, ex. « 010.010 Chef d'équipe 98.- »), surchargeable par `collaborators.regie_price` ;
  - ressources → `price_elements.regie_price`, sinon coût brut × (1 + majoration), arrondi à 5 ct ;
  - prix client = prix régie par défaut. Les champs sont remplis dans les hooks `saving` des modèles si absents ;
    `applyTariffs()` (ligne ou rapport) réapplique les tarifs actuels et remet le client au régie.
  - Réglages (table `settings`, admin, **jamais exposés aux ouvriers** : `Setting::MANAGEMENT_KEYS`) :
    `regie_markup_percent` (30) et `work_day_hours` (9).
- **API régie** (`roles:admin,responsable`, `RegieController`) : `GET /regie/lines?project_id=&status=&from=&to=
  &collaborator_id=&all=1` (rapports `is_regie` seulement, sauf `all`) → lignes aplaties (`kind` hour | item, trois prix,
  trois montants, `locked` si facturé), les rapports et les totaux ; `PUT /regie/lines/{hour|item}/{id}`
  (`cost_price` / `regie_price` / `client_price` ; le client suit le régie tant qu'il n'a pas été fixé à part ; 403 si
  facturé) ; `POST /regie/apply-tariffs` (`project_id` ou `report_ids`, rapports non facturés).
- **Contrôle des heures** (`HoursControlController`) : `GET /hours-control?month=AAAA-MM` (collaborateurs : heures
  productives, rapports en cours, absences), `GET /hours-control/{collaborator}?month=` (matrice projets × jours,
  cellule = `{hours, status, report_ids}`, statut `en_cours` si un rapport du jour l'est encore), `POST
  /hours-control/{collaborator}/validate?month=` (rapports en cours où il a des heures → en contrôle).
  Seules les heures productives comptent (étape du devis ou type de travail en `h`). Attention MySQL
  `only_full_group_by` : préfixer les colonnes dans les agrégats.
- **Absences** (`collaborator_absences`, une par collaborateur et par jour, types `CollaboratorAbsence::TYPES`) :
  `POST /collaborators/{id}/absences` `{from, to?, type, hours?, note?}` (période → jours ouvrés ; 0 h efface).
- **Types de travail** : `apiResource('work-types')` store/update/destroy (gestion) ; un type utilisé est désactivé
  au lieu d'être supprimé ; `GET /work-types?all=1` inclut les inactifs.
- Front : `pages/RegiePage` (lignes du projet courant groupées par rapport, `components/regie/PriceCell` éditable en
  place, onglet Récapitulation par famille et par rapport, marge affichée ; hooks `hooks/useRegie.ts` : la ligne
  renvoyée remplace celle du cache et les totaux sont recalculés localement), `pages/HoursControlPage` (mois et
  collaborateur dans l'URL `?mois=&collaborateur=`, couleur de cellule = statut du rapport, clic = ouvre le rapport,
  ligne « Vacances / absences » cliquable → `components/hours/AbsenceDialog`, hooks `hooks/useHoursControl.ts`),
  `components/reports/WorkTypesEditor` sur la page Collaborateurs (avec position régie et tarif régie propre),
  réglages de régie dans `SettingsPage`.
- `lib/demo.ts` et le badge « Données d'exemple » ont disparu : tout est branché sur l'API. `DemoDataSeeder` charge
  des données **fictives** en environnement `local` uniquement (deux chantiers avec devis et rapports d'août 2026,
  absences, positions régie des collaborateurs).

### Stocks (phase 9, livré en avance le 08.10.2026)
- `stock_items` (un élément de coûts suivi : `price_element_id` unique, `quantity`, `min_quantity` = seuil « à
  commander », `location`, `note`, `counted_at` / `counted_by`) et `stock_movements` (`type` entree | sortie | inventaire,
  `quantity` signée, `quantity_after`, `user_id`, `note`). `StockItem::apply()` est le seul chemin de modification de la
  quantité ; `status()` = a_compter (jamais compté) | rupture (≤ 0) | bas (≤ seuil) | ok. Familles stockables : 2 à 5
  (pas salaire ni tiers).
- **Les stocks survivent à toutes les reprises** : les éléments gardent leur id (`import-baubit` retrouve un élément par
  clé BauBit, sinon par code régie + numéro + désignation, sinon numéro + désignation, et ne supprime jamais rien) ;
  **un élément suivi en stock garde son identité** (famille, groupe, numéro, désignation, unités, code régie :
  `BaubitImport::keepStockedIdentity()`), seuls ses prix suivent BauBit ;
  `stock_items` / `stock_movements` font partie du transfert local → prod (`DataTransfer`) ; un élément suivi en stock
  ne peut pas être supprimé définitivement (`PriceElement::deleting`), la corbeille laisse le produit visible.
- **Liste client** : `backend/database/baubit/elements_xlsx_to_json.py` convertit un export Excel BauBit des éléments
  de coûts en JSON, puis `php artisan stepbuild:import-stock-list <json> [--dry-run] [--no-prices] [--no-stock]`
  (`App\Support\StockListImport`) retrouve chaque élément (code régie + numéro + désignation), crée les inconnus
  (`baubit_id` = `XLS-<code>`), rafraîchit les prix dont la « mutation » est plus récente, et met l'article en stock
  « à compter ». Fait le 08.10.2026 avec `_construction/Matériaux 2026.xlsx` (9 988 lignes, famille 2).
- API `StockController` : `GET /stock/items` (tout, la vue filtre en mémoire), `GET /stock/products?search=` (éléments
  pas encore suivis, **sans prix**), `POST /stock/items`, `PUT|DELETE /stock/items/{id}`, `POST
  /stock/items/{id}/movements` (renvoie `item` + `movement`), `GET /stock/items/{id}/movements`. Aucune ressource stock
  n'émet de prix.
- Front : `pages/StockPage` (une seule page : recherche instantanée, filtres Tous / À commander / Rupture, colonne
  Quantité saisie au clavier **« 12 » = inventaire, « +5 » = entrée, « -3 » = sortie, Entrée = ligne suivante**, seuil
  et emplacement éditables en place, historique dépliable, ajout depuis le catalogue par `ProductPicker`), hooks
  `hooks/useStock.ts` (le produit renvoyé remplace celui du cache). Pour admin/responsable la page est dans la coque
  normale (Données de base → Stocks).

### Unités de mesure
Table `units` (code imprimé, libellé, ordre, actif), `Unit::DEFAULTS` = codes BauBit du devis type (M1, M2, M3, H., Jour,
Pce…), créées par `Unit::seedDefaults()` dans `DatabaseSeeder` (tous environnements, jamais écrasées). `GET /units`
pour tous les rôles ; store/update/destroy/reorder pour la gestion. Les positions, articles et éléments gardent
l'unité **en texte** (code) : supprimer ou désactiver une unité ne touche pas aux données. Front :
`components/shared/UnitSelect` (liste + valeur actuelle hors liste conservée, remonté quand la liste arrive pour
react-hook-form) dans `PositionRow` et le formulaire d'article ; éditeur `components/settings/UnitsEditor` sur la
page Configuration.

### Reprise BauBit (phase 7)
- Sauvegardes SQL Server dans `_construction/DataBaubit/Backup/Backup/*.bak` (SQL Server 2019, base
  `LACHATCONSTRUCTION`). Lecture **sans rien modifier** via Docker : conteneur `baubit-sql`
  (`mcr.microsoft.com/mssql/server:2022-latest`, dossier des sauvegardes monté sur `/backup`, mot de passe sa
  `Baubit!2026Restore`, port 14333), `RESTORE DATABASE LACHAT … WITH MOVE`, requêtes par
  `docker exec baubit-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P … -C -d LACHAT -Q "…"`.
- Tables utiles : `CostElement` + `CostElementPrices` (éléments de coûts : `CEL_SubTypeCode` = famille 1–6,
  `CEL_Group` « 92 », `CEL_Number` stocké **sans point** « 020000 », `CEL_RegieCode` « 2.020.000 »), `RegiePosition` +
  `RegiePricePerCategory` (tarif régie, catégorie 18 = Vente ; les **salaires 1.010.xxx n'existent que là**),
  `FreeChapter` / `FreePosition` / `FreePricePerCategory` (catalogue libre : 5 catalogues, codes `Code_1..4`, texte
  brut `FPO_NamePlain_F`, prix 18 Vente / 19 Achat ; le catalogue « Devis - prix H., M1, M2, M3 » = nos 19 chapitres
  00–18), `Project` / `ProJob` (étapes de projet) / `Document` / `DocumentPosition` / `DailyReportHeader|Detail` /
  `WorkingTime` / `RecipientAddress` / `Users` pour la suite de la reprise.
- Export JSON (`bcp … FOR JSON PATH`) dans `_construction/DataBaubit/export/` (`elements`, `regie_positions`,
  `catalog_chapters`, `catalog_positions`, `units`), puis **`php artisan stepbuild:import-baubit <dossier> [--dry-run]
  [--catalog|--elements] [--root-catalog=1]`** (`App\Support\BaubitImport`) : chapitres, articles et éléments reçoivent
  leur clé d'origine dans `baubit_id` (migration du 08.10.2026), l'import est relançable (chapitres retrouvés par code,
  articles par chapitre + code + sous-code). **Employés** (`users.json`, `--collaborators`) → collaborateurs : nom,
  prénom, coût horaire `USE_SalaryPerHour`, actif, position régie = fonction la plus utilisée dans ses rapports
  (`UserFunction.UFU_PositionNumber` → élément famille 1 de même code régie) ; comptes techniques ignorés, partis repris
  inactifs. Validé sur la base de test : 12 519 éléments + 21 tarifs régie, 64 collaborateurs, 1 221 positions.
- Adaptations faites pour ces données : unités BauBit ajoutées à `Unit::DEFAULTS` (Litre, Pqt, Bidon, Bte, Fr., Mois,
  Km, Up, Approx…) ; `price_elements.price_updated_at` = date du dernier changement de prix (« Mutation de » BauBit,
  mise à jour automatiquement dans `PriceElement::booted()` quand un prix change, colonne « Prix du » de la liste).

## Modules et routes front
Navigation dans `frontend/src/lib/navigation.ts` (groupes calqués sur les rubans BauBit),
filtrée par rôle. Pages dans `frontend/src/pages/` :
`/dashboard`, `/projets`, `/clients`, `/rapports`, `/regie`, `/controle-heures`,
`/documents`, `/statistiques`, `/catalogue`, `/listes-prix`, `/modeles-devis`, `/sous-details-types`,
`/collaborateurs`, `/stock`, `/users`, `/settings`.
Les modules non développés utilisent `components/ModulePlaceholder.tsx` : **remplacer**
le placeholder par la vraie page lors de la phase concernée.

Statuts (libellés, codes BauBit, couleurs) dans `frontend/src/lib/status.ts`.
Phases du projet : `frontend/src/lib/phases.ts` (mettre à jour `status` ; n'alimente plus que la barre d'état, la liste a été retirée du tableau de bord le 08.10.2026).

## ⚠️ Piège PHP (IMPORTANT)
Le `php` du PATH Windows est en **8.1** (trop vieux pour Laravel 13, qui exige **PHP >= 8.3**).
- Backend : `backend\artisan.bat <cmd>` (choisit le PHP 8.4 de WAMP) ou
  `D:\wamp64\bin\php\php8.4.24\php.exe artisan <cmd>`.
- Composer/tests : `$env:Path = 'D:\wamp64\bin\php\php8.4.24;' + $env:Path`.

## Démarrer
- **`dev.bat`** (racine) lance le backend (`:8001`) + le frontend (`:5174`). **WAMP (MySQL) doit tourner.**
- Base MySQL : `app_chantier`. Plusieurs projets dérivés de baseapp partagent les ports → **un seul lancé à la fois**.

## Stack
- **Backend** : Laravel 13, PHP 8.4, Sanctum (token), spatie/laravel-permission (rôles),
  spatie/laravel-activitylog (audit), Pest, Pint, Telescope (dev). MySQL (WAMP).
- **Frontend** : React 19, Vite, TypeScript, TailwindCSS v4 (couleur `primary-*` définie
  dans `index.css`), TanStack Query, react-hook-form + zod, axios, react-router-dom.
  Icônes inline dans `components/icons.tsx` (pas de dépendance).

## Conventions backend
- **Validation** → Form Requests (`app/Http/Requests`).
- **Sorties** → API Resources (`app/Http/Resources`) ; listes **paginées**.
- **Accès** → middleware `admin`, ou `roles:admin,responsable` (`EnsureUserHasAnyRole`) pour la gestion.
- **Listes** → trait `HandlesGridQuery` (search, filter[col], sort, dir, per_page) ; **recherche** → trait
  `HasSearchText` (colonne `search_text` sans accents, scope `search`).
- **Erreurs API** → JSON uniforme (401/404 dans `bootstrap/app.php`).
- **Modèles** → soft deletes + journal d'activité (cf. `User`) ; indispensable pour la
  traçabilité des prix de régie et de la facturation.

## Conventions frontend
- **Données** → hooks TanStack Query (`src/hooks/useX.ts`). Pas de `fetch` manuel dans les pages.
- **Formulaires** → react-hook-form + zod.
- **UI** → `src/components/ui` : Button, Input, Select, Modal, Spinner, PageHeader, Card, Badge, EmptyState.
- **Accès par rôle** → `<RoleRoute roles={[...]} />` dans `App.tsx`, `hasRole()` dans `lib/roles.ts`.
- **Notifications** → `toast()` de `src/lib/toast.ts`.

## Ajouter une entité métier (ex. `Project`)
1. `backend\artisan.bat make:model Project -m`, éditer la migration, `backend\artisan.bat migrate`.
2. `ProjectResource`, `StoreProjectRequest`, `ProjectController` (CRUD paginé, recherche `?search=`).
3. Routes dans `routes/api.php` sous `auth:sanctum` (+ `roles:` selon le module).
4. Front : hook `useProjects` → page (remplace le placeholder) + formulaire + kit UI.
5. Test Pest dans `backend/tests/Feature`.

## Qualité
- Tests : `backend\artisan.bat test` (Pest, SQLite en mémoire).
- Format PHP : `composer pint` (PHP 8.4). Vérif : `composer pint:test`.
- Front : `npm run lint` et `npm run build` (dans `frontend/`).

## Base de données
- Schéma **uniquement via des migrations**. phpMyAdmin : http://localhost/phpmyadmin (`root`, sans mot de passe).

## Ne jamais committer
`.env`, `vendor/`, `node_modules/`, `frontend/dist/`, `storage/*`, `_construction/` (données client).

## Mode d'emploi client
`docs/Mode d'emploi - StepBuild.pdf`, généré par `docs/manuel/` : `npm run captures` (puppeteer sur
Chrome, données d'exemple ; `FRONT_URL` / `API_URL` pour d'autres ports) puis `npm run pdf` (reportlab,
`build_manual.py`, police Helvetica → caractères WinAnsi seulement). **À compléter à chaque phase livrée**
(chapitre par module, version et date en tête du script).

## Déploiement
Voir `DEPLOY.md`. Même méthode que app-planningchantier : **un seul domaine**
`planning.lachatconstruction.ch` (doc root → `backend/public`, build Vite copié dans `public/`,
`routes/web.php` renvoie `index.html` hors `/api`, `lib/api.ts` appelle l'API en relatif en production).
`.github/workflows/deploy.yml` déploie à chaque push sur `master` après la CI (`ci.yml` : Pest SQLite **et**
MySQL, Pint, ESLint, build) : maintenance, `git merge --ff-only`, Composer, **`backup:run` obligatoire**
avant `migrate --force`, `db:seed --class=DatabaseSeeder --force`, rsync du front, `optimize`, contrôle de
`/api/health`. Hébergement **temporaire** sur le compte Infomaniak de Step One, dossier
`apps/planning-chantier-lachat` ; passage prévu sur le compte du client (`DEPLOY.md` § 7 : seuls les
secrets GitHub, le `.env` et le DNS changent).
- **Production** : `DatabaseSeeder` ne crée **aucun compte de démo** en `APP_ENV=production` (rôles via
  `RolesSeeder`, unités, sous-détails types seulement). Premier compte : `php artisan stepbuild:admin <email>`
  (mot de passe généré et affiché une fois, `--password=`, ou `--mail` pour un lien).
- **Sauvegardes** : `App\Services\BackupService` (`backup:run`, mysqldump sinon dump PDO, rotation
  `BACKUP_KEEP`) dans `storage/app/private/backups`. Tâche planifiée Infomaniak par URL
  `GET /api/cron/run/{CRON_TOKEN}` → `stepbuild:cron` (sauvegarde si la dernière a plus de 20 h).
- **Reprise local → prod** : `stepbuild:export-data` (fichier SQL `storage/app/transfer/donnees-<date>.sql`, tables
  listées dans `App\Support\DataTransfer`, en-tête avec les migrations appliquées) puis, sur le serveur,
  `stepbuild:import-data <fichier>` (sauvegarde, refus si les migrations diffèrent, tables vidées puis remplies,
  connexions effacées ; **les comptes et rôles de la cible ne sont jamais touchés** : tables `DataTransfer::USER_TABLES`
  ignorées et colonnes `USER_REFERENCES` remises à vide ; `--with-users` les remplace, comptes `@chantier.test` alors mis
  à la corbeille). Les fichiers de `storage/app/private` se copient à part.
- `backend/.env.production.example` = modèle du `.env` de prod ; `backend/public/.user.ini` = limites
  d'envoi (photos) et mémoire (PDF). `release.ps1` = archive de secours sans GitHub.
Signature des documents client : « Stéphane Offreda — Step One ».
