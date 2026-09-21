<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CatalogArticleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'catalog_chapter_id' => $this->catalog_chapter_id,
            'chapter_code' => $this->whenLoaded('chapter', fn () => $this->chapter?->code),
            'code' => $this->code,
            'sub_code' => $this->sub_code,
            'description' => $this->description,
            'unit' => $this->unit,
            'purchase_price' => $this->purchase_price,
            'sale_price' => $this->sale_price,
            'work_type' => $this->work_type,
            'category' => $this->category,
            'is_title' => $this->is_title,
            'usage_count' => $this->usage_count,
            'updated_at' => $this->updated_at,
        ];
    }
}
