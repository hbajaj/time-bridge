/* Global city autocomplete. Server side proxy keeps the client CSP self-only.
 * Inputs are bounded; upstream host and path are fixed; results are sanitized.
 * Open-Meteo GeoNames geocoding: https://open-meteo.com/en/docs/geocoding-api
 */
import {citySearchInput,citySearchURL,normalizeGlobalCities} from '../lib/city-search.mjs';
const memo=new Map(),TTL=6*60*60*1000,MAX_CACHE=180;
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
  const name=citySearchInput(req.query?.name);
  const country=typeof req.query?.country==='string'?req.query.country.toUpperCase():'';
  if(!name||(country&&!/^[A-Z]{2}$/.test(country)))return res.status(400).json({error:'Enter at least two characters of a city name, optionally followed by a state or country.'});
  const key=`${country}|${name.toLowerCase()}`,cached=memo.get(key);
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=3600');
  if(cached&&Date.now()-cached.at<TTL)return res.status(200).json({results:cached.results,source:'open-meteo-geonames'});
  try{
    const response=await fetch(citySearchURL(name,country),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5500)});
    if(!response.ok)throw Error('City provider unavailable');
    const payload=await response.json();
    if(payload?.error)throw Error('City provider error');
    const results=normalizeGlobalCities(payload);
    if(memo.size>=MAX_CACHE)memo.clear();
    memo.set(key,{results,at:Date.now()});
    return res.status(200).json({results,source:'open-meteo-geonames'});
  }catch{
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({results:[],error:'Global search temporarily unavailable. Try again or use the built-in locations.'});
  }
}
