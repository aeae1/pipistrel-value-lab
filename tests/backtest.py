#!/usr/bin/env python3
"""Grouped holdout of asking records using the actual production JavaScript engine.
Requires Node, not a browser. UI smoke tests are separate. No fitted sale-price claims.
"""
from __future__ import annotations
import csv
import json
import statistics
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def summarize(rows):
 return dict(record_count=len(rows),median_absolute_percent_error=round(statistics.median(r['abs_pct_error'] for r in rows),2),mean_absolute_percent_error=round(statistics.mean(r['abs_pct_error'] for r in rows),2),mean_signed_percent_error=round(statistics.mean(r['signed_pct_error'] for r in rows),2),in_band_count=sum(r['inside_range'] for r in rows),in_band_percent=round(100*sum(r['inside_range'] for r in rows)/len(rows),1))

def main():
 records=json.loads(subprocess.check_output(['node',str(ROOT/'tests/backtest-engine.cjs')],text=True))
 assert records and all(0<=r['abs_pct_error']<1e6 for r in records)
 with (ROOT/'tests/backtest-results.csv').open('w',newline='',encoding='utf8') as f:
  w=csv.DictWriter(f,fieldnames=list(records[0]),lineterminator='\n');w.writeheader();w.writerows(records)
 result=summarize(records)
 result.update(method='Leave one aircraft identity group out; exact UI record-to-scenario mapping; negotiation zero',by_variant={v:summarize([r for r in records if r['variant']==v]) for v in sorted({r['variant'] for r in records})},largest_residuals=[dict(id=r['id'],signed_pct_error=round(r['signed_pct_error'],2)) for r in sorted(records,key=lambda r:r['abs_pct_error'],reverse=True)[:6]],caveat='Retrospective asking-price corpus with hand-selected priors, incomplete specs and possible unidentified duplicates. Not independent sales-price validation. Bands are judgment ranges. Earlier 38-row results used different imputation and holdout rules and are not directly comparable.')
 (ROOT/'tests/backtest-summary.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
