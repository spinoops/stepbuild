# Déploiement (Infomaniak mutualisé)

Ce guide décrit la mise en production d'un projet dérivé de **baseapp** sur un
hébergement mutualisé Infomaniak.

## Principe clé

- Le **code** (dont les migrations) voyage par **Git**.
- Le **schéma** de la base se reconstruit avec `php artisan migrate --force`.
- Les **données** ne sont **jamais** copiées entre local et prod : chaque
  environnement a sa propre base.

## Prérequis (offre mutualisée payante)

- SSH, Composer, sélecteur de version PHP (**8.3+**), Git, cron : disponibles.
- **Pas de Node.js en prod** → on build le front **en local** et on envoie `frontend/dist/`.
- Le **dossier cible (doc root)** du domaine doit pointer sur **`backend/public`**
  (jamais la racine du projet).

## Architecture recommandée (2 sous-domaines)

| Domaine | Dossier cible | Contenu |
|---|---|---|
| `api.mon-domaine.tld` | `backend/public` | API Laravel |
| `mon-domaine.tld` | `frontend/dist` | SPA React (fichiers statiques) |

## 1. Première mise en ligne (une seule fois)

En SSH sur le serveur :

```bash
cd sites/api.mon-domaine.tld
git clone <url-du-depot> .
composer install --no-dev --optimize-autoloader

cp backend/.env.production.example backend/.env   # puis compléter (MySQL, URLs…)
php backend/artisan key:generate
php backend/artisan migrate --seed --force
php backend/artisan config:cache
php backend/artisan route:cache
```

Puis, dans le **Manager Infomaniak** : régler le doc root du domaine sur
`backend/public` (et un sous-domaine sur `frontend/dist`).

Enfin, envoyer le front (voir §2, étape build + upload).

## 2. À chaque déploiement (le geste répété)

**En local :**
```bash
npm --prefix frontend run build      # génère frontend/dist
git add . && git commit -m "…" && git push
```

**En prod (SSH) :**
```bash
git pull
composer install --no-dev --optimize-autoloader
php backend/artisan migrate --force          # applique les migrations, garde les données
php backend/artisan config:cache && php backend/artisan route:cache
# envoyer frontend/dist vers le dossier du front (rsync / FTP)
```

> `migrate --force` **ajoute / modifie** les tables sans toucher aux données
> existantes. Ne jamais copier la base locale par-dessus la prod.

## 3. Tâches planifiées (cron) — optionnel

Si le projet utilise le scheduler ou les files d'attente, ajouter dans le
gestionnaire de tâches Infomaniak :

```bash
# Scheduler Laravel (toutes les minutes)
php /chemin/vers/backend/artisan schedule:run

# Worker de file d'attente (ex. toutes les minutes, --stop-when-empty)
php /chemin/vers/backend/artisan queue:work --stop-when-empty
```

## 4. Automatiser (plus tard)

Une **GitHub Action** peut exécuter le bloc « §2 côté prod » à chaque `push`
sur `main` (build front + SSH + `migrate --force` + envoi du `dist`). Voir
`.github/workflows/` pour le point de départ (CI déjà en place).

## Rappels sécurité

- `APP_DEBUG=false` et `APP_ENV=production` en prod.
- Ne jamais committer le `.env` réel.
- Telescope ne se charge qu'en local (voir `AppServiceProvider`).
