/* Global city search: Open-Meteo's GeoNames-backed geocoding metadata.
 * Keep the handler same-origin; never expose keys, location sensors or arbitrary upstream URLs.
 * Data attribution: https://open-meteo.com/en/docs/geocoding-api (GeoNames, CC BY 4.0).
 */
export const CITY_SEARCH_ORIGIN='https://geocoding-api.open-meteo.com';
export function citySearchInput(raw){
  if(typeof raw!=='string')return '';
  const term=raw.trim().replace(/\s+/g,' ');
  if(term.length<2||term.length>90||/[\u0000-\u001f<>\\]/.test(term))return '';
  return term;
}
export function citySearchURL(name,country='',count=40){
  const url=new URL('/v1/search',CITY_SEARCH_ORIGIN);
  url.searchParams.set('name',name);url.searchParams.set('count',String(Math.max(1,Math.min(100,count))));
  url.searchParams.set('language','en');
  if(/^[A-Z]{2}$/.test(country))url.searchParams.set('countryCode',country);
  return url.toString();
}
export function normalizeGlobalCities(payload){
  if(!payload||!Array.isArray(payload.results))return [];
  const known=new Set(),cities=[];
  for(const item of payload.results.slice(0,100)){
    if(!item||typeof item!=='object')continue;
    const name=typeof item.name==='string'?item.name.trim().slice(0,90):'';
    const country=typeof item.country_code==='string'?item.country_code.toUpperCase():'';
    const zone=typeof item.timezone==='string'?item.timezone:'';
    const feature=typeof item.feature_code==='string'?item.feature_code:'';
    if(!name||!/^[A-Z]{2}$/.test(country)||!feature.startsWith('PPL'))continue;
    try{new Intl.DateTimeFormat('en-US',{timeZone:zone})}catch{continue}
    const region=typeof item.admin1==='string'?item.admin1.trim().slice(0,90):'';
    const countryName=typeof item.country==='string'?item.country.trim().slice(0,90):country;
    const id=Number(item.id)||0,key=`${country}:${region}:${name}:${id}`;
    if(known.has(key))continue;known.add(key);
    cities.push({id,name,region,country,countryName,zone,population:Number.isFinite(Number(item.population))?Math.max(0,Number(item.population)):0});
  }
  return cities;
}
