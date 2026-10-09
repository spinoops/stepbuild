<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /** Même réponse qu'un compte existe ou non : l'adresse ne permet pas d'énumérer les comptes. */
    public const NEUTRAL_MESSAGE = "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.";

    /**
     * Envoie le lien de réinitialisation par email.
     * Réponse volontairement neutre : le statut de Laravel (« utilisateur introuvable »,
     * « lien déjà envoyé ») n'est jamais renvoyé, il révélerait l'existence du compte.
     */
    public function forgot(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($request->only('email'));

        return response()->json(['message' => self::NEUTRAL_MESSAGE]);
    }

    /**
     * Réinitialise le mot de passe à partir du token reçu par email,
     * et révoque les tokens Sanctum existants.
     */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            // Même message pour un lien périmé, déjà utilisé ou un email inconnu.
            throw ValidationException::withMessages(['email' => ["Ce lien n'est plus valable. Demande un nouveau lien de réinitialisation."]]);
        }

        return response()->json(['message' => 'Mot de passe modifié. Tu peux te connecter.']);
    }
}
