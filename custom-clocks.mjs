/* TimeBridge v2.3 personal world clocks.
 * No remote requests, geolocation, user profiles, or third-party services.
 * Extra clocks are display-only: meeting destinations and holiday checks do not change.
 */
import { identifyDeviceZone } from './time-core.mjs';
import { COUNTRY_FROM_ZONE } from './country-map.mjs';
import { MAJOR_CITIES } from './city-directory.mjs';

export const CLOCK_LIMIT = 6;
export const CLOCK_STORAGE_KEY = 'timebridge-extra-clocks-v1';

const FEATURED = [
  ['London', 'Europe/London', 'United Kingdom UK England GMT BST'],
  ['Los Angeles', 'America/Los_Angeles', 'California West Coast Pacific PST PDT'],
  ['San Francisco', 'America/Los_Angeles', 'California Bay Area Silicon Valley PST PDT'],
  ['Seattle', 'America/Los_Angeles', 'Washington Pacific PST PDT'],
  ['Chicago', 'America/Chicago', 'Illinois Central Time CST CDT'],
  ['Dallas', 'America/Chicago', 'Texas Central Time CST CDT'],
  ['Denver', 'America/Denver', 'Mountain Time MST MDT Colorado'],
  ['Phoenix', 'America/Phoenix', 'Arizona MST no daylight saving'],
  ['Honolulu', 'Pacific/Honolulu', 'Hawaii HST'],
  ['Toronto', 'America/Toronto', 'Canada Eastern ET EDT EST'],
  ['Vancouver', 'America/Vancouver', 'Canada Pacific PST PDT'],
  ['Mexico City', 'America/Mexico_City', 'Mexico CST'],
  ['São Paulo', 'America/Sao_Paulo', 'Brazil Brasilia'],
  ['Dubai', 'Asia/Dubai', 'United Arab Emirates UAE GST'],
  ['Abu Dhabi', 'Asia/Dubai', 'United Arab Emirates UAE'],
  ['Riyadh', 'Asia/Riyadh', 'Saudi Arabia'],
  ['Singapore', 'Asia/Singapore', 'SGT'],
  ['Tokyo', 'Asia/Tokyo', 'Japan JST'],
  ['Seoul', 'Asia/Seoul', 'South Korea KST'],
  ['Hong Kong', 'Asia/Hong_Kong', 'HKT'],
  ['Shanghai', 'Asia/Shanghai', 'China CST'],
  ['Kathmandu', 'Asia/Kathmandu', 'Nepal NPT'],
  ['Bangkok', 'Asia/Bangkok', 'Thailand ICT'],
  ['Sydney', 'Australia/Sydney', 'Australia AEDT AEST'],
  ['Melbourne', 'Australia/Melbourne', 'Australia AEDT AEST'],
  ['Perth', 'Australia/Perth', 'Western Australia AWST'],
  ['Auckland', 'Pacific/Auckland', 'New Zealand NZDT NZST'],
  ['Paris', 'Europe/Paris', 'France CEST CET'],
  ['Berlin', 'Europe/Berlin', 'Germany CEST CET'],
  ['Dublin', 'Europe/Dublin', 'Ireland IST GMT'],
  ['Amsterdam', 'Europe/Amsterdam', 'Netherlands CET'],
  ['UTC', 'Etc/UTC', 'Coordinated Universal Time Zulu GMT']
].map(([name, zone, keywords]) => ({name, zone, keywords}));

const safeCanonical = zone => {
  if (typeof zone !== 'string' || zone.length > 100) return null;
  try { return new Intl.DateTimeFormat('en-US', {timeZone: zone}).resolvedOptions().timeZone; }
  catch { return null; }
};
export const canonicalZone = safeCanonical;
function zoneKey(zone) {
  const canonical = safeCanonical(zone);
  if (!canonical) return null;
  // All aliases for the fixed meeting destinations are already represented.
  const home = identifyDeviceZone(canonical);
  return home ? `fixed-${home}` : canonical;
}
export function clockUnavailable(zone, stored, deviceZone) {
  const key = zoneKey(zone);
  return !key || ['fixed-et','fixed-ng','fixed-in', zoneKey(deviceZone), ...stored.map(x => zoneKey(x.zone))].includes(key);
}

