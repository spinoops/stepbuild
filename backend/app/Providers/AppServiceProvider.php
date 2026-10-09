<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Laravel\Telescope\TelescopeServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Telescope est installé en dépendance --dev : on ne le charge qu'en local
        // et seulement si le paquet est présent (absent en production).
        if ($this->app->environment('local') && class_exists(TelescopeServiceProvider::class)) {
            $this->app->register(TelescopeServiceProvider::class);
            $this->app->register(\App\Providers\TelescopeServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Un jeton inutilisé depuis `sanctum.inactivity` minutes n'est plus accepté (en plus de
        // l'expiration absolue `sanctum.expiration`) : un appareil oublié se déconnecte tout seul.
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $token, bool $isValid): bool {
            $inactivity = (int) config('sanctum.inactivity');
            if (! $isValid || $inactivity <= 0) {
                return $isValid;
            }
            $lastUsed = $token->last_used_at ?? $token->created_at;

            return $lastUsed === null || $lastUsed->gt(now()->subMinutes($inactivity));
        });

        // Le lien de réinitialisation de mot de passe pointe vers la SPA React.
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            return config('app.frontend_url')
                .'/reset-password?token='.$token
                .'&email='.urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
