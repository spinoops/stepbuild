<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\RunsBulkImport;
use App\Support\StockListImport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Met en stock les articles d'une liste fournie par le client (export Excel BauBit des éléments
 * de coûts, converti en JSON) et rafraîchit les prix plus récents que ceux connus.
 *
 *   python backend/database/baubit/elements_xlsx_to_json.py "Matériaux 2026.xlsx" materiaux.json
 *   php artisan stepbuild:import-stock-list materiaux.json --dry-run
 */
class ImportStockList extends Command
{
    use RunsBulkImport;

    protected $signature = 'stepbuild:import-stock-list
                            {file : Fichier JSON produit par elements_xlsx_to_json.py}
                            {--no-prices : Ne pas mettre à jour les prix des éléments existants}
                            {--no-stock : Ne pas mettre les articles en stock (prix seulement)}
                            {--dry-run : Simuler : tout est annulé à la fin}';

    protected $description = 'Met en stock les articles d\'une liste client (export BauBit des éléments de coûts) et met à jour leurs prix.';

    public function handle(): int
    {
        try {
            $rows = StockListImport::read((string) $this->argument('file'));
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $import = new StockListImport(! $this->option('no-prices'), ! $this->option('no-stock'));

        $this->prepareBulkImport();
        DB::beginTransaction();
        try {
            $import->run($rows);
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

        $s = $import->stats;
        $this->table(['', 'Lignes'], [
            ['Lignes lues', count($rows)],
            ['Éléments retrouvés', $s['matched']],
            ['Éléments créés', $s['created']],
            ['Prix mis à jour (plus récents)', $s['prices_updated']],
            ['Mis en stock (à compter)', $s['stock_added']],
            ['Déjà en stock', $s['stock_existing']],
            ['Ignorées (vides / inactives)', $s['skipped']],
        ]);

        return self::SUCCESS;
    }
}