let cachedChoices;
function choices() {
  if (cachedChoices) return cachedChoices;
  const featured = FEATURED.map(c => ({...c, group: 'City'}));
  let zones = [];
  try { zones = Intl.supportedValuesOf?.('timeZone') || []; } catch {}
  const listed = new Set([...zones, ...Object.keys(COUNTRY_FROM_ZONE), 'Etc/UTC']);
  const generic = [...listed].filter(safeCanonical).map(zone => ({name: zone.split('/').at(-1).replaceAll('_', ' '), zone, keywords: zone.replaceAll('_',' '), group:'Time zone'}));
  cachedChoices = [...featured, ...MAJOR_CITIES, ...generic];
  return cachedChoices;
}
const searchText = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[_/]+/g,' ').toLowerCase().trim();
export function searchClockZones(query, stored=[], deviceZone='', limit=8) {
  const term = searchText(query);
  const found = [];
  const used = new Set();
  for (const [index, candidate] of choices().entries()) {
    const key = candidate.group==='Major city' ? `${candidate.country}/${candidate.region}/${candidate.name}` : zoneKey(candidate.zone);
    const unavailable=clockUnavailable(candidate.zone,stored,deviceZone);
    if (!key || used.has(key) || (unavailable && candidate.group!=='Major city')) continue;
    const name = searchText(candidate.name), timezone=searchText(candidate.zone),
      region=searchText(candidate.region||''),country=searchText(candidate.countryName||''),tags=searchText(candidate.keywords);
    if (term && ![name,timezone,region,country,tags].some(s=>s.includes(term))) continue;
    const score = !term ? (candidate.group==='City'?1000-index:0) :
      (name===term?200 : name.startsWith(term)?180 : region===term?160 :
       country===term?140 : name.includes(term)?120 : timezone.startsWith(term)?90 :
       region.startsWith(term)?80 : tags.includes(term)?60 : 40)+(candidate.group==='Major city'?20:candidate.group==='City'?10:0);
    used.add(key);
    found.push({...candidate, unavailable, score});
  }
  found.sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
  return found.slice(0, Math.max(0, Math.min(Number(limit)||8, 20)));
}
export function cleanSavedClocks(value, deviceZone='') {
  if (!Array.isArray(value)) return [];
  const cleaned=[];
  for (const raw of value.slice(0,50)) {
    const zone = typeof raw?.zone === 'string' ? safeCanonical(raw.zone) : null;
    if (!zone || clockUnavailable(zone,cleaned,deviceZone)) continue;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0,60) : zone.split('/').at(-1).replaceAll('_',' ');
    cleaned.push({name,zone});
    if (cleaned.length === CLOCK_LIMIT) break;
  }
  return cleaned;
}
export function readClockStorage(storage,deviceZone='') {
  try { return cleanSavedClocks(JSON.parse(storage?.getItem(CLOCK_STORAGE_KEY)||'[]'),deviceZone); }
  catch { return []; }
}
export function makeClockFormatter(zone) {
  if (!safeCanonical(zone)) throw Error('Unsupported time zone');
  const date = new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'});
  const time = new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:true});
  const tz = new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'short',hour:'numeric'});
  return ms => {
    const instant=new Date(ms);
    const observed=tz.formatToParts(instant).find(x=>x.type==='timeZoneName')?.value || zone;
    // ICU releases differ: GMT+0 and GMT are the same United Kingdom standard time.
    const abbreviation=observed.replace(/^GMT\+0(?::00)?$/,'GMT');
    return {time:time.format(instant),date:date.format(instant),abbreviation};
  };
}

