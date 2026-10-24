/* IANA zone lookup for selected city coordinates.
 * Open-Meteo resolves geographic coordinates to a tzdb zone via timezone=auto.
 * Never guess a time zone on failed resolution.
 */
import {validCoordinates} from '../lib/geo-directory.mjs';
const cache=new Map();
export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 const rawLat=req.query?.lat,rawLon=req.query?.lon;
 const lat=typeof rawLat==='string'&&rawLat.trim()?Number(rawLat):NaN;
 const lon=typeof rawLon==='string'&&rawLon.trim()?Number(rawLon):NaN;
 if(!validCoordinates(lat,lon))return res.status(400).json({error:'Invalid coordinates'});
 const key=`${lat.toFixed(4)},${lon.toFixed(4)}`,cached=cache.get(key);
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=604800');
 if(cached)return res.status(200).json({zone:cached});
 try{
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',String(lat));
  url.searchParams.set('longitude',String(lon));
  url.searchParams.set('timezone','auto');
  url.searchParams.set('current','temperature_2m');
  url.searchParams.set('forecast_days','1');
  const response=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(6500)});
  if(!response.ok)throw Error('Zone provider unavailable');
  const value=await response.json();
  if(typeof value?.timezone!=='string')throw Error('Zone missing');
  const zone=new Intl.DateTimeFormat('en-US',{timeZone:value.timezone}).resolvedOptions().timeZone;
  if(!zone)throw Error('Zone invalid');
  if(cache.size>=1000)cache.clear();cache.set(key,zone);
  return res.status(200).json({zone});
 }catch{
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({error:'Could not verify the selected city time zone. Please retry; location not added.'});
 }
}
