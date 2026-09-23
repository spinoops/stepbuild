<?php

namespace App\Http\Controllers\Concerns;

use App\Models\DailyReport;
use Illuminate\Http\Request;

/**
 * Droits sur un rapport journalier : la gestion voit tout ; l'ouvrier voit ses rapports
 * (créés par lui, dont il est responsable ou où il a des heures) et ne modifie que ceux en cours.
 */
trait AuthorizesDailyReports
{
    protected function authorizeView(Request $request, DailyReport $report): void
    {
        abort_unless($report->isVisibleTo($request->user()), 404, 'Rapport introuvable.');
    }

    protected function authorizeEdit(Request $request, DailyReport $report): void
    {
        $this->authorizeView($request, $report);
        abort_unless($report->isEditableBy($request->user()), 403, 'Ce rapport ne peut plus être modifié.');
    }
}
