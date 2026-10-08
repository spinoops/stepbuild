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
     * Données de base, idempotentes et sans danger en production (lancé à chaque déploiement) :
     * rôles (RolesSeeder), unités de mesure, sous-détails de prix types.
     *
     * Hors production seulement, comptes de démonstration :
     *   admin@chantier.test / responsable@chantier.test / ouvrier@chantier.test — mot de passe `password`.
     * En local seulement, données d'exemple fictives (DemoDataSeeder).
     */
    public function run(): void
    {
        $this->call(RolesSeeder::class);

        if (! app()->environment('production')) {
            $this->seedDemoAccounts();
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

    private function seedDemoAccounts(): void
    {
        $accounts = [
            'admin' => ['email' => 'admin@chantier.test', 'name' => 'Administrateur'],
            'responsable' => ['email' => 'responsable@chantier.test', 'name' => 'Responsable démo'],
            'ouvrier' => ['email' => 'ouvrier@chantier.test', 'name' => 'Ouvrier démo'],
        ];

        foreach ($accounts as $role => $account) {
            // withTrashed : un compte de démo mis à la corbeille (stepbuild:import-data) est réactivé, pas dupliqué.
            $user = User::withTrashed()->updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                ]
            );
            if ($user->trashed()) {
                $user->restore();
            }
            $user->syncRoles([Role::findByName($role, 'web')]);
        }
    }
}
