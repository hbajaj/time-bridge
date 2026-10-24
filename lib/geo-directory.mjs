/* Pinned-country directory normalization (ODbL 1.0).
 * Source: srestre/world-countries-cities-db at ab77d11f438f439e3f7ed2680463cbd1f861ec15.
 */
export const WORLD_DIRECTORY_REV='ab77d11f438f439e3f7ed2680463cbd1f861ec15';
export const WORLD_DIRECTORY_SOURCE='srestre/world-countries-cities-db';
export function normalizeCountryDirectory(raw,code){
 if(!Array.isArray(raw)||raw.length!==1||raw[0]?.iso2!==code)throw Error('Country dataset invalid');
 const entry=raw[0],regions=[];
 for(const state of (Array.isArray(entry.states)?entry.states:[])){
  if(typeof state.name!=='string'||!state.name.trim())continue;
  const cities=[];
  for(const item of (Array.isArray(state.cities)?state.cities:[])){
   if(typeof item?.name!=='string'||!item.name.trim())continue;
   const latitude=item.latitude===null||item.latitude===undefined?NaN:Number(item.latitude),
         longitude=item.longitude===null||item.longitude===undefined?NaN:Number(item.longitude);
   cities.push({name:item.name.trim().slice(0,110),latitude:Number.isFinite(latitude)&&Math.abs(latitude)<=90?latitude:null,
    longitude:Number.isFinite(longitude)&&Math.abs(longitude)<=180?longitude:null});
  }
  regions.push({code:String(state.code??'').slice(0,16),name:state.name.trim().slice(0,110),cities});
 }
 return {country:code,name:entry.name,regions,regionCount:regions.length,cityCount:regions.reduce((a,s)=>a+s.cities.length,0),sourceRevision:WORLD_DIRECTORY_REV};
}
export function validCountryCode(code){return typeof code==='string'&&/^[A-Z]{2}$/.test(code)}
export function validCoordinates(lat,lon){return Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lon)&&Math.abs(lon)<=180}
