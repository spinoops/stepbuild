<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * Photo de présentation d'un projet, stockée sur le disque privé et servie par lien signé
 * temporaire (une balise <img> ne peut pas envoyer le token Bearer).
 */
class ProjectPhoto extends Model
{
    public const DISK = 'local';

    protected $fillable = ['project_id', 'path', 'original_name', 'mime', 'size', 'caption', 'position'];

    protected function casts(): array
    {
        return ['size' => 'integer', 'position' => 'integer'];
    }

    protected static function booted(): void
    {
        static::deleted(fn (self $photo) => Storage::disk(self::DISK)->delete($photo->path));
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function url(): string
    {
        return URL::temporarySignedRoute('project-photos.file', now()->addHours(6), ['photo' => $this->id]);
    }
}
