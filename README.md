# app-chantier — logiciel de gestion de chantier

Application sur mesure pour **Lachat Construction Sàrl** (remplacement de BauBit PRO),
dérivée du template **baseapp** : une **API REST Laravel 13** (authentification par token
Sanctum) et un **front React (Vite + TypeScript + TailwindCSS)** servi séparément.

Spécification, offre et captures d'écran de référence : dossier `_construction/` (non versionné).
Contexte de développement détaillé : `CLAUDE.md`.

## Stack

| Côté      | Techno                                                                 |
|-----------|------------------------------------------------------------------------|
| Backend   | Laravel 13, PHP 8.3, Sanctum (tokens), Pest, Telescope (dev), MySQL    |
| Frontend  | React 19, Vite, TypeScript, TailwindCSS v4, axios, react-router-dom    |

```
app-chantier/
├── backend/    # API Laravel (http://localhost:8001)
└── frontend/   # SPA React (http://localhost:5174)
```

## Prérequis

- PHP **8.3+** (CLI) — sous WAMP, voir la note plus bas
- Composer 2
- Node **20+** et npm
- MySQL (fourni par WAMP)

## Installation

### 1. Backend

```bash
cd backend
composer install
copy .env.example .env          # (cp sous Linux/Mac)
php artisan key:generate
```

Créer la base puis migrer/seed :

```bash
# Crée la base 'app_chantier' (utf8mb4)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS app_chantier CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

php artisan migrate --seed
php artisan serve --port=8001   # http://localhost:8001
```

> Ajuste `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` dans `backend/.env` si besoin.

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env          # contient VITE_API_URL=http://localhost:8001
npm run dev                     # http://localhost:5174
```

## Comptes de démonstration

Créés par le seeder (mot de passe `password`) :

| Email                       | Rôle        | Accès                                              |
|-----------------------------|-------------|----------------------------------------------------|
| `admin@chantier.test`       | admin       | tout, y compris utilisateurs et configuration      |
| `responsable@chantier.test` | responsable | chantiers, prix, régie, documents, statistiques    |
| `ouvrier@chantier.test`     | ouvrier     | projets et rapports journaliers, sans les prix     |

## Endpoints API

| Méthode | URL            | Auth      | Description                          |
|---------|----------------|-----------|--------------------------------------|
| GET     | `/api/health`  | public    | Vérifie que l'API tourne             |
| POST    | `/api/login`   | public    | `{ email, password }` → `{ token, user }` |
| GET     | `/api/user`    | Bearer    | Utilisateur authentifié              |
| POST    | `/api/logout`  | Bearer    | Révoque le token courant             |

Le front stocke le token dans `localStorage` et l'envoie via l'en-tête
`Authorization: Bearer <token>` (voir `frontend/src/lib/api.ts`).

## Tests

```bash
cd backend
php artisan test            # ou: ./vendor/bin/pest
```

Les tests utilisent une base **SQLite en mémoire** (configurée dans `phpunit.xml`) :
ils ne touchent jamais la base MySQL de développement.

## Telescope (debug, local uniquement)

Accessible sur http://localhost:8001/telescope en environnement `local`.
Le paquet est en dépendance `--dev` et n'est chargé qu'en local (voir
`app/Providers/AppServiceProvider.php`), il ne s'exécutera pas en production.

## Note WAMP — PHP 8.4 en ligne de commande

WAMP permet plusieurs versions de PHP, mais le `php` du terminal dépend du `PATH`
Windows (souvent figé sur une ancienne version). Pour utiliser 8.4 en CLI :

- soit ajouter `D:\wamp64\bin\php\php8.4.x` **avant** l'ancienne entrée dans le `PATH`
  système (puis rouvrir le terminal) ;
- soit préfixer ponctuellement : `$env:Path = 'D:\wamp64\bin\php\php8.4.24;' + $env:Path`.
