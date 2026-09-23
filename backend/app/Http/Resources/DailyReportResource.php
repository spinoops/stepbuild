<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Rapport journalier. Les montants (tarifs, coûts) ne sont renvoyés qu'à la gestion.
 */
class DailyReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $prices = $user?->canSeePrices() ?? false;

        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'number' => $this->project->number,
                'designation1' => $this->project->designation1,
            ]),
            'document_id' => $this->document_id,
            'document' => $this->whenLoaded('document', fn () => $this->document ? [
                'id' => $this->document->id,
                'number' => $this->document->number,
                'status' => $this->document->status,
            ] : null),
            // Étapes du devis de rattachement : colonnes de la grille des heures (jamais de prix ici).
            'steps' => $this->whenLoaded('document', fn () => $this->document
                ? $this->document->steps->map(fn ($step) => ['id' => $step->id, 'code' => $step->code, 'label' => $step->label])->values()
                : []),
            'sequence' => $this->sequence,
            'number' => $this->number,
            'date' => $this->date?->format('Y-m-d'),
            'status' => $this->status,
            'is_regie' => $this->is_regie,
            'responsible_id' => $this->responsible_id,
            'responsible' => $this->whenLoaded('responsible', fn () => $this->responsible?->name),
            'created_by' => $this->created_by,
            'remark' => $this->remark,
            'events' => $this->events,
            'weather' => $this->weather,
            'temp_min' => $this->temp_min,
            'temp_max' => $this->temp_max,
            'total_hours' => $this->total_hours,
            'total_amount' => $this->when($prices, $this->total_amount),
            'can_edit' => $user ? $this->resource->isEditableBy($user) : false,
            'hours' => $this->whenLoaded('hours', fn () => $this->hours->map(fn ($line) => [
                'id' => $line->id,
                'collaborator_id' => $line->collaborator_id,
                'document_step_id' => $line->document_step_id,
                'work_type_id' => $line->work_type_id,
                'quantity' => $line->quantity,
                ...($prices ? ['hourly_cost' => $line->hourly_cost, 'amount' => $line->amount] : []),
            ])->values()),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'family' => $item->family,
                'document_step_id' => $item->document_step_id,
                'price_element_id' => $item->price_element_id,
                'label' => $item->label,
                'unit' => $item->unit,
                'quantity' => $item->quantity,
                ...($prices ? ['unit_cost' => $item->unit_cost, 'amount' => $item->amount] : []),
                'note' => $item->note,
                'position' => $item->position,
            ])->values()),
            'files' => $this->whenLoaded('files', fn () => $this->files->map(fn ($file) => [
                'id' => $file->id,
                'url' => $file->url(),
                'original_name' => $file->original_name,
                'mime' => $file->mime,
                'size' => $file->size,
                'is_image' => $file->is_image,
                'caption' => $file->caption,
                'position' => $file->position,
            ])->values()),
            'updated_at' => $this->updated_at,
        ];
    }
}
