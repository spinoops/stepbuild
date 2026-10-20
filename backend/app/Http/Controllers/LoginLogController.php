<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesGridQuery;
use App\Http\Resources\LoginLogResource;
use App\Models\LoginLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Journal des connexions (administration) : liste paginée, du plus récent au plus ancien.
 * Filtres : ?event=, ?user_id=, ?from=AAAA-MM-JJ, ?to=AAAA-MM-JJ, plus ceux de la grille (filter[email]…).
 * La réponse porte un résumé des dernières 24 h (connexions, échecs, adresses IP en échec).
 */
class LoginLogController extends Controller
{
    use HandlesGridQuery;

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'event' => ['nullable', Rule::in(LoginLog::EVENTS)],
            'user_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = LoginLog::with('user:id,name,email,deleted_at')
            ->when($filters['event'] ?? null, fn ($q, $event) => $q->where('event', $event))
            ->when($filters['user_id'] ?? null, fn ($q, $id) => $q->where('user_id', $id))
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->where('created_at', '>=', $from.' 00:00:00'))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->where('created_at', '<=', $to.' 23:59:59'));

        $logs = $this->paginateGrid($query, $request, ['email', 'ip_address', 'user_agent'], ['created_at', 'event', 'email', 'ip_address'], 'created_at', 'desc');

        $since = now()->subDay();
        $recent = LoginLog::where('created_at', '>=', $since);

        return LoginLogResource::collection($logs)->additional(['summary' => [
            'logins_24h' => (clone $recent)->where('event', 'login')->count(),
            'failed_24h' => (clone $recent)->whereIn('event', ['failed', 'throttled'])->count(),
            'failed_ips_24h' => (clone $recent)->whereIn('event', ['failed', 'throttled'])->distinct()->count('ip_address'),
            'retention_days' => LoginLog::RETENTION_DAYS,
        ]]);
    }
}
