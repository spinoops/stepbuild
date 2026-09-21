<?php

use App\Http\Controllers\AddressController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogArticleController;
use App\Http\Controllers\CatalogChapterController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PriceElementController;
use App\Http\Controllers\ProjectAddressController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectPhotoController;
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

// Routes protégées : nécessitent un token valide (Authorization: Bearer ...).
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

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
        Route::apiResource('catalog-articles', CatalogArticleController::class)
            ->parameters(['catalog-articles' => 'article']);

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
