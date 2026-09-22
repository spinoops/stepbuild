<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteTemplateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'is_default' => $this->is_default,
            'position' => $this->position,
            'steps' => $this->whenLoaded('steps', fn () => $this->steps->map(fn ($step) => [
                'id' => $step->id,
                'catalog_chapter_id' => $step->catalog_chapter_id,
                'code' => $step->chapter?->code ?? $step->code,
                'label' => $step->chapter?->label ?? $step->label,
                'with_articles' => $step->with_articles,
                'position' => $step->position,
            ])),
            'updated_at' => $this->updated_at,
        ];
    }
}
