<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Configuration CORS
    |--------------------------------------------------------------------------
    |
    | Autorise la SPA React (Vite) à appeler l'API. Avec une authentification
    | par token Bearer, supports_credentials peut rester à false.
    | Si tu passes un jour en mode cookie/session Sanctum, mets-le à true.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // En local, le front peut être ouvert en localhost ou en 127.0.0.1 : les deux sont admis.
    'allowed_origins' => array_values(array_unique(array_filter([
        env('FRONTEND_URL', 'http://localhost:5190'),
        env('APP_ENV') === 'local' ? 'http://localhost:5190' : null,
        env('APP_ENV') === 'local' ? 'http://127.0.0.1:5190' : null,
    ]))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
