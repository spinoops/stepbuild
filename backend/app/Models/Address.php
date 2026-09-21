<?php

namespace App\Models;

use App\Models\Concerns\HasSearchText;
use Database\Factories\AddressFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Address extends Model
{
    /** @use HasFactory<AddressFactory> */
    use HasFactory, HasSearchText, LogsActivity, SoftDeletes;

    public const TYPES = ['client', 'fournisseur', 'sous_traitant', 'contact'];

    protected $fillable = [
        'type', 'title', 'last_name', 'first_name', 'designation', 'street', 'street_no', 'po_box',
        'country', 'zip', 'city', 'phone', 'mobile', 'email', 'debtor_no', 'remark', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function searchableFields(): array
    {
        return ['last_name', 'first_name', 'designation', 'street', 'zip', 'city', 'email', 'phone', 'debtor_no'];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontSubmitEmptyLogs();
    }
}
