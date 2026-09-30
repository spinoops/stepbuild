@php
    use App\Support\DocumentPrint as P;
    $base = $document->total_net - $document->discount_amount;
    $recipient = array_filter([
        $document->recipient_title,
        trim(($document->recipient_first_name ?? '').' '.($document->recipient_name ?? '')),
        trim(($document->recipient_street ?? '').' '.($document->recipient_street_no ?? '')),
        trim(($document->recipient_zip ?? '').' '.($document->recipient_city ?? '')),
    ]);
    $projectAddress = array_filter([
        trim(($project?->street ?? '').' '.($project?->street_no ?? '')),
        trim(($project?->zip ?? '').' '.($project?->city ?? '')),
    ]);
    $intro = $document->header_text ?: ($document->type === 'devis' ? $company['quote_intro'] : null);
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 22mm 18mm 20mm 20mm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; color: #1f1f1f; line-height: 1.35; }
        table { width: 100%; border-collapse: collapse; }
        .right { text-align: right; }
        .muted { color: #666; }
        .nowrap { white-space: nowrap; }

        /* Page de garde */
        .letterhead { margin-top: -9mm; }
        .letterhead td { vertical-align: top; }
        .company { font-size: 8pt; color: #444; line-height: 1.4; }
        .recipient { margin-top: 8mm; margin-left: 100mm; min-height: 22mm; font-size: 10.5pt; }
        .dateline { margin-top: 6mm; }
        h1 { font-size: 14pt; margin: 6mm 0 4mm; }
        .project td { padding: 0 0 1mm; vertical-align: top; }
        .project td.label { width: 22mm; color: #666; }
        .intro { margin-top: 5mm; white-space: pre-line; }
        h2 { font-size: 10.5pt; margin: 6mm 0 2mm; }
        .recap td { padding: 0.9mm 0; border-bottom: 0.3pt solid #ddd; }
        .recap td.num { width: 10mm; color: #666; }
        .recap td.cur { width: 12mm; color: #666; }
        .recap td.amount { width: 28mm; text-align: right; }
        .recap tr.total td { border-top: 0.8pt solid #1f1f1f; border-bottom: none; font-weight: bold; padding-top: 2mm; }
        .recap tr.sub td { border-bottom: none; }
        .recap tr.grand td { border-top: 0.8pt solid #1f1f1f; border-bottom: 1.6pt solid #1d3f9c; font-weight: bold; font-size: 10.5pt; padding: 2mm 0; }
        .terms { margin-top: 5mm; }
        .terms .label { font-weight: bold; }
        .ending { page-break-inside: avoid; }
        .closing { margin-top: 5mm; }
        .signature { margin-top: 8mm; }
        .signature td { width: 50%; padding-top: 9mm; border-bottom: 0.5pt solid #888; font-size: 8pt; color: #666; }

        /* Détail des positions */
        .detail { page-break-before: always; margin-top: 6mm; }
        .detail thead th { font-size: 8pt; text-align: left; color: #666; font-weight: normal; border-bottom: 0.8pt solid #1f1f1f; padding: 1.5mm 1mm; }
        .detail td { padding: 1.4mm 1mm; vertical-align: top; }
        .detail td.pos { width: 13mm; color: #555; }
        .detail td.unit { width: 13mm; }
        .detail td.qty, .detail th.qty { width: 18mm; text-align: right; }
        .detail td.price, .detail th.price { width: 22mm; text-align: right; }
        .detail td.amount, .detail th.amount { width: 25mm; text-align: right; }
        .detail tr.step td { font-weight: bold; padding-top: 4mm; border-bottom: 0.4pt solid #bbb; }
        .detail tr.title td { font-weight: bold; padding-top: 2.5mm; }
        .detail tr.text td { font-style: italic; color: #444; }
        .detail tr.item td { border-bottom: 0.2pt solid #e6e6e6; }
        .detail tr.item { page-break-inside: avoid; }
        .detail .description { white-space: pre-line; }
        .option { color: #777; }
        .grand-total td { border-top: 0.8pt solid #1f1f1f; font-weight: bold; padding: 2.5mm 1mm; }
    </style>
</head>
<body>
    {{-- Page de garde --}}
    <table class="letterhead">
        <tr>
            <td style="width: 60%">
                @if ($logo)
                    <img src="{{ $logo }}" style="width: 58mm" alt="{{ $company['name'] }}">
                @else
                    <div style="font-size: 16pt; font-weight: bold">{{ $company['name'] }}</div>
                @endif
            </td>
            <td class="company">
                {{ $company['street'] }}<br>
                {{ $company['zip'] }} {{ $company['city'] }}<br>
                Mail : {{ $company['email'] }}<br>
                Mobile : {{ $company['phone'] }}<br>
                Internet : {{ $company['website'] }}
            </td>
        </tr>
    </table>

    <div class="recipient">
        @foreach ($recipient as $line)
            {{ $line }}<br>
        @endforeach
    </div>

    <div class="dateline">{{ $dateLine }}</div>

    <h1>{{ $title }}</h1>

    <table class="project">
        <tr>
            <td class="label">Projet :</td>
            <td>
                {{ $project?->number }}{{ $project?->designation1 ? ' - '.$project->designation1 : '' }}
                @foreach ($projectAddress as $line)
                    <br>{{ $line }}
                @endforeach
            </td>
        </tr>
        @if ($document->title)
            <tr>
                <td class="label">Objet :</td>
                <td>{{ $document->title }}</td>
            </tr>
        @endif
    </table>

    @if ($intro)
        <div class="intro">{{ $intro }}</div>
    @endif

    <h2>Récapitulation</h2>
    <table class="recap">
        @foreach ($steps as $step)
            <tr>
                <td class="num">{{ $step['number'] }}</td>
                <td>{{ $step['label'] }}</td>
                <td class="cur">CHF</td>
                <td class="amount">{{ P::money($step['total']) }}</td>
            </tr>
        @endforeach
        <tr class="total">
            <td colspan="2">Total brut</td>
            <td class="cur">CHF</td>
            <td class="amount">{{ P::money($document->total_net) }}</td>
        </tr>
        @if ($document->discount_amount > 0)
            <tr class="sub">
                <td colspan="2">Rabais {{ rtrim(rtrim(number_format($document->discount_percent, 2, '.', ''), '0'), '.') }} %</td>
                <td class="cur">CHF</td>
                <td class="amount">- {{ P::money($document->discount_amount) }}</td>
            </tr>
            <tr class="sub">
                <td colspan="2">Total net HT</td>
                <td class="cur">CHF</td>
                <td class="amount">{{ P::money($base) }}</td>
            </tr>
        @endif
        <tr class="sub">
            <td colspan="2">TVA {{ number_format($document->vat_rate, 2, '.', '') }} % sur CHF {{ P::money($base) }}</td>
            <td class="cur">CHF</td>
            <td class="amount">{{ P::money($document->total_vat) }}</td>
        </tr>
        @if (abs($document->rounding) >= 0.005)
            <tr class="sub">
                <td colspan="2">Arrondi</td>
                <td class="cur">CHF</td>
                <td class="amount">{{ P::money($document->rounding) }}</td>
            </tr>
        @endif
        <tr class="grand">
            <td colspan="2">Total net TTC</td>
            <td class="cur">CHF</td>
            <td class="amount">{{ P::money($document->total_gross) }}</td>
        </tr>
    </table>

    <div class="terms">
        <span class="label">Conditions de paiement</span><br>
        {{ $company['payment_terms'] }}
    </div>

    @if ($document->footer_text)
        <div class="intro">{{ $document->footer_text }}</div>
    @endif

    <div class="ending">
        <div class="closing">
            {{ $company['closing'] }}<br><br>
            {{ $company['name'] }}
        </div>

        <div class="signature">
            <div>Pour le donneur d'ordre / direction des travaux</div>
            <table>
                <tr>
                    <td>Date</td>
                    <td>Signature</td>
                </tr>
            </table>
        </div>
    </div>

    {{-- Détail des positions --}}
    <table class="detail">
        <thead>
            <tr>
                <th>Pos.</th>
                <th>Description</th>
                <th>Un.</th>
                <th class="qty">Quantité</th>
                <th class="price">Prix</th>
                <th class="amount">Montant</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($steps as $step)
                <tr class="step">
                    <td class="pos">{{ $step['number'] }}</td>
                    <td colspan="5">{{ $step['label'] }}</td>
                </tr>
                @foreach ($step['rows'] as $row)
                    @if ($row['kind'] === 'item')
                        <tr class="item {{ $row['is_optional'] ? 'option' : '' }}">
                            <td class="pos">{{ $row['number'] }}</td>
                            <td class="description">{{ $row['description'] }}@if ($row['is_optional']) <span class="nowrap">(option, hors total)</span>@endif</td>
                            <td class="unit">{{ $row['unit'] }}</td>
                            <td class="qty">{{ $row['quantity'] !== null ? P::money($row['quantity']) : '' }}</td>
                            <td class="price">{{ P::money($row['unit_price']) }}</td>
                            <td class="amount">{{ P::money($row['amount']) }}</td>
                        </tr>
                    @else
                        <tr class="{{ $row['kind'] }}">
                            <td class="pos">{{ $row['number'] }}</td>
                            <td colspan="5" class="description">{{ $row['description'] }}</td>
                        </tr>
                    @endif
                @endforeach
            @endforeach
            <tr class="grand-total">
                <td></td>
                <td colspan="4">Total brut</td>
                <td class="amount right">{{ P::money($document->total_net) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
