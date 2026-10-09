<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * En-têtes de sécurité HTTP, sur toutes les réponses de Laravel (API JSON, index.html de la SPA,
 * PDF, fichiers servis par lien signé). Les fichiers servis directement par Apache (assets du
 * build) reçoivent les mêmes en-têtes depuis public/.htaccess.
 */
class SecurityHeaders
{
    /**
     * Politique de contenu de l'interface (index.html seulement : inutile sur du JSON ou un PDF).
     *  - scripts : uniquement les fichiers du build (aucun script en ligne) ;
     *  - styles : fichiers du build + attributs style= posés par React ;
     *  - images : self, data:, blob: et https: (logo de l'entreprise configurable par URL) ;
     *  - iframes : self + blob: (aperçu PDF des devis) ; jamais d'inclusion dans un autre site.
     */
    public const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        ."img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; "
        ."frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $headers = $response->headers;

        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'SAMEORIGIN');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self), payment=()');

        if ($request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        if (str_starts_with((string) $headers->get('Content-Type'), 'text/html')) {
            $headers->set('Content-Security-Policy', self::CONTENT_SECURITY_POLICY);
        }

        return $response;
    }
}
