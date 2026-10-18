const assert = require('node:assert/strict');
const {createEngine} = require('./engine-harness.cjs');
const e=createEngine();
const run=s=>e.run(s);
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS',name)};
check('unknown values never become zero-hour or fresh engines',()=>{
 assert.equal(run('finite(null,null)'),null);assert.equal(run('finite("",null)'),null);
 assert.equal(run('engineRemaining({...defaults,engineHours:null}).hoursLeft'),null);
 assert.equal(run('engineRemaining({...defaults,serviceYear:null,engineDue:""}).yearsLeft'),null);
});
check('SP-SFLY engine/prop distinction and calendar deadline',()=>{
 assert.equal(run('marketFields(OBS.find(o=>o.id==="V09"),defaults).tboHours'),815);
 assert.equal(run('engineRemaining(recordScenario(OBS.find(o=>o.id==="V09"),defaults)).calendarExpired'),true);
 assert.equal(run('OBS.find(o=>o.id==="V09").propHours'),841);
});
check('loading sparse record clears all aircraft maintenance and prior equipment',()=>{
 const c=run('recordScenario(OBS.find(o=>o.id==="V43"),{...defaults,engineDue:"2000-01",repackDue:"2000-01",repackInterval:20,engineCalendar:20,propStatus:"overdue",gearboxStatus:"overdue",landingGear:"tail",oxygen:true,vatRebate:20})');
 for(const k of ['engineDue','repackDue'])assert.equal(c[k],'');
 for(const k of ['engineCalendar','repackInterval','serviceYear'])assert.equal(c[k],null);
 assert.equal(c.propStatus,'unknown');assert.equal(c.gearboxStatus,'unknown');assert.equal(c.landingGear,'unknown');assert.equal(c.oxygen,false);assert.equal(c.autopilot,'unknown');assert.equal(c.vatRebate,0);
});
check('month deadlines and due-without-date are distinct',()=>{
 assert.equal(run('dueMonths("2026-13")'),null);
 assert.equal(run('dueMonths("2026-09")'),-1);
 assert.equal(run('marketFields(OBS.find(o=>o.id==="V02"),defaults).repack'),null);
 assert.equal(run('parachuteYears(recordScenario(OBS.find(o=>o.id==="V11"),defaults))'),15/12);
});
check('known identities deduplicate at runtime and held-out aircraft cannot compare to itself',()=>{
 assert.equal(run('independentRecords([OBS[0],{...OBS[0],id:"COPY"}]).length'),1);
 assert.equal(run('calculate(recordScenario(OBS.find(o=>o.id==="V19"),defaults)).comparables.some(o=>o.id==="V19")'),false);
 assert.equal(run('aircraftKey(OBS.find(o=>o.id==="V14"))===aircraftKey(OBS.find(o=>o.id==="V40"))'),true);
});
check('injection and parachute search does not fill omissions',()=>{
 assert.equal(run('matchesFilters(OBS.find(o=>o.id==="V35"),{engine:"is100",rescue:"yes"},defaults)'),false);
 assert.equal(run('matchesFilters(OBS.find(o=>o.id==="V17"),{engine:"is100"},defaults)'),false);
 assert.equal(run('matchesFilters(OBS.find(o=>o.id==="V01"),{maxPrice:150000},defaults)'),false);
});
check('unknowns sort last both directions including parachute',()=>{
 for(const key of ['year','hours','engine','engineHours','tboHours','tboCalendar','avionics','autopilot','parachute','repack','prop'])for(const direction of ['asc','desc']){
  const n=run(`sortedValues({variant:'virus_sw',price:1,currency:'USD'},{variant:'virus_sw',price:1,currency:'USD',year:2020,hours:2,engine:'is100',engineHours:1,engineTboHours:2000,engineTboCalendarDue:'2030-01',avionics:'g3x',autopilot:true,parachute:true,repackDue:'2029-01',prop:'constant'},'${key}','${direction}',defaults)`);
  assert.equal(n,1,`${key} ${direction}`);
 }
});
check('fractional times and common-currency price sort',()=>{
 assert.equal(run('hoursFmt(5.6)'),'5.6');
 assert.ok(run('sortedValues({variant:"virus_sw",price:100000,currency:"EUR"},{variant:"virus_sw",price:110000,currency:"USD"},"usd","asc",defaults)')>0);
});
check('variant baseline includes its standard options once',()=>{
 const n=run(`(()=>{const c={...defaults,variant:'virus_explorer',...vs.virus_explorer.typ,navigator:'none',...Object.fromEntries(Object.keys(EXTRA).map(k=>[k,BASE_EXTRAS.virus_explorer.includes(k)]))};return gearPremium(c)-baselineGear(c.variant)})()`);
 assert.equal(n,0);
});
check('engine wear, overdue rescue and condition have monotone effects',()=>{
 assert.ok(run('calculate({...defaults,engineHours:1900}).midpoint < calculate(defaults).midpoint'));
 assert.ok(run('calculate({...defaults,repackEvidence:"due"}).midpoint < calculate(defaults).midpoint'));
 assert.ok(run('calculate({...defaults,condition:"fair"}).midpoint < calculate(defaults).midpoint'));
});
check('every record preset and each variant returns finite ordered bounds',()=>{
 assert.equal(run(`OBS.every(o=>{const r=calculate(recordScenario(o,defaults));return Number.isFinite(r.midpoint)&&r.low<=r.midpoint&&r.midpoint<=r.high})`),true);
 assert.equal(run('Object.keys(vs).every(variant=>Number.isFinite(calculate({...defaults,variant}).midpoint))'),true);
});
check('visual domains respect year/discount limits and retain high-hour scenarios',()=>{
 assert.equal(run('axisDomain(defaults,"year")[1]'),2026);
 assert.equal(run('axisDomain(defaults,"negotiation")[1]'),20);
 assert.ok(run('axisDomain({...defaults,hours:12001},"hours")[1]')>=12001);
});
check('curves preserve other inputs, react to changed evidence and keep unknowns unknown',()=>{
 assert.equal(run(`(()=>{const c={...defaults,engineHours:null,avionics:'unknown'},before=JSON.stringify(c);for(const axis of Object.keys(VISUAL_AXES))for(const p of curveSamples(c,axis)){const expected=calculate({...c,[axis]:p.value});if(p.mid!==expected.midpoint||p.low!==expected.low||p.high!==expected.high)return false}return JSON.stringify(c)===before})()`),true);
 assert.notEqual(run('curveSamples({...defaults,fxRate:1},"hours")[0].mid'),run('curveSamples({...defaults,fxRate:1.5},"hours")[0].mid'));
});
check('price formation reconciles to the displayed midpoint for every record',()=>{
 assert.equal(run(`OBS.every(o=>{const c=recordScenario(o,defaults),r=calculate(c),rows=priceBridge(c,r);return Math.abs(rows.slice(0,-1).reduce((s,row)=>s+row.value,0)-r.midpoint)<.000001&&rows.at(-1).end===r.midpoint})`),true);
});
check('year, airframe, engine and negotiation sweeps have consistent direction',()=>{
 const failure=run(`(()=>{
  const cases=[['default',defaults],...Object.keys(vs).map(variant=>[variant,{...defaults,variant,...vs[variant].typ}]),...OBS.filter(isEligible).map(o=>[o.id,recordScenario(o,defaults)])];
  for(const [id,c] of cases)for(const [axis,min,max,step,direction] of [['hours',0,4000,25,-1],['year',2000,2026,1,1],['engineHours',0,3000,100,-1],['serviceYear',1970,2026,1,1],['repackYear',1980,2026,1,1],['rocketYear',2025,2040,1,1],['negotiation',0,20,1,-1]]){
   let previous=null;
   for(let value=min;value<=max;value+=step){const r=calculate({...c,[axis]:value});
    if(![r.low,r.midpoint,r.high].every(Number.isFinite)||r.low>r.midpoint||r.midpoint>r.high)return {id,axis,value,error:'invalid bounds'};
    if(previous!==null&&(r.midpoint-previous)*direction<0)return {id,axis,value,previous,midpoint:r.midpoint};
    previous=r.midpoint;
   }
  }
  return null;
 })()`);
 assert.equal(failure,null,JSON.stringify(failure));
});
check('negotiation cannot raise a low-value scenario above its asking benchmark',()=>{
 const results=run(`(()=>{const c={...defaults,variant:'virus_long',year:2000,hours:30000,engine:'ul80',engineHours:30000,serviceYear:1980,engineTbo:1000,engineCalendar:10,avionics:'analog',autopilot:'none',prop:'fixed',rescue:'none',condition:'fair',damage:'repaired',hangared:'missing',propStatus:'overdue',hoseStatus:'due',gearboxStatus:'overdue'};return [0,10,20].map(negotiation=>calculate({...c,negotiation}))})()`);
 assert.ok(results[0].ask<12000,'fixture must reach the low-price bound');
 assert.equal(results[0].midpoint,results[0].ask);
 for(const r of results)assert.ok(r.midpoint<=r.ask);
});
check('plotted current values are exact and engine-hour knees are resolved',()=>{
 assert.equal(run(`(()=>{const c={...defaults,hours:145.8},r=calculate(c),p=curveWithCurrent(curveSamples(c,'hours'),c,r,'hours').find(p=>p.x===145.8);return p.mid===r.midpoint&&p.low===r.low&&p.high===r.high})()`),true);
 const error=run(`(()=>{let worst=0;for(const id of ['V15','S05']){const c=recordScenario(OBS.find(o=>o.id===id),defaults),points=curveSamples(c,'engineHours');for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];for(const f of [.25,.5,.75]){const r=calculate({...c,engineHours:a.x+(b.x-a.x)*f});for(const [key,field] of [['mid','midpoint'],['low','low'],['high','high']])worst=Math.max(worst,Math.abs(r[field]-(a[key]+(b[key]-a[key])*f)))}}}return worst})()`);
 assert.ok(error<=25,`plot interpolation error: $${error}`);
});
check('equipment steps ascend by actual price and retain every choice identity',()=>{
 const failure=run(`(()=>{
  const cases=[defaults,...OBS.filter(isEligible).map(o=>recordScenario(o,defaults))];
  for(const c of cases)for(const [axis,a] of Object.entries(VISUAL_AXES))if(a.choices){
   const points=curveSamples(c,axis);
   if(new Set(points.map(p=>p.value)).size!==a.choices.length)return {axis,error:'missing choice'};
   for(let i=0;i<points.length;i++){
    const p=points[i],expected=calculate({...c,[axis]:p.value}).midpoint;
    if(p.mid!==expected||p.x!==i||(i&&p.mid<points[i-1].mid))return {axis,value:p.value,error:'ordering or price mismatch'};
   }
  }
  return null;
 })()`);
 assert.equal(failure,null,JSON.stringify(failure));
});
check('engine cost references match the reviewed source and preserve partial residual value',()=>{
 const evidence=require('../research/component-evidence.json').records.find(r=>r.id==='rotech-2026');
 for(const [engine,cost] of Object.entries(evidence.prices)){
  assert.equal(run(`engineCostReference('${engine}').usd`),cost);
  assert.equal(run(`engineCostReference('${engine}').sourced`),true);
  const loss=run(`engineDepreciation({...defaults,engine:'${engine}',engineHours:2000,engineTbo:2000,serviceYear:2026,engineCalendar:15})`);
  assert.ok(loss>0&&loss<cost,'TBO does not erase all residual engine value');
  assert.equal(loss,run(`engineDepreciation({...defaults,engine:'${engine}',engineHours:5000,engineTbo:2000,serviceYear:2026,engineCalendar:15})`),'overdue exposure is capped');
 }
 assert.equal(run('engineCostReference("s3").sourced'),false);
 assert.equal(run('engineCostReference("s3").usd'),24500);
});
check('parachute milestones are continuous and do not charge an absent system',()=>{
 for(const [remaining,loss] of [[0,3200],[2,2000],[4,1100],[6,250],[8,0]]){
  const expr=`rescueLoss({...defaults,rescue:'grs',repackEvidence:'date',repackInterval:6,rocketYear:0,repackYear:2020+${remaining}})`;
  assert.equal(run(expr),loss);
  const jump=run(`Math.abs(rescueLoss({...defaults,repackEvidence:'date',repackInterval:6,rocketYear:0,repackYear:2020+${remaining}-.00001})-rescueLoss({...defaults,repackEvidence:'date',repackInterval:6,rocketYear:0,repackYear:2020+${remaining}+.00001}))`);
  assert.ok(jump<.02,`repack boundary ${remaining}: $${jump}`);
 }
 for(const remaining of [0,2,4]){
  const jump=run(`Math.abs(rescueLoss({...defaults,rocketYear:YEAR+${remaining}-.00001})-rescueLoss({...defaults,rocketYear:YEAR+${remaining}+.00001}))`);
  assert.ok(jump<.02,`rocket boundary ${remaining}: $${jump}`);
 }
 for(const rescue of ['none','unknown'])assert.equal(run(`rescueLoss({...defaults,rescue:'${rescue}',repackEvidence:'due',rocketYear:2020})`),0);
 assert.equal(run('rescueLoss({...defaults,repackEvidence:"unknown",rocketYear:0})'),1850);
 assert.equal(run('rescueLoss({...defaults,repackEvidence:"due",rocketYear:2020})'),5000);
});
check('calendar graphs retain dates and respect explicit deadline overrides',()=>{
 assert.equal(run('axisValueLabel("serviceYear",2018)'),'2018');
 assert.equal(run('axisDomain({...defaults,serviceYear:1980},"serviceYear")[0]'),1980);
 assert.equal(run('axisDomain({...defaults,repackYear:null},"repackYear")[0]'),2010);
 assert.equal(run('new Set(curveSamples({...defaults,engineDue:"2029-06"},"serviceYear").map(p=>p.mid)).size'),1);
 assert.equal(run('new Set(curveSamples({...defaults,repackEvidence:"deadline",repackDue:"2029-06"},"repackYear").map(p=>p.mid)).size'),1);
});
console.log(`${checks} model regression groups passed.`);
