// Attribute the two predeclared changes using the unchanged production record mapper.
// Reproduction requires both recorded commits in repository history, Node, no network.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {createEngine}=require('../tests/engine-harness.cjs');
const root=path.resolve(__dirname,'..'),baselineCommit='71c5459e617221642e432d836cd91ba64ea842d6';
const previous=cp.execFileSync('git',['show',`${baselineCommit}:scripts/app.js`],{cwd:root,encoding:'utf8'});
const reviewedCommit='c158339f007383eaf828a9cf443ebda18dcf1b7f';
const atReview=file=>cp.execFileSync('git',['show',`${reviewedCommit}:${file}`],{cwd:root,encoding:'utf8'});
const current=atReview('scripts/app.js');
const template=atReview('template.html'),visuals=atReview('scripts/visuals.js');
const frozen=cp.execFileSync('git',['show',`${baselineCommit}:data/observations.json`],{cwd:root,encoding:'utf8'});
if(frozen!==atReview('data/observations.json'))throw Error('Evidence differs between the recorded review commits');
const functionSource=(source,name)=>{
 const found=source.match(new RegExp('^function '+name+'\\([^]*?^}\\n','m'));
 if(!found)throw Error('Function not found: '+name);return found[0];
};
const helper=functionSource(current,'engineCostReference')+functionSource(current,'servicePressure');
const replace=(source,name)=>source.replace(functionSource(previous,name),functionSource(current,name));
const sources={baseline:previous,engine_only:helper+replace(previous,'engineDepreciation'),service_only:helper+replace(previous,'rescueLoss'),combined:current};
const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2};
const average=a=>a.reduce((x,y)=>x+y,0)/a.length;
const rounded=n=>Math.round(n*100)/100;
const summarize=rows=>({n:rows.length,median_absolute_percent_error:rounded(median(rows.map(r=>r.abs_pct_error))),mean_absolute_percent_error:rounded(average(rows.map(r=>r.abs_pct_error))),mean_signed_percent_error:rounded(average(rows.map(r=>r.signed_pct_error))),in_band:rows.filter(r=>r.inside_range).length});
const results={};
for(const [name,source] of Object.entries(sources)){
 const e=createEngine({source,observations:JSON.parse(frozen),template,visuals});
 const rows=e.run(`independentRecords(OBS.filter(o=>isEligible(o)&&o.hours!=null)).map(o=>{
  const c=recordScenario(o,{...defaults,negotiation:0}),r=calculate(c),listed=usd(o,c.fxRate);
  if(r.comparables.some(x=>aircraftKey(x)===aircraftKey(o)))throw Error('Identity leakage');
  return {id:o.id,variant:o.variant,listed_usd:listed,estimated_ask_usd:r.ask,signed_pct_error:(r.ask/listed-1)*100,abs_pct_error:Math.abs(r.ask/listed-1)*100,inside_range:listed>=r.low&&listed<=r.high};
 })`);
 results[name]={summary:summarize(rows),by_variant:Object.fromEntries([...new Set(rows.map(r=>r.variant))].sort().map(v=>[v,summarize(rows.filter(r=>r.variant===v))])),rows};
}
const changes=results.combined.rows.map(r=>{const b=results.baseline.rows.find(x=>x.id===r.id);return {id:r.id,variant:r.variant,asking_change_usd:r.estimated_ask_usd-b.estimated_ask_usd,error_change_points:rounded(r.abs_pct_error-b.abs_pct_error)}});
const report={baseline_commit:baselineCommit,reviewed_commit:reviewedCommit,method:'Unchanged 41-aircraft asking holdout and UI mapping, identity exclusion, zero negotiation. Prior development corpus; not independent sales validation.',candidates:results,changes};
fs.writeFileSync(path.join(__dirname,'candidate-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{summary:v.summary,by_variant:v.by_variant}])),null,2));
