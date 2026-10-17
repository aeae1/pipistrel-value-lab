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
const finite=(v,fallback=0)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(+v)? +v : fallback;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(finite(n));
const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(finite(n));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Math.round(v*100)+'%';
const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(finite(n));
const hoursFmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(finite(n));
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
 autopilot:{none:0,basic:2600,installed:4550,twoaxis:6500},
 prop:{fixed:-6300,ground:-3700,inflight:0,constant:4700},
 navigator:{none:0,basic:500,gnx:3100,gtn650:5500,gtn750:9000}
};
const EXTRA={adsb:1500,flarm:1350,dualGlass:3100,oxygen:1000,towKit:3300,wingTips:4800,longRange:1750,premiumInterior:2100,beringerBrakes:950,heatedPitot:950,electricTrim:800,ledLights:450,enginePreheat:400,wheelFairings:500};
// Equipment included in the disclosed variant anchor; never charge for it twice.
const BASE_EXTRAS={virus_explorer:['dualGlass','adsb','towKit'],sinus_flex:['wingTips'],sinus_max:['wingTips']};
const REGIONS={US:{shipping:[900,3000],paperwork:2500},Europe:{shipping:[14000,30000],paperwork:6000},Canada:{shipping:[3000,9000],paperwork:4200},Other:{shipping:[18000,40000],paperwork:7000}};
const FIELDS=Array.from(document.querySelectorAll('[data-persist]'));
const QUERY_KEY='pvl-scenario';
const STORAGE_KEY='pipistrel-value-lab-v3';
let lastReport=null;
let lastDatabase=[];
let scenarios=[];
let loading=false;
let initialized=false;
let lastDisplayedMid=null;
let lastDisplayedConfig=null;
let tableSort={key:'date',direction:'desc'};

