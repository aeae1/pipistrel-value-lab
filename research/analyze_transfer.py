#!/usr/bin/env python3
"""Exploratory within-model asking-price associations. Never writes production inputs.
Requires numpy and matplotlib; fixed seed, no network, no scipy/statsmodels needed.
"""
import json
from collections import Counter
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parent
SEED=20261018
BOOTSTRAPS=2000

def design(rows, terms):
    models=sorted({r['model'] for r in rows})
    columns=models+terms
    x=np.zeros((len(rows),len(columns)))
    for i,r in enumerate(rows):
        x[i,models.index(r['model'])]=1
        for j,t in enumerate(terms,len(models)):
            x[i,j]={'build_year':(r['year']-2015),'airframe_1000h':r['hours']/1000,
                    'engine_1000h':(r['engine_hours'] or 0)/1000,
                    'modern_panel':float(r['avionics']=='modern')}[t]
    return x,np.log([r['asking_price'] for r in rows]),columns

def fit(rows,terms,robust=True):
    x,y,names=design(rows,terms)
    if len(rows)<=len(names) or np.linalg.matrix_rank(x)<len(names): return None
    base=np.array([r['quality'] for r in rows]) if robust else np.ones(len(rows))
    weights=base.copy()
    beta=np.linalg.lstsq(x*np.sqrt(weights[:,None]),y*np.sqrt(weights),rcond=None)[0]
    for _ in range(100 if robust else 0):
        residual=y-x@beta
        scale=max(float(1.4826*np.median(np.abs(residual-np.median(residual)))),.01)
        huber=np.minimum(1,1.345*scale/np.maximum(np.abs(residual),1e-12))
        weights=base*huber
        nxt=np.linalg.lstsq(x*np.sqrt(weights[:,None]),y*np.sqrt(weights),rcond=None)[0]
        if np.max(np.abs(nxt-beta))<1e-9: beta=nxt;break
        beta=nxt
    return dict(coeff=dict(zip(names,beta.tolist())),weights=weights.tolist(),
                fitted=np.exp(x@beta).tolist(),residual_log=(y-x@beta).tolist(),
                condition_number=float(np.linalg.cond(x)),n=len(rows),parameters=len(names))

def informative(rows):
    counts=Counter(r['model'] for r in rows)
    return [r for r in rows if counts[r['model']]>=2]

def brief(result,terms):
    if result is None:return {'estimable':False}
    return {'estimable':True,'n':result['n'],'parameters':result['parameters'],
            'condition_number':round(result['condition_number'],2),
            'log_coefficients':{k:round(result['coeff'][k],6) for k in terms},
            'percent_effects':{k:round(100*np.expm1(result['coeff'][k]),3) for k in terms}}

