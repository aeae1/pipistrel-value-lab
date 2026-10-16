#!/usr/bin/env python3
"""Compile the editable app, price observations, and research references to one offline HTML file."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build() -> Path:
    template = (ROOT / 'template.html').read_text(encoding='utf-8')
    app = (ROOT / 'scripts' / 'app.js').read_text(encoding='utf-8')
    payload = {
        'observations': json.loads((ROOT / 'data' / 'observations.json').read_text(encoding='utf-8')),
        'sources': json.loads((ROOT / 'data' / 'sources.json').read_text(encoding='utf-8')),
    }
    # Escaping '<' prevents an untrusted listing note from closing the JSON script element.
    data_text = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    if template.count('__DATA_JSON__') != 1 or template.count('__APP_JS__') != 1:
        raise RuntimeError('Template must contain one instance of each build marker')
    result = template.replace('__DATA_JSON__', data_text).replace('__APP_JS__', app.rstrip())
    out = ROOT / 'index.html'
    out.write_text(result, encoding='utf-8')
    print(f'Built {out.name} ({out.stat().st_size:,} bytes; '
          f'{len(payload["observations"])} observations, '
          f'{len(payload["sources"])} reference links)')
    return out


if __name__ == '__main__':
    build()
