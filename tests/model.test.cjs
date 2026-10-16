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
console.log(`${checks} model regression groups passed.`);
