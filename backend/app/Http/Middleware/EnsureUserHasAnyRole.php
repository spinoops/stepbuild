<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasAnyRole
{
    /**
     * Autorise les utilisateurs possédant au moins un des rôles indiqués.
     * Usage : ->middleware('roles:admin,responsable'). Renvoie un 403 JSON sinon.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole($roles)) {
            return response()->json(['message' => 'Accès non autorisé pour votre rôle.'], 403);
        }

        return $next($request);
    }
}
