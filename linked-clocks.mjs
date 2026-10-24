/* Shared location picker & world clock rendering for v2.5.1.
   Meeting participants are the source of truth; the local reference remains independent. */
import { ZONES, NAMES } from './time-core.mjs';
import { searchClockZones, makeClockFormatter, canonicalZone } from './custom-clocks.mjs';
import { inferCountry } from './country-map.mjs';
import { mountGlobalDirectory } from './global-directory-picker.mjs';
const DEFAULT_CHOICES=[{zone:ZONES.et,name:NAMES.et,country:'US'},
  {zone:ZONES.ng,name:NAMES.ng,country:'NG'},
  {zone:ZONES.in,name:NAMES.in,country:'IN'}];
const sharedName=(zone)=>zone.split('/').at(-1).replaceAll('_',' ');
export function mountLinkedClocks({getInstant,deviceZone,getParticipants,addLocation,removeLocation,maxLocations=8,onRendered=()=>{}}){
  const $=id=>document.getElementById(id),toggle=$('clock-add-toggle'),panel=$('clock-add-panel'),
    query=$('clock-search'),results=$('clock-results'),grid=$('extra-clocks'),
    count=$('extra-clock-count'),status=$('clock-add-status'),limitNote=$('clock-add-limit');
  let cards=[];const formatterCache=new Map();
  let globalMatches=[],globalQuery='',globalStatus='',globalRevision=0,globalTimer=null,globalAbort=null;
  function resetSearch(){
    globalRevision++;if(globalTimer!==null)clearTimeout(globalTimer);globalTimer=null;
    globalAbort?.abort();globalAbort=null;globalMatches=[];globalQuery='';globalStatus='';
  }
  function requestWorldwide(){
    const name=query.value.trim(),revision=++globalRevision;
    if(globalTimer!==null)clearTimeout(globalTimer);
    globalAbort?.abort();globalAbort=null;globalMatches=[];globalQuery=name;
    globalStatus=name.length>=2?'Searching worldwide…':'';
    renderResults();
    if(name.length<2)return;
    globalTimer=setTimeout(async()=>{
      const abort=new AbortController();globalAbort=abort;
      try{
        const response=await fetch('/api/cities?name='+encodeURIComponent(name),{signal:abort.signal});
        if(!response.ok)throw Error('Global provider unavailable');
        const payload=await response.json();
        if(revision!==globalRevision||panel.hidden)return;
        if(!payload||!Array.isArray(payload.results))throw Error('Invalid city search response');
        globalMatches=payload.results.filter(city=>city&&typeof city.name==='string'&&
          /^[A-Z]{2}$/.test(city.country||'')&&canonicalZone(city.zone))
          .slice(0,40).map(city=>({...city,group:'Worldwide city'}));
        globalStatus=globalMatches.length?'':'No additional worldwide matches. Try the city name followed by a full state or country name.';
      }catch(error){
        if(revision!==globalRevision||error?.name==='AbortError'||panel.hidden)return;
        globalStatus='Worldwide search temporarily unavailable; built-in cities and time zones are still searchable.';
      }finally{if(revision===globalRevision){globalAbort=null;renderResults()}}
    },260);
  }
  function paint(ms){for(const {fmt,time,date,abbr} of cards){const v=fmt(ms);time.textContent=v.time;date.textContent=v.date;abbr.textContent=v.abbreviation}}
  function render(){
    // Old extra cards may have been moved to the main grid for mixed-location ordering.
    for(const card of document.querySelectorAll('#clocks > .extra-clock-card'))card.remove();
    cards=[];grid.replaceChildren();
    const extras=getParticipants().filter(p=>!Object.values(ZONES).some(z=>canonicalZone(z)===canonicalZone(p.zone)) && canonicalZone(p.zone)!==canonicalZone(deviceZone));
    const total=getParticipants().length;
    count.textContent=`${total} meeting location${total===1?'':'s'}`;
    const isFull=total>=maxLocations;
    toggle.disabled=isFull;
    limitNote.hidden=!isFull;
    if(isFull){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}
    if(!isFull && status.textContent.startsWith('Maximum '))status.textContent='';
    grid.hidden=extras.length===0;
    for(const p of extras){
      const article=document.createElement('article');article.className='clock-card extra-clock-card';article.dataset.clockZone=canonicalZone(p.zone);
      const meta=document.createElement('div');meta.className='clock-meta';
      const heading=document.createElement('div');heading.className='extra-clock-head';
      const name=document.createElement('span');name.className='location';name.textContent=`🌐 ${p.name}`;
      const remove=document.createElement('button');remove.type='button';remove.className='clock-remove';remove.textContent='Remove';
      remove.setAttribute('aria-label',`Remove ${p.name} clock and meeting location`);
      remove.addEventListener('click',()=>removeLocation(p.zone));heading.append(name,remove);
      const day=document.createElement('div');day.className='local-date';meta.append(heading,day);
      const time=document.createElement('div');time.className='clock-value';
      const abbr=document.createElement('div');abbr.className='zone-label';
      const zone=document.createElement('div');zone.className='extra-clock-zone';zone.textContent=p.zone.replaceAll('_',' ');
      article.append(meta,time,abbr,zone);grid.append(article);
      if(!formatterCache.has(p.zone))formatterCache.set(p.zone,makeClockFormatter(p.zone));
      cards.push({fmt:formatterCache.get(p.zone),time,date:day,abbr});
    }
    paint(getInstant());onRendered();renderResults();
  }
  function resultsList(){
    const stored=getParticipants();const lower=query.value.trim().toLowerCase();
    const defaults=DEFAULT_CHOICES.filter(d=>!stored.some(p=>canonicalZone(p.zone)===canonicalZone(d.zone)))
      .filter(d=>!lower||d.name.toLowerCase().includes(lower)||d.zone.toLowerCase().includes(lower));
    const usual=searchClockZones(query.value,[],deviceZone,20)
      .filter(choice=>choice.group==='Major city'||!stored.some(p=>p.zone===canonicalZone(choice.zone)))
      .map(({zone,name,region,country,countryName,group,unavailable})=>({zone,name,region,country:country||inferCountry(zone),countryName,group,unavailable}));
    const seen=new Set();const options=[];
    const worldwide=globalQuery===query.value.trim()?globalMatches:[];
    for(const choice of [...defaults,...worldwide,...usual]){
      const zone=canonicalZone(choice.zone);
      const key=(choice.group==='Major city'||choice.group==='Worldwide city') ?
        `${choice.country}/${choice.region}/${choice.name}`:zone;
      if(!zone||seen.has(key))continue;
      seen.add(key);options.push({...choice,zone,unavailable:choice.unavailable||stored.some(p=>canonicalZone(p.zone)===zone)});
      if(options.length>=20)break;
    }
    return options;
  }
  function renderResults(){
    results.replaceChildren();
    if(getParticipants().length>=maxLocations){const li=document.createElement('li');li.className='clock-no-results';li.textContent=`Maximum ${maxLocations} meeting locations reached. Remove one to add another.`;results.append(li);return}
    for(const choice of resultsList()){
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='clock-result';
      const cityLabel=choice.region?`${choice.name}, ${choice.region}, ${choice.countryName||choice.country}`:choice.name;
      button.textContent=`${cityLabel} · ${choice.zone}${choice.unavailable?' · Time zone already shown':''}`;
      button.setAttribute('aria-label',`Add ${cityLabel} clock and meeting location`);
      if(choice.unavailable){button.disabled=true;button.title='This time zone is already represented by an existing meeting location';}
      button.addEventListener('click',()=>{
        if(!choice.country){status.textContent=`Choose ${choice.name} in Meetings to confirm its holiday country first.`;return}
        const message=addLocation(choice.zone,choice.region?`${choice.name}, ${choice.region}`:choice.name,choice.country);
        if(message){status.textContent=message;return}
        status.textContent=`${choice.name} added to clocks and meetings.`;
        query.value='';setOpen(false);
      });li.append(button);results.append(li);
    }
    if(globalStatus&&query.value.trim().length>=2){const li=document.createElement('li');li.className='clock-no-results';li.textContent=globalStatus;li.setAttribute('role','status');results.append(li);}
    if(!results.children.length){const li=document.createElement('li');li.className='clock-no-results';li.textContent='No matching city or time zone. Try a city name followed by its full state or country name.';results.append(li)}
  }
  const directory=mountGlobalDirectory({addLocation,onAdded:()=>setOpen(false),maxLocations,getParticipants});
  function setOpen(open){if(toggle.disabled)open=false;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(open){renderResults();directory.onOpen();}else{resetSearch();if(!toggle.disabled)toggle.focus()}}
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  query.addEventListener('input',requestWorldwide);
  query.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}});
  render();return {paint,render};
}
