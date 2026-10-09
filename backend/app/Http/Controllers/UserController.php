<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Liste paginée des utilisateurs, avec recherche optionnelle (?search=).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::with('roles')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return UserResource::collection($users);
    }

    /**
     * Crée un utilisateur et lui assigne ses rôles.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        $user->syncRoles($data['roles']);

        return UserResource::make($user->load('roles'))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Met à jour un utilisateur. Le mot de passe est optionnel.
     * Un nouveau mot de passe ou un changement de rôles révoque les connexions existantes du
     * compte (sauf celle de l'admin qui modifie son propre compte).
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $data = $request->validated();

        $user->name = $data['name'];
        $user->email = $data['email'];
        $passwordChanged = ! empty($data['password']);
        if ($passwordChanged) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        $previousRoles = $user->getRoleNames()->sort()->values()->all();
        $user->syncRoles($data['roles']);
        $rolesChanged = $user->fresh()->getRoleNames()->sort()->values()->all() !== $previousRoles;

        if ($passwordChanged || $rolesChanged) {
            $this->revokeTokens($request, $user);
        }

        return UserResource::make($user->load('roles'));
    }

    /**
     * Supprime un utilisateur (interdit sur son propre compte).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    /** Supprime les jetons du compte, en gardant celui de la requête courante s'il lui appartient. */
    private function revokeTokens(Request $request, User $user): void
    {
        $current = $request->user()?->currentAccessToken();
        $query = $user->tokens();
        if ($request->user()?->is($user) && $current && isset($current->id)) {
            $query->whereKeyNot($current->id);
        }
        $query->delete();
    }
}
