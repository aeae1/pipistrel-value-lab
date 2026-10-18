#!/usr/bin/env python3
"""Offline desktop/mobile UI smoke tests. Requires playwright + installed Chromium."""
from __future__ import annotations
import json
import os
import shutil
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT/'index.html').resolve().as_uri()


def as_money(t: str) -> float:
    return float(t.replace('$','').replace(',','').strip())


def exercise(browser, width, height, screenshot):
    page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(URL,wait_until='load')
    page.locator('#priceCenter').wait_for()
    # The artwork is bundled in the offline page and never relies on the network.
    art=page.locator('.hero-art')
    assert art.evaluate('(img)=>img.complete&&img.naturalWidth>0&&img.src.startsWith("data:image/png;base64,")')
    assert art.bounding_box()['width']<=width
    assert abs(art.bounding_box()['width']/art.bounding_box()['height']-(3 if width<=790 else 4))<.02
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
    # Every explorer setting changes the real input; curves and live price agree.
    expect(page.locator('#valueCurve .plot-point')).to_have_attribute('data-price', str(int(initial)))
    point=page.locator('#valueCurve .plot-point')
    initial_transform=point.get_attribute('style')
    page.locator('#curveSlider').fill('1200')
    expect(page.locator('#hours')).to_have_value('1200')
    expect(point).to_have_attribute('data-value','1200')
    assert point.get_attribute('style') != initial_transform
    expect(point).to_have_attribute('data-price',str(int(as_money(page.locator('#priceCenter').inner_text()))))
    page.locator('#pinCurve').click()
    expect(page.locator('#clearCurvePin')).to_be_visible()
    pinned=page.locator('#valueCurve .plot-pin').get_attribute('d')
    page.locator('#curveSlider').fill('1700')
    expect(point).to_have_attribute('data-value','1700')
    assert page.locator('#valueCurve .plot-pin').get_attribute('d')==pinned
    page.locator('#curveAxis').select_option('avionics')
    expect(page.locator('#curveChoices')).to_be_visible()
    page.locator('button[data-curve-choice="hdx"]').click()
    expect(page.locator('#avionics')).to_have_value('hdx')
    expect(point).to_have_attribute('data-value','hdx')
    assert 'H' in page.locator('#valueCurve .plot-line').get_attribute('d')
    expect(page.locator('button[data-curve-choice="hdx"]')).to_have_attribute('aria-pressed','true')
    expect(page.locator('#miniCurve-avionics .plot-point')).to_have_attribute('data-price',str(int(as_money(page.locator('#priceCenter').inner_text()))))
    # Hold other inputs fixed even when selecting another engine type in the graph.
    tbo=page.locator('#engineTbo').input_value()
    page.locator('#curveAxis').select_option('engine')
    page.locator('button[data-curve-choice="turbo"]').click()
    expect(page.locator('#engine')).to_have_value('turbo')
    assert page.locator('#engineTbo').input_value()==tbo
    # Every categorical chart and its form select share ascending actual prices.
    for axis in ['engine','avionics','autopilot','prop','condition']:
        page.locator('#curveAxis').select_option(axis)
        page.wait_for_function('(axis)=>document.querySelector("#valueCurve").dataset.axis===axis',arg=axis)
        prices=[as_money(value) for value in page.locator('#curveChoices button b').all_text_contents()]
        assert prices==sorted(prices),(axis,prices)
        choices=page.locator('#curveChoices button').evaluate_all('(buttons)=>buttons.map(b=>b.dataset.curveChoice)')
        options=page.locator('#'+axis+' option').evaluate_all('(opts)=>opts.map(o=>o.value).filter(v=>v!=="unknown")')
        assert choices==options,(axis,choices,options)
        selected=page.locator('#'+axis).input_value()
        expect(page.locator('#curveChoices button[aria-pressed="true"]')).to_have_attribute('data-curve-choice',selected)
    page.locator('#curveAxis').select_option('year')
    expect(page.locator('#curveSlider')).to_have_attribute('max','2026')
    page.locator('#curveAxis').select_option('negotiation')
    expect(page.locator('#curveSlider')).to_have_attribute('max','20')
    # Calendar curves change the real year fields without changing hours or interval.
    saved_hours=page.locator('#engineHours').input_value()
    for axis,value in [('serviceYear','2024'),('repackYear','2025')]:
        page.locator('#curveAxis').select_option(axis)
        page.locator('#curveSlider').fill(value)
        expect(page.locator('#'+axis)).to_have_value(value)
        expect(point).to_have_attribute('data-value',value)
        expect(point).to_have_attribute('data-price',str(int(as_money(page.locator('#priceCenter').inner_text()))))
        expect(page.locator('#miniCurve-'+axis+' .plot-point')).to_have_attribute('data-value',value)
        expect(page.locator('#curveChangeLabel')).to_have_text('+1 year')
    assert page.locator('#engineHours').input_value()==saved_hours
    expect(page.locator('#repackInterval')).to_have_value('6')
    expect(page.locator('#engineCostNote')).to_contain_text('37,571')
    page.locator('#repackEvidence').select_option('deadline')
    page.locator('#repackDue').fill('2029-06')
    page.locator('#curveAxis').select_option('repackYear')
    expect(page.locator('#curveNote')).to_contain_text('This input is inactive')
    # Price stays below the navigation while working deep in the form.
    page.locator('#gearboxStatus').scroll_into_view_if_needed()
    summary=page.locator('#mobileSummary').bounding_box()
    nav=page.locator('.subbar').bounding_box()
    assert summary and nav and summary['y']>=nav['y']+nav['height']-1 and summary['y']+summary['height']<height
    # A reduced-motion preference disables marker animation.
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('#valueCurve .plot-point').evaluate('(el)=>getComputedStyle(el).transitionDuration')=='0s'
    page.emulate_media(reduced_motion='no-preference')
    # Reset via the app's actual defaults, then capture the new graph interface.
    page.on('dialog',lambda d:d.accept())
    page.locator('#resetBtn').evaluate('(el)=>el.click()')
    expect(page.locator('#hours')).to_have_value('450')
    page.locator('#clearCurvePin').click()
    page.locator('#curveAxis').select_option('avionics')
    expect(page.locator('button[data-curve-choice="g3x"]')).to_have_attribute('aria-pressed','true')
    page.locator('#visualWorkbench').scroll_into_view_if_needed()
    page.screenshot(path=str(Path(os.environ.get('PVL_SCREENSHOT_DIR',tempfile.gettempdir()))/('visual-'+screenshot)),full_page=False)
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
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
    page.locator('#engineHours').fill('')
    expect(page.locator('#miniCurve-engineHours .plot-point')).to_be_hidden()
    expect(page.locator('#miniCurve-serviceYear .plot-point')).to_be_hidden()
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
