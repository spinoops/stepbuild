<?php

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

function loginLogUser(): User
{
    return User::factory()->create(['email' => 'jane@example.com', 'password' => Hash::make('secret123')]);
}

it('trace les connexions réussies, refusées et les déconnexions', function () {
    $user = loginLogUser();

    $this->withHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36')
        ->postJson('/api/login', ['email' => 'jane@example.com', 'password' => 'mauvais'])->assertStatus(422);
    $this->postJson('/api/login', ['email' => 'Inconnu@Example.com', 'password' => 'x'])->assertStatus(422);
    $token = $this->postJson('/api/login', ['email' => 'jane@example.com', 'password' => 'secret123'])->assertOk()->json('token');
    $this->withToken($token)->postJson('/api/logout')->assertOk();

    $logs = LoginLog::orderBy('id')->get();
    expect($logs->pluck('event')->all())->toBe(['failed', 'failed', 'login', 'logout'])
        ->and($logs[0]->reason)->toBe('bad_password')
        ->and($logs[0]->user_id)->toBe($user->id)
        ->and($logs[0]->device())->toBe('Chrome · Windows')
        ->and($logs[1]->reason)->toBe('unknown_email')
        ->and($logs[1]->user_id)->toBeNull()
        ->and($logs[1]->email)->toBe('inconnu@example.com')
        ->and($logs[2]->user_id)->toBe($user->id)
        ->and($logs[2]->ip_address)->toBe('127.0.0.1')
        ->and($logs[3]->user_id)->toBe($user->id);
});

it('trace les tentatives bloquées par le limiteur', function () {
    loginLogUser();

    foreach (range(1, 6) as $attempt) {
        $this->postJson('/api/login', ['email' => 'jane@example.com', 'password' => 'mauvais'])->assertStatus(422);
    }
    $this->postJson('/api/login', ['email' => 'jane@example.com', 'password' => 'mauvais'])->assertStatus(429);

    expect(LoginLog::where('event', 'failed')->count())->toBe(6)
        ->and(LoginLog::where('event', 'throttled')->value('email'))->toBe('jane@example.com');
});

it('réserve le journal à l’admin, filtre par événement et résume les dernières 24 h', function () {
    $user = loginLogUser();
    LoginLog::create(['user_id' => $user->id, 'email' => $user->email, 'event' => 'login', 'ip_address' => '10.0.0.1']);
    LoginLog::create(['email' => 'pirate@example.com', 'event' => 'failed', 'reason' => 'unknown_email', 'ip_address' => '10.0.0.9']);
    LoginLog::create(['email' => 'pirate@example.com', 'event' => 'failed', 'reason' => 'unknown_email', 'ip_address' => '10.0.0.9', 'created_at' => now()->subDays(3)]);

    actingAsRole('responsable');
    $this->getJson('/api/login-logs')->assertForbidden();

    actingAsRole('admin');
    $all = $this->getJson('/api/login-logs')->assertOk();
    expect($all->json('meta.total'))->toBe(3)
        ->and($all->json('data.0.event'))->toBe('login')   // du plus récent au plus ancien
        ->and($all->json('data.0.user.name'))->toBe($user->name)
        ->and($all->json('summary'))->toMatchArray(['logins_24h' => 1, 'failed_24h' => 1, 'failed_ips_24h' => 1, 'retention_days' => 365]);

    $this->getJson('/api/login-logs?event=failed&filter[email]=pirate')->assertOk()->assertJsonPath('meta.total', 2);
    $this->getJson('/api/login-logs?from='.now()->subDay()->toDateString())->assertOk()->assertJsonPath('meta.total', 2);
    $this->getJson('/api/login-logs?event=autre')->assertStatus(422);
});

it('purge le journal au-delà de la durée de conservation', function () {
    LoginLog::create(['email' => 'ancien@example.com', 'event' => 'login', 'created_at' => now()->subDays(LoginLog::RETENTION_DAYS + 1)]);
    LoginLog::create(['email' => 'recent@example.com', 'event' => 'login']);

    expect(LoginLog::prune())->toBe(1)
        ->and(LoginLog::pluck('email')->all())->toBe(['recent@example.com']);
});
