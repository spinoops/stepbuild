# Déploiement (Infomaniak mutualisé)

Mise en production de **StepBuild** (logiciel de chantier de Lachat Construction) sur **https://planning.lachatconstruction.ch**,
avec la même méthode que Planning Chantier, ProTime-Cuttat et StepWork : code par Git,
déploiement automatique par GitHub Actions. Le §5 est le runbook de la première mise en ligne.

**Hébergement temporaire** : le site est d'abord installé sur l'hébergement Infomaniak de
Step One (compte « amis »), dans le dossier `apps/planning-chantier-lachat`. Il passera ensuite
sur le compte Infomaniak du client (§7) : seuls les secrets GitHub et le `.env` changent, le
dépôt et la méthode restent les mêmes.

## Principe clé

- Le **code** (dont les migrations) voyage par **Git**.
- Le **schéma** de la base se reconstruit avec `php artisan migrate --force`.
- Les **données** ne sont **jamais** copiées entre local et prod : la base locale est une base
  de démo (`DemoDataSeeder`), la production démarre vide (rôles, unités, sous-détails types) et
  se remplit en ligne — ou par la reprise des données BauBit (phase 7).

## Prérequis (offre mutualisée payante)

- SSH, Composer, Git : disponibles. PHP **8.4** (site **et** ligne de commande, voir §5.C),
  extensions `gd` (PDF dompdf, photos) et `zlib` (sauvegardes) : présentes chez Infomaniak.
- **Pas de Node.js en prod** → le front est buildé sur GitHub et envoyé par l'Action.
- Le **dossier cible (doc root)** du domaine pointe sur **`backend/public`**
  (jamais la racine du projet).
- **HTTPS** obligatoire (certificat Let's Encrypt du Manager).
- Envoi de photos : `upload_max_filesize` ≥ 12 Mo et `post_max_size` ≥ 130 Mo (12 photos de
  10 Mo par envoi). `backend/public/.user.ini` les règle ; si l'hébergeur ne l'applique pas,
  les régler dans le Manager (PHP → paramètres).

## Architecture : un seul domaine

Interface React et API vivent sur le **même domaine** : doc root `backend/public`, API
sous `/api/...`, build Vite (`frontend/dist/*`) copié dans `backend/public/`.
`routes/web.php` renvoie `index.html` pour toute URL hors `/api` (routage côté client) ;
`public/.htaccess` envoie le reste à Laravel et transmet l'en-tête `Authorization`.
Le front appelle l'API en relatif (`lib/api.ts` : sans `VITE_API_URL`, adresse relative
en production). Avantages : un certificat, pas de CORS, liens signés des photos sur le
même domaine.

## 1. À chaque déploiement (le geste répété)

```bash
git add . && git commit -m "…" && git push
```

C'est tout : l'Action du §2 fait le reste. Ce qu'elle exécute, pour mémoire (et pour un
déploiement manuel en SSH si GitHub est indisponible, voir aussi §6) :

```bash
cd ~/apps/planning-chantier-lachat
git pull
composer install --no-dev --optimize-autoloader --working-dir=backend
php backend/artisan backup:run                       # sauvegarde avant le schéma
php backend/artisan migrate --force                   # ajoute / modifie les tables, garde les données
php backend/artisan db:seed --class=DatabaseSeeder --force   # rôles, unités, sous-détails types (idempotent)
php backend/artisan optimize
# + build du front (frontend/dist/*) envoyé dans backend/public/
```

## 2. Déploiement automatique (GitHub Action)

`.github/workflows/deploy.yml` exécute le §1 à chaque `push` sur `master`.
`.github/workflows/ci.yml` lance les tests (Pest SQLite + MySQL, Pint, ESLint, build) sur
toutes les autres branches et avant chaque déploiement.

Déroulé (`deploy.yml`) :

