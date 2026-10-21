/* Country-public-holiday scheduling safeguard. Network failures never produce an unverified recommendation. */
import { localDay } from './time-core.mjs';
export const HOLIDAY_API = 'https://nagerholidays.com/api/v4/Holidays';
const CACHE_HOURS = 8;
const inflight = new Map();
const isoDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
export function normalizeHolidays(payload, country){
  if (!Array.isArray(payload) || !payload.length) throw Error(`No reliable public-holiday calendar for ${country}`);
  const seen=new Set(); const output=[];
  for(const raw of payload){
    if(!raw || !isoDay(raw.date) || typeof raw.name!=='string')continue;
    if(raw.countryCode && raw.countryCode.toUpperCase()!==country)continue;
    const types = raw.holidayTypes ?? raw.types;
    if(!Array.isArray(types) || !types.some(t=>String(t).toLowerCase()==='public'))continue;
    // All public holidays, including those limited to subdivisions: deliberately conservative.
    const key=raw.date+'|'+raw.name;
    if(seen.has(key))continue;seen.add(key);
    output.push({date:raw.date,name:raw.name,regional:raw.nationalHoliday===false || raw.global===false});
  }
  if(!output.length)throw Error(`No public-holiday entries for ${country}`);
  return output.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
export async function holidaysFor(country,year,fetcher=fetch){
  if(!/^[A-Z]{2}$/.test(country) || !Number.isInteger(year) || year<2020 || year>2100)throw Error('Country/year is not supported');
  const key=`tb-holidays-v4-${country}-${year}`,existing=inflight.get(key);
  if(existing)return existing;
  const task=(async()=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw){const cached=JSON.parse(raw);if(Date.now()-cached.saved<CACHE_HOURS*3600000 && Array.isArray(cached.data))return normalizeHolidays(cached.data,country)}
    }catch{}
    let result;
    const response=await fetcher(`${HOLIDAY_API}/${country}/${year}`,{headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(`Holiday service unavailable (${country}, HTTP ${response.status})`);
    result=await response.json();
    const normalized=normalizeHolidays(result,country);
    try{localStorage.setItem(key,JSON.stringify({saved:Date.now(),data:result}))}catch{}
    return normalized;
  })();
  inflight.set(key,task);
  try{return await task}finally{inflight.delete(key)}
}
export function holidayConflicts(slot, calendars, extraZone=null, extraCountry=''){
  if(!slot)return [{name:'Invalid meeting'}];
  const mappings=[['et','US'],['ng','NG'],['in','IN']];
  if(extraZone && extraCountry && !mappings.some(([zone,code])=>zone===extraZone&&code===extraCountry)) mappings.push(['visitor',extraCountry]);
  const conflicts=[];
  for(const [zone,country] of mappings){
    const findDate=zone==='visitor'?null:zone;
    const getDate=ms=> findDate?localDay(ms,zone):formatZoneDay(ms,extraZone);
    const a=getDate(slot.ms),b=getDate(slot.ms+slot.duration*60000);
    for(const day of new Set([a,b])){
      const byYear=calendars.get(`${country}-${day.slice(0,4)}`);
      if(!byYear)throw Error(`Holiday data missing for ${country} ${day.slice(0,4)}`);
      for(const h of byYear.filter(x=>x.date===day))conflicts.push({country,day,name:h.name,regional:h.regional});
    }
  }
  return conflicts;
}
export function formatZoneDay(ms,zone){
  const t=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
  const p=Object.fromEntries(t.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function requiredHolidayYears(now,days=45){
  const start=new Date(now);const end=new Date(now+days*86400000);
  const years=[];for(let y=start.getUTCFullYear();y<=end.getUTCFullYear();y++)years.push(y);
  return years;
}
