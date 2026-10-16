#!/usr/bin/env python3
"""Offline desktop/mobile UI smoke tests. Requires playwright + installed Chromium."""
from __future__ import annotations
import json
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
    page.screenshot(path=str(ROOT/'docs'/screenshot),full_page=(width>500))
    assert initial > 20000,(width,initial)
    assert page.locator('#heroRecords').inner_text().startswith('92 ')
    assert page.locator('#heroModel').inner_text().startswith('46 ')
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
    assert page.locator('#databaseRows tr').first.locator('td').nth(6).inner_text().startswith('1,159')
    page.locator('#dbSearch').fill('SP-SFLY')
    assert page.locator('#databaseRows tr').count()==1
    page.locator('#databaseRows button[data-load-record]').click()
    assert page.locator('#engineEvidence').input_value()=='uncertain'
    assert page.locator('#repackEvidence').input_value()=='unknown'
    assert 'hypothetical placeholders' in page.locator('#listingLoadedNotice').inner_text()
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
    page.locator('button[data-tab="research"]').click()
    assert 'Linked research library' in page.locator('#tab-research').inner_text()
    page.locator('button[data-tab="estimate"]').click()
    assert not errors, ('Browser console exceptions: ',errors)
    result={'width':width,'initial':initial,'highHours':after_engine,'repackOverdue':after_repack,'errors':len(errors)}
    page.close()
    return result


def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        try:
            desktop=exercise(browser,1440,900,'desktop-preview.png')
            mobile=exercise(browser,390,844,'mobile-preview.png')
            print('PASS desktop:',json.dumps(desktop))
            print('PASS mobile:',json.dumps(mobile))
        finally:browser.close()

if __name__ == '__main__':main()