1. **Tests d'abord** : la CI doit passer, sinon rien n'est déployé.
2. Build du front sur GitHub (API relative).
3. Mode maintenance (`artisan down`), puis le serveur passe **exactement** au commit testé
   (`git merge --ff-only <sha>`).
4. `composer install`, puis **sauvegarde** (`backup:run`) : si elle échoue, retour
   automatique au commit précédent et arrêt (le schéma n'est pas touché).
5. Migrations, données de base (`DatabaseSeeder` : en production, rôles, unités et
   sous-détails types seulement — **aucun compte de démo**), fin de maintenance.
6. Envoi du front : nouveaux fichiers d'abord, `index.html` en dernier (pas de page blanche) ;
   les anciens fichiers du front sont gardés 7 jours puis supprimés.
7. Caches (`artisan optimize`) et contrôle de `/api/health` (vérifie aussi la base) et `/login`.

Le déploiement ne touche ni la base (sauf migrations et données de base), ni `storage/`
(photos, fichiers des rapports, sauvegardes), ni le `.env`.

### Secrets et variables du dépôt

Dépôt GitHub → **Settings → Secrets and variables → Actions**.

| Secret               | Valeur                                                                   |
|----------------------|--------------------------------------------------------------------------|
| `DEPLOY_HOST`        | hôte SSH de l'hébergement (Manager Infomaniak → SSH)                     |
| `DEPLOY_USER`        | utilisateur SSH                                                          |
| `DEPLOY_SSH_KEY`     | clé privée dont la clé publique est dans `~/.ssh/authorized_keys` du serveur (lignes BEGIN/END comprises) |
| `DEPLOY_KNOWN_HOSTS` | (recommandé) sortie de `ssh-keyscan -H <hôte>`, vérifiée une fois à la main |

| Variable     | Valeur (défaut)                              |
|--------------|----------------------------------------------|
| `APP_DOMAIN` | `planning.lachatconstruction.ch` — à régler si le domaine diffère |
| `APP_PATH`   | `apps/planning-chantier-lachat` (dossier du clone, relatif au home SSH) |

**Même hébergement que Planning Chantier / ProTime / StepWork (compte Step One) ?** Reprendre
exactement les valeurs `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (et `DEPLOY_KNOWN_HOSTS`)
du dépôt `planning-chantier` : la clé `~/.ssh/github-actions` du serveur est déjà autorisée.
**Autre hébergement (compte du client, §7) ?** Créer la clé sur ce serveur :

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github-actions          # ← clé PRIVÉE, à copier dans le secret DEPLOY_SSH_KEY
```

### Revenir à la version précédente

```bash
cd ~/apps/planning-chantier-lachat
git log --oneline -5                      # repérer le commit à rétablir
php backend/artisan down
git reset --hard <commit>                 # code précédent
composer install --no-dev --optimize-autoloader --working-dir=backend
# seulement si la version fautive avait ajouté des migrations :
php backend/artisan migrate:rollback --step=<nombre de migrations ajoutées>
php backend/artisan optimize && php backend/artisan up
```

Puis relancer le workflow *Deploy* (onglet Actions → Run workflow) sur ce commit, ou
pousser un correctif sur `master`, pour renvoyer le front correspondant.

## 3. Rappels sécurité

- `APP_DEBUG=false` et `APP_ENV=production` en prod.
- Ne jamais committer le `.env` réel (exclu par les `.gitignore`).
- **Aucun compte de démo en production** : en `APP_ENV=production`, `DatabaseSeeder` ne crée
  ni les comptes `@chantier.test` ni les données d'exemple. Premier compte :
  `php backend/artisan stepbuild:admin <email>` (§5.F).
- Les ouvriers ne voient jamais un prix : règle appliquée côté API (`User::canSeePrices()`),
  pas seulement dans l'interface.
- Telescope ne se charge qu'en local (voir `AppServiceProvider`).

## 4. Sauvegardes et tâche planifiée

Sauvegarde de la base par `php artisan backup:run` → `backend/storage/app/private/backups/`
(`backup-<date>.sql.gz`, `BACKUP_KEEP` dernières gardées, 30 par défaut). Faite **à chaque
déploiement** et **une fois par jour** par la tâche planifiée ci-dessous. Si `mysqldump` n'est
pas disponible, le service bascule tout seul sur un export en PHP. Les photos des projets et
les fichiers des rapports (`backend/storage/app/private`) ne sont pas dans ces sauvegardes :
garder aussi les sauvegardes Infomaniak et, de temps en temps, rapatrier une copie (`scp`).

Restaurer la base :

```bash
cd ~/apps/planning-chantier-lachat/backend
php artisan down
gunzip -c storage/app/private/backups/backup-<date>.sql.gz | mysql -h <DB_HOST> -u <DB_USERNAME> -p <DB_DATABASE>
php artisan up
```

### Tâche planifiée (une fois)

Le planificateur d'Infomaniak appelle une **URL**. Elle lance `stepbuild:cron` : **sauvegarde**
si la dernière a plus de 20 h.

1. Sur le serveur, générer un jeton secret et le mettre dans `backend/.env` :

   ```bash
   php -r 'echo bin2hex(random_bytes(24)), PHP_EOL;'
   # backend/.env :  CRON_TOKEN=<le jeton affiché>
   cd ~/apps/planning-chantier-lachat && php backend/artisan config:cache
   ```

2. Manager Infomaniak → **Planificateur de tâches** → *Planifier une tâche* :
   - URL : `https://planning.lachatconstruction.ch/api/cron/run/<le jeton>`
   - Fréquence : **une fois par heure** (la sauvegarde ne se fait que si la dernière a plus de 20 h).

3. Tester : ouvrir l'URL dans le navigateur → `{"status":"ok", …}`. Sans jeton ou avec un
   mauvais jeton, l'adresse répond 404.

Sur un serveur avec un vrai cron, `php backend/artisan schedule:run` chaque minute fait
la même chose (`routes/console.php`, sauvegarde à 3 h).

---

## 5. Première mise en ligne

| | Valeur |
|---|---|
| Domaine | `https://planning.lachatconstruction.ch` (interface + API) |
| Dépôt Git | `https://github.com/spinoops/stepbuild` (privé, branche `master`) |
| Dossier sur le serveur | `~/apps/planning-chantier-lachat` (clone du dépôt) — compte Step One, temporaire |
| Doc root | `apps/planning-chantier-lachat/backend/public` |
| Base MySQL | créée dans le Manager (hôte `xxxxx.myd.infomaniak.com`, nom, utilisateur, mot de passe) |
| PHP | 8.4 (site **et** ligne de commande) |

### A. En local : dépôt GitHub

1. Sur https://github.com/new : dépôt **`stepbuild`**, **privé**, sans README ni
   `.gitignore` (le projet a les siens).
2. Le projet est déjà un dépôt Git (branche `master`). Contrôler qu'aucun secret ni document
   client n'est suivi, puis brancher GitHub et envoyer :

```powershell
cd D:\wamp64\www\app-chantier
git status
git ls-files | Select-String "\.env$|_construction"   # ne doit RIEN afficher
git remote add origin https://github.com/spinoops/stepbuild.git
git push -u origin master
```

   Ce premier push lance l'Action « Deploy (Infomaniak) » : la CI tourne, puis le déploiement
   **échoue** tant que le serveur et les secrets ne sont pas prêts (étapes B à E). C'est
   normal, on le relancera.

### B. Manager Infomaniak

- **Domaine** : `planning.lachatconstruction.ch` doit pointer sur l'hébergement Step One
  (enregistrement DNS chez le registraire du client, ou alias de domaine ajouté à l'hébergement).
- **Base de données** : créer la base et son utilisateur, noter les accès.
- **Adresse d'envoi** : `noreply@lachatconstruction.ch` (ou une adresse de l'hébergement) et
  son mot de passe (mot de passe oublié, lien du premier compte).
- **Site `planning.lachatconstruction.ch`** : version PHP **8.4**, doc root
  **`apps/planning-chantier-lachat/backend/public`**, certificat SSL activé.

### C. Sur le serveur (SSH), une seule fois

**Version de PHP en ligne de commande** : `php -v` doit afficher **8.4**. Sinon, la régler
dans le Manager (version PHP utilisée en SSH) ; Planning Chantier, ProTime et StepWork
tournent aussi en 8.4.

**Accès au dépôt privé** : GitHub refuse le mot de passe, et une même *deploy key* ne peut
servir qu'à un dépôt (celles de Planning, ProTime et StepWork sont prises). On crée une clé
dédiée, avec un alias :

```bash
ssh-keygen -t ed25519 -C "infomaniak-stepbuild" -f ~/.ssh/stepbuild_github -N ""
cat ~/.ssh/stepbuild_github.pub
#   → coller sur GitHub : dépôt stepbuild → Settings → Deploy keys → Add deploy key
#     (lecture seule suffit)

cat >> ~/.ssh/config <<'EOF'
Host github-stepbuild
  HostName github.com
  User git
  IdentityFile ~/.ssh/stepbuild_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

**Clone, dépendances, configuration** : le dossier `~/apps/planning-chantier-lachat` (créé par le
Manager avec le site) doit être **vide** pour le clone. Vérifier avec `ls -A` ; s'il ne
contient que la page par défaut d'Infomaniak, la supprimer d'abord.

```bash
mkdir -p ~/apps/planning-chantier-lachat && cd ~/apps/planning-chantier-lachat
ls -A
git clone git@github-stepbuild:spinoops/stepbuild.git .
composer install --no-dev --optimize-autoloader --working-dir=backend

cp backend/.env.production.example backend/.env
php backend/artisan key:generate --force
nano backend/.env
#   APP_URL / FRONTEND_URL / SANCTUM_STATEFUL_DOMAINS = le vrai domaine
#   DB_HOST / DB_DATABASE / DB_USERNAME / DB_PASSWORD (Manager)
#   MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM_ADDRESS
#   CRON_TOKEN=… (voir §4)

php backend/artisan migrate --force
php backend/artisan db:seed --class=DatabaseSeeder --force
php backend/artisan optimize
chmod -R u+rwX backend/storage backend/bootstrap/cache
```

### D. Secrets GitHub

Voir §2 : `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (+ `DEPLOY_KNOWN_HOSTS`), et les
variables `APP_DOMAIN` / `APP_PATH` si elles diffèrent des défauts.

### E. Premier déploiement complet

GitHub → dépôt → **Actions** → « Deploy (Infomaniak) » → **Run workflow**. Cette exécution
envoie le front dans `backend/public`. Tout vert = en ligne.

### F. Vérifications et premier compte

1. `https://planning.lachatconstruction.ch/api/health` répond `{"status":"ok","database":"ok", …}`.
2. `https://planning.lachatconstruction.ch` affiche la page de connexion.
3. Créer le compte administrateur (mot de passe généré et affiché une seule fois, à noter ;
   `--password=…` pour le choisir, `--mail` pour envoyer plutôt un lien) :

```bash
cd ~/apps/planning-chantier-lachat
php backend/artisan stepbuild:admin login@step-one.ch --name="Step One"
```

4. Dans l'application, **Utilisateurs** : créer les comptes du client (admin, responsables,
   ouvriers), puis **Collaborateurs** (lier chaque ouvrier à son compte, position régie),
   **Configuration** (régie, unités). Puis adresses, catalogue, projets — ou reprise BauBit.
