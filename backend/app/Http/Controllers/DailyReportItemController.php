<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesDailyReports;
use App\Http\Requests\SaveDailyReportItemRequest;
use App\Http\Resources\DailyReportResource;
use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\PriceElement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Ressources d'un rapport (matériaux, machines, matériel d'exploitation, outillage, tiers).
 */
class DailyReportItemController extends Controller
{
    use AuthorizesDailyReports;

    public function store(SaveDailyReportItemRequest $request, DailyReport $report): JsonResponse
    {
        $this->authorizeEdit($request, $report);
        $data = $request->validated();
        $this->checkStep($report, $data);

        if (! empty($data['price_element_id'])) {
            $element = PriceElement::findOrFail($data['price_element_id']);
            $data = array_merge([
                'label' => $element->description,
                'unit' => $element->unit,
                'unit_cost' => $element->net_price ?? $element->supplier_price,
            ], array_filter($data, fn ($value) => $value !== null));
            $element->increment('usage_count');
        }

        $data['position'] = ((int) $report->items()->where('family', $data['family'])->max('position')) + 1;
        $item = $report->items()->create($data);

        return DailyReportResource::make($report->recalculate()->load(DailyReport::FULL))
            ->additional(['created_item_id' => $item->id])
            ->response()
            ->setStatusCode(201);
    }

    public function update(SaveDailyReportItemRequest $request, DailyReport $report, DailyReportItem $item): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        abort_unless($item->daily_report_id === $report->id, 404);
        $data = $request->validated();
        $this->checkStep($report, $data);
        $item->update($data);

        return DailyReportResource::make($report->recalculate()->load(DailyReport::FULL));
    }

    public function destroy(Request $request, DailyReport $report, DailyReportItem $item): DailyReportResource
    {
        $this->authorizeEdit($request, $report);
        abort_unless($item->daily_report_id === $report->id, 404);
        $item->delete();

        return DailyReportResource::make($report->recalculate()->load(DailyReport::FULL));
    }

    /** L'étape indiquée doit appartenir au devis du rapport. */
    private function checkStep(DailyReport $report, array $data): void
    {
        if (! empty($data['document_step_id'])) {
            abort_unless(
                $report->document_id && $report->document->steps()->whereKey($data['document_step_id'])->exists(),
                422,
                "Cette étape n'appartient pas au devis du rapport."
            );
        }
    }
}
