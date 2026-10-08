<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Tâche planifiée par URL (hébergement sans crontab)
    |--------------------------------------------------------------------------
    |
    | Le planificateur d'Infomaniak appelle GET /api/cron/run/{CRON_TOKEN}, qui lance
    | `stepbuild:cron` (sauvegarde quotidienne). Sans jeton, l'adresse est désactivée
    | (404). Générer : php -r 'echo bin2hex(random_bytes(24)), PHP_EOL;'
    |
    */

    'token' => env('CRON_TOKEN', ''),

];
