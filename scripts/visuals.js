/* Visual explanations use the production calculate() function. No second price model. */
'use strict';
const VISUAL_AXES={
 hours:{name:'Airframe hours',short:'TTAF',unit:'h',min:0,max:4000,step:1,delta:100,note:'Airframe time only; engine hours and service dates stay fixed. The assumed airframe discount is capped, so the high-hour curve can flatten.'},
 year:{name:'Model year',short:'Year',calendar:true,min:2000,max:2026,step:1,delta:1,note:'Build-year comparison at the research date, not a forecast of future depreciation. Engine service dates stay fixed.'},
 engineHours:{name:'Engine hours',short:'Engine hours',unit:'h',min:0,max:3000,step:1,delta:100,note:'Hours since new or overhaul only. A calendar limit can make part of this curve flat.'},
 serviceYear:{name:'Engine service year',short:'Engine service',calendar:true,min:2000,max:2026,step:1,delta:1,note:'First operation or last overhaul year, with engine hours fixed. A stated deadline overrides this year; an exhausted hour limit can also make the curve flat.'},
 repackYear:{name:'Parachute repack year',short:'Repack year',calendar:true,min:2010,max:2026,step:1,delta:1,note:'Repack year with the selected interval fixed. The allowance changes continuously between service milestones; it is not a service quotation. Select documented repack year to use this input.'},
 avionics:{name:'Avionics',short:'Avionics',choices:[['analog','Analog'],['legacyGlass','Legacy glass'],['hdx','Dynon HDX'],['g3x','Garmin G3X'],['g1000','G1000*']],note:'Steps compare complete aircraft estimates with each panel choice. G1000 is hypothetical; compatibility and approval are unverified.'},
 autopilot:{name:'Autopilot',short:'Autopilot',choices:[['none','None'],['basic','Basic'],['installed','Axes unknown'],['twoaxis','Two-axis']],note:'Installed with unknown axes is an uncertainty assumption, not a separate hardware tier.'},
 prop:{name:'Propeller',short:'Propeller',choices:[['fixed','Fixed'],['ground','Ground adj.'],['inflight','In-flight adj.'],['constant','Constant speed']],note:'Propeller types are discrete scenarios. Maintenance status stays fixed; installation approval needs separate verification.'},
 engine:{name:'Engine type',short:'Engine type',choices:[['ul80','912 UL'],['uls100','912 ULS'],['s3','912 S3'],['turbo','914 Turbo'],['is100','912 iS']],note:'Engine-type comparison keeps the selected hours and limits fixed. This does not establish an approved installation or TBO.'},
 condition:{name:'Condition',short:'Condition',choices:[['fair','Fair'],['good','Good'],['excellent','Excellent']],note:'Condition changes only; damage history, documentation and equipment stay fixed.'},
 negotiation:{name:'Negotiation',short:'Negotiation',unit:'%',min:0,max:20,step:.5,delta:1,note:'An assumed discount from asking price, not an observed transaction-price relationship.'}
};
let visualAxis='hours',visualPin=null,visualFrame=null,visualConfig=null,visualReport=null,visualChoiceAxis=null,visualShowRange=false;
const curveCache=new Map();
function axisValueLabel(axis,value){
 const a=VISUAL_AXES[axis];
 if(value===null||value===undefined||value===''||value==='unknown')return 'Unknown';
 return a.choices?(a.choices.find(x=>x[0]===value)?.[1]||String(value)):a.calendar?String(value):hoursFmt(value)+(a.unit==='%'?'%':' h');
}
function axisDomain(c,axis){
 const a=VISUAL_AXES[axis];
 if(a.choices)return [0,a.choices.length-1];
 const value=finite(c[axis],null),scale=a.calendar?1:500;
 return [a.calendar&&value!==null?Math.min(a.min,Math.floor(value)):a.min,value!==null&&value>a.max?Math.ceil(value/scale)*scale:a.max];
}
function axisPosition(axis,value,points=null){const a=VISUAL_AXES[axis];return a.choices?(points?points.findIndex(p=>p.value===value):a.choices.findIndex(x=>x[0]===value)):finite(value,null)}
function curveSamples(c,axis,domain=axisDomain(c,axis)){
 const a=VISUAL_AXES[axis],copy={...c};delete copy[axis];
 // Acquisition and quote-only controls do not affect the price model.
 for(const key of ['askingPrice','askingCurrency','budget','shippingLow','shippingHigh','registrationCosts','duty','tax','vatRebate','eligibility'])delete copy[key];
 const signature=JSON.stringify([axis,domain,copy]);
 if(curveCache.has(signature))return curveCache.get(signature);
 const n=a.calendar?domain[1]-domain[0]:48;
 const values=a.choices?a.choices.map(x=>x[0]):Array.from({length:n+1},(_,i)=>domain[0]+(domain[1]-domain[0])*i/n);
 const evaluated=new Map();
 const evaluate=(value,i=value)=>{
  if(evaluated.has(value))return evaluated.get(value);
  const r=calculate({...c,[axis]:value}),point={x:a.choices?i:value,value,mid:r.midpoint,low:r.low,high:r.high};
  evaluated.set(value,point);return point;
 };
 const anchors=values.map(evaluate),points=[];
 // Check quarter-points as well as midpoints: offsetting bends can hide at the midpoint.
 // Refine calendar curves too; fractional horizons can put a knee between whole years.
 // $20 is a sampling tolerance, not a statement about valuation accuracy.
 // This is piecewise-linear sampling, never a decorative smoothing spline.
 const refine=(left,right,depth=0)=>{
  const samples=[.25,.5,.75].map(f=>[f,evaluate(left.x+(right.x-left.x)*f)]),middle=samples[1][1];
  const error=Math.max(...samples.flatMap(([f,p])=>['mid','low','high'].map(key=>Math.abs(p[key]-(left[key]+(right[key]-left[key])*f)))));
  if(error>20&&depth<8){refine(left,middle,depth+1);refine(middle,right,depth+1)}else points.push(right);
 };
 points.push(anchors[0]);
 for(let i=1;i<anchors.length;i++){if(a.choices)points.push(anchors[i]);else refine(anchors[i-1],anchors[i])}
 // Equipment is categorical: display actual scenario prices low to high,
 // without changing the estimates to manufacture a rising staircase.
 if(a.choices){points.sort((a,b)=>a.mid-b.mid);points.forEach((point,i)=>{point.x=i})}
 if(curveCache.size>24)curveCache.clear();
 curveCache.set(signature,points);return points;
}
function priceBridge(c,r){
 const matched=r.result?r.result.mid*r.dataWeight+r.prior*(1-r.dataWeight):r.prior;
 // Condition row includes the calculator's rounding and minimum-price bound.
 const rows=[['Reference + equipment',0,r.prior,'total'],['Market evidence',r.prior,matched,'delta'],['Condition / history',matched,r.ask-r.riskAdj,'delta'],['Maintenance',r.ask-r.riskAdj,r.ask,'delta'],[r.midpoint>Math.round(r.ask*(1-c.negotiation/100))?'Negotiation / price floor':'Negotiation',r.ask,r.midpoint,'delta'],['Purchase midpoint',0,r.midpoint,'final']];
 return rows.map(([label,start,end,kind])=>({label,start,end,kind,value:end-start}));
}
function signedMoney(value){return (value<0?'−':'+')+money(Math.abs(value))}
function compactMoney(value){return '$'+(value/1000).toLocaleString('en-US',{maximumFractionDigits:1})+'k'}
function svgCurvePath(points,x,y,key='mid',stepped=false,reverse=false){
 return points.map((p,i)=>i===0?`M${x(p.x)},${y(p[key])}`:stepped?reverse?`V${y(p[key])}H${x(p.x)}`:`H${x(p.x)}V${y(p[key])}`:`L${x(p.x)},${y(p[key])}`).join(' ');
}
function curveWithCurrent(points,c,r,axis){
 const value=axisPosition(axis,c[axis]);
 if(VISUAL_AXES[axis].choices||value===null||value<points[0].x||value>points.at(-1).x||points.some(p=>p.x===value))return points;
 // The selected point belongs to the plotted line, including fractional hours.
 return [...points,{x:value,value,mid:r.midpoint,low:r.low,high:r.high}].sort((a,b)=>a.x-b.x);
}
function initializePlot(svg,prefix,mini=false){
 if(svg.dataset.ready)return;
 svg.dataset.ready='true';
 svg.innerHTML=`<title id="${prefix}Title"></title><desc id="${prefix}Desc"></desc><g class="plot-grid"></g><path class="plot-band"/><path class="plot-pin"/><path class="plot-line"/><g class="plot-ticks"></g><g class="plot-point" hidden><line class="plot-guide"/><circle r="${mini?8:12}" class="plot-halo"/><circle r="${mini?4:6}" class="plot-dot"/></g>`;
 svg.setAttribute('aria-labelledby',`${prefix}Title ${prefix}Desc`);
}
function drawCurve(svg,prefix,c,r,axis,mini=false,pin=null){
 initializePlot(svg,prefix,mini);
 const a=VISUAL_AXES[axis],domain=axisDomain(c,axis);
 if(pin&&!a.choices){const pinnedDomain=axisDomain(pin,axis);domain[0]=Math.min(domain[0],pinnedDomain[0]);domain[1]=Math.max(domain[1],pinnedDomain[1]);}
 const points=curveWithCurrent(curveSamples(c,axis,domain),c,r,axis);
 let pinned=pin?curveWithCurrent(curveSamples(pin,axis,domain),pin,calculate(pin),axis):[];
 // A pin uses the current category order so like-for-like labels stay aligned.
 if(pinned.length&&a.choices)pinned=points.map(p=>({...pinned.find(q=>q.value===p.value),x:p.x}));
 const narrow=!mini&&svg.clientWidth<500;
 const w=mini?420:narrow?540:760,h=mini?126:306,left=mini?46:64,right=w-22,top=mini?12:24,bottom=h-(mini?25:44);
 svg.classList.toggle('narrow-plot',narrow);
 const bounds=[...points,...pinned];
 const showBand=!mini&&visualShowRange;
 const lo=Math.min(...bounds.map(p=>showBand?p.low:p.mid)),hi=Math.max(...bounds.map(p=>showBand?p.high:p.mid));
 const pad=Math.max((hi-lo)*.12,1500),yMin=Math.max(0,Math.floor((lo-pad)/1000)*1000),yMax=Math.ceil((hi+pad)/1000)*1000;
 const x=v=>left+(v-domain[0])/(domain[1]-domain[0])*(right-left),y=v=>bottom-(v-yMin)/(yMax-yMin)*(bottom-top);
 svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
 svg.querySelector('title').textContent=`${a.name} versus modeled purchase price`;
 svg.querySelector('desc').textContent=`${a.note} Current setting: ${axisValueLabel(axis,c[axis])}; purchase midpoint ${money(r.midpoint)}. Other inputs stay fixed.`;
 const grid=Array.from({length:mini?2:4},(_,i)=>yMin+(yMax-yMin)*i/(mini?1:3));
 svg.querySelector('.plot-grid').innerHTML=grid.map(v=>`<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${compactMoney(v)}</text>`).join('');
 const ticks=a.choices?points.map(p=>[p.x,mini&&axis==='avionics'?({analog:'Analog',legacyGlass:'Legacy',hdx:'HDX',g3x:'G3X',g1000:'G1000*'})[p.value]:axisValueLabel(axis,p.value)]):Array.from({length:mini?3:5},(_,i)=>{let v=domain[0]+(domain[1]-domain[0])*i/(mini?2:4);if(a.calendar)v=Math.round(v);return[v,a.calendar?v:fmt(v)+(a.unit==='%'?'%':'')]});
 svg.querySelector('.plot-ticks').innerHTML=ticks.map(([v,label])=>`<text x="${x(v)}" y="${bottom+22}" text-anchor="${v===domain[0]?'start':v===domain[1]?'end':'middle'}">${esc(label)}</text>`).join('');
 svg.querySelector('.plot-line').setAttribute('d',svgCurvePath(points,x,y,'mid',!!a.choices));
 const band=svg.querySelector('.plot-band');
 band.setAttribute('d',svgCurvePath(points,x,y,'high',!!a.choices)+' '+svgCurvePath([...points].reverse(),x,y,'low',!!a.choices,true).replace(/^M/,'L')+' Z');
 band.style.display=showBand?'':'none';
 svg.querySelector('.plot-pin').setAttribute('d',pinned.length?svgCurvePath(pinned,x,y,'mid',!!a.choices):'');
 const value=axisPosition(axis,c[axis],points),marker=svg.querySelector('.plot-point'),known=value!==null&&value>=domain[0]&&value<=domain[1];
 // A new axis has a different coordinate system; do not animate across unrelated scales.
 marker.style.transition=svg.dataset.axis!==axis||a.choices?'none':'';svg.dataset.axis=axis;
 marker.style.display=known?'':'none';marker.removeAttribute('hidden');
 if(known){marker.style.transform=`translate(${x(value)}px,${y(r.midpoint)}px)`;marker.dataset.value=String(c[axis]);marker.dataset.price=String(r.midpoint);const guide=marker.querySelector('line');guide.setAttribute('y1','0');guide.setAttribute('y2',String(bottom-y(r.midpoint)));}
 return {points,domain};
}
function renderBridge(c,r){
 const rows=priceBridge(c,r),svg=$('priceBridge'),max=Math.max(...rows.map(x=>Math.max(x.start,x.end)))*1.08;
 const x=v=>157+v/max*177;
 svg.innerHTML='<title>How the purchase midpoint is formed</title><desc>Sequential model adjustments, in dollars. Bars connect the reference to the purchase midpoint.</desc>'+rows.map((row,i)=>{const y=23+i*38,color=row.kind==='final'?'#007965':row.kind==='total'?'#536d7b':row.value<0?'#ca735c':'#24a68a';return `<text x="0" y="${y+4}" class="bridge-label">${esc(row.label)}</text><line x1="157" x2="334" y1="${y}" y2="${y}" stroke="#e9efed"/><rect x="${x(Math.min(row.start,row.end))}" y="${y-8}" width="${Math.max(1,Math.abs(x(row.end)-x(row.start)))}" height="16" rx="3" fill="${color}"><title>${esc(row.label)}: ${row.kind==='delta'?signedMoney(row.value):money(row.end)}</title></rect><text x="418" y="${y+4}" text-anchor="end" class="bridge-value">${row.kind==='delta'?signedMoney(row.value):money(row.end)}</text>`}).join('')+`<text x="157" y="248" class="bridge-axis">$0</text><text x="334" y="248" text-anchor="end" class="bridge-axis">${compactMoney(max)}</text>`;
 svg.dataset.total=String(r.midpoint);
 const a=acquisition(c,r),parts=[['Aircraft',a.purchase[1],'#087c68'],['Delivery',(a.shipLow+a.shipHigh)/2,'#58aaac'],['Prebuy / admin',a.admin,'#7686ac'],['Tax + duty',a.tax+a.duty,'#c48d56']];
 $('costRibbon').innerHTML=parts.map(([name,value,color])=>`<span style="flex:${Math.max(0,value)};background:${color}" title="${esc(name+': '+money(value))}"></span>`).join('');
 $('costLegend').innerHTML=parts.map(([name,value,color])=>`<span><i style="background:${color}"></i>${esc(name)} <b>${money(value)}</b></span>`).join('');
 $('visualLanded').textContent=money(a.deliveredMid);
 $('visualBudget').textContent=(a.budgetDiff>=0?'Below':'Above')+' budget by '+money(Math.abs(a.budgetDiff))+' · '+(c.eligibility==='confirmed'?'eligibility reviewed by you':c.eligibility==='ineligible'?'operation ineligible':'eligibility unverified');
}
function renderVisuals(c,r){
 visualConfig=c;visualReport=r;
 if(visualFrame!==null)cancelAnimationFrame(visualFrame);
 visualFrame=requestAnimationFrame(()=>{visualFrame=null;paintVisuals(visualConfig,visualReport)});
}
function paintVisuals(c,r){
 // Keep each form dropdown in the same low-to-high order as its chart.
 // Moving existing options preserves their labels, unknowns and selected value.
 for(const [key,meta] of Object.entries(VISUAL_AXES))if(meta.choices){
  const select=$(key),value=select.value,options=[...select.options],order=curveSamples(c,key).map(p=>p.value);
  const sorted=[...options.filter(o=>!order.includes(o.value)),...order.map(v=>options.find(o=>o.value===v))];
  if(sorted.some((option,i)=>option!==options[i])){sorted.forEach(option=>select.appendChild(option));select.value=value;}
 }
 const axis=visualAxis,a=VISUAL_AXES[axis],{points,domain}=drawCurve($('valueCurve'),'valueCurve',c,r,axis,false,visualPin);
 $('curveAxis').value=axis;
 $('curveCurrent').textContent=axisValueLabel(axis,c[axis]);
 $('curvePrice').textContent=money(r.midpoint);
 $('curveRange').textContent=money(r.low)+' – '+money(r.high)+' illustrative range';
 const inactive=axis==='repackYear'&&(c.repackEvidence!=='date'||['none','unknown'].includes(c.rescue))?'This input is inactive for the current rescue/repack selection. ':axis==='serviceYear'&&c.engineDue?'The stated engine deadline overrides the service year. ':'';
 $('curveNote').textContent=inactive+(a.choices?'Choices run from lower to higher modeled value. ':'')+a.note+' All other inputs stay fixed. Curves show model sensitivity, not measured market depreciation.';
 $('curveSliderWrap').classList.toggle('hidden',!!a.choices);
 $('curveChoices').classList.toggle('hidden',!a.choices);
 $('curveSliderLabel').textContent=a.name;
 const slider=$('curveSlider');slider.min=domain[0];slider.max=domain[1];slider.step=a.step||1;slider.value=c[axis]??domain[0];slider.setAttribute('aria-valuetext',axisValueLabel(axis,c[axis]));
 $('curveMin').textContent=axisValueLabel(axis,domain[0]);$('curveMax').textContent=axisValueLabel(axis,domain[1]);
 $('curveUnknown').classList.toggle('hidden',c[axis]!==null&&c[axis]!=='unknown');
 if(a.choices){
  const choiceOrder=axis+':'+points.map(p=>p.value).join(',');
  if(visualChoiceAxis!==choiceOrder){$('curveChoices').innerHTML=points.map(p=>`<button type="button" data-curve-choice="${p.value}"><span>${esc(axisValueLabel(axis,p.value))}</span><b></b></button>`).join('');visualChoiceAxis=choiceOrder;}
  $('curveChoices').querySelectorAll('button').forEach((button,i)=>{button.setAttribute('aria-pressed',String(c[axis]===points[i].value));button.querySelector('b').textContent=money(points[i].mid)});
 }
 let changeLabel,change;
 if(a.choices){changeLabel='vs. '+axisValueLabel(axis,points[0].value);change=r.midpoint-points[0].mid;if(c[axis]==='unknown')change=null;}
 else{const v=finite(c[axis],null),d=v!==null&&v+a.delta<=domain[1]?a.delta:-a.delta;changeLabel=`${d>0?'+':''}${d}${a.calendar?' year':a.unit==='%'?' point':' hours'}`;change=v===null?null:calculate({...c,[axis]:v+d}).midpoint-r.midpoint;}
 $('curveChangeLabel').textContent=changeLabel;$('curveChange').textContent=change===null?'Unknown':signedMoney(change);
 $('curvePinLegend').classList.toggle('hidden',!visualPin);
 $('curveBandLegend').classList.toggle('hidden',!visualShowRange);
 $('clearCurvePin').classList.toggle('hidden',!visualPin);
 $('curvePinDelta').textContent=visualPin?signedMoney(r.midpoint-calculate(visualPin).midpoint)+' vs. pinned scenario':'Pin a scenario to compare changes';
 $('pinCurve').textContent=visualPin?'Update pin':'Pin comparison';
 for(const key of ['year','hours','engineHours','serviceYear','repackYear','avionics']){drawCurve($('miniCurve-'+key),'mini-'+key,c,r,key,true);$('miniValue-'+key).textContent=axisValueLabel(key,c[key])+' · '+money(r.midpoint);}
 renderBridge(c,r);
}
function setVisualValue(value){
 const el=$(visualAxis);el.value=String(value);
 // Intentionally do not trigger engine defaults: every chart comparison holds other fields fixed.
 renderAll();
}
function initVisuals(){
 const nav=document.querySelector('.subbar');
 const measureNav=()=>document.documentElement.style.setProperty('--subbar-height',nav.getBoundingClientRect().height+'px');
 measureNav();new ResizeObserver(measureNav).observe(nav);
 window.addEventListener('resize',()=>{if(lastReport)renderVisuals(getConfig(),lastReport)});
 $('curveAxis').innerHTML=Object.entries(VISUAL_AXES).map(([key,a])=>`<option value="${key}">${a.name}</option>`).join('');
 $('curveAxis').addEventListener('change',e=>{visualAxis=e.target.value;renderVisuals(getConfig(),lastReport)});
 $('curveShowRange').addEventListener('change',e=>{visualShowRange=e.target.checked;renderVisuals(getConfig(),lastReport)});
 $('curveSlider').addEventListener('input',e=>setVisualValue(+e.target.value));
 $('curveChoices').addEventListener('click',e=>{const b=e.target.closest('[data-curve-choice]');if(b)setVisualValue(b.dataset.curveChoice)});
 $('pinCurve').addEventListener('click',()=>{visualPin={...getConfig()};renderVisuals(getConfig(),lastReport)});
 $('clearCurvePin').addEventListener('click',()=>{visualPin=null;renderVisuals(getConfig(),lastReport)});
 document.addEventListener('input',e=>{const axis=e.target.id==='hoursSlider'?'hours':e.target.id;if(VISUAL_AXES[axis]){visualAxis=axis;renderVisuals(getConfig(),lastReport)}});
 for(const axis of ['year','hours','engineHours','serviceYear','repackYear','avionics']){
  const field=$(axis).closest('.field'),host=document.createElement('div');host.className='inline-curve';
  host.innerHTML=`<div class="inline-curve-label"><span>${VISUAL_AXES[axis].name} → purchase price</span><b id="miniValue-${axis}"></b></div><svg id="miniCurve-${axis}" class="mini-curve" role="img"></svg>`;field.appendChild(host);
 }
}