def main():
    data=json.loads((ROOT/'aircraft-evidence.json').read_text())['records']
    core=[r for r in data if r['fit_status']=='diagnostic']
    assert len({r['identity'] for r in data})==len(data),'Duplicate aircraft identity'
    assert all(r['market']=='US' and r['currency']=='USD' and r['asking_price']>0 and r['hours'] is not None for r in core)
    rows=informative(core)
    terms=['build_year','airframe_1000h']
    model=fit(rows,terms)
    ordinary=fit(rows,terms,False)
    rng=np.random.default_rng(SEED)
    groups=[[r for r in rows if r['model']==m] for m in sorted({r['model'] for r in rows})]
    boot=[]
    for _ in range(BOOTSTRAPS):
        draw=[group[i] for group in groups for i in rng.integers(0,len(group),len(group))]
        result=fit(draw,terms)
        if result:boot.append([result['coeff'][t] for t in terms])
    boot=np.array(boot)
    bootstrap={t:{'log_p05':float(np.percentile(boot[:,i],5)),'log_p95':float(np.percentile(boot[:,i],95)),
                  'expected_sign_fraction':float(np.mean(boot[:,i]>0 if t=='build_year' else boot[:,i]<0))}
               for i,t in enumerate(terms)}
    family={f:brief(fit(informative([r for r in rows if r['family']!=f]),terms),terms) for f in sorted({r['family'] for r in rows})}
    known_panel=informative([r for r in core if r['avionics'] in ['legacy','modern']])
    known_engine=informative([r for r in known_panel if r['engine_hours'] is not None])
    specs={
      'age_hours_robust':brief(model,terms),'age_hours_ordinary':brief(ordinary,terms),
      'with_known_panel':brief(fit(known_panel,terms+['modern_panel']),terms+['modern_panel']),
      'with_known_panel_engine_hours':brief(fit(known_engine,terms+['engine_1000h','modern_panel']),terms+['engine_1000h','modern_panel']),
      'known_engine_hours_no_panel':brief(fit(known_engine,terms+['engine_1000h']),terms+['engine_1000h']),
      'without_documentation_flags':brief(fit(informative([r for r in core if r['quality']==1]),terms),terms),
      'without_last_ask_sold':brief(fit(informative([r for r in core if r['status']!='sold_last_ask']),terms),terms),
      'without_same_broker_FD06_FD08':brief(fit(informative([r for r in core if r['id'] not in ['FD06','FD08']]),terms),terms)}
    # Each row is an identity group. Keep exact-model intercepts; no target aircraft enter this fit.
    loo=[]
    for r in rows:
        result=fit([a for a in rows if a['identity']!=r['identity']],terms)
        if result:
            c=result['coeff'];prediction=np.exp(c[r['model']]+c['build_year']*(r['year']-2015)+c['airframe_1000h']*r['hours']/1000)
            loo.append(dict(id=r['id'],predicted_ask=round(float(prediction),2),actual_ask=r['asking_price'],abs_percent_error=round(float(abs(prediction/r['asking_price']-1)*100),3)))
    gate=dict(min_30_airframes=len(rows)>=30,min_3_informative_families=len(family)>=3,
      expected_sign_in_90_percent_resamples=all(v['expected_sign_fraction']>=.9 for v in bootstrap.values()),
      no_leave_family_sign_reversal=all(x.get('estimable') and x['log_coefficients']['build_year']>0 and x['log_coefficients']['airframe_1000h']<0 for x in family.values()),
      engine_calendar_history_sufficient=False)
    output=dict(seed=SEED,requested_bootstrap_samples=BOOTSTRAPS,estimable_bootstrap_samples=len(boot),
      reviewed_records=len(data),diagnostic_records=len(core),informative_records=len(rows),
      model_counts=dict(Counter(r['model'] for r in rows)),singletons_not_informing_slopes=[r['id'] for r in core if r not in rows],
      specifications=specs,bootstrap=bootstrap,leave_one_family_out=family,gate=gate,transfer_accepted=all(gate.values()),
      aircraft_holdout=dict(n=len(loo),median_absolute_percent_error=round(float(np.median([r['abs_percent_error'] for r in loo])),3),rows=loo),
      robust_residuals=[dict(id=r['id'],quality_weight=r['quality'],final_weight=round(w,5),residual_percent=round(float(100*np.expm1(res)),3)) for r,w,res in zip(rows,model['weights'],model['residual_log'])],
      limitations=['Convenience asking sample, not actual sales or longitudinal depreciation.','Stratified bootstrap resamples aircraft within exact model; small groups and shared brokers make intervals exploratory, not population confidence intervals.','Unknown aircraft identities may conceal duplicates; same-broker sensitivity is reported.','Most engine calendar history is absent. TTAF may proxy engine use, training and condition.','Hardware bundles are not equivalent to installed resale premiums. No empirical coefficients transferred.'])
    (ROOT/'transfer-results.json').write_text(json.dumps(output,indent=2)+'\n')
    # Standalone scientific figure, not a decorative fitted price curve.
    plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none','svg.hashsalt':'pvl-transfer-20261018'})
    fig,ax=plt.subplots(1,2,figsize=(12,4.8),gridspec_kw={'width_ratios':[1.25,1]})
    colors={'Flight Design':'#09836c','Czech Sport Aircraft':'#6379ae','Remos':'#c58055'}
    for fam,col in colors.items():
        subset=[r for r in rows if r['family']==fam]
        ax[0].scatter([r['hours'] for r in subset],[r['asking_price']/1000 for r in subset],c=col,label=fam,s=48,alpha=.85)
    for id in ['SC03','SC04','SC11']:
        r=next(r for r in rows if r['id']==id);ax[0].annotate(id,(r['hours'],r['asking_price']/1000),xytext=(5,5),textcoords='offset points',fontsize=9)
    ax[0].set(xlabel='Advertised airframe time (hours)',ylabel='Advertised ask (USD thousands)',title=f'{len(rows)} within-model observations; no common price curve')
    ax[0].legend(frameon=False,fontsize=8,loc='lower right');ax[0].grid(alpha=.15)
    for i,t in enumerate(terms):
        mid=100*np.expm1(model['coeff'][t]);lo=100*np.expm1(bootstrap[t]['log_p05']);hi=100*np.expm1(bootstrap[t]['log_p95'])
        ax[1].plot([lo,hi],[i,i],color='#09836c',lw=4);ax[1].scatter([mid],[i],color='#09836c',s=50,zorder=3)
        ax[1].scatter([100*np.expm1(ordinary['coeff'][t])],[i],facecolors='none',edgecolors='#9d647b',s=65,zorder=3)
    ax[1].axvline(0,color='#a0aaa8',lw=1);ax[1].set_yticks([0,1],['One newer build year','Another 1,000 airframe h'])
    ax[1].set(xlabel='Association with asking price (%)',title='Robust fit and exploratory 5–95% resamples',ylim=(-.6,1.6));ax[1].grid(axis='x',alpha=.15)
    fig.suptitle('Broader-airframe evidence: useful checks, insufficient calibration',fontsize=15,fontweight='bold',x=.06,ha='left')
    fig.text(.06,.02,'Filled: robust + source-quality weights · Open: ordinary fit · Exact-model intercepts · Engine/calendar/equipment confounding remains',fontsize=9,color='#52625d')
    fig.tight_layout(rect=[0,.07,1,.92]);fig.savefig(ROOT/'transfer-review.svg',metadata={'Date':'2026-10-18'});plt.close(fig)
    print(json.dumps({k:output[k] for k in ['reviewed_records','diagnostic_records','informative_records','specifications','bootstrap','leave_one_family_out','gate','transfer_accepted']},indent=2))
if __name__=='__main__': main()
