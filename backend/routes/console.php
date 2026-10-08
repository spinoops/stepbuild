<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Tâches planifiées
|--------------------------------------------------------------------------
|
| Sur un serveur avec crontab : `php artisan schedule:run` chaque minute. Sur Infomaniak
| mutualisé, le planificateur appelle plutôt l'URL /api/cron/run/{CRON_TOKEN}
| (CronController → chantier:cron). Voir DEPLOY.md, § 4.
|
*/

Schedule::command('backup:run')->dailyAt('03:00');
