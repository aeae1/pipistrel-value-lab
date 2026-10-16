/* Pipistrel Value Lab: all computation local, no telemetry, no live market feed.
   Price estimates are asking-price-derived decision aids, NOT completed-sale appraisals.
*/
'use strict';
const PAYLOAD=JSON.parse(document.getElementById('app-data').textContent);
const OBS=PAYLOAD.observations;
const RESEARCH=PAYLOAD.sources;
const ASOF='2026-10-16';
const YEAR=2026;
const $=id=>document.getElementById(id);
const clamp=(v,l,h)=>Math.min(h,Math.max(l,v));
const finite=(v,fallback=0)=>Number.isFinite(+v)? +v : fallback;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(finite(n));
const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(finite(n));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Math.round(v*100)+'%';
const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(finite(n));
const vs={
 virus_long:{name:'Virus · original long wing',refYear:2010,ask:93000,family:'virus',desc:'Older longer-wing Virus, not a Virus SW; engine and weight class vary.',typ:{engine:'uls100',avionics:'analog',autopilot:'none',prop:'inflight',rescue:'grs'}},
 virus_sw:{name:'Virus SW · 100 / 100iS',refYear:2018,ask:150000,family:'virus',desc:'Short-wing Virus SW: 80/100 hp, injected 912iS, or 914 turbo by particular approval and serial.',typ:{engine:'uls100',avionics:'legacyGlass',autopilot:'basic',prop:'constant',rescue:'grs'}},
 virus_sw121:{name:'Virus SW121 · certified',refYear:2020,ask:180000,family:'virus',desc:'Certified CS-LSA family; standard Rotax 912 S3 is carbureted, not fuel-injected.',typ:{engine:'s3',avionics:'g3x',autopilot:'twoaxis',prop:'constant',rescue:'grs'}},
 virus_explorer:{name:'Virus SW121A · Explorer',refYear:2023,ask:242000,family:'virus',desc:'Explorer is a certified SW121A, typically Rotax 912 S3 carbureted; do not label it 912iS.',typ:{engine:'s3',avionics:'g3x',autopilot:'twoaxis',prop:'constant',rescue:'grs'}},
 sinus_classic:{name:'Sinus · classic 912',refYear:2010,ask:87000,family:'sinus',desc:'Motorglider-oriented classic Sinus with long wings, mainly 80 hp Rotax 912UL.',typ:{engine:'ul80',avionics:'legacyGlass',autopilot:'none',prop:'inflight',rescue:'grs'}},
 sinus_flex:{name:'Sinus Flex / Max Flex',refYear:2018,ask:117000,family:'sinus',desc:'Flexible wingtip configurations; confirm that BOTH tip sets are included, plus exact approved MTOW.',typ:{engine:'ul80',avionics:'hdx',autopilot:'twoaxis',prop:'inflight',rescue:'grs'}},
 sinus_max:{name:'Sinus Max · recent',refYear:2024,ask:186000,family:'sinus',desc:'Recent Sinus Max is distinct from older 2000s Sinus 912 models; evidence currently sparse.',typ:{engine:'ul80',avionics:'g3x',autopilot:'twoaxis',prop:'inflight',rescue:'grs'}}
};
const PREMIUM={
 engine:{ul80:-7000,uls100:0,is100:14000,s3:1500,turbo:11000},
 avionics:{analog:-7000,legacyGlass:0,hdx:6200,g3x:9000,g1000:11500},
 autopilot:{none:0,basic:2600,twoaxis:6500},
 prop:{fixed:-6300,ground:-3700,inflight:0,constant:4700},
 navigator:{none:0,basic:500,gnx:3100,gtn650:5500,gtn750:9000}
};
const EXTRA={adsb:1500,flarm:1350,dualGlass:3100,oxygen:1000,towKit:3300,wingTips:4800,longRange:1750,premiumInterior:2100,beringerBrakes:950,heatedPitot:950,electricTrim:800,ledLights:450,enginePreheat:400,wheelFairings:500};
const REGIONS={US:{shipping:[900,3000],paperwork:2500},Europe:{shipping:[14000,30000],paperwork:6000},Canada:{shipping:[3000,9000],paperwork:4200},Other:{shipping:[18000,40000],paperwork:7000}};
const FIELDS=Array.from(document.querySelectorAll('[data-persist]'));
const QUERY_KEY='pvl-scenario';
const STORAGE_KEY='pipistrel-value-lab-v2';
let lastReport=null;
let lastDatabase=[];
let scenarios=[];
let loading=false;
let initialized=false;
let lastDisplayedMid=null;
let tableSort={key:'date',direction:'desc'};

