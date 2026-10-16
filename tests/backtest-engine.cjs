const {createEngine}=require('./engine-harness.cjs');
const e=createEngine();
process.stdout.write(e.run(`JSON.stringify(independentRecords(OBS.filter(o=>isEligible(o)&&o.hours!=null)).map(o=>{
 const c=recordScenario(o,{...defaults,negotiation:0});
 const r=calculate(c),listed=usd(o,c.fxRate);
 if(r.comparables.some(x=>aircraftKey(x)===aircraftKey(o)))throw Error('Identity leakage: '+o.id);
 return {id:o.id,aircraft_id:aircraftKey(o),variant:o.variant,year:o.year,region:o.region,listed_usd:listed,estimated_ask_usd:r.ask,low_usd:r.low,high_usd:r.high,signed_pct_error:(r.ask-listed)/listed*100,abs_pct_error:Math.abs(r.ask-listed)/listed*100,inside_range:listed>=r.low&&listed<=r.high,close_comps:r.n,confidence:r.confidence};
}))`));
