/* Country → state/province → city picker.
 * The catalog is browsed per country; city rows are rendered in small pages.
 * IANA zone is verified at selection time rather than inferred from a region.
 */
const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const collator=new Intl.Collator('en',{sensitivity:'base'});
export function selectCities(region,query='',count=60,offset=0){
 const q=fold(query.trim());
 const matches=(region?.cities||[]).filter(c=>!q||fold(c.name).includes(q));
 return {total:matches.length,items:matches.slice(offset,offset+count)};
}
export function mountGlobalDirectory({addLocation,onAdded,maxLocations,getParticipants}){
 const $=id=>document.getElementById(id);
 const country=$('geo-country'),region=$('geo-region'),cityQuery=$('geo-city-query'),
   list=$('geo-city-results'),more=$('geo-city-more'),status=$('geo-directory-status');
 const controls=$('geo-directory-controls');
 if(!country||!region||!cityQuery||!list||!more||!status)return {onOpen:()=>{}};
 let allCountries=null,current=null,revision=0,offset=0,active=null;
 const step=60;
 const message=text=>{status.textContent=text;};
 function clearCities(){
  cityQuery.value='';offset=0;list.replaceChildren();more.hidden=true;
 }
 function renderCities(){
  list.replaceChildren();
  const selected=current?.regions.find((r,i)=>String(i)===region.value);
  if(!selected){more.hidden=true;return}
  const {total,items}=selectCities(selected,cityQuery.value,offset+step,0);
  for(const city of items){
   const li=document.createElement('li'),button=document.createElement('button');
   button.type='button';button.className='clock-result';button.textContent=city.name;
   button.setAttribute('aria-label',`Add ${city.name}, ${selected.name}, ${current.name} clock and meeting location`);
   if(city.latitude===null||city.longitude===null){button.disabled=true;button.title='No coordinates available to verify this city time zone'}
   button.addEventListener('click',()=>chooseCity(city,selected));
   li.append(button);list.append(li);
  }
  const shown=items.length;
  more.hidden=shown>=total;
  more.textContent=`Show more cities (${shown} of ${total})`;
  message(total?`${total.toLocaleString()} cities found in ${selected.name}; select a city to verify its time zone.`:
   'No city matches this search in the selected region.');
 }
 async function chooseCity(city,state){
  if(getParticipants().length>=maxLocations){message(`Maximum ${maxLocations} meeting locations reached.`);return}
  const label=`${city.name}, ${state.name}`,selectedCountry=current?.country,stamp=revision;
  message(`Verifying ${label} time zone…`);
  controls.setAttribute('aria-busy','true');
  try{
   const endpoint=`/api/resolve-timezone?lat=${encodeURIComponent(city.latitude)}&lon=${encodeURIComponent(city.longitude)}`;
   const response=await fetch(endpoint);
   if(!response.ok)throw Error('Time-zone lookup unavailable');
   const value=await response.json();
   if(stamp!==revision)return;
   if(!value?.zone||typeof value.zone!=='string')throw Error('Time zone missing');
   const zone=new Intl.DateTimeFormat('en-US',{timeZone:value.zone}).resolvedOptions().timeZone;
   const result=addLocation(zone,label,selectedCountry);
   if(result){message(result);return}
   message(`${label} added to clocks and meetings (${zone}).`);
   onAdded?.();
  }catch{
   if(stamp===revision)message(`Could not verify the time zone for ${label}. No location was added; please retry.`);
  }finally{controls.removeAttribute('aria-busy')}
 }
 async function ensureCountries(){
  if(allCountries)return;
  message('Loading worldwide country list…');
  try{
   const response=await fetch('/geo/countries.json');
   if(!response.ok)throw Error('Countries unavailable');
   const data=await response.json();
   if(!Array.isArray(data)||data.length<200)throw Error('Incomplete countries index');
   allCountries=data.filter(x=>/^[A-Z]{2}$/.test(x.code)&&typeof x.name==='string')
    .sort((a,b)=>collator.compare(a.name,b.name));
   country.replaceChildren(new Option('Choose a country',''));
   for(const item of allCountries)country.add(new Option(item.name,item.code));
   message('Choose a country, then state/province, then city.');
  }catch{message('Country directory unavailable. Please retry opening Add Clock.');}
 }
 async function loadCountry(){
  const code=country.value,stamp=++revision;
  active?.abort();active=null;current=null;
  region.replaceChildren(new Option('Choose state / province / region',''));region.disabled=true;
  cityQuery.disabled=true;clearCities();
  if(!code){message('Choose a country.');return}
  message('Loading all regions and cities for the selected country…');
  const controller=new AbortController();active=controller;
  try{
   const response=await fetch('/geo/regions/'+encodeURIComponent(code)+'.json',{signal:controller.signal});
   if(!response.ok)throw Error('Directory temporarily unavailable');
   const data=await response.json();
   if(stamp!==revision)return;
   if(data?.country!==code||!Array.isArray(data.regions))throw Error('Invalid directory response');
   current=data;
   const indexed=data.regions.map((r,i)=>({...r,index:i})).sort((a,b)=>collator.compare(a.name,b.name));
   for(const item of indexed){const n=item.cities?.length||0;region.add(new Option(`${item.name} (${n.toLocaleString()})`,String(item.index)));}
   region.disabled=indexed.length===0;
   message(indexed.length?`${data.regionCount.toLocaleString()} regions · ${data.cityCount.toLocaleString()} cities/towns available for ${data.name}.`:
     'This source currently lists no administrative regions or cities for that country.');
  }catch(err){
   if(stamp===revision&&err?.name!=='AbortError')message('Country download unavailable; retry selecting the country.');
  }finally{if(stamp===revision)active=null}
 }
 country.addEventListener('change',loadCountry);
 region.addEventListener('change',()=>{revision++;clearCities();cityQuery.disabled=!region.value;renderCities()});
 cityQuery.addEventListener('input',()=>{offset=0;renderCities()});
 more.addEventListener('click',()=>{offset+=step;renderCities()});
 return {onOpen:ensureCountries};
}
