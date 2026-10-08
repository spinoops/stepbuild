<?php

namespace Database\Seeders;

use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Rôles applicatifs du logiciel de chantier + comptes de démonstration (idempotent).
     *
     * Rôles (cf. Plan de création, phase 0) :
     *  - admin       : tout, y compris utilisateurs et configuration.
     *  - responsable : gestion complète des chantiers (prix, régie, documents, contrôle).
     *  - ouvrier     : saisie de ses rapports journaliers, sans accès aux prix ni aux marges.
     *
     * Identifiants : admin@chantier.test       / password
     *                responsable@chantier.test / password
     *                ouvrier@chantier.test     / password
     */
    public function run(): void
    {
        $roles = [];
        foreach (['admin', 'responsable', 'ouvrier'] as $name) {
            $roles[$name] = Role::firstOrCreate(['name' => $name]);
        }

        $accounts = [
            'admin' => ['email' => 'admin@chantier.test', 'name' => 'Administrateur'],
            'responsable' => ['email' => 'responsable@chantier.test', 'name' => 'Responsable démo'],
            'ouvrier' => ['email' => 'ouvrier@chantier.test', 'name' => 'Ouvrier démo'],
        ];

        foreach ($accounts as $role => $account) {
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                ]
            );
            $user->syncRoles([$roles[$role]]);
        }

        // Unités de mesure par défaut (tous environnements, jamais écrasées).
        Unit::seedDefaults();

        // Sous-détails de prix types du métreur (données réelles, tous environnements).
        $this->call(BreakdownTemplateSeeder::class);

        // Données d'exemple fictives : uniquement en local, jamais en production ni en test.
        if (app()->environment('local')) {
            $this->call(DemoDataSeeder::class);
        }
    }
}
