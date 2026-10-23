/* Shared location picker & world clock rendering for v2.5.1.
   Meeting participants are the source of truth; the local reference remains independent. */
import { ZONES, NAMES } from './time-core.mjs';
import { searchClockZones, makeClockFormatter, canonicalZone } from './custom-clocks.mjs';
import { inferCountry } from './country-map.mjs';
const DEFAULT_CHOICES=[{zone:ZONES.et,name:NAMES.et,country:'US'},
  {zone:ZONES.ng,name:NAMES.ng,country:'NG'},
  {zone:ZONES.in,name:NAMES.in,country:'IN'}];
const sharedName=(zone)=>zone.split('/').at(-1).replaceAll('_',' ');
export function mountLinkedClocks({getInstant,deviceZone,getParticipants,addLocation,removeLocation,maxLocations=8}){
  const $=id=>document.getElementById(id),toggle=$('clock-add-toggle'),panel=$('clock-add-panel'),
    query=$('clock-search'),results=$('clock-results'),grid=$('extra-clocks'),
    count=$('extra-clock-count'),status=$('clock-add-status'),limitNote=$('clock-add-limit');
  let cards=[];const formatterCache=new Map();
  function paint(ms){for(const {fmt,time,date,abbr} of cards){const v=fmt(ms);time.textContent=v.time;date.textContent=v.date;abbr.textContent=v.abbreviation}}
  function render(){
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
      const article=document.createElement('article');article.className='clock-card extra-clock-card';
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
    paint(getInstant());renderResults();
  }
  function resultsList(){
    const stored=getParticipants();const lower=query.value.trim().toLowerCase();
    const defaults=DEFAULT_CHOICES.filter(d=>!stored.some(p=>canonicalZone(p.zone)===canonicalZone(d.zone)))
      .filter(d=>!lower||d.name.toLowerCase().includes(lower)||d.zone.toLowerCase().includes(lower));
    const usual=searchClockZones(query.value,[],deviceZone,18)
      .filter(choice=>!stored.some(p=>p.zone===canonicalZone(choice.zone)))
      .map(({zone,name})=>({zone,name,country:inferCountry(zone)}));
    const seen=new Set();const options=[];
    for(const choice of [...defaults,...usual]){
      const zone=canonicalZone(choice.zone);if(!zone||seen.has(zone))continue;
      seen.add(zone);options.push({...choice,zone});if(options.length>=10)break;
    }
    return options;
  }
  function renderResults(){
    results.replaceChildren();
    if(getParticipants().length>=maxLocations){const li=document.createElement('li');li.className='clock-no-results';li.textContent=`Maximum ${maxLocations} meeting locations reached. Remove one to add another.`;results.append(li);return}
    for(const choice of resultsList()){
      const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='clock-result';
      button.textContent=`${choice.name} · ${choice.zone}`;button.setAttribute('aria-label',`Add ${choice.name} clock and meeting location`);
      button.addEventListener('click',()=>{
        if(!choice.country){status.textContent=`Choose ${choice.name} in Meetings to confirm its holiday country first.`;return}
        const message=addLocation(choice.zone,choice.name,choice.country);
        if(message){status.textContent=message;return}
        status.textContent=`${choice.name} added to clocks and meetings.`;
        query.value='';setOpen(false);
      });li.append(button);results.append(li);
    }
    if(!results.children.length){const li=document.createElement('li');li.className='clock-no-results';li.textContent='No matching available time zones.';results.append(li)}
  }
  function setOpen(open){if(toggle.disabled)open=false;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open){renderResults();query.focus()}else if(!toggle.disabled)toggle.focus()}
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  query.addEventListener('input',renderResults);
  query.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}});
  render();return {paint,render};
}