function fieldValue(el){return el.type==='checkbox'?el.checked:el.value;}
function getConfig(){
 const c={}; for(const el of FIELDS){c[el.id]=fieldValue(el)};
 const numbers=['askingPrice','year','hours','engineHours','serviceYear','engineTbo','engineCalendar','repackYear','repackInterval','rocketYear','fxRate','negotiation','budget','shippingLow','shippingHigh','registrationCosts','duty','tax','vatRebate'];
 for(const key of numbers){c[key]=finite(c[key],0)}
 c.year=clamp(Math.round(c.year),2000,2026);c.hours=clamp(c.hours,0,30000);
 c.engineHours=clamp(c.engineHours,0,30000); c.engineTbo=clamp(c.engineTbo,100,4000);
 c.serviceYear=clamp(c.serviceYear,1970,2026);c.engineCalendar=clamp(c.engineCalendar,1,30);
 c.repackYear=clamp(c.repackYear,1980,2026);c.repackInterval=clamp(c.repackInterval,1,20);
 c.negotiation=clamp(c.negotiation,0,20);c.fxRate=clamp(c.fxRate,.5,2.5);
 c.askingPrice=clamp(c.askingPrice,0,1000000);
 c.tax=clamp(c.tax,0,15);c.duty=clamp(c.duty,0,100);c.vatRebate=clamp(c.vatRebate,0,25);
 return c;
}
function setConfig(values,{render=true}={}){
 for(const el of FIELDS){if(Object.hasOwn(values,el.id)){if(el.type==='checkbox'){el.checked=Boolean(values[el.id])}else if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(values[el.id]))){continue;}else{el.value=String(values[el.id])}}}
 syncSliders();if(render)renderAll();
}
function store(){if(!initialized)return;try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(getConfig()))}catch{}}
function initState(){let saved=null;
 try{const p=new URLSearchParams(location.search).get('c');if(p&&p.length<8000){saved=JSON.parse(decodeURIComponent(p))}}catch{}
 if(!saved){try{saved=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'null')}catch{}}
 if(saved&&typeof saved==='object'){setConfig(saved,{render:false})}
 initialized=true;
}
function syncSliders(){
 $('hoursSlider').value=String(clamp(finite($('hours').value),0,4000));
 $('yearEcho').textContent=$('year').value;
}
function selectTab(tab){document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')});document.querySelectorAll('.tabpane').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));if(tab==='database')renderDatabase();if(tab==='research')renderPriors();window.scrollTo({top:0,behavior:'instant'})}

function engineRemaining(c,override=null){
 const h=override?.hours??c.engineHours,y=override?.serviceYear??c.serviceYear;
 const tbo=override?.tbo??c.engineTbo,cal=override?.calendar??c.engineCalendar;
 const hoursLeft=tbo-h;
 const yearsLeft=y+cal-YEAR;
 const remaining=Math.min(hoursLeft/tbo,yearsLeft/cal);
 const used=clamp(1-remaining,0,1);
 return{hoursLeft,yearsLeft,remaining:clamp(remaining,0,1),used,hoursExpired:hoursLeft<=0,calendarExpired:yearsLeft<=0};
}
function engineDepreciation(c,overrides=null){
 const r=engineRemaining(c,overrides);
 const referenceEngineCost=c.engine==='turbo'?30000:(c.engine==='is100'?29000:24500);
 // Resale adjustment is only a FRACTION of hypothetical overhaul cost; not the overhaul estimate itself.
 return Math.round(referenceEngineCost*0.49*Math.pow(r.used,1.27));
}
function parachuteYears(c){if(c.rescue==='none'||c.rescue==='unknown'||c.repackEvidence!=='date')return null;return c.repackYear+c.repackInterval-YEAR}
function rescueLoss(c){
 if(c.rescue==='none'||c.rescue==='unknown')return 0; // Absence/unknown is priced by rescuePremium, NOT charged twice.
 let due=parachuteYears(c);
 let loss=c.repackEvidence==='unknown'?1850:c.repackEvidence==='due'?3200:due<=0?3200:due<=2?2000:due<=4?1100:due<=6?250:0;
 if(c.rocketYear>0){let rem=c.rocketYear-YEAR;loss+=rem<=0?1800:rem<=2?700:0}
 return loss;
}
function statusLoss(c){
 let n=0;
 if(c.propStatus==='soon')n+=1200;
 if(c.propStatus==='overdue')n+=3400;
 if(c.propStatus==='unknown')n+=750;
 if(c.hoseStatus==='due')n+=2500;
 if(c.hoseStatus==='unknown')n+=900;
 if(c.gearboxStatus==='soon')n+=900;
 if(c.gearboxStatus==='overdue')n+=3000;
 if(c.gearboxStatus==='unknown')n+=500;
 return n;
}
function optionValue(k,v){return PREMIUM[k]?.[v]??0}
function totalExtra(c){return Object.keys(EXTRA).reduce((sum,k)=>sum+(c[k]?EXTRA[k]:0),0)}
function rescuePremium(c){return c.rescue==='none'?-6200:c.rescue==='unknown'?-3200:0}
function gearPremium(c){
 return optionValue('engine',c.engine)+optionValue('avionics',c.avionics)+optionValue('autopilot',c.autopilot)+optionValue('prop',c.prop)+optionValue('navigator',c.navigator)+totalExtra(c)+rescuePremium(c);
}
function baselineGear(v){
 const t=vs[v].typ;
 return optionValue('engine',t.engine)+optionValue('avionics',t.avionics)+optionValue('autopilot',t.autopilot)+optionValue('prop',t.prop);
}
function refAsking(v,year){const p=vs[v];return p.ask*Math.pow(1.029,clamp(year-p.refYear,-22,17))}
function airframeTimeEffect(v,h){const rate=v.includes('explorer')?20:v==='sinus_max'?20:v==='virus_sw121'?17:v==='virus_sw'?16:11;return clamp((500-h)*rate,-38000,22000)}
function issueCost(c){
 let out=0;
 if(c.condition==='excellent')out+=0.055;
 if(c.condition==='fair')out-=.085;
 if(c.damage==='unknown')out-=.025;
 if(c.damage==='repaired')out-=.09;
 if(c.hangared==='normal')out-=.025;
 if(c.hangared==='unknown')out-=.045;
 if(c.hangared==='missing')out-=.10;
 if(c.registration==='unknown')out-=.025;
 // No monetary credit for certified US registration when sourced from unverified foreign sellers.
 return out;
}
// A neutral quote intentionally excludes aircraft-specific maintenance and damage.
// They are applied AFTER the comp/prior blend to avoid diluting their effect when
// many comps exist. Older comps have their own typical-age TBO embodied in ask.
function quotePrior(c){
 const v=c.variant;
 const bench=refAsking(v,c.year)+airframeTimeEffect(v,c.hours);
 return Math.max(15000,bench+gearPremium(c)-baselineGear(v));
}
function maintenanceDelta(c){
 // Assume the price of a typical same-year aircraft already incorporates an
 // original engine with approximately airframe TT and a 2000h/15yr reference.
 // This comparison is NOT a claim that every engine is eligible for 2000 h.
 const normal=engineDepreciation(c,{hours:c.hours,serviceYear:c.year,tbo:2000,calendar:15});
 const actual=engineDepreciation(c);
 const parachute=c.rescue==='none'||c.rescue==='unknown'?0:250-rescueLoss(c);
 return Math.round(normal-actual+parachute-statusLoss(c));
}
function isEligible(o){return ['current','historical'].includes(o.status)&&o.airworthiness!=='nonairworthy'&&!o.skipModel&&o.year!=null&&o.price>2000}
function usd(o,fx){return o.currency==='EUR'?o.price*fx:o.price}
function comparableAdjust(o,c){
 let v=usd(o,c.fxRate);
 const fromYear=o.year??YEAR;
 // Normalize by known model, build year and TT. No CPI/future FX backfill of old asking prices.
 let modelAndYear=refAsking(c.variant,c.year)-refAsking(o.variant,fromYear);
 modelAndYear=clamp(modelAndYear,-120000,120000);
 v+=modelAndYear;
 if(o.hours!=null)v+=airframeTimeEffect(c.variant,c.hours)-airframeTimeEffect(o.variant,o.hours);
 // Missing advertisement fields are UNKNOWN; never treat them as absent.
 for(const k of ['engine','avionics','prop']){
  if(o[k]!==undefined&&o[k]!==null){v+=optionValue(k,c[k])-optionValue(k,o[k])}
 }
 if(o.autopilot!==undefined &&o.autopilot!==null){v+=optionValue('autopilot',c.autopilot)-(o.autopilot?optionValue('autopilot','twoaxis'):0)}
 if(o.parachute!==undefined&&o.parachute!==null){v+=rescuePremium(c)-(o.parachute?0:-6200)}
 if(o.rescueDue===true&&c.rescue!=='none'&&c.rescue!=='unknown')v+=2300;
 if(o.damage==='repaired'&&c.damage==='none')v+=Math.min(12500,usd(o,c.fxRate)*.07);
 // Do not guess engine installation/overhaul year from aircraft manufacture year.
 // Engine service status is valued once in maintenanceDelta() after blending.
 return clamp(v,10000,500000);
}
function compWeight(o,c){
 const target=vs[c.variant],match=(o.variant===c.variant?1:(o.family===target.family?.08:0));
 if(match===0)return 0;
 const age=clamp(YEAR-finite(o.date?.slice(0,4),YEAR),0,12);
 const timeFac=.4+.6*Math.exp(-age/5);
 const hoursFac=o.hours==null?.72:(.7+.3*Math.exp(-Math.abs(c.hours-o.hours)/1100));
 const yearFac=.62+.38*Math.exp(-Math.abs(c.year-o.year)/8);
 // Heavily discount foreign comps for a U.S. acquisition: EU microlights are not US S-LSAs.
 const regionFac=(o.region===c.origin?1:.55);
 const issueFac=o.flag==='classification'?.44:o.flag==='price-conflict'?.77:o.flag==='possible-duplicate'?.45:o.flag==='rapid-markdown'?.6:o.flag==='high'?.24:.95;
 return (o.quality??.6)*match*timeFac*hoursFac*yearFac*regionFac*issueFac;
}
function weightedMedian(vals){
 if(!vals.length)return 0;
 const s=vals.slice().sort((a,b)=>a.value-b.value),tot=s.reduce((sum,o)=>sum+o.w,0);
 let cum=0;for(const v of s){cum+=v.w;if(cum>=tot/2)return v.value}return s[s.length-1].value;
}
function weightedMean(vals){let den=vals.reduce((s,x)=>s+x.w,0);return den?vals.reduce((s,x)=>s+x.value*x.w,0)/den:0}
function robustSummary(vals){
 if(!vals.length)return null;
 const median=weightedMedian(vals);
 const trimmed=vals.map(x=>({...x,value:clamp(x.value,median*.69,median*1.31)}));
 return{mid:weightedMean(trimmed)*.55+median*.45,median,n:vals.length,w:vals.reduce((s,x)=>s+x.w,0),spread:Math.sqrt(vals.reduce((s,x)=>s+x.w*Math.pow((x.value-median)/median,2),0)/vals.reduce((s,x)=>s+x.w,0))};
}
function calculate(c){
 const vals=OBS.filter(isEligible).map(o=>({...o,w:compWeight(o,c),value:comparableAdjust(o,c)})).filter(o=>o.w>.012);
 const exact=vals.filter(x=>x.variant===c.variant);
 let using=exact.length>=3?exact:vals;
 // If sparse, use gently corrected family comparisons as context but not as equal substitutes.
 const result=robustSummary(using);
 let prior=quotePrior(c);
 const eqWeight=exact.reduce((s,x)=>s+x.w,0);
 const refWeight=clamp(eqWeight/(eqWeight+1.0),.08,.82);
 // If only other variants matched, their model-change formula is highly speculative. Rely on the prior.
 const dataWeight=exact.length===0?.15:exact.length===1?.28:exact.length===2?.43:refWeight;
 const matchedAsk=result?result.mid*dataWeight+prior*(1-dataWeight):prior;
 const riskAdj=maintenanceDelta(c);
 const conditionMultiplier=(1+issueCost(c));
 const ask=Math.max(10000,Math.round(matchedAsk*conditionMultiplier+riskAdj));
 const negotiable=1-c.negotiation/100;
 const midpoint=Math.max(12000,Math.round(ask*negotiable));
 const n=exact.length;
 let width=clamp(.135+.20/Math.sqrt(1+eqWeight),.16,.40);
 if(n<2)width=Math.max(width,.28);
 if(c.engineEvidence!=='verified')width+=.05;
 if(c.rescue!=='none'&&c.rescue!=='unknown'&&c.rocketYear===0)width+=.015;
 if(c.rescue==='unknown'||c.repackEvidence==='unknown')width+=.025;
 if(c.variant==='sinus_flex')width=Math.max(width,.35);
 if(c.variant==='virus_explorer')width=Math.max(width,.30);
 if(using.some(x=>x.flag==='classification'))width+=.015;
 width=clamp(width,.17,.47);
 let low=Math.round(midpoint*(1-width));
 let high=Math.round(midpoint*(1+width));
 let confidence=n>=5&&eqWeight>=2.3?'Moderate':n>=3&&eqWeight>1.1?'Limited':'Low';
 const sameMarket=exact.filter(x=>x.region===c.origin).length;
 if(['sinus_flex','virus_explorer'].includes(c.variant) && sameMarket<3 && confidence==='Moderate') confidence='Limited';
 const matches=using.slice().sort((a,b)=>b.w-a.w);
 return{prior,ask,midpoint,low,high,width,confidence,n,sameMarket,eqWeight,result,comparables:matches,dataWeight,riskAdj,conditionMultiplier};
}
function acquisition(c,r){
 const rate=c.origin==='US'?1:1-c.vatRebate/100;
 const purchase=[r.low*rate,r.midpoint*rate,r.high*rate];
 const applyDuty=c.origin==='US'?0:c.duty/100;
 const shippingLow=Math.min(c.shippingLow,c.shippingHigh),shippingHigh=Math.max(c.shippingLow,c.shippingHigh);
 const admin=c.registrationCosts;
 const tax=c.tax/100;
 const priceTax=price=>price*tax;
 const costs=(price,ship)=>price+price*applyDuty+priceTax(price)+ship+admin;
 const deliveredLow=costs(purchase[0],shippingLow);
 const deliveredMid=costs(purchase[1],(shippingLow+shippingHigh)/2);
 const deliveredHigh=costs(purchase[2],shippingHigh);
 return{purchase,deliveredLow,deliveredMid,deliveredHigh,shipLow:shippingLow,shipHigh:shippingHigh,tax:priceTax(purchase[1]),duty:purchase[1]*applyDuty,admin,budgetDiff:c.budget-deliveredMid};
}
function showHealth(c){
 const er=engineRemaining(c);
 $('engineHoursLeft').textContent=fmt(er.hoursLeft)+' h';
 $('engineYearsLeft').textContent=er.yearsLeft.toFixed(1)+' yr';
 $('engineHoursCard').classList.toggle('bad',er.hoursExpired);
 $('engineCalendarCard').classList.toggle('bad',er.calendarExpired);
 $('engineExplanation').textContent=er.calendarExpired||er.hoursExpired?'At least one stated limit is reached. An overhaul, documented extension, or permissible on-condition regime must be verified.':`The shorter of ${(er.hoursLeft).toFixed(0)} h and ${er.yearsLeft.toFixed(0)} calendar years determines the stated TBO horizon; serial number and edition govern.`;
 const resc=parachuteYears(c);
 $('repackLeft').textContent=c.rescue==='none'?'Not fitted':c.rescue==='unknown'?'Unknown':c.repackEvidence==='unknown'?'Not verified':c.repackEvidence==='due'?'DUE / expired':resc<=0?'DUE / expired':resc+' yr';
 $('repackCard').classList.toggle('bad',c.repackEvidence==='due'||(resc!==null&&resc<=0));
 const rocket=c.rocketYear;
 $('rocketLeft').textContent=c.rescue==='none'?'—':c.rescue==='unknown'?'Unknown':rocket===0?'Unverified':(rocket<=YEAR?'Due / expired':(rocket-YEAR)+' yr');
 $('rocketCard').classList.toggle('bad',c.rescue!=='none'&&rocket>0&&rocket<=YEAR);
 const warnings=[];
 if(c.rescue==='unknown')warnings.push('Parachute installation has not been established for this listing; your mandatory rescue-system requirement remains unverified.');
 if(c.rescue!=='none'&&c.rescue!=='unknown'&&c.repackEvidence==='unknown')warnings.push('Repack date is not verified. The model applies an uncertainty adjustment, not a fabricated repack interval.');
 if(c.engineEvidence!=='verified')warnings.push('Engine TBO is unverified or on-condition. The calculation uses the selected numeric limits as a sensitivity exercise only; it does not validate legal operation beyond a published limit.');
 if(c.engineEvidence==='verified'&&c.engine==='ul80'&&c.engineTbo===2000)warnings.push('Older Rotax 912 UL/ULS serials often carried shorter limits. Verify service bulletin eligibility for a 2,000-hour TBO.');
 if((c.variant==='virus_sw121'||c.variant==='virus_explorer')&&c.engine==='is100')warnings.push('Non-standard specification: certified SW121 / SW121A Explorer ordinarily uses a carbureted Rotax 912 S3, not a 912iS. Verify the exact approval basis; an FI retrofit may not be permitted.');
 if(c.variant.startsWith('sinus')&&c.engine==='is100')warnings.push('Fuel-injected Sinus configuration is not a standard assumption. Confirm that this exact conversion is factory-approved for the serial and airworthiness category.');
 if(c.year<2021&&c.variant==='virus_explorer')warnings.push('SW121A Explorer type certification dates to 2021; an earlier build year needs verification.');
 if(c.year<2016&&c.variant==='virus_sw121')warnings.push('Certified Virus SW121 was type-certified in 2016. An earlier listing may be a mislabeled UL variant; verify the exact serial and approval.');
 if(c.landingGear==='tail'&&c.variant==='virus_sw121')warnings.push('Tailwheel SW121 scenario: verify that the exact certified variant and serial were approved for this landing-gear configuration.');
 $('engineWarning').innerHTML=warnings.map(esc).join('<br>');$('engineWarning').classList.toggle('hidden',!warnings.length);
 $('variantHint').textContent=vs[c.variant].desc;
}
function renderEstimate(c,r){
 $('priceCenter').textContent=money(r.midpoint);
 const d=lastDisplayedMid===null?null:r.midpoint-lastDisplayedMid;
 const delta=$('priceDelta');
 delta.className='price-delta'+(d>0?' positive':d<0?' negative':'');
 delta.textContent=d===null?'Adjust a control to see the dollar change.':d===0?'No change to the nearest dollar':(d>0?'+':'−')+money(Math.abs(d))+' since the previous setting · illustrative';
 lastDisplayedMid=r.midpoint;
 $('miniPrice').textContent=money(r.midpoint);
 $('miniRange').textContent=money(r.low)+' – '+money(r.high);
 $('priceLow').textContent=money(r.low);
 $('priceHigh').textContent=money(r.high);
 $('rangeFill').style.width=(100*(1-clamp(r.width,0,.5)))+'%';
 $('askMid').textContent=money(r.ask);
 $('evidenceCount').textContent=`${r.n} exact; ${r.comparables.length} examined`;
 const maintain=r.riskAdj;
 $('maintenanceAdjust').textContent=(maintain<0?'−':'+')+money(Math.abs(maintain))+' vs. typical service';
 const confidence=r.confidence;
 $('confidencePill').textContent=confidence.toUpperCase()+' EVIDENCE';
 $('confidencePill').classList.toggle('warn',confidence!=='Moderate');
 $('confidenceTitle').textContent=confidence==='Moderate'?'Moderate · still asking-derived':confidence==='Limited'?'Limited · small sample':'Low · benchmark-assisted projection';
 $('confidenceReason').textContent=`${r.n} exact-variant usable asking-price observations (${r.sameMarket} from the selected market); total exact evidence weight ${r.eqWeight.toFixed(2)}. ${(r.dataWeight*100).toFixed(0)}% comparable-derived and ${((1-r.dataWeight)*100).toFixed(0)}% baseline-prior-driven. Neither broker asking nor “sold-labelled” index values establish a completed transaction price.`;
}
function renderAcquisition(c,r){
 const a=acquisition(c,r);
 const rows=[['Aircraft · modeled negotiated midpoint',money(a.purchase[1])],['Freight, ferry, packing or import (range)',money(a.shipLow)+' – '+money(a.shipHigh)],['Prebuy / paperwork / assembly allowance',money(a.admin)],['Potential customs surcharge',money(a.duty)],['Texas sales/use tax scenario',money(a.tax)],['Indicated landed midpoint',money(a.deliveredMid)],['Conservative landed interval',money(a.deliveredLow)+' – '+money(a.deliveredHigh)]];
 $('costBreakdown').innerHTML=rows.map((x,i)=>`<div class="${i>=5?'subtotal':''}">${esc(x[0])}</div><div class="number ${i>=5?'subtotal':''}">${esc(x[1])}</div>`).join('');
 const under=a.budgetDiff>=0;
 $('budgetDelta').className='mono '+(under?'under':'over');
 $('budgetDelta').textContent=(under?'+':'−')+money(Math.abs(a.budgetDiff));
 $('budgetLabel').textContent=(under?'Below budget':'Above budget')+` · ${money(c.budget)}`;
 const desc=c.origin==='US'?'Domestic US purchase: a ferry/pickup allowance, prebuy and applicable Texas tax are estimated.':`International acquisition from ${c.origin}: FAA registration/airworthiness eligibility is NOT priced or assured; import can be impossible for some UL serials.`;
 $('importWarning').innerHTML=esc(desc)+' <strong>Verify exact serial, FAA airworthiness eligibility, US category, VAT export conditions and shipping quotes before placing a deposit.</strong>';
}
function renderOffer(c,r){
 const panel=$('offerResult');
 if(!(c.askingPrice>0)){
  panel.innerHTML='<p class="note" style="margin-bottom:0">Add a seller’s advertised price to evaluate the quote alongside the research comps. Zero means no quote entered.</p>';
  return;
 }
 const usdAsk=c.askingCurrency==='EUR'?c.askingPrice*c.fxRate:c.askingPrice;
 const difference=usdAsk-r.ask;
 const percent=(difference/r.ask)*100;
 const badge=percent>12?'Higher than modeled asks':percent< -12?'Lower than modeled asks':'Near modeled asks';
 const cls=percent>12?'over':percent< -12?'under':'';
 panel.innerHTML=`<div class="offer-readout mono ${cls}">${esc(money(usdAsk))}</div><div class="offer-sub">Converted seller ask · ${esc(badge)}</div><div class="offer-sub"><strong>${difference>=0?'+':'−'}${esc(money(Math.abs(difference)))} (${difference>=0?'+':'−'}${Math.abs(percent).toFixed(1)}%)</strong> versus modeled typical <em>asking</em> benchmark of ${esc(money(r.ask))}.</div><div class="offer-sub">The separate modeled <em>negotiated</em> purchase midpoint is <strong>${esc(money(r.midpoint))}</strong>. A low advertised price may reflect damage, eligibility restrictions, overdue maintenance, missing options or a false advertisement. Verify before assuming value.</div>`;
}
function renderCompPreview(r,c){
 let top=r.comparables.slice(0,4);
 if(!top.length){$('compPreview').innerHTML='<div class="empty">No eligible matching records. Estimate uses transparent reference assumptions and should be treated as speculative.</div>';return}
 $('compPreview').innerHTML=top.map(o=>`<div style="border-bottom:1px solid #e9eeee;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:9px"><div><div class="small strong">${esc(o.year??'?')} ${esc(vs[o.variant].name)}</div><div class="small muted">${esc(o.reg||o.location)} · ${o.hours==null?'Hours unknown':fmt(o.hours)+' h'}</div></div><div style="text-align:right;flex:none"><div class="small strong number">${money(usd(o,c.fxRate))}</div><span class="tag">${esc(o.status)}</span></div></div><div class="small" style="margin-top:6px"><a target="_blank" rel="noopener noreferrer" href="${esc(o.url)}">Source ↗</a><span class="muted"> · adjusted to scenario: ${money(o.value)}</span> <button type="button" class="action-load" data-load-record="${esc(o.id)}">Use as scenario ↗</button></div></div>`).join('');
}
function optionChanges(c){
 const t=vs[c.variant].typ;
 const arr=[['Engine / injection',optionValue('engine',c.engine)-optionValue('engine',t.engine)],['Flight deck',optionValue('avionics',c.avionics)-optionValue('avionics',t.avionics)],['Autopilot',optionValue('autopilot',c.autopilot)-optionValue('autopilot',t.autopilot)],['Propeller',optionValue('prop',c.prop)-optionValue('prop',t.prop)],['Navigation / GTN',optionValue('navigator',c.navigator)],['Rescue fitted',rescuePremium(c)],...Object.entries(EXTRA).map(([key,v])=>[({adsb:'ADS-B',flarm:'FLARM',dualGlass:'Dual flight displays',oxygen:'Installed oxygen',towKit:'Approved glider tow kit',wingTips:'Both wingtip sets',longRange:'Long-range fuel tanks',premiumInterior:'Interior / paint',beringerBrakes:'Beringer wheels / brakes',heatedPitot:'Heated pitot',electricTrim:'Electric trim',ledLights:'LED lighting',enginePreheat:'Engine preheater',wheelFairings:'Wheel fairings'}[key]),c[key]?v:0])];
 return arr;
}
function renderSensitivity(c,r){
 const changes=optionChanges(c).filter(x=>Math.abs(x[1])>0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 const all=changes.slice(0,6);
 if(!all.length){$('sensitivity').innerHTML='<div class="note">Typical benchmark specification selected; no major equipment premiums versus this variant baseline. Try changing the Garmin, engine or propeller.</div>'}
 else{$('sensitivity').innerHTML=all.map(([name,v])=>`<div class="bar-section"><div class="bar-row"><span>${esc(name)}</span><b class="number" style="color:${v>=0?'#16776b':'#b2704c'}">${v>=0?'+':'−'}${money(Math.abs(v))}</b></div><div class="hbar"><i style="width:${Math.max(7,Math.round(100*Math.abs(v)/16000))}%;background:${v>=0?'linear-gradient(90deg,#5cb7b0,#1c847a)':'linear-gradient(90deg,#d2a97d,#bd7557)'}"></i></div></div>`).join('')}
 $('optionBreakdown').innerHTML='<table class="options-table"><thead><tr><th>Feature vs variant benchmark</th><th>Resale effect</th></tr></thead><tbody>'+optionChanges(c).map(([name,v])=>`<tr><td>${esc(name)}</td><td class="number" style="text-align:right">${v>=0?'+':'−'}${money(Math.abs(v))}</td></tr>`).join('')+'</tbody></table>';
}
function renderPriors(){
 $('priorRows').innerHTML=Object.entries(vs).map(([k,v])=>`<tr><td>${esc(v.name)}</td><td>${v.refYear}</td><td class="number">${money(v.ask)}</td></tr>`).join('');
 const sections=[['Engine choices',PREMIUM.engine,{ul80:'912 UL · 80 hp / carb',uls100:'912 ULS · 100 hp / carb',is100:'912 iS · 100 hp / injected',s3:'912 S3 · 100 hp certified / carb',turbo:'914 turbo'}],['Avionics',PREMIUM.avionics,{analog:'Analog instruments',legacyGlass:'Legacy glass panel',hdx:'Dynon HDX',g3x:'Garmin G3X',g1000:'Garmin G1000'}],['Autopilot',PREMIUM.autopilot,{none:'Not installed',basic:'Basic autopilot',twoaxis:'Two-axis autopilot'}],['Propeller',PREMIUM.prop,{fixed:'Fixed pitch',ground:'Ground adjustable',inflight:'In-flight adjustable',constant:'Constant speed'}],['Navigation',PREMIUM.navigator,{none:'None',basic:'Basic navigator',gnx:'Garmin GNX/IFR GPS',gtn650:'GTN 650',gtn750:'GTN 750'}],['Other equipment',EXTRA,{}]];
 $('optionCatalogRows').innerHTML=sections.map(([group,items,names])=>'<tr><td colspan="2" class="strong" style="background:#f2f7f5">'+esc(group)+'</td></tr>'+Object.entries(items).map(([k,v])=>`<tr><td>${esc(names[k]||k.replace(/([A-Z])/g,' $1'))}</td><td class="number">${v>=0?'+':'−'}${money(Math.abs(v))}</td></tr>`).join('')).join('');
 $('sourcesList').innerHTML=RESEARCH.map(s=>`<div class="source-box"><div><a target="_blank" rel="noopener noreferrer" href="${esc(s.url)}">${esc(s.title)} ↗</a><span class="small">${esc(s.detail)}</span></div></div>`).join('');
}
function renderAll(){
 if(loading)return;
 loading=true;
 try{
  syncSliders(); const c=getConfig(),r=calculate(c);lastReport=r;
  showHealth(c);renderEstimate(c,r);renderAcquisition(c,r);renderOffer(c,r);renderCompPreview(r,c);renderSensitivity(c,r);
  $('heroRecords').textContent=OBS.length+' source-linked observations';
  $('heroModel').textContent=OBS.filter(isEligible).length+' model-eligible asking records';
  store();
  if(document.getElementById('tab-database').classList.contains('active'))renderDatabase();
 }catch(e){console.error('Valuation renderer:',e);$('priceCenter').textContent='Calculation error';$('confidenceReason').textContent=String(e.message||e)}
 finally{loading=false}
}
// Important: unknown engine TBO/GRS cycles cannot be computed from manufacture year.
const ENGINE_NAMES={ul80:'Rotax 912 UL · 80 hp, carb',uls100:'Rotax 912 ULS · 100 hp, carb',is100:'Rotax 912 iS · 100 hp, injected',s3:'Rotax 912 S3 · carb',turbo:'Rotax 914 · turbo'};
function dueMonths(yyyyMm){
 if(!/^\d{4}-\d{2}$/.test(String(yyyyMm||'')))return null;
 const [y,m]=yyyyMm.split('-').map(Number);
 return (y-2026)*12+(m-10);
}
function marketFields(o,c){
 const tbo=o.engineTboHours!=null&&o.engineHours!=null?o.engineTboHours-o.engineHours:null;
 const calendar=dueMonths(o.engineTboCalendarDue);
 const repack=dueMonths(o.repackDue);
 const parachute=o.parachute===true?'Fitted':o.parachute===false?'Not fitted':'Unknown';
 const rp=o.repackStatus==='due'||o.rescueDue===true?'Due (seller-stated)':repack!==null?(repack<=0?'Due / overdue':`${repack} months`):o.repackServiceYear!=null?`Service ${o.repackServiceYear}; due unknown`:'Unknown';
 return {
  aircraft:`${vs[o.variant]?.name||o.variant} ${o.reg||''}`,
  year:o.year,usd:usd(o,c.fxRate),hours:o.hours,
  engine:o.engineDetail||ENGINE_NAMES[o.engine]||null,
  engineHours:o.engineHours,
  tboHours:tbo,
  tboCalendar:calendar,
  avionics:o.avionicsDetail||({analog:'Analog',legacyGlass:'Legacy glass',hdx:'Dynon HDX',g3x:'Garmin G3X',g1000:'Garmin G1000'}[o.avionics]||null),
  autopilot:o.autopilotDetail||(o.autopilot===true?'Installed · model unknown':o.autopilot===false?'None advertised':null),
  parachute, repack:o.repackStatus==='due'||o.rescueDue===true?-1:repack,
  repackLabel:rp,
  prop:o.propDetail||({fixed:'Fixed pitch',ground:'Ground adjustable',inflight:'In-flight adjustable',constant:'Constant speed'}[o.prop]||null),
  location:o.location, date:o.date, status:o.status
 };
}
function sortedValues(a,b,key,direction,c){
 const x=marketFields(a,c)[key],y=marketFields(b,c)[key];
 if(x==null && y==null)return 0;
 if(x==null)return 1; // Unknown ALWAYS last in either direction
 if(y==null)return -1;
 const sign=direction==='asc'?1:-1;
 if(typeof x==='number'&&typeof y==='number')return sign*(x-y);
 return sign*String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'});
}
function filteredDatabase(){
 const q=$('dbSearch').value.trim().toLowerCase(),family=$('dbFamily').value,status=$('dbStatus').value,use=$('dbUse').value,engine=$('dbEngine').value,rescue=$('dbRescue').value;
 let list=OBS.filter(o=>(family==='all'||o.family===family)&&(status==='all'||o.status===status)&&(use==='all'||(use==='usable'?isEligible(o):!isEligible(o)))&&(engine==='all'||o.engine===engine)&&(rescue==='all'||(rescue==='yes'?o.parachute===true:o.parachute===false))&&(!q||[o.id,o.reg,o.year,o.variant,o.location,o.notes,o.source,o.status,o.avionicsDetail,o.autopilotDetail,o.propDetail,o.engineDetail].join(' ').toLowerCase().includes(q)));
 const c=getConfig();list.sort((a,b)=>sortedValues(a,b,tableSort.key,tableSort.direction,c)||String(b.date).localeCompare(String(a.date)));
 return list;
}
function selectTableSort(key){
 if(tableSort.key===key)tableSort.direction=tableSort.direction==='asc'?'desc':'asc';
 else{tableSort.key=key;tableSort.direction=['date','year','usd','hours','engineHours','tboHours','tboCalendar','repack'].includes(key)?'asc':'asc';}
 $('dbSort').value='custom';renderDatabase();
}
function setQuickSort(value){
 if(value==='custom')return;
 const m=/^(.+)-(asc|desc)$/.exec(value);if(!m)return;
 tableSort={key:m[1],direction:m[2]};renderDatabase();
}
function renderScatter(rows,c){
 // Scatter only uses known manufacturing years and specifically excludes unsuitable records.
 const good=rows.filter(o=>o.year!=null&&o.year>=2000&&o.year<=2026&&['current','historical'].includes(o.status)&&o.airworthiness!=='nonairworthy');
 let width=1000,height=245,L=58,R=22,T=20,B=38,maxPrice=300000;
 let x=y=>L+((y-2000)/26)*(width-L-R), y=p=>T+(1-clamp(p,0,maxPrice)/maxPrice)*(height-T-B);
 let el=`<svg class="plot" viewBox="0 0 ${width} ${height}" aria-label="Asking prices of selected Virus and Sinus observations by build year" role="img"><rect width="${width}" height="${height}" fill="#fbfdfc" rx="12"/>`;
 for(const a of [0,100000,200000,300000]){const py=y(a);el+=`<line x1="${L}" y1="${py}" x2="${width-R}" y2="${py}" stroke="#dce6e3"/><text x="${L-8}" y="${py+4}" font-size="11" text-anchor="end" fill="#6d8383">${a===0?'$0':'$'+a/1000+'k'}</text>`}
 for(const a of [2000,2005,2010,2015,2020,2026]){let xx=x(a);el+=`<text x="${xx}" y="${height-12}" text-anchor="middle" font-size="11" fill="#6d8383">${a}</text>`}
 for(const o of good){const px=x(o.year),py=y(usd(o,c.fxRate)),col=o.family==='virus'?'#178b75':'#d08a49';el+=`<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer"><circle cx="${px}" cy="${py}" r="${o.flag?4:5}" stroke="#fff" stroke-width="2" fill="${col}" opacity=".77"/><title>${esc((o.year||'?')+' '+vs[o.variant].name+' – '+money(usd(o,c.fxRate))+' – '+o.location)}</title></a>`}
 el+='</svg>';return el;
}
function renderDatabase(){
 const c=getConfig();let rows=filteredDatabase();lastDatabase=rows;
 $('recordTotal').textContent=fmt(OBS.length);
 $('usableTotal').textContent=fmt(OBS.filter(isEligible).length);
 $('archiveTotal').textContent=fmt(OBS.filter(o=>o.status==='archive').length);
 $('dbCount').textContent=rows.length+' records match · 0 transaction prices verified · euro conversions use '+c.fxRate.toFixed(2)+' USD/EUR';
 const panel=$('dbScatterWrapper');if(panel)panel.innerHTML=renderScatter(rows,c);
 document.querySelectorAll('#marketTable th[data-sort-col]').forEach(th=>{
  const active=th.dataset.sortCol===tableSort.key;
  const dir=active?(tableSort.direction==='asc'?'ascending':'descending'):'none';
  th.setAttribute('aria-sort',dir);
  const glyph=th.querySelector('.sort-glyph');if(glyph)glyph.textContent=active?(tableSort.direction==='asc'?'↑':'↓'):'↕';
 });
 const unknown='<span class="unknown">Unknown</span>';
 const plain=v=>v==null||v===''?unknown:esc(v);
 const number=v=>v==null?unknown:fmt(v);
 const months=v=>v==null?unknown:`<span class="${v<=0?'overdue':''}">${v<=0?'OVERDUE':esc(String(v)+' months')}</span>`;
 $('databaseRows').innerHTML=rows.map(o=>{
  const f=marketFields(o,c),priceLabel=money(f.usd);
  const original=o.currency==='EUR'?eur(o.price):money(o.price);
  const priceSub=o.currency==='EUR'?`${original} original · rate ${c.fxRate.toFixed(2)}`:'USD original';
  const tboSub=f.tboHours==null?'':`<span class="subvalue">${o.engineTboBasis?'† Seller claim / unverified':'† Seller-advertised limit; verify serial'}</span>`;
  const calSub=f.tboCalendar==null?'':'<span class="subvalue">† Seller-stated due date</span>';
  const repackSub=o.repackDue?`<span class="subvalue">Seller due: ${esc(o.repackDue)}</span>`:o.repackServiceYear?'<span class="subvalue">Service date ≠ verified repack due date</span>':'';
  const history=o.priceHistory?.length?`<b>Asking history (one aircraft)</b><p>${o.priceHistory.map(h=>esc(h.date)+' · '+money(o.currency==='EUR'?h.price*c.fxRate:h.price)).join('<br>')}</p>`:'';
  return `<tr>
   <td><div class="strong">${esc(vs[o.variant]?.name||o.variant)}</div><span class="subvalue">${esc(o.reg||o.id)} ${o.flag?'<span class="issue">⚠ '+esc(o.flag)+'</span>':''}</span></td>
   <td class="num">${number(f.year)}</td>
   <td class="num strong">${priceLabel}<span class="subvalue">${esc(priceSub)}</span></td>
   <td class="num">${number(f.hours)}</td>
   <td class="longcell">${plain(f.engine)}</td>
   <td class="num">${number(f.engineHours)}</td>
   <td class="num">${f.tboHours==null?unknown:`<span class="${f.tboHours<=0?'overdue':''}">${fmt(f.tboHours)} h</span>`}${tboSub}</td>
   <td class="num">${months(f.tboCalendar)}${calSub}</td>
   <td class="longcell">${plain(f.avionics)}</td>
   <td class="longcell">${plain(f.autopilot)}</td>
   <td>${f.parachute==='Unknown'?unknown:esc(f.parachute)}</td>
   <td class="num">${f.repack==null?`<span class="${f.repackLabel.startsWith('Due')?'overdue':'unknown'}">${esc(f.repackLabel)}</span>`:f.repack===-1?'<span class="overdue">DUE</span>':months(f.repack)}${repackSub}</td>
   <td class="longcell">${plain(f.prop)}</td>
   <td class="longcell">${esc(f.location)}</td>
   <td class="num">${esc(f.date)}</td>
   <td><span class="badge ${esc(o.status)}">${esc(o.status)}</span><span class="subvalue">${isEligible(o)?'Valuation comp':'Context only'}</span><button type="button" class="action-load" data-load-record="${esc(o.id)}">Load into calculator ↗</button><details><summary>Evidence &amp; notes</summary><div class="small" style="max-width:325px;line-height:1.6">${esc(o.notes||'Not specified')}<br>${history}<br>Source: ${esc(o.source||'Unknown')}<br><a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">Original listing ↗</a></div></details></td></tr>`;
 }).join('');
 if(!rows.length)$('databaseRows').innerHTML='<tr><td colspan="16" style="text-align:center;padding:30px">No records match the current filters.</td></tr>';
}
function downloadVisibleCSV(){
 const rows=lastDatabase,c=getConfig();
 const keys=['id','family','variant','year','price_usd_equivalent','price_original','currency_original','fx_usd_per_eur','airframe_hours','engine','engine_hours','engine_tbo_left_hours_seller_claim','engine_tbo_calendar_months_left_seller_claim','avionics','autopilot','parachute_status','parachute_repack_months_left_documented','parachute_repack_detail','propeller','location','date','source','status','is_model_eligible','notes','url'];
 const v=x=>{let str=String(x??'');if(/^[=+\-@\t\r]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"'};
 const csv=keys.join(',')+'\r\n'+rows.map(o=>{
  const f=marketFields(o,c);
  const record={id:o.id,family:o.family,variant:o.variant,year:o.year,price_usd_equivalent:Math.round(f.usd),price_original:o.price,currency_original:o.currency,fx_usd_per_eur:c.fxRate,airframe_hours:o.hours,engine:f.engine,engine_hours:o.engineHours,engine_tbo_left_hours_seller_claim:f.tboHours,engine_tbo_calendar_months_left_seller_claim:f.tboCalendar,avionics:f.avionics,autopilot:f.autopilot,parachute_status:f.parachute,parachute_repack_months_left_documented:f.repack,parachute_repack_detail:f.repackLabel,propeller:f.prop,location:o.location,date:o.date,source:o.source,status:o.status,is_model_eligible:isEligible(o),notes:o.notes,url:o.url};
  return keys.map(k=>v(record[k])).join(',');
 }).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='pipistrel-observations-'+ASOF+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function loadRecord(id){
 const o=OBS.find(x=>x.id===id);if(!o)return;
 const updates={variant:o.variant,askingPrice:o.price,askingCurrency:o.currency,origin:o.region};
 if(o.year!=null)updates.year=o.year;
 if(o.hours!=null)updates.hours=o.hours;
 // An unseen engine model/hours/TBO is NOT silently represented as a documented one.
 if(o.engine&&Object.hasOwn(PREMIUM.engine,o.engine))updates.engine=o.engine;
 if(o.avionics&&Object.hasOwn(PREMIUM.avionics,o.avionics))updates.avionics=o.avionics;
 if(o.prop&&Object.hasOwn(PREMIUM.prop,o.prop))updates.prop=o.prop;
 updates.engineHours=o.engineHours??500; // illustrative placeholder, NOT aircraft record
 updates.serviceYear=o.engineServiceYear??(o.year??2020); // illustrative if absent
 updates.engineTbo=o.engineTboHours??2000; // placeholder; NOT serial-specific
 updates.engineEvidence='uncertain';
 updates.autopilot=o.autopilot===false?'none':o.autopilot===true?'basic':'none';
 updates.rescue=o.parachute===true?'other':o.parachute===false?'none':'unknown';
 updates.repackEvidence=(o.repackStatus==='due'||o.rescueDue===true)?'due':'unknown';
 updates.repackYear=2020; // ignored unless user documents it and selects repackEvidence=date
 updates.rocketYear=0;
 setConfig(updates);
 const unknowns=[];
 if(o.engineHours==null)unknowns.push('engine time');
 if(o.engineServiceYear==null)unknowns.push('engine service / overhaul date');
 if(o.engineTboHours==null)unknowns.push('engine TBO eligibility');
 if(o.parachute==null)unknowns.push('rescue installation');
 if(o.repackDue==null && o.repackStatus!=='due' && !o.rescueDue)unknowns.push('parachute repack deadline');
 if(o.autopilot==null)unknowns.push('autopilot specification');
 const note=$('listingLoadedNotice');
 note.innerHTML=`<b>Loaded source record ${esc(o.id)} · ${esc(vs[o.variant].name)}</b><br>Known advertisement fields were copied. Missing technical values are <strong>hypothetical placeholders</strong>, not seller-certified specifications. ${unknowns.length?'Before relying on this scenario, verify: '+esc(unknowns.join(', '))+'.':''} <a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">Open listing ↗</a>`;
 note.classList.remove('hidden');
 selectTab('estimate');
}
function copyScenario(){
 try{let p=new URL(location.href);p.searchParams.set('c',encodeURIComponent(JSON.stringify(getConfig())));let txt=p.toString();
  let copy=()=>navigator.clipboard?.writeText(txt).then(()=>true).catch(()=>false);
  if(navigator.clipboard){copy().then(ok=>{if(ok){$('shareBtn').textContent='Link copied ✓';setTimeout(()=>{$('shareBtn').textContent='Copy scenario link ↗'},2600)}else{prompt('Copy scenario URL',txt)}})}else{prompt('Copy scenario URL',txt)}
 }catch{alert('Could not construct a scenario link in this browser.')}
}
function bind(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
 $('viewDatabase').addEventListener('click',()=>selectTab('database'));
 $('resetBtn').addEventListener('click',()=>{if(!confirm('Reset aircraft configuration and assumptions to research defaults?'))return;try{localStorage.removeItem(STORAGE_KEY)}catch{};history.replaceState(null,'',location.pathname);let defaults={askingPrice:0,askingCurrency:'USD',variant:'virus_sw',year:2018,hours:450,condition:'good',damage:'none',registration:'unknown',hangared:'documented',engine:'is100',engineHours:450,serviceYear:2018,engineTbo:2000,engineCalendar:15,engineEvidence:'verified',rescue:'grs',repackYear:2024,repackInterval:6,repackEvidence:'date',rocketYear:0,avionics:'g3x',autopilot:'twoaxis',navigator:'none',prop:'constant',propStatus:'ok',hoseStatus:'current',gearboxStatus:'current',landingGear:'nose',adsb:true,flarm:false,dualGlass:false,oxygen:false,towKit:false,wingTips:false,longRange:false,premiumInterior:false,beringerBrakes:false,heatedPitot:false,electricTrim:false,ledLights:false,enginePreheat:false,wheelFairings:false,origin:'US',fxRate:1.16,negotiation:4,budget:200000,shippingLow:900,shippingHigh:3000,registrationCosts:2500,duty:0,tax:8.25,vatRebate:0};setConfig(defaults);$('listingLoadedNotice').classList.add('hidden');selectTab('estimate')});
 $('shareBtn').addEventListener('click',copyScenario);
 $('downloadCSV').addEventListener('click',downloadVisibleCSV);
 for(const id of ['dbSearch','dbFamily','dbUse','dbEngine','dbRescue','dbStatus'])$(id).addEventListener('input',renderDatabase);
 $('dbSort').addEventListener('change',e=>setQuickSort(e.target.value));
 document.querySelectorAll('#marketTable button[data-sort-key]').forEach(button=>button.addEventListener('click',()=>selectTableSort(button.dataset.sortKey)));
 document.addEventListener('click',e=>{const b=e.target.closest('button[data-load-record]');if(b)loadRecord(b.dataset.loadRecord)});
 $('hoursSlider').addEventListener('input',()=>{$('hours').value=$('hoursSlider').value;renderAll()});
 $('hours').addEventListener('input',()=>{$('hoursSlider').value=clamp(finite($('hours').value),0,4000)});
 $('variant').addEventListener('change',()=>{
  const v=$('variant').value;
  const p=vs[v];
  $('year').value=p.refYear;
  $('engine').value=p.typ.engine;
  $('avionics').value=p.typ.avionics;
  $('autopilot').value=p.typ.autopilot;
  $('prop').value=p.typ.prop;
  $('engineHours').value=300;
  $('hours').value=450;
  $('serviceYear').value=p.refYear;
  $('repackYear').value=2024;
  $('rocketYear').value=0;
  $('wingTips').checked=v==='sinus_max'||v==='sinus_flex';
  $('dualGlass').checked=v==='virus_explorer'||v==='virus_sw121';
  renderAll();
 });
 $('engine').addEventListener('change',()=>{
  let e=$('engine').value;
  if(e==='is100'||e==='s3'||e==='uls100'){$('engineTbo').value='2000';$('engineCalendar').value='15'}
  if(e==='ul80'){$('engineTbo').value='2000';$('engineCalendar').value='15'}
  if(e==='turbo'){$('engineTbo').value='2000';$('engineCalendar').value='15'}
  renderAll();
 });
 $('origin').addEventListener('change',()=>{
  const p=REGIONS[$('origin').value];$('shippingLow').value=p.shipping[0];$('shippingHigh').value=p.shipping[1];$('registrationCosts').value=p.paperwork;renderAll();
 });
 for(const el of FIELDS){
  if(['variant','engine','origin'].includes(el.id))continue;
  el.addEventListener('input',renderAll);
  el.addEventListener('change',renderAll);
 }
}
function init(){
 // Add an analysis chart into the database's already-formed panel without external dependencies.
 const panel=$('dbCount');const host=document.createElement('div');host.id='dbScatterWrapper';host.style.cssText='margin:12px 0 21px;max-width:100%;';
 panel.insertAdjacentElement('afterend',host);
 initState();bind();renderPriors();renderAll();renderDatabase();
}
init();