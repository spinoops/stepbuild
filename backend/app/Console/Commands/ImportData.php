<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\BackupService;
use App\Support\DataTransfer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * En production : remplace les données métier par celles d'un fichier produit par
 * stepbuild:export-data (sauvegarde de la base d'abord). Les tables reprises sont
 * vidées puis remplies ; les connexions sont réinitialisées (chacun se reconnecte).
 * **Les comptes et rôles de la cible ne sont jamais touchés** (sauf --with-users explicite,
 * auquel cas les comptes de démonstration @chantier.test sont mis à la corbeille).
 *
 *   php artisan stepbuild:import-data donnees-20261008-120000.sql
 *       (fichier déposé dans backend/storage/app/transfer/, ou chemin complet)
 */
class ImportData extends Command
{
    protected $signature = 'stepbuild:import-data
                            {file : Fichier exporté (nom dans storage/app/transfer ou chemin)}
                            {--force : Ne pas demander de confirmation}
                            {--no-backup : Ne pas sauvegarder la base avant (déconseillé)}
                            {--with-users : Reprendre aussi les comptes et rôles du fichier (REMPLACE ceux de la cible ; jamais par défaut)}
                            {--keep-demo-accounts : Avec --with-users, garder les comptes @chantier.test actifs}
                            {--ignore-schema : Importer même si les migrations appliquées diffèrent (déconseillé)}';

    protected $description = 'Remplace les données métier par celles exportées en local (sauvegarde d\'abord).';

    public function handle(BackupService $backups): int
    {
        $file = (string) $this->argument('file');
        $path = collect([$file, storage_path('app/transfer/'.$file), base_path($file)])->first(fn ($p) => is_file($p));
        if (! $path) {
            $this->error("Fichier introuvable : {$file} (dépose-le dans backend/storage/app/transfer/).");

            return self::FAILURE;
        }

        $content = (string) file_get_contents($path);
        $statements = array_values(array_filter(
            array_map('trim', explode(DataTransfer::SEPARATOR, $content)),
            fn (string $s) => $s !== '' && ! str_starts_with($s, '--'),
        ));
        if ($statements === []) {
            $this->error('Fichier vide ou illisible.');

            return self::FAILURE;
        }

        if (! $this->schemaMatches($content)) {
            return self::FAILURE;
        }

        $withUsers = (bool) $this->option('with-users');
        if ($withUsers) {
            $this->warn('Les COMPTES, réglages, adresses, catalogue, projets, devis, rapports et stocks actuels vont être REMPLACÉS.');
        } else {
            $statements = array_values(array_filter($statements, fn (string $sql) => ! preg_match(
                '/^(?:DELETE FROM|INSERT INTO) `('.implode('|', DataTransfer::USER_TABLES).')`/',
                $sql,
            )));
            $this->warn('Les comptes actuels sont conservés ; réglages, adresses, catalogue, projets, devis, rapports et stocks vont être REMPLACÉS.');
        }
        if (! $this->option('force') && ! $this->confirm('Continuer ?', false)) {
            $this->line('Annulé.');

            return self::FAILURE;
        }

        if (! $this->option('no-backup')) {
            try {
                $this->info('Sauvegarde : '.$backups->run());
            } catch (Throwable $e) {
                $this->error('Sauvegarde impossible, import annulé : '.$e->getMessage());

                return self::FAILURE;
            }
        }

        Schema::disableForeignKeyConstraints();
        if (DB::getDriverName() === 'sqlite') {
            // SQLite ignore PRAGMA foreign_keys à l'intérieur d'une transaction (tests) : on diffère les
            // contrôles à la validation ; les liens vers des comptes sont remis à vide avant.
            DB::statement('PRAGMA defer_foreign_keys = ON');
        }
        try {
            foreach (DataTransfer::ALWAYS_CLEARED as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->delete();
                }
            }
            foreach ($statements as $sql) {
                DB::unprepared($sql);
            }
            if (! $withUsers) {
                // Les ids de comptes du fichier sont ceux de la base d'origine : on coupe les liens plutôt
                // que de les laisser pointer vers de mauvaises personnes.
                foreach (DataTransfer::USER_REFERENCES as $table => $columns) {
                    if (Schema::hasTable($table)) {
                        DB::table($table)->update(array_fill_keys($columns, null));
                    }
                }
            }
        } catch (Throwable $e) {
            $this->error('Import interrompu : '.$e->getMessage());
            $this->error('La base est peut-être incomplète : restaurer la sauvegarde ci-dessus (DEPLOY.md, § 4).');

            return self::FAILURE;
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        if ($withUsers && ! $this->option('keep-demo-accounts')) {
            $demo = User::where('email', 'like', '%'.DataTransfer::DEMO_EMAIL_DOMAIN)->get();
            foreach ($demo as $user) {
                $user->delete();
            }
            if ($demo->isNotEmpty()) {
                $this->comment('Comptes de démonstration mis à la corbeille : '.$demo->pluck('email')->implode(', '));
            }
        }

        Artisan::call('db:seed', ['--class' => 'Database\\Seeders\\RolesSeeder', '--force' => true]);
        Artisan::call('permission:cache-reset');
        Artisan::call('cache:clear');

        $counts = collect(['users', 'addresses', 'catalog_articles', 'price_elements', 'projects', 'documents', 'daily_reports', 'collaborators'])
            ->filter(fn ($t) => Schema::hasTable($t))
            ->map(fn ($t) => [$t, DB::table($t)->count()])
            ->values()
            ->all();
        $this->table(['Table', 'Lignes'], $counts);
        $this->info('Import terminé. Supprime maintenant le fichier : rm '.$path);

        return self::SUCCESS;
    }

    /** Le fichier a été exporté depuis une base au même schéma (mêmes migrations appliquées). */
    private function schemaMatches(string $content): bool
    {
        if (! preg_match('/^'.preg_quote(DataTransfer::MIGRATIONS_PREFIX, '/').'(.*)$/m', $content, $m)) {
            $this->warn('Fichier sans liste de migrations : schéma non vérifié.');

            return true;
        }

        $exported = array_filter(explode(',', trim($m[1])));
        $applied = DB::table('migrations')->orderBy('migration')->pluck('migration')->all();
        sort($exported);
        sort($applied);
        if ($exported === $applied) {
            return true;
        }

        $this->error('Le schéma diffère : le fichier a été exporté avec d\'autres migrations que celles appliquées ici.');
        $this->line('Manquantes ici : '.(implode(', ', array_diff($exported, $applied)) ?: '—'));
        $this->line('En plus ici : '.(implode(', ', array_diff($applied, $exported)) ?: '—'));
        if ($this->option('ignore-schema')) {
            $this->warn('--ignore-schema : import quand même.');

            return true;
        }
        $this->line('Déployer la même version des deux côtés (git pull + migrate --force), puis réessayer.');

        return false;
    }
}
