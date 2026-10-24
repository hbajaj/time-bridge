/* On-demand full-country region/city file from pinned ODbL dataset.
 * A fixed upstream origin, pinned revision and ISO validation prevent SSRF.
 */
import {normalizeCountryDirectory,validCountryCode,WORLD_DIRECTORY_REV} from '../lib/geo-directory.mjs';
const cache=new Map(),TTL=24*60*60*1000;
export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 const code=typeof req.query?.country==='string'?req.query.country.toUpperCase():'';
 if(!validCountryCode(code))return res.status(400).json({error:'Invalid country'});
 const hit=cache.get(code);
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=86400, stale-while-revalidate=3600');
 if(hit&&Date.now()-hit.t<TTL)return res.status(200).json(hit.data);
 try{
  const url=`https://raw.githubusercontent.com/srestre/world-countries-cities-db/${WORLD_DIRECTORY_REV}/countries/${code}.json`;
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Upstream missing country');
  const data=normalizeCountryDirectory(await response.json(),code);
  if(cache.size>=18)cache.clear();
  cache.set(code,{data,t:Date.now()});
  return res.status(200).json(data);
 }catch{
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({code:'DIRECTORY_UNAVAILABLE',error:'Country directory is temporarily unavailable. Try again.'});
 }
}
