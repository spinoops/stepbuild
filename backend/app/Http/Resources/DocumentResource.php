<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'number' => $this->project->number,
                'designation1' => $this->project->designation1,
            ]),
            'type' => $this->type,
            'source_document_id' => $this->source_document_id,
            'source' => $this->when($this->source_document_id !== null && $this->relationLoaded('source') && $this->source, fn () => [
                'id' => $this->source->id,
                'number' => $this->source->number,
                'date' => $this->source->date?->format('Y-m-d'),
                'total_net' => $this->source->total_net,
                'discount_amount' => $this->source->discount_amount,
            ]),
            'advance_percent' => $this->advance_percent,
            'sequence' => $this->sequence,
            'number' => $this->number,
            'title' => $this->title,
            'date' => $this->date?->format('Y-m-d'),
            'status' => $this->status,
            'address_id' => $this->address_id,
            'recipient_company' => $this->recipient_company,
            'recipient_title' => $this->recipient_title,
            'recipient_name' => $this->recipient_name,
            'recipient_first_name' => $this->recipient_first_name,
            'recipient_extra_label' => $this->recipient_extra_label,
            'recipient_extra' => $this->recipient_extra,
            'recipient_street' => $this->recipient_street,
            'recipient_street_no' => $this->recipient_street_no,
            'recipient_zip' => $this->recipient_zip,
            'recipient_city' => $this->recipient_city,
            'recipient_email' => $this->recipient_email,
            'user_id' => $this->user_id,
            'initials' => $this->initials,
            'header_text' => $this->header_text,
            'footer_text' => $this->footer_text,
            'vat_rate' => $this->vat_rate,
            'discount_percent' => $this->discount_percent,
            'total_net' => $this->total_net,
            'discount_amount' => $this->discount_amount,
            'total_vat' => $this->total_vat,
            'rounding' => $this->rounding,
            'total_gross' => $this->total_gross,
            'steps' => DocumentStepResource::collection($this->whenLoaded('steps')),
            'updated_at' => $this->updated_at,
        ];
    }
}
