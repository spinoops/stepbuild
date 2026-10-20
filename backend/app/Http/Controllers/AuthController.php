<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authentifie l'utilisateur et renvoie un token Sanctum (Bearer).
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['sometimes', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            // Le journal distingue l'e-mail inconnu du mauvais mot de passe ; la réponse, elle, reste la même.
            LoginLog::record($request, 'failed', $user, $credentials['email'], $user ? 'bad_password' : 'unknown_email');

            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        $deviceName = $credentials['device_name'] ?? 'spa';
        $token = $user->createToken($deviceName)->plainTextToken;
        LoginLog::record($request, 'login', $user);

        return response()->json([
            'token' => $token,
            'user' => UserResource::make($user),
        ]);
    }

    /**
     * Révoque le token utilisé pour la requête courante.
     */
    public function logout(Request $request): JsonResponse
    {
        LoginLog::record($request, 'logout', $request->user());
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * Renvoie l'utilisateur authentifié.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(UserResource::make($request->user()));
    }
}
