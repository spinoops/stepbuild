<?php

use App\Http\Controllers\AddressController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BreakdownTemplateController;
use App\Http\Controllers\CatalogArticleController;
use App\Http\Controllers\CatalogChapterController;
use App\Http\Controllers\CollaboratorController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\DailyReportFileController;
use App\Http\Controllers\DailyReportHourController;
use App\Http\Controllers\DailyReportItemController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentPositionController;
use App\Http\Controllers\DocumentStepController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PriceElementController;
use App\Http\Controllers\ProjectAddressController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectPhotoController;
use App\Http\Controllers\QuoteTemplateController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API (préfixées par /api)
|--------------------------------------------------------------------------
*/

// Health check public — utile pour vérifier que l'API tourne.
Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'app' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

// Authentification (token Sanctum). Throttle anti-brute-force.
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

// Mot de passe oublié / réinitialisation (throttle anti-abus).
Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:6,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:6,1');

// Réglages d'identité de l'app (nom, logo, couleur) — lecture publique,
// pour pouvoir les appliquer même avant la connexion.
Route::get('/settings', [SettingController::class, 'index']);

// Fichier d'une photo de projet : lien signé temporaire (une balise <img> n'envoie pas de token).
Route::get('/project-photos/{photo}/file', [ProjectPhotoController::class, 'file'])
    ->name('project-photos.file')
    ->middleware('signed');

// Fichier joint à un rapport journalier : lien signé temporaire.
Route::get('/daily-report-files/{file}/file', [DailyReportFileController::class, 'file'])
    ->name('daily-report-files.file')
    ->middleware('signed');

// Routes protégées : nécessitent un token valide (Authorization: Bearer ...).
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Rapports journaliers : tous les rôles (l'ouvrier ne voit que les siens, jamais de montant).
    Route::get('/collaborators', [CollaboratorController::class, 'index']);
    Route::get('/work-types', [CollaboratorController::class, 'workTypes']);
    Route::get('/daily-reports', [DailyReportController::class, 'index']);
    Route::post('/projects/{project}/daily-reports', [DailyReportController::class, 'store'])->whereNumber('project');
    Route::get('/daily-reports/{report}', [DailyReportController::class, 'show']);
    Route::put('/daily-reports/{report}', [DailyReportController::class, 'update']);
    Route::delete('/daily-reports/{report}', [DailyReportController::class, 'destroy']);
    Route::post('/daily-reports/{report}/copy-team', [DailyReportController::class, 'copyTeam']);
    Route::post('/daily-reports/{report}/collaborators', [DailyReportHourController::class, 'addCollaborator']);
    Route::delete('/daily-reports/{report}/collaborators/{collaborator}', [DailyReportHourController::class, 'removeCollaborator']);
    Route::put('/daily-reports/{report}/hours', [DailyReportHourController::class, 'setCell']);
    Route::post('/daily-reports/{report}/items', [DailyReportItemController::class, 'store']);
    Route::put('/daily-reports/{report}/items/{item}', [DailyReportItemController::class, 'update']);
    Route::delete('/daily-reports/{report}/items/{item}', [DailyReportItemController::class, 'destroy']);
    Route::post('/daily-reports/{report}/files', [DailyReportFileController::class, 'store']);
    Route::put('/daily-reports/{report}/files/{file}', [DailyReportFileController::class, 'update']);
    Route::delete('/daily-reports/{report}/files/{file}', [DailyReportFileController::class, 'destroy']);

    // Projets en lecture : tous les rôles (l'ouvrier choisit son chantier, sans aucun prix).
    Route::get('/projects/stats', [ProjectController::class, 'stats']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->whereNumber('project');

    // Gestion (admin + responsable) : données de base. Jamais accessible aux ouvriers (prix).
    Route::middleware('roles:admin,responsable')->group(function () {
        Route::get('/projects/next-number', [ProjectController::class, 'nextNumber']);
        Route::apiResource('projects', ProjectController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('projects.addresses', ProjectAddressController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('projects.photos', ProjectPhotoController::class)->only(['store', 'update', 'destroy']);

        Route::get('/search/index', [SearchController::class, 'index']);
        Route::get('/search', SearchController::class);

        Route::apiResource('addresses', AddressController::class);

        Route::apiResource('catalog-chapters', CatalogChapterController::class)
            ->except(['show'])
            ->parameters(['catalog-chapters' => 'chapter']);
        Route::get('/catalog-articles/picker', [CatalogArticleController::class, 'picker']);
        Route::apiResource('catalog-articles', CatalogArticleController::class)
            ->parameters(['catalog-articles' => 'article']);

        // Documents (devis, puis acomptes et factures) : étapes et positions.
        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/projects/{project}/documents', [DocumentController::class, 'store']);
        Route::get('/documents/{document}', [DocumentController::class, 'show']);
        Route::put('/documents/{document}', [DocumentController::class, 'update']);
        Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
        Route::post('/documents/{document}/duplicate', [DocumentController::class, 'duplicate']);
        Route::get('/documents/{document}/pdf', [DocumentController::class, 'pdf']);
        Route::post('/documents/{document}/positions/prune', [DocumentPositionController::class, 'prune']);
        Route::post('/documents/{document}/steps/reorder', [DocumentStepController::class, 'reorder']);
        Route::apiResource('documents.steps', DocumentStepController::class)->only(['store', 'update', 'destroy']);
        Route::post('/documents/{document}/positions/reorder', [DocumentPositionController::class, 'reorder']);
        Route::put('/documents/{document}/positions/{position}/breakdown', [DocumentPositionController::class, 'breakdown']);
        Route::apiResource('documents.positions', DocumentPositionController::class)->only(['store', 'update', 'destroy']);

        // Modèles de devis (jeux d'étapes).
        Route::apiResource('quote-templates', QuoteTemplateController::class)
            ->except(['show'])
            ->parameters(['quote-templates' => 'template']);
        Route::post('/documents/{document}/save-as-template', [QuoteTemplateController::class, 'fromDocument']);
        Route::post('/quote-templates/{template}/apply/{document}', [QuoteTemplateController::class, 'apply']);

        // Sous-détails de prix types (bibliothèque d'ouvrages du métreur).
        Route::apiResource('breakdown-templates', BreakdownTemplateController::class)
            ->parameters(['breakdown-templates' => 'template']);
        Route::post('/breakdown-templates/{template}/used', [BreakdownTemplateController::class, 'used']);

        Route::apiResource('collaborators', CollaboratorController::class)->except(['index']);

        Route::get('/price-elements/groups', [PriceElementController::class, 'groups']);
        Route::apiResource('price-elements', PriceElementController::class)
            ->parameters(['price-elements' => 'element']);
    });

    // Administration : réservé aux utilisateurs de rôle 'admin'.
    Route::middleware('admin')->group(function () {
        Route::apiResource('users', UserController::class)->except(['show']);
        Route::put('/settings', [SettingController::class, 'update']);
    });
});
