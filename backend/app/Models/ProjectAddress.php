<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Adresse nommée d'un projet (facturation, architecte, accès…), liée ou non au carnet d'adresses.
 */
class ProjectAddress extends Model
{
    protected $fillable = [
        'project_id', 'label', 'address_id', 'name', 'street', 'street_no', 'zip', 'city',
        'phone', 'email', 'remark', 'position',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function address(): BelongsTo
    {
        return $this->belongsTo(Address::class)->withTrashed();
    }
}
