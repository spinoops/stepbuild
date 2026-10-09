<?php

use App\Http\Middleware\SecurityHeaders;
use App\Models\User;

it('pose les en-têtes de sécurité sur les réponses de l\'API, sans CSP sur le JSON', function () {
    $response = $this->getJson('/api/health')->assertOk();

    $response->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeaderMissing('Content-Security-Policy')
        ->assertHeaderMissing('Strict-Transport-Security'); // requête http en test
});

it('ajoute HSTS en HTTPS seulement', function () {
    $this->getJson('https://localhost/api/health')
        ->assertOk()
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

it('pose une politique de contenu sur les pages HTML', function () {
    $response = $this->get('/');

    expect($response->headers->get('Content-Type'))->toStartWith('text/html');
    $response->assertHeader('Content-Security-Policy', SecurityHeaders::CONTENT_SECURITY_POLICY);
    expect(SecurityHeaders::CONTENT_SECURITY_POLICY)
        ->toContain("script-src 'self'")
        ->toContain("frame-ancestors 'self'")
        ->toContain("frame-src 'self' blob:") // aperçu PDF des devis
        ->not->toContain("script-src 'self' 'unsafe-inline'");
});

it('conserve les en-têtes sur les réponses authentifiées et les erreurs', function () {
    $user = User::factory()->create();

    $this->getJson('/api/user')->assertUnauthorized()
        ->assertHeader('X-Content-Type-Options', 'nosniff');
    $this->withToken($user->createToken('t')->plainTextToken)->getJson('/api/user')->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff');
});
