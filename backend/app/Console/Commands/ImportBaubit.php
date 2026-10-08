<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\RunsBulkImport;
use App\Support\BaubitImport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Reprise du catalogue d'articles et des éléments de coûts BauBit depuis les fichiers JSON
 * exportés de la sauvegarde SQL Server (CLAUDE.md, « Reprise BauBit »).
 *
 *   php artisan stepbuild:import-baubit "D:\…\_construction\DataBaubit\export" --dry-run
 *   php artisan stepbuild:import-baubit /chemin/export --elements
 */
class ImportBaubit extends Command
{
    use RunsBulkImport;

    protected $signature = 'stepbuild:import-baubit
                            {dir : Dossier des fichiers JSON exportés (elements, regie_positions, catalog_chapters, catalog_positions)}
                            {--catalog : Seulement le catalogue d\'articles}
                            {--elements : Seulement les éléments de coûts}
                            {--collaborators : Seulement les employés (collaborateurs)}
                            {--root-catalog=1 : Code du catalogue BauBit dont les groupes deviennent des chapitres racine (modèles d\'étapes)}
                            {--dry-run : Simuler : tout est annulé à la fin, seuls les comptages s\'affichent}';

    protected $description = 'Reprend le catalogue d\'articles, les éléments de coûts et les employés d\'une sauvegarde BauBit (fichiers JSON exportés).';

    public function handle(): int
    {
        $all = ! $this->option('catalog') && ! $this->option('elements') && ! $this->option('collaborators');

        try {
            $import = new BaubitImport((string) $this->argument('dir'));
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->prepareBulkImport();
        $import->onProgress = fn (string $step, int $done, int $total) => $this->line("  {$step} : {$done} / {$total}");

        DB::beginTransaction();
        try {
            if ($all || $this->option('elements')) {
                $this->line('Éléments de coûts…');
                $import->importElements();
            }
            if ($all || $this->option('collaborators')) {
                $this->line('Employés…');
                $import->importCollaborators();
            }
            if ($all || $this->option('catalog')) {
                $this->line('Catalogue d\'articles…');
                $import->importCatalog((string) $this->option('root-catalog'));
            }
        } catch (Throwable $e) {
            DB::rollBack();
            activity()->enableLogging();
            $this->error('Import interrompu, rien n\'a été modifié : '.$e->getMessage());

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            DB::rollBack();
            $this->warn('Simulation : rien n\'a été enregistré.');
        } else {
            DB::commit();
        }
        activity()->enableLogging();

        $rows = [];
        foreach (['elements' => 'Éléments de coûts', 'regie_positions' => 'Tarifs régie sans élément (salaires…)', 'collaborators' => 'Collaborateurs', 'chapters' => 'Chapitres', 'articles' => 'Articles'] as $key => $label) {
            $created = $import->stats[$key.'_created'] ?? 0;
            $updated = $import->stats[$key.'_updated'] ?? 0;
            if ($created + $updated > 0) {
                $rows[] = [$label, $created, $updated];
            }
        }
        $this->table(['', 'Créés', 'Mis à jour'], $rows);
        $this->info($this->option('dry-run') ? 'Relancer sans --dry-run pour enregistrer.' : 'Reprise terminée.');

        return self::SUCCESS;
    }
}
