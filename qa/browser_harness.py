"""Offline Chromium harness that loads the exact TimeBridge modules into an isolated DOM.
No source edits and no network requests. A module-wrapper transformation preserves semantics
but it is not a live HTTP/CSP/backend test. See QA report for scope and limitations.
"""
import re, json
from pathlib import Path
SRC=Path(__file__).resolve().parents[1]
DEPS={
 'time-core.mjs':[],
 'country-map.mjs':[],
 'city-directory.mjs':[],
 'holidays.mjs':['time-core.mjs'],
 'visitor-time.mjs':[],
 'tabs.mjs':[],
 'custom-clocks.mjs':['time-core.mjs','country-map.mjs','city-directory.mjs'],
 'planner-v25.mjs':['holidays.mjs'],
 'teams-v3.mjs':['planner-v25.mjs'],
 'global-directory-picker.mjs':[],
 'linked-clocks.mjs':['time-core.mjs','custom-clocks.mjs','country-map.mjs','global-directory-picker.mjs'],
 'app.v2.mjs':['time-core.mjs','country-map.mjs','holidays.mjs','visitor-time.mjs','tabs.mjs','custom-clocks.mjs','planner-v25.mjs','linked-clocks.mjs','teams-v3.mjs']
}
EXPORT_RE=re.compile(r'^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)', re.M)
IMPORT_RE=re.compile(r"^import\s*\{([^}]*)\}\s*from\s*['\"]\./([^'\"]+)['\"];?", re.M)
def bundled():
    output=['window.__qaModules={};']
    for name,deps in DEPS.items():
        code=(SRC/name).read_text()
        exports=EXPORT_RE.findall(code)
        def replace(m):
            symbols=m.group(1); origin=m.group(2)
            assert origin in deps,(name,origin)
            return f"const {{{symbols}}} = window.__qaModules[{json.dumps(origin)}];"
        code=IMPORT_RE.sub(replace,code)
        code=re.sub(r'\bexport\s+(?=(?:const|let|function|class|async\s+function)\b)','',code)
        assert not re.search(r'\b(?:import|export)\s+\{',code),name
        output.append(f'window.__qaModules[{json.dumps(name)}]=(function(){{\n{code}\nreturn {{{", ".join(exports)}}};\n}})();')
    return '\n'.join(output)

