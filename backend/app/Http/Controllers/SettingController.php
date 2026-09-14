<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /**
     * Renvoie les réglages d'identité de l'app (lecture publique :
     * utile pour appliquer nom/logo/couleur, y compris avant connexion).
     */
    public function index(): JsonResponse
    {
        return response()->json(Setting::allAsArray());
    }

    /**
     * Met à jour les réglages (réservé aux admins via le middleware).
     */
    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        Setting::setMany($request->validated());

        return response()->json(Setting::allAsArray());
    }
}
