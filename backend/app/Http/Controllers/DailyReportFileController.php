<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesDailyReports;
use App\Http\Resources\DailyReportResource;
use App\Models\DailyReport;
use App\Models\DailyReportFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Fichiers et photos joints à un rapport (disque privé, lien signé temporaire).
 */
class DailyReportFileController extends Controller
{
    use AuthorizesDailyReports;

    public function store(Request $request, DailyReport $report): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:12'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf,doc,docx,xls,xlsx,txt', 'max:10240'],
        ], [
            'files.*.mimes' => 'Formats acceptés : photos (JPG, PNG, WebP), PDF, Word, Excel, texte.',
            'files.*.max' => 'Un fichier ne peut pas dépasser 10 Mo.',
        ]);

        $next = ((int) $report->files()->max('position')) + 1;
        foreach ($request->file('files') as $file) {
            $mime = $file->getMimeType();
            $report->files()->create([
                'path' => $file->store("daily-reports/{$report->id}", DailyReportFile::DISK),
                'original_name' => $file->getClientOriginalName(),
                'mime' => $mime,
                'size' => $file->getSize(),
                'is_image' => str_starts_with((string) $mime, 'image/'),
                'position' => $next++,
            ]);
        }

        return DailyReportResource::make($report->load(DailyReport::FULL));
    }

    public function update(Request $request, DailyReport $report, DailyReportFile $file): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        abort_unless($file->daily_report_id === $report->id, 404);
        $file->update($request->validate(['caption' => ['nullable', 'string', 'max:255']]));

        return DailyReportResource::make($report->load(DailyReport::FULL));
    }

    public function destroy(Request $request, DailyReport $report, DailyReportFile $file): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        abort_unless($file->daily_report_id === $report->id, 404);
        $file->delete();

        return DailyReportResource::make($report->load(DailyReport::FULL));
    }

    /** Sert le fichier via un lien signé temporaire (route hors auth, middleware signed). */
    public function file(DailyReportFile $file): StreamedResponse
    {
        abort_unless(Storage::disk(DailyReportFile::DISK)->exists($file->path), 404);

        return Storage::disk(DailyReportFile::DISK)->response($file->path, $file->original_name, [
            'Cache-Control' => 'private, max-age=21600',
        ]);
    }
}