HTML=re.sub(r'<meta\s+http-equiv="Content-Security-Policy"[^>]*>', '',(SRC/'index.html').read_text(),flags=re.I)
INIT=r'''
window.__qaErrors=[];
window.addEventListener('error',e=>window.__qaErrors.push(String(e.error||e.message)));
window.addEventListener('unhandledrejection',e=>window.__qaErrors.push('promise: '+String(e.reason)));
window.__qaSaved={};
window.__qaMockStorage={
 getItem(k){return Object.hasOwn(window.__qaSaved,k)?window.__qaSaved[k]:null},
 setItem(k,v){window.__qaSaved[k]=String(v)},
 removeItem(k){delete window.__qaSaved[k]}
};
Object.defineProperty(window,'localStorage',{value:window.__qaMockStorage,configurable:true});
window.__qaCalls=[];
window.__qaFailureCode='';
window.__qaDates={US:[['2026-11-26','Thanksgiving'],['2026-12-25','Christmas'],['2027-01-01','New Year']],NG:[['2026-12-25','Christmas']],IN:[['2026-10-20','Dussehra'],['2026-11-08','Diwali']],GB:[['2026-12-25','Christmas']],JP:[['2026-11-03','Culture Day']]};
window.fetch=async (url)=>{
  const u=new URL(url,'https://fake.test');const country=u.searchParams.get('country'),year=u.searchParams.get('year');
  if(u.pathname==='/api/cities'){
    const name=(u.searchParams.get('name')||'').toLowerCase();
    const city=name.startsWith('bandung')?{id:1650357,name:'Bandung',admin1:'West Java',country:'Indonesia',country_code:'ID',timezone:'Asia/Jakarta',feature_code:'PPLA',population:2400000}:
      name.startsWith('cedar rapids')?{id:4850751,name:'Cedar Rapids',admin1:'Iowa',country:'United States',country_code:'US',timezone:'America/Chicago',feature_code:'PPL',population:130000}:
      name.startsWith('tunis')?{id:2464470,name:'Tunis',admin1:'Tunis Governorate',country:'Tunisia',country_code:'TN',timezone:'Africa/Tunis',feature_code:'PPLC',population:600000}:null;
    window.__qaCalls.push('city:'+name);
    return {ok:true,status:200,json:async()=>({results:city?[{name:city.name,region:city.admin1,country:city.country_code,countryName:city.country,zone:city.timezone,population:city.population,id:city.id}]:[]})};
  }
  if(u.pathname==='/geo/countries.json'){
    const known=[{code:'US',name:'United States'},{code:'IN',name:'India'},{code:'NG',name:'Nigeria'},{code:'ID',name:'Indonesia'},{code:'TN',name:'Tunisia'}];
    const used=new Set(known.map(c=>c.code)),many=[];
    for(let i=0;many.length<245;i++){
      const code=String.fromCharCode(65+Math.floor(i/26),65+i%26);
      if(!used.has(code))many.push({code,name:'Country '+i});
    }
    return {ok:true,status:200,json:async()=>[...many,...known]};
  }
  if(u.pathname==='/api/directory'||u.pathname.startsWith('/geo/regions/')){
    const sets={
      US:[{code:'IA',name:'Iowa',cities:[{name:'Des Moines',latitude:41.58,longitude:-93.62},{name:'Cedar Rapids',latitude:41.9779,longitude:-91.6656}]},
          {code:'CA',name:'California',cities:[{name:'Los Angeles',latitude:34.052,longitude:-118.24}]}],
      ID:[{code:'JB',name:'West Java',cities:[{name:'Bandung',latitude:-6.9175,longitude:107.6191}]}],
      IN:[{code:'KA',name:'Karnataka',cities:[{name:'Bengaluru',latitude:12.9716,longitude:77.5946}]}],
      NG:[{code:'LA',name:'Lagos',cities:[{name:'Ikeja',latitude:6.6059,longitude:3.3495}]}],
      TN:[{code:'11',name:'Tunis Governorate',cities:[{name:'Tunis',latitude:36.8065,longitude:10.1815}]}]
    };
    const countryCode=u.searchParams.get('country')||u.pathname.split('/').at(-1).replace('.json',''),regions=sets[countryCode]||[];
    return {ok:true,status:200,json:async()=>({country:countryCode,name:{US:'United States',ID:'Indonesia',IN:'India',NG:'Nigeria',TN:'Tunisia'}[countryCode],regions,regionCount:regions.length,cityCount:regions.reduce((sum,r)=>sum+r.cities.length,0)})};
  }
  if(u.pathname==='/api/resolve-timezone'){
    if(window.__qaTimezoneFailure)return {ok:false,status:503,json:async()=>({error:'Unavailable'})};
    const lat=Number(u.searchParams.get('lat'));
    const zone=lat>40&&lat<43?'America/Chicago':lat>30&&lat<37?'America/Los_Angeles':lat<-1?'Asia/Jakarta':lat>11?'Asia/Kolkata':lat>8?'Africa/Tunis':'Africa/Lagos';
    return {ok:true,status:200,json:async()=>({zone})};
  }
  window.__qaCalls.push(country+'-'+year);
  if(country===window.__qaFailureCode)return {ok:false,status:502,json:async()=>({error:'Simulated gateway outage'})};
  if(window.__qaSlow)return new Promise(resolve=>setTimeout(()=>resolve({ok:true,status:200,json:async()=>[]} ),400));
  const dates=(window.__qaDates[country]||[]).filter(a=>a[0].startsWith(year+'-'));
  const records=(dates.length?dates:[[year+'-06-18','Synthetic public holiday']]).map(([date,name])=>({date,name,countryCode:country,holidayTypes:['Public'],global:true}));
  return {ok:true,status:200,json:async()=>records};
};
Date.now=()=>Date.parse('2026-10-22T17:00:00Z');
'''

def boot(browser,timezone='America/New_York',width=390,height=844,saved=None,fail_country='',shared_query=None):
    context=browser.new_context(timezone_id=timezone,viewport={'width':width,'height':height})
    page=context.new_page()
    page.set_content(HTML,wait_until='domcontentloaded')
    page.add_style_tag(content=(SRC/'styles.v2.css').read_text())
    page.add_script_tag(content=INIT)
    if saved:page.evaluate('saved=>Object.assign(window.__qaSaved,saved)',saved)
    if fail_country:page.evaluate('c=>window.__qaFailureCode=c',fail_country)
    if shared_query is not None:
        page.evaluate("query=>{const Native=window.URLSearchParams;window.URLSearchParams=function(raw){return new Native(raw===''?query:raw)}}",shared_query)
    page.add_script_tag(content=bundled())
    page.wait_for_timeout(20)
    return context,page
