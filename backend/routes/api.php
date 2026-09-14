<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordResetController;
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

// Routes protégées : nécessitent un token valide (Authorization: Bearer ...).
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Administration : réservé aux utilisateurs de rôle 'admin'.
    Route::middleware('admin')->group(function () {
        Route::apiResource('users', UserController::class)->except(['show']);
        Route::put('/settings', [SettingController::class, 'update']);
    });
});
