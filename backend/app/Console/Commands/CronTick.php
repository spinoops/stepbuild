<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Tâche périodique pour un hébergement sans crontab (Infomaniak mutualisé : le
 * planificateur appelle une URL, voir CronController). À chaque appel : sauvegarde de
 * la base si la dernière a plus de 20 h. Peu importe l'heure ou la fréquence des appels.
 */
class CronTick extends Command
{
    protected $signature = 'stepbuild:cron';

    protected $description = "Sauvegarde quotidienne de la base (appelé par le planificateur d'URL).";

    public function handle(BackupService $backups): int
    {
        try {
            $last = $backups->list()[0]['created_at'] ?? null;
            if ($last === null || now()->diffInHours($last, true) >= 20) {
                $this->line('Sauvegarde : '.$backups->run());
            } else {
                $this->line('Sauvegarde : la dernière date de moins de 20 h.');
            }
        } catch (Throwable $e) {
            report($e);
            $this->error('Sauvegarde en échec : '.$e->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
