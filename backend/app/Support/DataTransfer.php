<?php

namespace App\Support;

/**
 * Reprise des données métier d'une base vers une autre (local → production) :
 * comptes et rôles, réglages, unités, types de travail, adresses, catalogue, éléments de
 * coûts, sous-détails types, modèles de devis, projets, collaborateurs, devis, rapports.
 *
 * Jamais repris : connexions (jetons, sessions), liens de mot de passe, caches, files
 * d'attente, Telescope, migrations. Le journal d'activité seulement sur demande.
 *
 * Les fichiers (photos de projets, fichiers des rapports : storage/app/private) ne sont
 * pas dans le fichier SQL : les copier à part (DEPLOY.md, § 5.F bis).
 */
class DataTransfer
{
    /** Séparateur entre deux instructions SQL du fichier (les textes peuvent contenir des retours à la ligne). */
    public const SEPARATOR = "\n-- @@\n";

    /** Préfixe de la ligne d'en-tête qui liste les migrations appliquées à l'export. */
    public const MIGRATIONS_PREFIX = '-- migrations: ';

    /** Domaine des comptes de démonstration, mis à la corbeille après l'import en production. */
    public const DEMO_EMAIL_DOMAIN = '@chantier.test';

    /**
     * Tables reprises, parents avant enfants.
     *
     * @return list<string>
     */
    public static function tables(bool $withActivityLog = false): array
    {
        return array_values(array_filter([
            'roles',
            'permissions',
            'role_has_permissions',
            'settings',
            'units',
            'work_types',
            'users',
            'model_has_roles',
            'model_has_permissions',
            'addresses',
            'catalog_chapters',
            'catalog_articles',
            'price_elements',
            'breakdown_templates',
            'breakdown_template_lines',
            'quote_templates',
            'quote_template_steps',
            'projects',
            'project_addresses',
            'project_photos',
            'collaborators',
            'collaborator_absences',
            'documents',
            'document_steps',
            'document_positions',
            'document_position_costs',
            'daily_reports',
            'daily_report_hours',
            'daily_report_items',
            'daily_report_files',
            $withActivityLog ? 'activity_log' : null,
        ]));
    }

    /** Tables vidées à l'import même sans données reprises (elles pointent vers les anciens ids). */
    public const ALWAYS_CLEARED = ['personal_access_tokens', 'sessions', 'password_reset_tokens', 'cache', 'cache_locks'];
}