5. Tâche planifiée (§4), puis vérifier qu'une sauvegarde apparaît dans
   `backend/storage/app/private/backups/`.

### F bis. Reprendre les données du PC (une fois, au démarrage)

Comptes (avec leurs mots de passe chiffrés), réglages, unités, types de travail, adresses, catalogue,
éléments de coûts, sous-détails types, modèles de devis, projets, collaborateurs, absences, devis et
rapports de la base locale peuvent être repris en production. Ne sont jamais repris : connexions,
liens de mot de passe, caches, Telescope, migrations ; le journal d'activité seulement avec
`--with-journal`. **Les comptes de démonstration `@chantier.test` sont mis à la corbeille** à
l'import (`--keep-demo-accounts` pour les garder).

1. **En local**, sur la **même version** du code que la production (l'import refuse un fichier
   exporté avec d'autres migrations) :

```powershell
backendrtisan.bat stepbuild:export-data
```

   → `backend\storagepp	ransfer\donnees-<date>.sql`.
2. **FTP / SFTP** : déposer ce fichier dans `apps/planning-chantier-lachat/backend/storage/app/transfer/`
   (créer le dossier `transfer` s'il n'existe pas). S'il y a des photos de projets ou des fichiers
   de rapports, copier aussi `backend/storage/app/private/projects/` et
   `backend/storage/app/private/daily-reports/` au même endroit sur le serveur.
3. **SSH** : sauvegarde automatique, puis **remplacement** des données de la production :

```bash
cd ~/apps/planning-chantier-lachat
php backend/artisan stepbuild:import-data donnees-<date>.sql
rm backend/storage/app/transfer/donnees-*.sql     # il contient les comptes
```

4. Chacun se reconnecte (les anciennes connexions sont effacées). Si aucun compte réel n'existait
   encore dans la base locale, créer l'admin avec `stepbuild:admin` (§ F).

### G. Ensuite

Le §1 à chaque mise à jour (`git push`). Le PC reste l'environnement de développement :
sa base est une base de démo, ne pas y saisir de données réelles.

## 6. Secours sans GitHub

`.\release.ps1` (en local) produit `release\stepbuild-<date>.zip` : le dossier `backend/`
avec ses dépendances de production et le front déjà copié dans `public/`. Le décompresser
dans `~/apps/planning-chantier-lachat/backend` (sans écraser `.env` ni `storage/`), puis lancer les
commandes artisan du §1.

## 7. Changer d'hébergement (passage sur le compte du client)

Le dépôt, l'Action et la méthode ne changent pas ; on déplace le clone, la base et les
fichiers, puis on pointe les secrets GitHub sur le nouveau serveur.

1. **Nouvel hébergement** (Manager du client) : §5.B (base, adresse d'envoi, site PHP 8.4,
   doc root `apps/<dossier>/backend/public`) et §5.C (clé de déploiement, clone, `.env` avec les
   nouveaux accès MySQL ; **recopier `APP_KEY`** de l'ancien `.env`, sinon les données chiffrées
   et les sessions sont perdues). Ne pas lancer `migrate` tout de suite.
2. **Geler l'ancien site** : `php backend/artisan down`, puis dernière sauvegarde :
   `php backend/artisan backup:run`.
3. **Transférer** l'ancien serveur → le nouveau (`scp` ou SFTP) :
   - la sauvegarde `backend/storage/app/private/backups/backup-<date>.sql.gz` ;
   - tout `backend/storage/app/private/` (photos des projets, fichiers des rapports).
4. **Restaurer** sur le nouveau serveur : `gunzip -c <sauvegarde> | mysql -h … -u … -p <base>`,
   puis `php backend/artisan migrate --force` (sans effet si le schéma est à jour) et
   `php backend/artisan optimize`.
5. **DNS** : faire pointer `planning.lachatconstruction.ch` sur le nouvel hébergement, activer le
   certificat SSL.
6. **GitHub** : mettre à jour `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`
   et, si le dossier change, la variable `APP_PATH` ; relancer « Deploy (Infomaniak) ».
7. Vérifier `/api/health`, la connexion, une photo de projet et un PDF de devis ; recréer la
   tâche planifiée (§4) sur le nouveau Manager. Supprimer ensuite l'ancien site.
