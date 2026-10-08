<?php

use App\Models\Unit;

it('propose les unités par défaut à tous les rôles et réserve leur gestion', function () {
    Unit::seedDefaults();
    Unit::seedDefaults(); // idempotent

    actingAsRole('ouvrier');
    $codes = collect($this->getJson('/api/units')->assertOk()->json('data'))->pluck('code');
    expect($codes->count())->toBe(count(Unit::DEFAULTS))
        ->and($codes->first())->toBe('M1')
        ->and($codes)->toContain('H.', 'Jour', 'Pce');
    $this->postJson('/api/units', ['code' => 'Pal'])->assertForbidden();

    actingAsRole('responsable');
    $unit = $this->postJson('/api/units', ['code' => 'Pal', 'label' => 'Palette'])->assertCreated()->json('data');
    expect($unit['position'])->toBe(count(Unit::DEFAULTS) + 1);
    $this->postJson('/api/units', ['code' => 'Pal'])->assertStatus(422);   // doublon
    $this->putJson("/api/units/{$unit['id']}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
    expect(collect($this->getJson('/api/units')->json('data'))->pluck('code'))->not->toContain('Pal')
        ->and(collect($this->getJson('/api/units?all=1')->json('data'))->pluck('code'))->toContain('Pal');

    $first = Unit::where('code', 'M1')->first();
    $this->postJson('/api/units/reorder', ['ids' => [$unit['id'], $first->id]])->assertOk();
    expect($first->refresh()->position)->toBe(2);
    $this->deleteJson("/api/units/{$unit['id']}")->assertOk();
    expect(Unit::where('code', 'Pal')->exists())->toBeFalse();
});
