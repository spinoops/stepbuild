# CLAUDE.md

Contexte pour Claude Code sur ce dépôt. À lire avant toute intervention.

## Projet
**app-chantier** — logiciel de gestion de chantier pour **Lachat Construction Sàrl**, qui
remplace BauBit PRO. Dérivé du template **baseapp** (Laravel 13 API + React SPA).
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
| 3 | Devis : création depuis le projet, étapes depuis les modèles, positions, chiffrage, récapitulation ; création d'article à la volée | à faire — **prochaine étape** |
| 4 | Rapports journaliers sur les étapes du devis, workflow en cours → en contrôle → facturé | à faire |
| 5 | Régie (brut → majoré → client), contrôle des heures | à faire |
| 6 | Acomptes, factures, facture finale, export PDF ; statistiques | à faire |
| 7 | Reprise des données BauBit, mise en production Infomaniak | à faire |
| 8 | Vue mobile / tablette (ouvriers) | janvier 2027 |
| 9 | Widget de temps au bureau, stocks | janvier 2027 |

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
rapport référencent une étape du devis ; les « modèles d'étapes » sont des gabarits réutilisables.
Côté front, `projectSteps()` / `documentSteps()` dans `lib/demo.ts` illustrent ce lien.

## Rôles
- `admin` : tout (utilisateurs, configuration).
- `responsable` : chantiers, prix, régie, documents, contrôle, statistiques.
- `ouvrier` : ses rapports journaliers et les projets ; **jamais de prix ni de marges**
  (côté API : ne jamais exposer les montants aux ouvriers ; côté front : `canSeePrices()`).

Comptes de démo (seeder) : `admin@chantier.test`, `responsable@chantier.test`,
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
  **sauvegarde automatique** (1,2 s après la frappe pour une fiche existante, à la sortie du formulaire,
  Ctrl+S) et reporte les erreurs 422 sur les champs. État affiché dans la barre d'état.
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
- Le **projet courant** (`workspaceStore.projectId`, numérique) est choisi dans la barre de contexte ou en
  ouvrant une fiche ; les modules suivants (devis, rapports) doivent s'y rattacher.
- Composants : `components/projects/` (`ProjectForm`, `ProjectAddressesTab`, `ProjectPhotosTab`), hooks `hooks/useProjects.ts`.

### Données d'exemple restantes
Rapports, contrôle des heures et documents utilisent encore `lib/demo.ts` (avec leur propre
sélection `DEMO_CONTEXT`, découplée du projet courant réel ; badge « Données d'exemple » via la prop
`demo` de `Workspace`). À remplacer au fil des phases 3 à 6.
Côté base, `DemoDataSeeder` charge des données **fictives** en environnement `local` uniquement.

## Modules et routes front
Navigation dans `frontend/src/lib/navigation.ts` (groupes calqués sur les rubans BauBit),
filtrée par rôle. Pages dans `frontend/src/pages/` :
`/dashboard`, `/projets`, `/clients`, `/rapports`, `/regie`, `/controle-heures`,
`/documents`, `/statistiques`, `/catalogue`, `/listes-prix`, `/users`, `/settings`.
Les modules non développés utilisent `components/ModulePlaceholder.tsx` : **remplacer**
le placeholder par la vraie page lors de la phase concernée.

Statuts (libellés, codes BauBit, couleurs) dans `frontend/src/lib/status.ts`.
Phases affichées sur le tableau de bord : `frontend/src/lib/phases.ts` (mettre à jour `status`).

## ⚠️ Piège PHP (IMPORTANT)
Le `php` du PATH Windows est en **8.1** (trop vieux pour Laravel 13, qui exige **PHP >= 8.3**).
- Backend : `backend\artisan.bat <cmd>` (choisit le PHP 8.4 de WAMP) ou
  `D:\wamp64\bin\php\php8.4.24\php.exe artisan <cmd>`.
- Composer/tests : `$env:Path = 'D:\wamp64\bin\php\php8.4.24;' + $env:Path`.

## Démarrer
- **`dev.bat`** (racine) lance le backend (`:8000`) + le frontend (`:5173`). **WAMP (MySQL) doit tourner.**
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

## Déploiement
Voir `DEPLOY.md` (Infomaniak mutualisé du client : doc root → `backend/public`, build front en
local, `migrate --force` en prod). Signature des documents client : « Stéphane Offreda — Step One ».
