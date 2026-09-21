<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentStepResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_id' => $this->document_id,
            'catalog_chapter_id' => $this->catalog_chapter_id,
            'code' => $this->code,
            'label' => $this->label,
            'position' => $this->position,
            // Total de l'étape, hors positions optionnelles.
            'total' => $this->whenLoaded('positions', fn () => round(
                (float) $this->positions->where('is_optional', false)->sum('amount'), 2
            )),
            'positions' => DocumentPositionResource::collection($this->whenLoaded('positions')),
        ];
    }
}