function fieldValue(el){return el.type==='checkbox'?el.checked:el.value;}
function getConfig(){
 const c={}; for(const el of FIELDS){c[el.id]=fieldValue(el)};
 const numbers=['askingPrice','year','hours','engineHours','serviceYear','engineTbo','engineCalendar','repackYear','repackInterval','rocketYear','fxRate','negotiation','budget','shippingLow','shippingHigh','registrationCosts','duty','tax','vatRebate'];
 const optional=new Set(['hours','engineHours','serviceYear','engineTbo','engineCalendar','repackYear','repackInterval']);
 for(const key of numbers){c[key]=finite(c[key],optional.has(key)?null:0)}
 c.year=clamp(Math.round(c.year),2000,2026);if(c.hours!==null)c.hours=clamp(c.hours,0,30000);
 for(const [key,lo,hi] of [['engineHours',0,30000],['engineTbo',100,4000],['serviceYear',1970,2026],['engineCalendar',1,30],['repackYear',1980,2026],['repackInterval',1,20]])if(c[key]!==null)c[key]=clamp(c[key],lo,hi);
 c.negotiation=clamp(c.negotiation,0,20);c.fxRate=clamp(c.fxRate,.5,2.5);
 c.askingPrice=clamp(c.askingPrice,0,1000000);
 c.tax=clamp(c.tax,0,15);c.duty=clamp(c.duty,0,100);c.vatRebate=clamp(c.vatRebate,0,25);
 return c;
}
function setConfig(values,{render=true}={}){
 for(const el of FIELDS){if(Object.hasOwn(values,el.id)){const value=values[el.id]??'';if(el.type==='checkbox'){el.checked=Boolean(value)}else if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(value))){continue;}else{el.value=String(value)}}}
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
 const h=finite(override?.hours??c.engineHours,null),y=finite(override?.serviceYear??c.serviceYear,null);
 const tbo=finite(override?.tbo??c.engineTbo,null),cal=finite(override?.calendar??c.engineCalendar,null);
 const direct=override?null:dueMonths(c.engineDue);
 const hoursLeft=h!==null&&tbo>0?tbo-h:null;
 const yearsLeft=direct!==null?direct/12:y!==null&&cal>0?y+cal-YEAR:null;
 const fractions=[hoursLeft!==null?hoursLeft/tbo:null,yearsLeft!==null?yearsLeft/(cal||15):null].filter(x=>x!==null);
 const remaining=fractions.length?clamp(Math.min(...fractions),0,1):null;
 return{hoursLeft,yearsLeft,remaining,used:remaining===null?null:1-remaining,hoursExpired:hoursLeft!==null&&hoursLeft<=0,calendarExpired:yearsLeft!==null&&yearsLeft<=0};
}
function engineDepreciation(c,overrides=null){
 const r=engineRemaining(c,overrides);
 const referenceEngineCost=c.engine==='turbo'?30000:(c.engine==='is100'?29000:24500);
 // Resale adjustment is only a FRACTION of hypothetical overhaul cost; not the overhaul estimate itself.
 return r.used===null?0:Math.round(referenceEngineCost*0.49*Math.pow(r.used,1.27));
}
function parachuteYears(c){if(c.rescue==='none'||c.rescue==='unknown')return null;if(c.repackEvidence==='deadline'){const m=dueMonths(c.repackDue);return m===null?null:m/12}if(c.repackEvidence!=='date'||c.repackYear==null||c.repackInterval==null)return null;return c.repackYear+c.repackInterval-YEAR}
function rescueLoss(c){
 if(c.rescue==='none'||c.rescue==='unknown')return 0; // Absence/unknown is priced by rescuePremium, NOT charged twice.
 let due=parachuteYears(c);
 let loss=c.repackEvidence==='due'?3200:due===null?1850:due<=0?3200:due<=2?2000:due<=4?1100:due<=6?250:0;
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
 return optionValue('engine',t.engine)+optionValue('avionics',t.avionics)+optionValue('autopilot',t.autopilot)+optionValue('prop',t.prop)+(BASE_EXTRAS[v]||[]).reduce((s,k)=>s+EXTRA[k],0);
}
function pricingConfig(input){
 const c={...input};
 for(const key of ['engine','avionics','autopilot','prop'])if(!Object.hasOwn(PREMIUM[key],c[key]))c[key]=vs[c.variant].typ[key];
 c.hours=finite(c.hours,500);
 return c;
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
 // Missing dimensions use the SAME reference as the baseline, so blanks are
 // neutral rather than zero-hour/new engines. Known limits/due months still bind.
 const actual=engineDepreciation({...c,engineHours:c.engineHours??c.hours,serviceYear:c.serviceYear??c.year,engineTbo:c.engineTbo??2000,engineCalendar:c.engineCalendar??15});
 const parachute=c.rescue==='none'||c.rescue==='unknown'?0:250-rescueLoss(c);
 return Math.round(normal-actual+parachute-statusLoss(c));
}
function isEligible(o){return ['current','historical'].includes(o.status)&&o.airworthiness!=='nonairworthy'&&!o.skipModel&&o.year!=null&&o.price>2000}
function aircraftKey(o){return o.aircraftId||o.reg?.toUpperCase().replace(/\s/g,'')||o.id}
function independentRecords(records){
 const unique=new Map();
 for(const o of records){const key=aircraftKey(o),old=unique.get(key);if(!old||(o.quality??0)>(old.quality??0)||((o.quality??0)===(old.quality??0)&&o.date>old.date))unique.set(key,o)}
 return [...unique.values()];
}
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
 if(o.autopilot!==undefined &&o.autopilot!==null){v+=optionValue('autopilot',c.autopilot)-optionValue('autopilot',o.autopilotType||(o.autopilot?'installed':'none'))}
 for(const key of Object.keys(EXTRA))if(typeof o[key]==='boolean')v+=((c[key]?1:0)-(o[key]?1:0))*EXTRA[key];
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
function calculate(input){
 const c=pricingConfig(input),source=OBS.find(o=>o.id===c.sourceId);
 const vals=independentRecords(OBS.filter(o=>isEligible(o)&&(!source||aircraftKey(o)!==aircraftKey(source)))).map(o=>({...o,w:compWeight(o,c),value:comparableAdjust(o,c)})).filter(o=>o.w>.012);
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
 if(result)width=Math.max(width,Math.min(.40,result.spread));
 if(n<2)width=Math.max(width,.28);
 if(c.engineEvidence!=='verified')width+=.05;
 if(['engineHours','serviceYear','engineTbo','engineCalendar'].some(k=>input[k]==null||input[k]===''))width+=.025;
 if(['engine','avionics','autopilot','prop'].some(k=>input[k]==='unknown'))width+=.025;
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
 $('engineHoursLeft').textContent=er.hoursLeft===null?'Unknown':hoursFmt(er.hoursLeft)+' h';
 $('engineYearsLeft').textContent=er.yearsLeft===null?'Unknown':er.yearsLeft.toFixed(1)+' yr';
 $('engineHoursCard').classList.toggle('bad',er.hoursExpired);
 $('engineCalendarCard').classList.toggle('bad',er.calendarExpired);
 $('engineExplanation').textContent=er.calendarExpired||er.hoursExpired?'At least one stated limit is reached. An overhaul, documented extension, or permissible on-condition regime must be verified.':er.hoursLeft===null||er.yearsLeft===null?'An engine-life dimension is unknown. Missing dimensions use a typical same-year reference in the price model; the displayed remaining life is not invented.':'The shorter hour/calendar horizon governs the selected schedule. Verify the engine serial, service date and current applicable bulletin.';
 const resc=parachuteYears(c);
 $('repackLeft').textContent=c.rescue==='none'?'Not fitted':c.rescue==='unknown'?'Unknown':c.repackEvidence==='due'?'DUE / expired':resc===null?'Not verified':resc<=0?'DUE / expired':resc.toFixed(1)+' yr';
 $('repackCard').classList.toggle('bad',c.repackEvidence==='due'||(resc!==null&&resc<=0));
 const rocket=c.rocketYear;
 $('rocketLeft').textContent=c.rescue==='none'?'—':c.rescue==='unknown'?'Unknown':rocket===0?'Unverified':(rocket<=YEAR?'Due / expired':(rocket-YEAR)+' yr');
 $('rocketCard').classList.toggle('bad',c.rescue!=='none'&&rocket>0&&rocket<=YEAR);
 const warnings=[];
 if(c.rescue==='unknown')warnings.push('Parachute installation has not been established for this listing; your mandatory rescue-system requirement remains unverified.');
 if(c.rescue!=='none'&&c.rescue!=='unknown'&&c.repackEvidence==='unknown')warnings.push('Repack date is not verified. The model applies an uncertainty adjustment, not a fabricated repack interval.');
 if(c.engineEvidence!=='verified')warnings.push('Engine TBO is unverified or on-condition. The calculation uses the selected numeric limits as a sensitivity exercise only; it does not validate legal operation beyond a published limit.');
 if(c.engineEvidence==='verified'&&c.engine==='ul80'&&c.engineTbo===2000)warnings.push('Older Rotax 912 UL/ULS serials often carried shorter limits. Verify service bulletin eligibility for a 2,000-hour TBO.');
 if((c.variant==='virus_sw121'||c.variant==='virus_explorer')&&c.engine!=='s3'&&c.engine!=='unknown')warnings.push('Non-standard specification: certified SW121 / SW121A Explorer ordinarily uses a carbureted Rotax 912 S3. Verify the exact engine approval basis.');
 if(['virus_sw121','virus_explorer'].includes(c.variant))warnings.push('2026 compliance records to check: EASA AD 2026-0070-E (airbrake bellcrank) and 2026-0137R1 (door locks). Applicability, serial groups and compliance times require the actual records; no listing has been cleared by this tool. Links are in Research.');
 if(c.avionics==='g1000')warnings.push('G1000 is an unverified hypothetical installation for these variants. Its pricing prior does not establish physical suitability, approval or IFR authorization.');
 if(c.variant.startsWith('sinus')&&c.engine==='is100')warnings.push('Fuel-injected Sinus configuration is not a standard assumption. Confirm that this exact conversion is factory-approved for the serial and airworthiness category.');
 if(c.year<2021&&c.variant==='virus_explorer')warnings.push('SW121A Explorer type certification dates to 2021; an earlier build year needs verification.');
 if(c.year<2016&&c.variant==='virus_sw121')warnings.push('Certified Virus SW121 was type-certified in 2016. An earlier listing may be a mislabeled UL variant; verify the exact serial and approval.');
 if(c.landingGear==='tail'&&['virus_sw121','virus_explorer'].includes(c.variant))warnings.push('Tailwheel certified SW121-family scenario: the referenced type sheet specifies tricycle gear. Verify any claimed alternative approval.');
 $('engineWarning').innerHTML=warnings.map(esc).join('<br>');$('engineWarning').classList.toggle('hidden',!warnings.length);
 $('variantHint').textContent=vs[c.variant].desc;
}
function renderEstimate(c,r){
 $('priceCenter').textContent=money(r.midpoint);
 const signature=JSON.stringify(c),changed=signature!==lastDisplayedConfig;
 const d=lastDisplayedMid===null?null:r.midpoint-lastDisplayedMid;
 const delta=$('priceDelta');
 if(changed){
 delta.className='price-delta'+(d>0?' positive':d<0?' negative':'');
 delta.textContent=d===null?'Adjust a control to see the dollar change.':d===0?'No change to the nearest dollar':(d>0?'+':'−')+money(Math.abs(d))+' since the previous setting · illustrative';
 lastDisplayedMid=r.midpoint;
 lastDisplayedConfig=signature;
 }
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
 const eligibility=c.eligibility||'unknown';
 $('eligibilityStatus').textContent=eligibility==='confirmed'?'Eligibility basis reviewed by you · verify documents remain applicable':eligibility==='ineligible'?'Ineligible for the intended US operation · acquisition is blocked':'US eligibility not established · cost scenario only';
 $('eligibilityStatus').className='warning';
 $('budgetDelta').className='mono '+(eligibility==='confirmed'?(under?'under':'over'):'');
 $('budgetDelta').textContent=(under?'+':'−')+money(Math.abs(a.budgetDiff));
 $('budgetLabel').textContent=(eligibility==='ineligible'?'Blocked':eligibility==='unknown'?'Conditional budget arithmetic':under?'Below budget':'Above budget')+` · ${money(c.budget)}`;
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
function optionChanges(input){
 const c=pricingConfig(input);
 const t=vs[c.variant].typ;
 const arr=[['Engine / injection',optionValue('engine',c.engine)-optionValue('engine',t.engine)],['Flight deck',optionValue('avionics',c.avionics)-optionValue('avionics',t.avionics)],['Autopilot',optionValue('autopilot',c.autopilot)-optionValue('autopilot',t.autopilot)],['Propeller',optionValue('prop',c.prop)-optionValue('prop',t.prop)],['Navigation / GTN',optionValue('navigator',c.navigator)],['Rescue fitted',rescuePremium(c)],...Object.entries(EXTRA).map(([key,v])=>[({adsb:'ADS-B',flarm:'FLARM',dualGlass:'Dual flight displays',oxygen:'Installed oxygen',towKit:'Approved glider tow kit',wingTips:'Both wingtip sets',longRange:'Long-range fuel tanks',premiumInterior:'Interior / paint',beringerBrakes:'Beringer wheels / brakes',heatedPitot:'Heated pitot',electricTrim:'Electric trim',ledLights:'LED lighting',enginePreheat:'Engine preheater',wheelFairings:'Wheel fairings'}[key]),((c[key]?1:0)-((BASE_EXTRAS[c.variant]||[]).includes(key)?1:0))*v])];
 return arr;
}
function renderSensitivity(c,r){
 const changes=optionChanges(c).filter(x=>Math.abs(x[1])>0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 const all=changes.slice(0,6);
 if(!all.length){$('sensitivity').innerHTML='<div class="note">Typical benchmark specification selected; no major equipment premiums versus this variant baseline. Try changing the Garmin, engine or propeller.</div>'}
 else{$('sensitivity').innerHTML=all.map(([name,v])=>`<div class="bar-section"><div class="bar-row"><span>${esc(name)}</span><b class="number" style="color:${v>=0?'#16776b':'#b2704c'}">${v>=0?'+':'−'}${money(Math.abs(v))}</b></div><div class="hbar"><i style="width:${Math.max(7,Math.round(100*Math.abs(v)/16000))}%;background:${v>=0?'linear-gradient(90deg,#5cb7b0,#1c847a)':'linear-gradient(90deg,#d2a97d,#bd7557)'}"></i></div></div>`).join('')}
 $('optionBreakdown').innerHTML='<table class="options-table"><thead><tr><th>Feature vs variant benchmark</th><th>Prior difference (before blend)</th></tr></thead><tbody>'+optionChanges(c).map(([name,v])=>`<tr><td>${esc(name)}</td><td class="number" style="text-align:right">${v>=0?'+':'−'}${money(Math.abs(v))}</td></tr>`).join('')+'</tbody></table>';
}
function renderPriors(){
 $('priorRows').innerHTML=Object.entries(vs).map(([k,v])=>`<tr><td>${esc(v.name)}</td><td>${v.refYear}</td><td class="number">${money(v.ask)}</td></tr>`).join('');
 const sections=[['Engine choices',PREMIUM.engine,{ul80:'912 UL · 80 hp / carb',uls100:'912 ULS · 100 hp / carb',is100:'912 iS · 100 hp / injected',s3:'912 S3 · 100 hp certified / carb',turbo:'914 turbo'}],['Avionics',PREMIUM.avionics,{analog:'Analog instruments',legacyGlass:'Legacy glass panel',hdx:'Dynon HDX',g3x:'Garmin G3X',g1000:'Garmin G1000'}],['Autopilot',PREMIUM.autopilot,{none:'Not installed',basic:'Basic autopilot',installed:'Installed, axes unverified',twoaxis:'Two-axis autopilot'}],['Propeller',PREMIUM.prop,{fixed:'Fixed pitch',ground:'Ground adjustable',inflight:'In-flight adjustable',constant:'Constant speed'}],['Navigation',PREMIUM.navigator,{none:'None',basic:'Basic navigator',gnx:'Garmin GNX/IFR GPS',gtn650:'GTN 650',gtn750:'GTN 750'}],['Other equipment',EXTRA,{}]];
 $('optionCatalogRows').innerHTML=sections.map(([group,items,names])=>'<tr><td colspan="2" class="strong" style="background:#f2f7f5">'+esc(group)+'</td></tr>'+Object.entries(items).map(([k,v])=>`<tr><td>${esc(names[k]||k.replace(/([A-Z])/g,' $1'))}</td><td class="number">${v>=0?'+':'−'}${money(Math.abs(v))}</td></tr>`).join('')).join('');
 $('sourcesList').innerHTML=RESEARCH.map(s=>`<div class="source-box"><div><a target="_blank" rel="noopener noreferrer" href="${esc(s.url)}">${esc(s.title)} ↗</a><span class="small">${esc(s.detail)}</span></div></div>`).join('');
}
function renderAll(){
 if(loading)return;
 loading=true;
 try{
  syncSliders(); const c=getConfig(),r=calculate(c);lastReport=r;
  renderLoadedNotice(c);showHealth(c);renderEstimate(c,r);renderAcquisition(c,r);renderOffer(c,r);renderCompPreview(r,c);renderSensitivity(c,r);renderVisuals(c,r);
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
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(yyyyMm||'')))return null;
 const [y,m]=yyyyMm.split('-').map(Number);
 return (y-2026)*12+(m-10);
}
function marketFields(o,c){
 const tbo=o.engineTboHours!=null&&o.engineHours!=null?o.engineTboHours-o.engineHours:null;
 const calendar=dueMonths(o.engineTboCalendarDue);
 const repack=dueMonths(o.repackDue);
 const parachute=o.parachute===true?'Fitted':o.parachute===false?'Not fitted':null;
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
  parachute, repack, repackIsDue:o.repackStatus==='due'||o.rescueDue===true,
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
function matchesFilters(o,f,c){
 const q=(f.search||'').trim().toLowerCase();
 const match=(k,v)=>!f[k]||f[k]==='all'||f[k]===v;
 return match('family',o.family)&&match('variant',o.variant)&&match('region',o.region)&&match('status',o.status)
  &&(match('use','all')||(f.use==='usable'?isEligible(o):!isEligible(o)))
  &&(match('engine','all')||(o.engine===f.engine&&o.fieldEvidence?.engine?.state!=='inferred'))
  &&(match('rescue','all')||(f.rescue==='yes'?o.parachute===true:f.rescue==='no'?o.parachute===false:o.parachute==null))
  &&(match('autopilot','all')||(f.autopilot==='yes'?o.autopilot===true:f.autopilot==='no'?o.autopilot===false:o.autopilot==null))
  &&(!(finite(f.maxPrice)>0)||usd(o,c.fxRate)<=+f.maxPrice)
  &&(!q||[o.id,o.reg,o.serial,o.year,o.variant,o.location,o.notes,o.source,o.status,o.avionicsDetail,o.autopilotDetail,o.propDetail,o.engineDetail].join(' ').toLowerCase().includes(q));
}
function filteredDatabase(){
 const f=Object.fromEntries(['Family','Variant','Region','Status','Use','Engine','Rescue','Autopilot','MaxPrice','Search'].map(k=>[k[0].toLowerCase()+k.slice(1),$('db'+k).value])),c=getConfig();
 return OBS.filter(o=>matchesFilters(o,f,c)).sort((a,b)=>sortedValues(a,b,tableSort.key,tableSort.direction,c)||String(b.date).localeCompare(String(a.date)));
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
 const number=v=>v==null?unknown:hoursFmt(v);
 const months=v=>v==null?unknown:`<span class="${v<=0?'overdue':''}">${v<=0?'OVERDUE':esc(String(v)+' months')}</span>`;
 $('databaseRows').innerHTML=rows.map(o=>{
  const f=marketFields(o,c),priceLabel=money(f.usd);
  const original=o.currency==='EUR'?eur(o.price):money(o.price);
  const priceSub=o.currency==='EUR'?`${original} original · rate ${c.fxRate.toFixed(2)}`:'USD original';
  const tboSub=f.tboHours==null?'':`<span class="subvalue">${o.engineTboBasis?'† Seller claim / unverified':'† Seller-advertised limit; verify serial'}</span>`;
  const calSub=f.tboCalendar==null?'':'<span class="subvalue">† Seller-stated due date</span>';
  const repackSub=o.repackDue?`<span class="subvalue">Seller due: ${esc(o.repackDue)}</span>`:o.repackServiceYear?'<span class="subvalue">Service date ≠ verified repack due date</span>':'';
  const history=o.priceHistory?.length?`<b>Asking history (one aircraft)</b><p>${o.priceHistory.map(h=>esc(h.date)+' · '+money((h.currency||o.currency)==='EUR'?h.price*c.fxRate:h.price)).join('<br>')}</p>`:'';
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
   <td>${plain(f.parachute)}</td>
   <td class="num">${f.repack==null?`<span class="${f.repackLabel.startsWith('Due')?'overdue':'unknown'}">${esc(f.repackLabel)}</span>`:months(f.repack)}${repackSub}</td>
   <td class="longcell">${plain(f.prop)}</td>
   <td class="longcell">${esc(f.location)}</td>
   <td class="num">${esc(f.date)}</td>
   <td><span class="badge ${esc(o.status)}">${esc(o.status)}</span><span class="subvalue">${isEligible(o)?'Valuation comp':'Context only'}</span><button type="button" class="action-load" data-load-record="${esc(o.id)}">Load into calculator ↗</button><details><summary>Evidence &amp; notes</summary><div class="small" style="max-width:325px;line-height:1.6">${esc(o.notes||'Not specified')}<br>${history}<br><b>Provenance</b>: ${esc(o.access||'legacy record')} · observed ${esc(o.observedAt||'not rechecked')}<br>Date basis: ${esc(o.dateBasis)}<br>Identity group: ${esc(aircraftKey(o))}<br>${Object.entries(o.fieldEvidence||{}).map(([k,v])=>esc(k+': '+v.state)+(v.url?' <a target="_blank" rel="noopener noreferrer" href="'+esc(v.url)+'">evidence ↗</a>':'')).join('<br>')}<br>Source: ${esc(o.source||'Unknown')}<br><a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">Original listing ↗</a></div></details></td></tr>`;
 }).join('');
 if(!rows.length)$('databaseRows').innerHTML='<tr><td colspan="16" style="text-align:center;padding:30px">No records match the current filters.</td></tr>';
}
function downloadVisibleCSV(){
 const rows=lastDatabase,c=getConfig();
 const keys=['id','family','variant','year','price_usd_equivalent','price_original','currency_original','fx_usd_per_eur','airframe_hours','engine','engine_hours','engine_tbo_left_hours_seller_claim','engine_tbo_calendar_months_left_seller_claim','avionics','autopilot','parachute_status','parachute_repack_months_left_seller_claim','parachute_repack_detail','propeller','location','date','source','status','is_model_eligible','notes','url','aircraft_id','date_basis','observed_at','access','field_evidence'];
 const v=x=>{let str=String(x??'');if(typeof x!=='number'&&/^[=+\-@\t\r]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"'};
 const csv=keys.join(',')+'\r\n'+rows.map(o=>{
  const f=marketFields(o,c);
  const record={id:o.id,family:o.family,variant:o.variant,year:o.year,price_usd_equivalent:Math.round(f.usd),price_original:o.price,currency_original:o.currency,fx_usd_per_eur:c.fxRate,airframe_hours:o.hours,engine:f.engine,engine_hours:o.engineHours,engine_tbo_left_hours_seller_claim:f.tboHours,engine_tbo_calendar_months_left_seller_claim:f.tboCalendar,avionics:f.avionics,autopilot:f.autopilot,parachute_status:f.parachute,parachute_repack_months_left_seller_claim:f.repack,parachute_repack_detail:f.repackLabel,propeller:f.prop,location:o.location,date:o.date,source:o.source,status:o.status,is_model_eligible:isEligible(o),notes:o.notes,url:o.url,aircraft_id:aircraftKey(o),date_basis:o.dateBasis,observed_at:o.observedAt,access:o.access,field_evidence:JSON.stringify(o.fieldEvidence||{})};
  return keys.map(k=>v(record[k])).join(',');
 }).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='pipistrel-observations-'+ASOF+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
// One mapping is shared by the UI and grouped holdout audit. No prior listing's
// aircraft-specific fields can leak through. Financial assumptions may persist.
function recordScenario(o,financial={}){
 const region=REGIONS[o.region]||REGIONS.Other;
 return {...financial,sourceId:o.id,variant:o.variant,askingPrice:o.price,askingCurrency:o.currency,origin:o.region,
  year:o.year??vs[o.variant].refYear,hours:o.hours??null,
  engine:o.engine??'unknown',avionics:o.avionics??'unknown',prop:o.prop??'unknown',navigator:o.navigator??'none',
  autopilot:o.autopilotType||(o.autopilot===true?'installed':o.autopilot===false?'none':'unknown'),
  condition:'good',damage:o.damage==='repaired'?'repaired':'unknown',hangared:'unknown',registration:o.registration??'unknown',eligibility:'unknown',landingGear:o.landingGear??'unknown',
  engineHours:o.engineHours??null,serviceYear:o.engineServiceYear??null,engineTbo:o.engineTboHours??null,engineCalendar:o.engineCalendarYears??null,engineDue:o.engineTboCalendarDue??'',engineEvidence:'uncertain',
  rescue:o.parachute===true?'other':o.parachute===false?'none':'unknown',
  repackEvidence:o.repackDue?'deadline':o.repackStatus==='due'||o.rescueDue===true?'due':'unknown',
  repackDue:o.repackDue??'',repackYear:o.repackServiceYear??null,repackInterval:null,rocketYear:0,
  propStatus:'unknown',hoseStatus:o.hoseServiceYear!=null?(o.hoseServiceYear+5<=YEAR?'due':'current'):'unknown',gearboxStatus:'unknown',
  shippingLow:region.shipping[0],shippingHigh:region.shipping[1],registrationCosts:region.paperwork,vatRebate:0,
  ...Object.fromEntries(Object.keys(EXTRA).map(k=>[k,typeof o[k]==='boolean'?o[k]:(BASE_EXTRAS[o.variant]||[]).includes(k)]))};
}
function renderLoadedNotice(c){
 const o=OBS.find(x=>x.id===c.sourceId),note=$('listingLoadedNotice');
 if(!o){note.classList.add('hidden');return}
 const unknowns=['year','hours','engine','avionics','prop','engineHours','engineServiceYear','engineTboHours','autopilot','parachute'].filter(k=>o[k]==null);
 const inherited=Object.keys(EXTRA).filter(k=>o[k]==null&&(BASE_EXTRAS[o.variant]||[]).includes(k));
 note.innerHTML=`<b>Starting record ${esc(o.id)} · ${esc(o.reg||vs[o.variant].name)}</b><br>Controls are editable. This aircraft and its grouped duplicates are excluded from its own comparables. Source claims are not independently verified. Missing specifications use disclosed variant assumptions in pricing; maintenance blanks remain visible. ${unknowns.length?'Unreported: '+esc(unknowns.join(', '))+'. ':''}${inherited.length?'Assumed baseline options: '+esc(inherited.join(', '))+'. ':''}<br>${esc(o.notes)} <a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">Open listing ↗</a>`;
 note.classList.remove('hidden');
}
function loadRecord(id){
 const o=OBS.find(x=>x.id===id);if(!o)return;
 setConfig(recordScenario(o,getConfig()));selectTab('estimate');
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
 $('resetBtn').addEventListener('click',()=>{if(!confirm('Reset aircraft configuration and assumptions to research defaults?'))return;try{localStorage.removeItem(STORAGE_KEY)}catch{};history.replaceState(null,'',location.pathname);let defaults={sourceId:'',engineDue:'',repackDue:'',eligibility:'unknown',askingPrice:0,askingCurrency:'USD',variant:'virus_sw',year:2018,hours:450,condition:'good',damage:'none',registration:'unknown',hangared:'documented',engine:'is100',engineHours:450,serviceYear:2018,engineTbo:2000,engineCalendar:15,engineEvidence:'uncertain',rescue:'grs',repackYear:2024,repackInterval:6,repackEvidence:'date',rocketYear:0,avionics:'g3x',autopilot:'twoaxis',navigator:'none',prop:'constant',propStatus:'ok',hoseStatus:'current',gearboxStatus:'current',landingGear:'nose',adsb:true,flarm:false,dualGlass:false,oxygen:false,towKit:false,wingTips:false,longRange:false,premiumInterior:false,beringerBrakes:false,heatedPitot:false,electricTrim:false,ledLights:false,enginePreheat:false,wheelFairings:false,origin:'US',fxRate:1.16,negotiation:4,budget:200000,shippingLow:900,shippingHigh:3000,registrationCosts:2500,duty:0,tax:8.25,vatRebate:0};setConfig(defaults);$('listingLoadedNotice').classList.add('hidden');selectTab('estimate')});
 $('shareBtn').addEventListener('click',copyScenario);
 $('downloadCSV').addEventListener('click',downloadVisibleCSV);
 $('preferredSearch').addEventListener('click',()=>{for(const id of ['dbFamily','dbVariant','dbRegion','dbAutopilot'])$(id).value='all';$('dbSearch').value='';$('dbEngine').value='is100';$('dbRescue').value='yes';$('dbUse').value='usable';$('dbStatus').value='current';$('dbMaxPrice').value='200000';renderDatabase()});
 $('clearFilters').addEventListener('click',()=>{for(const id of ['dbFamily','dbVariant','dbRegion','dbAutopilot','dbEngine','dbRescue','dbUse','dbStatus'])$(id).value='all';$('dbSearch').value='';$('dbMaxPrice').value='';renderDatabase()});
 for(const id of ['dbSearch','dbFamily','dbVariant','dbRegion','dbMaxPrice','dbAutopilot','dbUse','dbEngine','dbRescue','dbStatus'])$(id).addEventListener('input',renderDatabase);
 $('dbSort').addEventListener('change',e=>setQuickSort(e.target.value));
 document.querySelectorAll('#marketTable button[data-sort-key]').forEach(button=>button.addEventListener('click',()=>selectTableSort(button.dataset.sortKey)));
 document.addEventListener('click',e=>{const b=e.target.closest('button[data-load-record]');if(b)loadRecord(b.dataset.loadRecord)});
 $('hoursSlider').addEventListener('input',()=>{$('hours').value=$('hoursSlider').value;renderAll()});
 $('hours').addEventListener('input',()=>{$('hoursSlider').value=clamp(finite($('hours').value),0,4000)});
 $('variant').addEventListener('change',()=>{
  const v=$('variant').value;
  const p=vs[v];
  $('sourceId').value='';$('engineDue').value='';$('repackDue').value='';
  $('engineEvidence').value='uncertain';$('engineCalendar').value='15';$('engineTbo').value='2000';
  $('repackEvidence').value='unknown';$('repackInterval').value='6';$('landingGear').value='nose';
  for(const key of Object.keys(EXTRA))$(key).checked=(BASE_EXTRAS[v]||[]).includes(key);
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

  renderAll();
 });
 $('engine').addEventListener('change',()=>{
  let e=$('engine').value;
  $('engineDue').value='';$('engineEvidence').value='uncertain';
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
 initState();bind();initVisuals();renderPriors();renderAll();renderDatabase();
}
init();
