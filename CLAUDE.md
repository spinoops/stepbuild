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

## Phases (cf. Plan de création)
| Phase | Contenu | État |
|-------|---------|------|
| 0 | Socle, rôles admin / responsable / ouvrier, navigation par modules | **en cours** (coque d'interface livrée) |
| 1 | Clients, catalogue d'articles, listes de prix, recherche instantanée | à venir |
| 2 | Projets : fiche, statuts, adresses, photos, arborescence d'étapes | à venir |
| 3 | Rapports journaliers (bureau), workflow en cours → en contrôle → facturé | à venir |
| 4 | Régie (brut → majoré → client), contrôle des heures | à venir |
| 5 | Documents (devis, acomptes, factures, PDF), statistiques | à venir |
| 6 | Reprise des données BauBit, mise en production Infomaniak | à venir |
| 7 | Vue mobile / tablette (ouvriers) | janvier 2027 |
| 8 | Widget de temps au bureau, stocks | janvier 2027 |

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

## Interface « façon BauBit »
La coque reproduit BauBit PRO (cf. captures) : barre de titre, **ruban** à onglets
(`lib/ribbon.ts`), **barre bleue Projet / Document** (contexte courant dans
`lib/workspaceStore.ts`), **onglets d'espaces de travail**, contenu, **barre d'état** double.
Composants dans `frontend/src/components/shell/` (coque) et `components/baubit/` (kit) :
- `Workspace` (barre d'outils + panneau `AsidePanel` + contenu, alimente barre d'état et onglet),
- `DataGrid` (en-tête bleu, ligne de filtre jaune fonctionnelle, tri, lignes colorées par statut),
- `Form` (`Field`, `BbInput`, `BbSelect`, `BbTextarea`, `BbCheckbox`, `StatusSelect`, `SectionTitle`),
- `TabStrip`, `Toolbar` (`StandardTools`, `ToolButton`, `ToolMenu`, `ToolSep`), `Tree`.
Les pages Projets, Rapports journaliers, Contrôle des heures, Documents, Catalogue,
Éléments de coûts et Adresses sont construites sur ce kit avec les **données d'exemple
fictives** de `lib/demo.ts` (à remplacer par les hooks API au fil des phases ; le badge
« Données d'exemple » de la barre d'état vient de la prop `demo` de `Workspace`).
Couleurs BauBit : tokens `bb-*` dans `index.css` ; classes de lignes par statut dans `lib/status.ts`.

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
- **Accès** → middleware `admin`, ou `role:admin|responsable` (spatie) pour la gestion.
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
3. Routes dans `routes/api.php` sous `auth:sanctum` (+ `role:` selon le module).
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
