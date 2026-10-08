<?php

namespace App\Console\Commands;

use App\Support\DataTransfer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * En local : exporte les données métier dans un fichier SQL à importer en production
 * avec stepbuild:import-data. Le fichier contient les comptes (mots de passe chiffrés) :
 * le supprimer après l'import.
 *
 *   php artisan stepbuild:export-data
 *   php artisan stepbuild:export-data --with-journal --output=D:\donnees.sql
 */
class ExportData extends Command
{
    protected $signature = 'stepbuild:export-data
                            {--with-journal : Reprendre aussi le journal d\'activité}
                            {--output= : Chemin du fichier (défaut : storage/app/transfer/donnees-<date>.sql)}';

    protected $description = 'Exporte les données métier (comptes, catalogue, projets, devis, rapports…) pour les reprendre en production.';

    public function handle(): int
    {
        $pdo = DB::connection()->getPdo();
        $statements = [];
        $summary = [];

        foreach (DataTransfer::tables((bool) $this->option('with-journal')) as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $statements[] = 'DELETE FROM `'.$table.'`';
            $rows = DB::table($table)->get()->map(fn ($r) => (array) $r);
            $summary[] = [$table, $rows->count()];

            foreach ($rows->chunk(100) as $chunk) {
                $columns = array_keys($chunk->first());
                $values = $chunk->map(fn (array $row) => '('.implode(', ', array_map(
                    fn ($v) => $v === null ? 'NULL' : (is_bool($v) ? (int) $v : (is_int($v) || is_float($v) ? $v : $pdo->quote((string) $v))),
                    array_values($row),
                )).')')->implode(",\n");
                $statements[] = 'INSERT INTO `'.$table.'` (`'.implode('`, `', $columns).'`) VALUES'."\n".$values;
            }
        }

        $path = (string) ($this->option('output') ?: storage_path('app/transfer/donnees-'.now()->format('Ymd-His').'.sql'));
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }

        // Les migrations appliquées : l'import refuse une base dont le schéma diffère.
        $migrations = DB::table('migrations')->orderBy('migration')->pluck('migration')->implode(',');
        $header = '-- StepBuild : données exportées le '.now()->format('d.m.Y H:i').' ('.config('app.env').")\n"
            .'-- À importer avec : php artisan stepbuild:import-data '.basename($path)."\n"
            .DataTransfer::MIGRATIONS_PREFIX.$migrations."\n";
        file_put_contents($path, $header.DataTransfer::SEPARATOR.implode(DataTransfer::SEPARATOR, $statements).DataTransfer::SEPARATOR);

        $this->table(['Table', 'Lignes'], $summary);
        $this->info('Fichier : '.$path);
        $this->comment('Il contient les comptes (mots de passe chiffrés) : le supprimer une fois importé.');

        $files = $this->privateFilesSummary();
        if ($files !== []) {
            $this->comment('Fichiers à copier à part dans backend/storage/app/private/ du serveur : '.implode(', ', $files));
        }

        return self::SUCCESS;
    }

    /**
     * Dossiers de fichiers référencés par la base (photos de projets, fichiers des rapports).
     *
     * @return list<string>
     */
    private function privateFilesSummary(): array
    {
        $out = [];
        foreach (['project_photos' => 'photos de projets', 'daily_report_files' => 'fichiers des rapports'] as $table => $label) {
            if (Schema::hasTable($table) && ($n = DB::table($table)->count()) > 0) {
                $out[] = "{$n} {$label}";
            }
        }

        return $out;
    }
}
