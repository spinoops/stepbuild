<?php

/*
 * Serveur de développement : même rôle que « php artisan serve », mais lancé directement avec
 * `php -d opcache.enable_cli=1 -d xdebug.mode=off -S 127.0.0.1:8020 -t public server.php`
 * (cf. .claude/launch.json et dev.ps1). « artisan serve » ne transmet pas ces options au processus
 * qu'il lance : sans OPcache, chaque requête recompile tout Laravel (~0.2 s), et Xdebug (activé dans
 * le php.ini de WAMP) ralentit encore chaque appel. Ne sert à rien en production.
 */

$publicPath = __DIR__.'/public';

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');

// Fichier existant dans public/ : servi tel quel par le serveur intégré.
if ($uri !== '/' && file_exists($publicPath.$uri)) {
    return false;
}

require_once $publicPath.'/index.php';
