#!/usr/bin/env python3
"""Reproducible leave-one-aircraft-out audit against published asking prices (not sales)."""
from __future__ import annotations
import csv
import json
import statistics
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

# Browser execution uses the ACTUAL JavaScript valuation engine, not a separate
# Python approximation. For each test, hold the ad out of the same-variant dataset.
EVALUATOR='''() => {
  const baseline=getConfig();
  const entries=OBS.filter(o=>isEligible(o)&&o.hours!=null);
  return entries.map(o=>{
    const original=o.skipModel;
    o.skipModel=true;
    try {
      const c={...baseline,
        variant:o.variant, year:o.year, hours:o.hours, engineHours:o.engineHours??o.hours,
        serviceYear:o.year, origin:o.region, negotiation:0,
        engine:o.engine??vs[o.variant].typ.engine,
        avionics:o.avionics??vs[o.variant].typ.avionics,
        autopilot:o.autopilot===true?'twoaxis':o.autopilot===false?'none':vs[o.variant].typ.autopilot,
        prop:o.prop??vs[o.variant].typ.prop,
        rescue:o.parachute===false?'none':'grs',
        damage:o.damage==='repaired'?'repaired':'none',
        repackYear:2024,rocketYear:0,propStatus:'ok',hoseStatus:'current',gearboxStatus:'current'
      };
      const r=calculate(c);
      const listed=usd(o,c.fxRate);
      return {
        id:o.id,variant:o.variant,year:o.year,region:o.region,listed_usd:listed,
        estimated_ask_usd:r.ask,low_usd:r.low,high_usd:r.high,
        abs_pct_error:Math.abs(r.ask-listed)/listed*100,inside_range:listed>=r.low&&listed<=r.high,
        close_comps:r.n,confidence:r.confidence
      };
    } finally {o.skipModel=original;}
  });
}'''

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page()
        try:
            page.goto('about:blank')
            page.set_content((ROOT/'index.html').read_text(encoding='utf8'),wait_until='load')
            records=page.evaluate(EVALUATOR)
        finally:
            browser.close()
    assert records and all(0<=r['abs_pct_error']<1e6 for r in records)
    path=ROOT/'tests'/'backtest-results.csv'
    with path.open('w',newline='',encoding='utf8') as f:
        w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(records)
    result={
      'record_count':len(records),
      'median_absolute_percent_error':round(statistics.median(r['abs_pct_error'] for r in records),2),
      'mean_absolute_percent_error':round(statistics.mean(r['abs_pct_error'] for r in records),2),
      'in_band_count':sum(r['inside_range'] for r in records),
      'in_band_percent':round(100*sum(r['inside_range'] for r in records)/len(records),1),
      'caveat':'Asking-price in-sample leave-one-listing-out exercise, not external transaction-price verification',
    }
    (ROOT/'tests'/'backtest-summary.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()

