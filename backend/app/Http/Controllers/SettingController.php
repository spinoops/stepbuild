<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Renvoie les réglages d'identité de l'app (lecture publique :
     * utile pour appliquer nom/logo/couleur, y compris avant connexion).
     */
    public function index(Request $request): JsonResponse
    {
        $settings = Setting::allAsArray();
        if (! ($request->user('sanctum')?->canSeePrices() ?? false)) {
            $settings = array_diff_key($settings, array_flip(Setting::MANAGEMENT_KEYS));
        }

        return response()->json($settings);
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
