#!/usr/bin/env python3
"""Validate observation shape, traceability, duplicate keys, and strict flying-aircraft-only scope."""
from __future__ import annotations
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
VALID_VARIANTS = {'virus_long','virus_sw','virus_sw121','virus_explorer','sinus_classic','sinus_flex','sinus_max'}
VALID_STATUS = {'current','historical','archive','new'}
REGIONS = {'US','Europe','Canada','Other'}
# Any such language in an observation is cause for manual review before publishing it.
# Status text and categorical metadata are checked separately, too.
UNAIRWORTHY_PATTERNS = (
    r'\bnot airworthy\b',r'\bnon[ -]?airworthy\b',r'\bparts[ -]?only\b',
    r'\bparts plane\b',r'\bsalvage\b',r'\bairframe repair required\b',
    r'\bairframe needs repairs\b',r'\bwrecked\b',r'\bdismantled\b',
)


def main() -> int:
    records = json.loads((ROOT / 'data' / 'observations.json').read_text(encoding='utf8'))
    sources = json.loads((ROOT / 'data' / 'sources.json').read_text(encoding='utf8'))
    errors = []
    used_regs = []
    ids = []
    for ix, item in enumerate(records, start=1):
        label = str(item.get('id') or f'row {ix}')
        ids.append(label)
        for key in ('id','family','variant','price','currency','location','region','date','url','source','status','quality','notes'):
            if key not in item:
                errors.append(f'{label}: missing {key}')
        if item.get('variant') not in VALID_VARIANTS:
            errors.append(f'{label}: unknown variant {item.get("variant")}')
        if item.get('status') not in VALID_STATUS:
            errors.append(f'{label}: unsupported/non-airworthy category {item.get("status")}')
        if item.get('airworthiness') in ('nonairworthy','salvage','parts','project'):
            errors.append(f'{label}: explicitly non-airworthy aircraft cannot be retained')
        if item.get('currency') not in ('USD','EUR'):
            errors.append(f'{label}: unsupported currency')
        if item.get('region') not in REGIONS:
            errors.append(f'{label}: region must be one of {REGIONS}')
        if not isinstance(item.get('price'),(int,float)) or item['price'] <= 0:
            errors.append(f'{label}: invalid asking price')
        if item.get('year') is not None and (not isinstance(item['year'],int) or not 1990 <= item['year'] <= 2026):
            errors.append(f'{label}: implausible build year')
        if item.get('hours') is not None and (not isinstance(item['hours'],(float,int)) or item['hours'] < 0):
            errors.append(f'{label}: invalid airframe time')
        if not isinstance(item.get('quality'),(int,float)) or not 0 <= item['quality'] <= 1:
            errors.append(f'{label}: quality must be 0-1')
        if item.get('family') != item.get('variant','').split('_')[0]:
            errors.append(f'{label}: family/variant contradiction')
        try: date.fromisoformat(item.get('date',''))
        except Exception:errors.append(f'{label}: invalid observation date')
        parsed=urlsplit(item.get('url',''))
        if parsed.scheme!='https' or not parsed.netloc:
            errors.append(f'{label}: listing URL must be HTTPS absolute')
        search_blob=' '.join(str(item.get(k,'')) for k in ('notes','source','condition','description'))
        for pattern in UNAIRWORTHY_PATTERNS:
            if re.search(pattern,search_blob,re.I):
                errors.append(f'{label}: airworthiness scope violation: {pattern}')
        if item.get('status') in ('current','historical') and item.get('reg'):
            if not item.get('skipModel'): used_regs.append(item['reg'].strip().upper())
        if item.get('status')=='archive' and not item.get('skipModel'):
            errors.append(f'{label}: archive price requires skipModel=true')
        if item.get('status')=='new' and not item.get('skipModel'):
            errors.append(f'{label}: factory new record cannot be a used comp')
    for key,n in Counter(ids).items():
        if n>1: errors.append(f'duplicate observation id {key}: {n}')
    for reg,n in Counter(used_regs).items():
        if n>1: errors.append(f'repeated registration among weighted comparables: {reg}')
    if not isinstance(sources,list) or not sources:
        errors.append('research sources missing')
    for i,s in enumerate(sources):
        if not s.get('title') or not s.get('url','').startswith('https://'):
            errors.append(f'research link #{i+1}: missing title or valid HTTPS URL')
    if errors:
        print('FAILED data validation:')
        print('\n'.join('  • '+e for e in errors))
        return 1
    weighted=sum(x.get('status') in ('current','historical') and not x.get('skipModel') and x.get('year') is not None for x in records)
    print(f'PASS: {len(records)} records, {weighted} model-eligible, {len(sources)} research links, '
          'zero known non-airworthy/salvage/parts-only records')
    return 0

if __name__ == '__main__':sys.exit(main())
