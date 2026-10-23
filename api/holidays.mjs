/* TimeBridge holiday gateway. UTC date semantics, sanitized data and verified provenance.
 * Independent provider fallback where supported; no unverified dates are recommended.
 */
import { INDIA_CENTRAL_GAZETTED_2026 } from '../lib/india-2026.mjs';
import { SA_2026_OFFICIAL_CLOSURES } from '../lib/saudi-2026.mjs';
import { SA_2027_OFFICIAL_CLOSURES } from '../lib/saudi-2027.mjs';
import { fetchVerifiedHolidays } from '../lib/holiday-providers.mjs';
import { publishedDefaultCalendar } from '../lib/default-calendars.mjs';
const CACHE_MS=6*60*60*1000;
const memo=new Map();
const official=(country,year)=>{
  const stable=publishedDefaultCalendar(country,year);
  if(stable)return stable;
  if(country==='IN'&&year===2026)return {data:INDIA_CENTRAL_GAZETTED_2026,source:'india-gazetted-2026',coverage:'India central-government gazetted dates only; state and regional holidays not complete'};
  if(country==='SA'&&year===2026)return {data:SA_2026_OFFICIAL_CLOSURES,source:'sa-aviation-2026',coverage:'Saudi official aviation-sector closures, conservative; not all employers'};
  if(country==='SA'&&year===2027)return {data:SA_2027_OFFICIAL_CLOSURES,source:'sa-financial-2027',coverage:'Saudi official financial-sector closures, conservative; not all employers'};
  return null;
};
const annotate=(res,record)=>{
  res.setHeader('X-Holiday-Source',record.source);
  res.setHeader('X-Holiday-Coverage',record.coverage);
  res.setHeader('X-Holiday-Completeness',record.completeness||'provider');
  res.setHeader('X-Holiday-Verified-At',record.verifiedAt||'published-government-snapshot');
};
export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});
  }
  const {country:rawCountry,year:rawYear}=req.query||{};
  const country=typeof rawCountry==='string'?rawCountry.toUpperCase():'';
  const year=(typeof rawYear==='string'&&/^\d{4}$/.test(rawYear))|| (typeof rawYear==='number'&&Number.isInteger(rawYear))?Number(rawYear):NaN;
  if(!/^[A-Z]{2}$/.test(country)||!Number.isInteger(year)||year<2020||year>2100)return res.status(400).json({error:'Invalid country or year'});
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  const government=official(country,year);
  if(government){
    annotate(res,government);
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600');
    return res.status(200).json(government.data);
  }
  const key=`${country}-${year}`,cached=memo.get(key);
  if(cached&&Date.now()-cached.saved<CACHE_MS){
    annotate(res,cached);res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600');
    return res.status(200).json(cached.data);
  }
  try{
    const data=await fetchVerifiedHolidays(country,year,{apiKey:process.env.CALENDARIFIC_API_KEY||''});
    const entry={...data,saved:Date.now()};
    if(memo.size>200)memo.clear();
    memo.set(key,entry);annotate(res,entry);
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600');
    return res.status(200).json(entry.data);
  }catch{
    res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After','300');
    return res.status(503).json({code:'HOLIDAY_UNVERIFIED',error:`No verified holiday calendar is available for ${country} ${year}. Meeting recommendations are paused.`});
  }
}
