/* TimeBridge public-holiday providers: strict parsing, independent fallbacks.
 * Calendarific is OPTIONAL and is called only on the server; its key must never
 * appear in browser code, logs, responses, or a checked-in configuration.
 */
export const OPENHOLIDAYS_COUNTRIES = new Set([
  'AL','AD','AT','BY','BE','BR','BG','HR','CZ','EE','FR','DE','HU','IE','IT',
  'LV','LI','LT','LU','MT','MX','MD','MC','NL','PL','PT','RO','SM','RS','SK',
  'SI','ZA','ES','SE','CH','VA'
]);
const isISO = (date, year) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(`${year}-`)) return false;
  const ms = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10) === date;
};
const record = (date, name, country, regional=false) => ({date,name,countryCode:country,holidayTypes:['Public'],global:!regional});
const unique = (items, country, year) => {
  if (!Array.isArray(items) || items.length > 2000) throw Error('Invalid calendar shape');
  const seen = new Set(), out=[];
  for(const item of items){
    if(!item || !isISO(item.date,year) || typeof item.name!=='string' || !item.name.trim() || item.name.length>240) continue;
    if(item.countryCode!==country) continue;
    const key = `${item.date}|${item.name.trim()}`;
    if(seen.has(key)) continue;
    seen.add(key);out.push(item);
  }
  if(!out.length) throw Error('No validated public holidays in source');
  return out.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
};
export function parseNager(payload,country,year){
  if(!Array.isArray(payload))throw Error('Invalid Nager payload');
  return unique(payload.filter(p=>{
    const types = p?.holidayTypes??p?.types;
    return Array.isArray(types)&&types.some(x=>String(x).toLowerCase()==='public')&&(!p.countryCode||p.countryCode.toUpperCase()===country);
  }).map(p=>record(p.date,p.name,country,p.nationalHoliday===false||p.global===false)),country,year);
}
export function parseOpenHolidays(payload,country,year){
  if(!Array.isArray(payload))throw Error('Invalid OpenHolidays payload');
  return unique(payload.flatMap(p=>{
    if(!p || !isISO(p.startDate,year) || !isISO(p.endDate??p.startDate,year))return [];
    const name = typeof p.name==='string'?p.name:(Array.isArray(p.name)?(p.name.find(x=>String(x.language||'').toUpperCase()==='EN')||p.name[0])?.text:null);
    if(!name || typeof name!=='string') return [];
    const start=Date.parse(`${p.startDate}T12:00:00Z`),end=Date.parse(`${p.endDate??p.startDate}T12:00:00Z`);
    if(end<start||end-start>14*86400000)return [];
    const regional = p.nationwide===false || (Array.isArray(p.subdivisions)&&p.subdivisions.length>0) || (Array.isArray(p.regionalScope)&&p.regionalScope.length>0);
    const days=[];for(let ms=start;ms<=end;ms+=86400000)days.push(record(new Date(ms).toISOString().slice(0,10),name,country,regional));
    return days;
  }),country,year);
}
export function parseCalendarific(payload,country,year){
  if(!Array.isArray(payload?.response?.holidays))throw Error('Invalid Calendarific payload');
  return unique(payload.response.holidays.filter(p=>Array.isArray(p?.type)&&p.type.some(t=>/national holiday|public holiday|federal holiday|state holiday|local holiday|regional holiday|bank holiday/i.test(String(t)))).map(p=>record(p?.date?.iso,p?.name,country,p.locations!=='All'&&p.states!=='All')),country,year);
}
export function providerPlan(country,year,calendarificEnabled=false){
  const list=[{id:'nager-v4',url:`https://nagerholidays.com/api/v4/Holidays/${country}/${year}`,parse:parseNager}];
  if(OPENHOLIDAYS_COUNTRIES.has(country))list.push({id:'openholidays',url:`https://openholidaysapi.org/PublicHolidays?countryIsoCode=${country}&languageIsoCode=EN&validFrom=${year}-01-01&validTo=${year}-12-31`,parse:parseOpenHolidays});
  if(calendarificEnabled)list.push({id:'calendarific',url:null,parse:parseCalendarific});
  // Compatibility fallback only: the v3 endpoint is not an independent provider.
  list.push({id:'nager-v3',url:`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,parse:parseNager});
  return list;
}
export async function fetchVerifiedHolidays(country,year,{fetcher=fetch,apiKey='',timeoutMs=2200}={}){
  const diagnostics=[];
  const deadline=Date.now()+7200;
  for (const provider of providerPlan(country,year,Boolean(apiKey))){
    try{
      const url=provider.id==='calendarific'?`https://calendarific.com/api/v2/holidays?${new URLSearchParams({api_key:apiKey,country,year:String(year)})}`:provider.url;
      const remaining=deadline-Date.now();
      if(remaining<200)throw Error('Global holiday lookup budget exhausted');
      const response=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(Math.min(timeoutMs,remaining))});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const json=await response.json();
      const data=provider.parse(json,country,year);
      return {data,source:provider.id,coverage:'Country-level provider calendar; regional holidays included only where supplied',verifiedAt:new Date().toISOString()};
    }catch(e){diagnostics.push({source:provider.id,reason:String(e?.message||e).replace(/api_key=[^&]+/g,'api_key=[redacted]').slice(0,90)});}
  }
  // Do not expose provider secrets or network internals to callers.
  const error=new Error('No verified holiday calendar was available');
  error.code='HOLIDAY_UNVERIFIED';error.attempted=diagnostics.map(x=>x.source);
  throw error;
}
