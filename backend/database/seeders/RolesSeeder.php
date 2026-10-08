<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Rôles applicatifs du logiciel de chantier (cf. Plan de création, phase 0) :
 *  - admin       : tout, y compris utilisateurs et configuration.
 *  - responsable : gestion complète des chantiers (prix, régie, documents, contrôle).
 *  - ouvrier     : saisie de ses rapports journaliers, sans accès aux prix ni aux marges.
 *  - stock       : uniquement la vue des stocks (quantités, seuils, mouvements), sans aucun prix.
 *
 * Idempotent : exécuté à chaque déploiement, sans risque pour les données.
 */
class RolesSeeder extends Seeder
{
    public const ROLES = ['admin', 'responsable', 'ouvrier', 'stock'];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        foreach (self::ROLES as $role) {
            Role::findOrCreate($role, 'web');
        }
    }
}
