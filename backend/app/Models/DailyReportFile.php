<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * Fichier ou photo joint à un rapport journalier (disque privé, lien signé temporaire).
 */
class DailyReportFile extends Model
{
    public const DISK = 'local';

    protected $fillable = ['daily_report_id', 'path', 'original_name', 'mime', 'size', 'is_image', 'caption', 'position'];

    protected function casts(): array
    {
        return ['size' => 'integer', 'is_image' => 'boolean', 'position' => 'integer'];
    }

    protected static function booted(): void
    {
        static::deleted(fn (self $file) => Storage::disk(self::DISK)->delete($file->path));
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function url(): string
    {
        return URL::temporarySignedRoute('daily-report-files.file', now()->addHours(6), ['file' => $this->id]);
    }
}
