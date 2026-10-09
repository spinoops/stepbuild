<?php

use App\Http\Controllers\PasswordResetController;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

it('envoie une notification de réinitialisation', function () {
    Notification::fake();
    $user = User::factory()->create(['email' => 'reset@example.com']);

    $this->postJson('/api/forgot-password', ['email' => 'reset@example.com'])->assertOk();

    Notification::assertSentTo($user, ResetPassword::class);
});

it('répond la même chose que le compte existe ou non (pas de liste des comptes possible)', function () {
    Notification::fake();
    User::factory()->create(['email' => 'connu@example.com']);

    $known = $this->postJson('/api/forgot-password', ['email' => 'connu@example.com'])->assertOk()->json();
    $unknown = $this->postJson('/api/forgot-password', ['email' => 'inconnu@example.com'])->assertOk()->json();

    expect($unknown)->toBe($known)
        ->and($unknown['message'])->toBe(PasswordResetController::NEUTRAL_MESSAGE)
        ->and(strtolower($unknown['message']))->not->toContain("can't find");
});

it('réinitialise le mot de passe avec un token valide', function () {
    $user = User::factory()->create(['email' => 'reset@example.com']);
    $token = Password::createToken($user);

    $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => 'reset@example.com',
        'password' => 'nouveaupass123',
        'password_confirmation' => 'nouveaupass123',
    ])->assertOk();

    expect(Hash::check('nouveaupass123', $user->fresh()->password))->toBeTrue();
});

it('rejette un token de réinitialisation invalide (422)', function () {
    User::factory()->create(['email' => 'reset@example.com']);

    $this->postJson('/api/reset-password', [
        'token' => 'invalide',
        'email' => 'reset@example.com',
        'password' => 'nouveaupass123',
        'password_confirmation' => 'nouveaupass123',
    ])->assertStatus(422);
});

it('ne distingue pas un email inconnu et un token invalide à la réinitialisation', function () {
    User::factory()->create(['email' => 'reset@example.com']);
    $payload = ['token' => 'invalide', 'password' => 'nouveaupass123', 'password_confirmation' => 'nouveaupass123'];

    $badToken = $this->postJson('/api/reset-password', [...$payload, 'email' => 'reset@example.com'])->assertStatus(422)->json('errors.email.0');
    $badEmail = $this->postJson('/api/reset-password', [...$payload, 'email' => 'inconnu@example.com'])->assertStatus(422)->json('errors.email.0');

    expect($badEmail)->toBe($badToken);
});
