<?php

/*
|--------------------------------------------------------------------------
| Entreprise émettrice des documents (devis, factures)
|--------------------------------------------------------------------------
| Coordonnées imprimées sur les PDF. Valeurs de Lachat Construction Sàrl,
| surchargeables par le .env pour un autre mandant.
*/

return [
    'name' => env('COMPANY_NAME', 'Lachat Construction Sàrl'),
    'street' => env('COMPANY_STREET', "Rue de l'Eglise 16"),
    'zip' => env('COMPANY_ZIP', '2854'),
    'city' => env('COMPANY_CITY', 'Bassecourt'),
    'email' => env('COMPANY_EMAIL', 'info@lachat-bat.ch'),
    'phone' => env('COMPANY_PHONE', '079 678 09 89'),
    'website' => env('COMPANY_WEBSITE', 'www.lachat-bat.ch'),
    'vat_number' => env('COMPANY_VAT_NUMBER', 'CHE-494.882.829 TVA'),

    // Logo imprimé en tête de la page de garde (JPG ou PNG, chemin relatif à resources/).
    'logo' => env('COMPANY_LOGO', 'images/logo-lachat.jpg'),

    // Textes par défaut des documents, quand le devis n'a pas les siens.
    'quote_intro' => 'Nous sommes persuadés que nous pourrons vous satisfaire dans cette exécution.',
    'payment_terms' => '30 Jours, net',
    'closing' => 'Avec nos meilleures salutations',
];