export function mountCustomClocks({getInstant, deviceZone='', storage=null}) {
  if (!storage) { try { storage=window.localStorage; } catch { /* Private browsing/storage disabled: in-memory clocks still work. */ } }
  const $ = id=>document.getElementById(id);
  const add=$('clock-add-toggle'), panel=$('clock-add-panel'), input=$('clock-search');
  const results=$('clock-results'), grid=$('extra-clocks'), status=$('clock-add-status'), count=$('extra-clock-count');
  let saved=readClockStorage(storage,deviceZone);
  const cardFormatters=new Map();
  let renderedCards=[];
  function persist() { try { storage?.setItem(CLOCK_STORAGE_KEY,JSON.stringify(saved)); return true; }catch{return false;} }
  function setStatus(message){status.textContent=message;}
  function paint(ms) {
    for(const {clock,number,date,abbr} of renderedCards) {
      const p=clock(ms);
      number.textContent=p.time; date.textContent=p.date; abbr.textContent=p.abbreviation;
    }
  }
  function render() {
    grid.replaceChildren(); renderedCards=[];
    count.textContent=`${saved.length} / ${CLOCK_LIMIT} added`;
    grid.hidden=saved.length===0;
    for(const entry of saved) {
      const article=document.createElement('article');article.className='clock-card extra-clock-card';
      const meta=document.createElement('div');meta.className='clock-meta';
      const head=document.createElement('div');head.className='extra-clock-head';
      const city=document.createElement('span');city.className='location';city.textContent=`🌐 ${entry.name}`;
      const remove=document.createElement('button');remove.type='button';remove.className='clock-remove';remove.textContent='Remove';
      remove.setAttribute('aria-label',`Remove ${entry.name} clock`);
      remove.addEventListener('click',()=>{
        saved=saved.filter(x=>x.zone!==entry.zone);
        const stored=persist();render();renderResults();
        setStatus(`${entry.name} removed.${stored?'':' This change may not persist in private browsing.'}`);
      });
      head.append(city,remove);
      const date=document.createElement('div');date.className='local-date';meta.append(head,date);
      const number=document.createElement('div');number.className='clock-value';
      const abbr=document.createElement('div');abbr.className='zone-label';
      const fullZone=document.createElement('div');fullZone.className='extra-clock-zone';fullZone.textContent=entry.zone.replaceAll('_',' ');
      article.append(meta,number,abbr,fullZone);grid.append(article);
      if(!cardFormatters.has(entry.zone)) cardFormatters.set(entry.zone,makeClockFormatter(entry.zone));
      renderedCards.push({clock:cardFormatters.get(entry.zone),number,date,abbr});
    }
    paint(getInstant());
  }
  function addChoice(choice) {
    if(saved.length>=CLOCK_LIMIT){setStatus(`Maximum ${CLOCK_LIMIT} extra clocks reached. Remove one to add another.`);return;}
    if(clockUnavailable(choice.zone,saved,deviceZone)){setStatus('That time zone is already shown.');return;}
    saved.push({zone:safeCanonical(choice.zone),name:choice.name});
    const stored=persist();render();input.value='';renderResults();toggle(false);
    setStatus(`${choice.name} clock added.${stored?'':' This choice may not persist in private browsing.'}`);
  }
  function renderResults() {
    results.replaceChildren();
    const matches=searchClockZones(input.value,saved,deviceZone,8);
    if(saved.length>=CLOCK_LIMIT) {
      const li=document.createElement('li');li.textContent='Remove a clock before adding another.';results.append(li);return;
    }
    for(const choice of matches) {
      const li=document.createElement('li'), button=document.createElement('button');
      button.type='button';button.className='clock-result';
      button.textContent=`${choice.name} · ${choice.zone.replaceAll('_',' ')}`;
      button.setAttribute('aria-label',`Add ${choice.name} (${choice.zone}) clock`);
      button.addEventListener('click',()=>addChoice(choice));li.append(button);results.append(li);
    }
    if(!matches.length){const li=document.createElement('li');li.className='clock-no-results';li.textContent=input.value.trim()?'No available matching time zone. Try a city or IANA zone name.':'All common time zones are already shown.';results.append(li);}
  }
  function toggle(force) {
    const show=typeof force==='boolean'?force:panel.hidden;
    panel.hidden=!show;add.setAttribute('aria-expanded',String(show));
    if(show){renderResults();input.focus();}else add.focus();
  }
  add.addEventListener('click',()=>toggle());
  input.addEventListener('input',renderResults);
  input.addEventListener('keydown',event=>{if(event.key==='Escape'&& !panel.hidden){event.preventDefault();toggle(false)}});
  window.addEventListener('storage',e=>{if(e.key===CLOCK_STORAGE_KEY){saved=readClockStorage(storage,deviceZone);render();renderResults();setStatus('Saved clocks updated from another tab.')}});
  render();
  return {paint, getSaved:()=>saved.map(x=>({...x}))};
}
