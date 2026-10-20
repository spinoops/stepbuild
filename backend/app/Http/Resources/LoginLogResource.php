<?php

namespace App\Http\Resources;

use App\Models\LoginLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LoginLog
 */
class LoginLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created_at' => $this->created_at?->toIso8601String(),
            'event' => $this->event,
            'reason' => $this->reason,
            'email' => $this->email,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'deleted' => $this->user->deleted_at !== null,
            ] : null,
            'ip_address' => $this->ip_address,
            'device' => $this->device(),
            'user_agent' => $this->user_agent,
        ];
    }
}
