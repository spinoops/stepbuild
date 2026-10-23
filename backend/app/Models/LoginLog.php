<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;
use Throwable;

/**
 * Une ligne du journal des connexions. Écrite par AuthController, PasswordResetController et le rendu
 * des refus « trop de tentatives » ; lue par la page d'administration. Un échec d'écriture du journal
 * ne bloque jamais la connexion.
 */
class LoginLog extends Model
{
    public const EVENTS = ['login', 'failed', 'throttled', 'logout', 'password_reset'];

    /** Durée de conservation, en jours (purge par stepbuild:cron). */
    public const RETENTION_DAYS = 365;

    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'email', 'event', 'reason', 'ip_address', 'user_agent', 'created_at'];

    protected function casts(): array
    {
        return ['user_id' => 'integer', 'created_at' => 'datetime'];
    }

    public static function record(Request $request, string $event, ?User $user = null, ?string $email = null, ?string $reason = null): void
    {
        try {
            self::create([
                'user_id' => $user?->id,
                'email' => $email !== null ? mb_strtolower(mb_substr(trim($email), 0, 255)) : $user?->email,
                'event' => $event,
                'reason' => $reason,
                'ip_address' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500) ?: null,
            ]);
        } catch (Throwable $e) {
            report($e); // le journal ne doit jamais empêcher de se connecter
        }
    }

    /** Supprime les lignes plus anciennes que la durée de conservation ; renvoie le nombre supprimé. */
    public static function prune(): int
    {
        return self::where('created_at', '<', now()->subDays(self::RETENTION_DAYS))->delete();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /** Recherche simple (grille) : e-mail, adresse IP ou navigateur. */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }
        $like = '%'.addcslashes($term, '%_\\').'%';

        return $query->where(fn (Builder $q) => $q->where('email', 'like', $like)
            ->orWhere('ip_address', 'like', $like)
            ->orWhere('user_agent', 'like', $like));
    }

    /** Navigateur et système lisibles (« Chrome · Windows »), déduits de l'en-tête User-Agent. */
    public function device(): ?string
    {
        $agent = (string) $this->user_agent;
        if ($agent === '') {
            return null;
        }
        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/') => 'Opera',
            str_contains($agent, 'Firefox/') => 'Firefox',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Safari/') => 'Safari',
            default => null,
        };
        $system = match (true) {
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'iPhone') || str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'Mac OS X') => 'macOS',
            str_contains($agent, 'Linux') => 'Linux',
            default => null,
        };
        $label = implode(' · ', array_filter([$browser, $system]));

        return $label !== '' ? $label : mb_strimwidth($agent, 0, 60, '…');
    }
}
