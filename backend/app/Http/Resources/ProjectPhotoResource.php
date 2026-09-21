<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectPhotoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'url' => $this->url(),
            'original_name' => $this->original_name,
            'size' => $this->size,
            'caption' => $this->caption,
            'position' => $this->position,
        ];
    }
}
