#!/usr/bin/env python3
"""Offline desktop/mobile UI smoke tests. Requires playwright + installed Chromium."""
from __future__ import annotations
import json
import os
import shutil
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT/'index.html').resolve().as_uri()


def as_money(t: str) -> float:
    return float(t.replace('$','').replace(',','').strip())


def exercise(browser, width, height, screenshot):
    page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('about:blank')
    page.set_content((ROOT/'index.html').read_text(encoding='utf8'),wait_until='load')
    page.locator('#priceCenter').wait_for()
    initial=as_money(page.locator('#priceCenter').inner_text())
    # Capture the standard FI Virus configuration before modifying inputs for tests.
    page.screenshot(path=str(Path(os.environ.get('PVL_SCREENSHOT_DIR',tempfile.gettempdir()))/screenshot),full_page=(width>500))
    assert initial > 20000,(width,initial)
    assert page.locator('#heroRecords').inner_text().startswith(str(len(json.loads((ROOT/'data/observations.json').read_text())))+' ')
    assert page.locator('#heroModel').inner_text().startswith(str(page.evaluate('OBS.filter(isEligible).length'))+' ')
    assert not page.locator('#condition option[value="project"]').count()
    assert not page.locator('#damage option[value="structural"]').count()
    assert not page.locator('#dbStatus option[value="salvage"]').count()
    recids=page.evaluate('OBS.map(x=>x.id)')
    assert 'V34' not in recids
    assert page.evaluate('OBS.find(x=>x.id==="V04").variant')=='virus_explorer'
    before=initial
    page.locator('#engineHours').fill('1900')
    page.locator('#engineHours').dispatch_event('input')
    after_engine=as_money(page.locator('#priceCenter').inner_text())
    assert after_engine < before,(width,before,after_engine)
    page.locator('#engineHours').fill('450')
    page.locator('#engineHours').dispatch_event('input')
    prev=as_money(page.locator('#priceCenter').inner_text())
    page.locator('#repackYear').fill('2014')
    page.locator('#repackYear').dispatch_event('input')
    after_repack=as_money(page.locator('#priceCenter').inner_text())
    assert after_repack < prev,('repack price',prev,after_repack)
    page.locator('#variant').select_option('sinus_flex')
    assert page.locator('#variantHint').inner_text().startswith('Flexible wingtip')
    assert as_money(page.locator('#priceCenter').inner_text())>20000
    page.locator('button[data-tab="database"]').click()
    assert page.locator('#marketTable th').count()==16
    assert page.locator('#databaseRows tr').first.locator('td').count()==16
    page.locator('button[data-sort-key="usd"]').click()
    assert page.locator('#marketTable th[data-sort-col="usd"]').get_attribute('aria-sort')=='ascending'
    vals=page.evaluate(r'''() => [...document.querySelectorAll('#databaseRows tr')].map(tr=>Number(tr.children[2].innerText.match(/\$([\d,]+)/)[1].replace(/,/g,'')))''')
    assert vals==sorted(vals)
    page.locator('button[data-sort-key="usd"]').click()
    assert page.locator('#marketTable th[data-sort-col="usd"]').get_attribute('aria-sort')=='descending'
    page.locator('#dbSort').select_option('tboHours-asc')
    assert page.locator('#databaseRows tr').first.locator('td').nth(6).inner_text().startswith('815')
    page.locator('#dbSearch').fill('SP-SFLY')
    assert page.locator('#databaseRows tr').count()==1
    page.locator('#databaseRows button[data-load-record]').click()
    assert page.locator('#engineEvidence').input_value()=='uncertain'
    assert page.locator('#repackEvidence').input_value()=='unknown'
    assert 'excluded from its own comparables' in page.locator('#listingLoadedNotice').inner_text()
    assert page.locator('#engineHours').input_value()=='1185'
    assert page.locator('#serviceYear').input_value()==''
    assert page.locator('#engineDue').input_value()=='2023-05'
    assert '−3.4' in page.locator('#engineYearsLeft').inner_text() or '-3.4' in page.locator('#engineYearsLeft').inner_text()
    assert page.locator('#propStatus').input_value()=='unknown'
    assert page.locator('#autopilot').input_value()=='unknown'
    page.locator('button[data-tab="database"]').click()
    page.locator('#dbSearch').fill('')
    page.locator('#dbSort').select_option('date-desc')
    page.locator('#dbSearch').fill('D-MAFV')
    assert 'D-MAFV' in page.locator('#databaseRows').inner_text()
    assert page.locator('#databaseRows tr').count()>=1
    page.locator('#dbSearch').fill('salvage')
    assert 'No records match' in page.locator('#databaseRows').inner_text()
    page.locator('#dbSearch').fill('')
    page.locator('#dbEngine').select_option('is100')
    assert 'D-MAFV' in page.locator('#databaseRows').inner_text()
    page.locator('#clearFilters').click()
    # Every column is clickable in both directions, including mobile overflow.
    for key in page.locator('#marketTable th[data-sort-col]').evaluate_all('(els)=>els.map(e=>e.dataset.sortCol)'):
        page.locator(f'button[data-sort-key="{key}"]').click()
        first=page.locator(f'th[data-sort-col="{key}"]').get_attribute('aria-sort')
        page.locator(f'button[data-sort-key="{key}"]').click()
        second=page.locator(f'th[data-sort-col="{key}"]').get_attribute('aria-sort')
        assert {first,second}=={'ascending','descending'}
    page.locator('#dbVariant').select_option('virus_explorer')
    page.locator('#dbRegion').select_option('US')
    page.locator('#dbMaxPrice').fill('180000')
    assert 'N195EA' in page.locator('#databaseRows').inner_text()
    assert 'N26WU' not in page.locator('#databaseRows').inner_text()
    page.locator('#preferredSearch').click()
    assert page.locator('#dbRescue').input_value()=='yes'
    assert page.locator('#dbEngine').input_value()=='is100'
    assert 'No records match' in page.locator('#databaseRows').inner_text()
    page.locator('#clearFilters').click()
    with page.expect_download() as download:
        page.locator('#downloadCSV').click()
    csv_text=Path(download.value.path()).read_text(encoding='utf-8-sig')
    assert 'aircraft_id' in csv_text and 'date_basis' in csv_text
    assert 'parachute_repack_months_left_seller_claim' in csv_text
    # Loading a dated repack, then sparse evidence, must clear the prior deadline.
    page.locator('#dbSearch').fill('V11')
    page.locator('button[data-load-record="V11"]').click()
    assert page.locator('#repackDue').input_value()=='2028-01'
    assert page.locator('#repackEvidence').input_value()=='deadline'
    page.locator('button[data-tab="database"]').click()
    page.locator('#dbSearch').fill('V43')
    page.locator('button[data-load-record="V43"]').click()
    assert page.locator('#repackDue').input_value()==''
    assert page.locator('#engineTbo').input_value()==''
    assert page.locator('#engine').input_value()=='unknown'
    assert page.locator('#engineHoursLeft').inner_text()=='Unknown'
    assert 'cost scenario only' in page.locator('#eligibilityStatus').inner_text()
    page.locator('#eligibility').select_option('ineligible')
    assert 'Blocked' in page.locator('#budgetLabel').inner_text()
    # input + change must not erase a real delta on blur.
    page.locator('#negotiation').fill('10')
    delta=page.locator('#priceDelta').inner_text()
    page.locator('#negotiation').dispatch_event('change')
    assert page.locator('#priceDelta').inner_text()==delta and 'No change' not in delta
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
    page.locator('button[data-tab="research"]').click()
    assert 'Linked research library' in page.locator('#tab-research').inner_text()
    page.locator('button[data-tab="estimate"]').click()
    assert not errors, ('Browser console exceptions: ',errors)
    result={'width':width,'initial':initial,'highHours':after_engine,'repackOverdue':after_repack,'errors':len(errors)}
    page.close()
    return result


def main():
    with sync_playwright() as p:
        executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
        browser=p.chromium.launch(headless=True,**({'executable_path':executable} if executable else {}),args=['--no-sandbox'])
        try:
            desktop=exercise(browser,1440,900,'desktop-preview.png')
            mobile=exercise(browser,390,844,'mobile-preview.png')
            print('PASS desktop:',json.dumps(desktop))
            print('PASS mobile:',json.dumps(mobile))
        finally:browser.close()

if __name__ == '__main__':main()
