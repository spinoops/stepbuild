# -*- coding: utf-8 -*-
"""
Convertit un export Excel de la liste « Éléments de coûts » de BauBit (Extras → Export, colonnes
Grp. / N° élément / Description / Un. / Un. régie / Prix fourn. / Net / Tarif régie / Un. com. /
Mutation de prix / … / Actif) en JSON pour `php artisan stepbuild:import-stock-list`.

    python backend/database/baubit/elements_xlsx_to_json.py "Matériaux 2026.xlsx" sortie.json

Chaque ligne devient { group, number, name, unit, unit_regie, supplier_price, net_price, regie_code,
unit_factor, price_date (AAAA-MM-JJ), active }. La famille est déduite du premier chiffre du code
régie (« 2.020.000 » → 2), sinon de la lettre du groupe (M = 2).
"""
import datetime
import json
import sys

import openpyxl

HEADERS = {
    'grp.': 'group', 'n° élément': 'number', 'description': 'name', 'un.': 'unit', 'un. régie': 'unit_regie',
    'prix fourn. chf': 'supplier_price', 'net chf': 'net_price', 'tarif régie': 'regie_code', 'un. com.': 'unit_factor',
    'mutation de prix': 'price_date', 'actif': 'active',
}


def to_date(value):
    if isinstance(value, datetime.datetime):
        return value.date().isoformat()
    if isinstance(value, datetime.date):
        return value.isoformat()
    if isinstance(value, str) and len(value) == 10 and value[2] == '.' and value[5] == '.':
        day, month, year = value.split('.')
        return f'{year}-{month}-{day}'
    return None


def to_number(value):
    if value in (None, ''):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace("'", '').replace(' ', '').replace(',', '.'))
    except ValueError:
        return None


def main(source, target):
    wb = openpyxl.load_workbook(source, data_only=True, read_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = [str(h or '').strip().lower() for h in next(rows)]
    index = {HEADERS[h]: i for i, h in enumerate(header) if h in HEADERS}
    missing = [k for k in ('number', 'name') if k not in index]
    if missing:
        sys.exit(f'Colonnes manquantes dans {source} : {missing} (en-têtes lus : {header})')

    out = []
    for row in rows:
        if not any(v is not None for v in row):
            continue
        get = lambda key: row[index[key]] if key in index and index[key] < len(row) else None  # noqa: E731
        code = str(get('regie_code') or '').strip()
        group = str(get('group') or '').strip()
        family = int(code[0]) if code[:1].isdigit() else {'S': 1, 'M': 2, 'O': 5, 'T': 6}.get(group[:1].upper(), 2)
        out.append({
            'family': family,
            'group': group[1:] if group[:1].isalpha() else group,
            'number': str(get('number') or '').strip(),
            'name': str(get('name') or '').strip(),
            'unit': (str(get('unit')).strip() if get('unit') is not None else None),
            'unit_regie': (str(get('unit_regie')).strip() if get('unit_regie') is not None else None),
            'supplier_price': to_number(get('supplier_price')),
            'net_price': to_number(get('net_price')),
            'regie_code': code or None,
            'unit_factor': to_number(get('unit_factor')) or 1,
            'price_date': to_date(get('price_date')),
            'active': str(get('active') or 'X').strip().upper() == 'X',
        })

    with open(target, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False)
    print(f'{len(out)} lignes -> {target}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
