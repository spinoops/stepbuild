<?php

namespace App\Console\Commands\Concerns;

use Laravel\Telescope\Telescope;

/**
 * Réglages communs des reprises en masse (milliers de lignes dans une transaction) :
 * mémoire suffisante et pas d'enregistrement Telescope, qui garderait chaque requête en mémoire.
 */
trait RunsBulkImport
{
    protected function prepareBulkImport(string $memory = '512M'): void
    {
        $limit = (string) ini_get('memory_limit');
        $bytes = (int) $limit * match (strtoupper(substr($limit, -1))) {
            'G' => 1024 ** 3, 'M' => 1024 ** 2, 'K' => 1024, default => 1
        };
        if ($bytes > 0 && $bytes < (int) $memory * 1024 ** 2) {
            ini_set('memory_limit', $memory);
        }

        if (class_exists(Telescope::class)) {
            Telescope::stopRecording();
        }

        // Pas de journal d'activité pour des milliers de lignes reprises en bloc.
        activity()->disableLogging();
    }
}
