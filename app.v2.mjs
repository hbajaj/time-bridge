/* TimeBridge UI controller — DOM and optional browser capabilities only. */
import { ZONES, ZONE_KEYS, NAMES, localDay, localClock, formatTime, formatDate, formatRange, shortOffset, identifyDeviceZone, resolveWall, rankDay, addDay, parts, toICS, shareText, validDay } from './time-core.mjs';
import { COUNTRY_NAMES, inferCountry } from './country-map.mjs';
import { holidaysFor, holidayInfo, holidayConflicts, requiredHolidayYears, formatZoneDay } from './holidays.mjs';
import { createVisitorClock } from './visitor-time.mjs';
import { initTabs } from './tabs.mjs';
import { mountLinkedClocks } from './linked-clocks.mjs';
import { DEFAULT_PARTICIPANTS, PARTICIPANT_KEY, MAX_PARTICIPANTS, cleanParticipants, rankMeetingDay, participantHolidayConflicts, meetingText, encodeParticipantGroup, decodeParticipantGroup } from './planner-v25.mjs';
import {SAVED_TEAMS_KEY, parseSavedTeams, upsertSavedTeam, removeSavedTeam, findSavedTeam} from './teams-v3.mjs';
const $ = id => document.getElementById(id);
const labels = { et:'🇺🇸 Eastern',ng:'🇳🇬 Nigeria',in:'🇮🇳 India' };
function el(tag,cls,txt){let node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node}
function zoneFromDevice(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch{return ''}}
const deviceZone=zoneFromDevice(),timeHome=identifyDeviceZone(deviceZone);
let visitorCountry=inferCountry(deviceZone);let home=null,visitorClock=null,liveContext='';
const regionCountry={et:'US',ng:'NG',in:'IN'};
const canonical=zone=>{try{return new Intl.DateTimeFormat('en-US',{timeZone:zone}).resolvedOptions().timeZone}catch{return ''}};
const sameZone=(a,b)=>canonical(a)===canonical(b);
// One list is authoritative for World Clocks, Meeting participants and holiday filtering.
// Preserve existing v2.5 participant preferences. Legacy clock visibility is migrated only
// when no participant selection has ever been saved.
let participants=DEFAULT_PARTICIPANTS.map(p=>({...p}));
try {
  const raw=localStorage.getItem(PARTICIPANT_KEY);
  if(raw!==null) participants=cleanParticipants(JSON.parse(raw));
  else {
    const prior=JSON.parse(localStorage.getItem('timebridge-visible-default-clocks-v25'));
    if(prior && typeof prior==='object') participants=participants.filter(p=>{
      const id=ZONE_KEYS.find(k=>ZONES[k]===p.zone);
      return id===undefined || prior[id]!==false;
    });
  }
} catch {}
// Explicit shared links display their meeting group without overwriting local settings.
try{const shared=decodeParticipantGroup(new URLSearchParams(location.search).get('team'));if(shared)participants=shared}catch{}
function saveParticipants(){try{localStorage.setItem(PARTICIPANT_KEY,JSON.stringify(participants))}catch{}}
function addLocation(zone,name,country){
  let canonical;
  try{canonical=new Intl.DateTimeFormat('en-US',{timeZone:zone}).resolvedOptions().timeZone}catch{return 'Invalid time zone.'}
  if(participants.length>=MAX_PARTICIPANTS)return `Maximum ${MAX_PARTICIPANTS} meeting locations.`;
  if(participants.some(p=>sameZone(p.zone,canonical)))return 'That location is already included.';
  if(!/^[A-Z]{2}$/.test(country||''))return 'Select a holiday country for this location in Meetings.';
  participants.push({zone:canonical,name:String(name||canonical).slice(0,60),country,start:'09:00',end:'18:00'});
  syncLocations();return '';
}
function removeLocation(zone){
  participants=participants.filter(p=>!sameZone(p.zone,zone));
  syncLocations();
}
function restoreDefaults(){
  participants=DEFAULT_PARTICIPANTS.map(p=>({...p}));
  syncLocations();
}
function renderClockVisibility(){
  for(const k of ZONE_KEYS) $('card-'+k).hidden=!participants.some(p=>sameZone(p.zone,ZONES[k]));
  updateVisitor();
}
function syncLocations(){
  saveParticipants();
  renderClockVisibility();
  renderParticipants();
  customClocks.render();
  refreshPlanning();
}
function refreshPlanning(){renderHolidayYear();paintRecommendations()}
for(const k of ZONE_KEYS){
  const head=$('card-'+k).querySelector('.location');
  const button=el('button','fixed-clock-remove','Remove');
  button.type='button';button.setAttribute('aria-label',`Remove ${NAMES[k]} clock and meeting location`);
  button.addEventListener('click',()=>removeLocation(ZONES[k]));head.append(button);
}
$('clock-restore').addEventListener('click',restoreDefaults);
$('participant-reset').addEventListener('click',restoreDefaults);

/* Saved teams are opt-in, local-only and never overwrite saved teams when a link is opened. */
function storedTeams(){try{return parseSavedTeams(localStorage.getItem(SAVED_TEAMS_KEY))}catch{return []}}
function renderSavedTeams(selection=''){
  const select=$('saved-team-select');select.replaceChildren();
  const intro=el('option','','Select a saved team…');intro.value='';select.append(intro);
  for(const item of storedTeams()){const opt=el('option','',item.name);opt.value=item.name;select.append(opt)}
  select.value=selection;
  const hasSelection=Boolean(select.value);$('team-load').disabled=!hasSelection;$('team-delete').disabled=!hasSelection;
}
function savedStatus(message){$('saved-team-status').textContent=message}
$('saved-team-select').addEventListener('change',()=>renderSavedTeams($('saved-team-select').value));
$('team-save').addEventListener('click',()=>{
  try{
    const next=upsertSavedTeam(storedTeams(),$('team-name').value,participants);
    localStorage.setItem(SAVED_TEAMS_KEY,JSON.stringify(next));
    renderSavedTeams(next[0].name);savedStatus(`Team “${next[0].name}” saved on this device.`);
    $('team-name').value='';
  }catch(error){savedStatus(error.message||'Unable to save this team. Check browser storage.');}
});
$('team-load').addEventListener('click',()=>{
  const name=$('saved-team-select').value,selectedTeam=findSavedTeam(storedTeams(),name);
  if(!selectedTeam){savedStatus('Choose a saved team first.');return}
  participants=selectedTeam;syncLocations();savedStatus(`Loaded “${name}” in World Clocks and Meetings.`);
});
$('team-delete').addEventListener('click',()=>{
  const name=$('saved-team-select').value;if(!name)return;
  try{localStorage.setItem(SAVED_TEAMS_KEY,JSON.stringify(removeSavedTeam(storedTeams(),name)));
    renderSavedTeams();savedStatus(`Deleted saved team “${name}”. Current meeting locations were not changed.`);
  }catch{savedStatus('Unable to delete saved team in this browser.');}
});
renderSavedTeams();

function formatHours(clock){
  const [h,m]=clock.split(':').map(Number);
  return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h>=12?'PM':'AM'}`;
}
function refreshParticipantLimit(){
  const full=participants.length>=MAX_PARTICIPANTS;
  $('participant-add').disabled=full;
  $('participant-limit').hidden=!full;
}
function renderParticipants(){
  const list=$('participant-list');list.replaceChildren();
  for(const p of participants){
    const row=el('div','participant-item'),label=el('strong','participant-name',p.name);
    const disclosure=el('details','participant-hours-disclosure');
    const summary=el('summary','participant-hours-summary');
    summary.setAttribute('aria-label',`${p.name}: ${formatHours(p.start)} to ${formatHours(p.end)}. Click to change working hours`);
    const timeLabel=el('span','participant-time-summary',`${formatHours(p.start)}–${formatHours(p.end)}`);
    const hint=el('span','participant-change','Change');summary.append(timeLabel,hint);disclosure.append(summary);
    const editor=el('div','participant-hours-editor');
    for(const field of ['start','end']){
      const wrap=el('label','participant-hour-field');
      wrap.append(el('span','',field==='start'?'From':'To'));
      const input=el('input');input.type='time';input.value=p[field];
      input.setAttribute('aria-label',`${p.name} working ${field}`);
      input.addEventListener('change',()=>{
        const previous=p[field];p[field]=input.value;
        if(!cleanParticipants([p]).length){
          p[field]=previous;input.value=previous;
          $('participant-status').textContent='Working hours need at least a 30-minute same-day window.';
          return;
        }
        timeLabel.textContent=`${formatHours(p.start)}–${formatHours(p.end)}`;
        summary.setAttribute('aria-label',`${p.name}: ${formatHours(p.start)} to ${formatHours(p.end)}. Click to change working hours`);
        saveParticipants();refreshPlanning();
      });wrap.append(input);editor.append(wrap);
    }
    const done=el('button','button participant-done','Done');done.type='button';
    done.addEventListener('click',()=>{disclosure.open=false;summary.focus()});
    editor.append(done);disclosure.append(editor);
    const remove=el('button','participant-remove','Remove');remove.type='button';
    remove.setAttribute('aria-label',`Remove ${p.name} participant`);
    remove.addEventListener('click',()=>removeLocation(p.zone));
    row.append(label,disclosure,remove);list.append(row);
  }
  // Only one inline editor expands at once, leaving the rest of the list compact.
  list.querySelectorAll('details.participant-hours-disclosure').forEach(details=>details.addEventListener('toggle',()=>{
    if(!details.open)return;
    for(const peer of list.querySelectorAll('details.participant-hours-disclosure[open]'))if(peer!==details)peer.open=false;
  }));
  $('participant-status').textContent=participants.length?`${participants.length} participating location${participants.length===1?'':'s'}; only these affect recommendations.`:'Add at least one participant to get meeting recommendations.';
  refreshParticipantLimit();
}
const zoneSelect=$('participant-zone'),countrySelect=$('participant-country');
const featured=[['Eastern US','America/New_York'],['Nigeria','Africa/Lagos'],['India','Asia/Kolkata'],['California','America/Los_Angeles'],['London','Europe/London'],['Singapore','Asia/Singapore'],['Dubai','Asia/Dubai'],['Tokyo','Asia/Tokyo'],['Sydney','Australia/Sydney'],['Toronto','America/Toronto'],['Paris','Europe/Paris'],['Berlin','Europe/Berlin'],['Kathmandu','Asia/Kathmandu'],['Auckland','Pacific/Auckland']];
for(const [name,zone] of featured){const option=el('option','',name+' · '+zone);option.value=zone;zoneSelect.append(option)}for(const zone of (Intl.supportedValuesOf?.('timeZone')||[])){if(featured.some(x=>x[1]===zone))continue;const option=el('option','',zone.replaceAll('_',' '));option.value=zone;zoneSelect.append(option)}
const chooseHolidayCountry=el('option','','Select holiday country…');chooseHolidayCountry.value='';countrySelect.append(chooseHolidayCountry);
for(const [code,name] of Object.entries(COUNTRY_NAMES).sort((a,b)=>a[1].localeCompare(b[1]))){const option=el('option','',name);option.value=code;countrySelect.append(option)}
function selectCountry(){countrySelect.value=inferCountry(zoneSelect.value)||''}zoneSelect.addEventListener('change',selectCountry);selectCountry();
$('participant-add').addEventListener('click',()=>{const zone=zoneSelect.value;const result=addLocation(zone,featured.find(x=>x[1]===zone)?.[0]||zone,countrySelect.value);if(result)$('participant-status').textContent=result;});
renderParticipants();
function deviceClockLabel(zone){
  const canonicalZone=canonical(zone);
  const defaults={
    'America/New_York':'Eastern Time · Eastern US',
    'America/Detroit':'Eastern Time · Eastern US',
    'America/Toronto':'Eastern Time · Toronto',
    'Africa/Lagos':'West Africa Time · Nigeria',
    'Asia/Kolkata':'India Standard Time · India',
    'Asia/Calcutta':'India Standard Time · India',
    'America/Los_Angeles':'Pacific Time · California',
    'Europe/London':'UK Time · London'
  };
  if(defaults[canonicalZone])return defaults[canonicalZone];
  if(!canonicalZone)return 'Your device time';
  let generic='';
  try{generic=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longGeneric'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value||''}catch{}
  const city=zone.split('/').at(-1).replaceAll('_',' ');
  return generic && generic!==city?`${generic} · ${city}`:city;
}
function updateVisitor(){
  // The local reference never disappears—even after its location is removed.
  // It replaces, rather than duplicates, a matching participant clock card.
  home=timeHome||null;
  visitorClock=createVisitorClock(deviceZone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Etc/UTC');
  $('base').value=home||$('base').value||'et';
  $('card-local').hidden=false;
  $('local-clock-name').textContent=deviceClockLabel(deviceZone);
  $('card-local').setAttribute('aria-label',`Your time: ${deviceClockLabel(deviceZone)}`);
  $('clocks').classList.add('has-local');
  for(const k of ZONE_KEYS){
    $('card-'+k).hidden=home===k||!participants.some(p=>sameZone(p.zone,ZONES[k]));
    $('card-'+k).classList.remove('is-home');
    $('you-'+k).hidden=true;
  }
  liveContext=`Live times · Your time zone: ${deviceZone||'UTC'}`;
  $('clock-context').textContent=liveContext;
}
$('base').value=timeHome||'et';
updateVisitor();
let theme='light';try{theme=localStorage.getItem('timebridge-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{theme=window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'}
function showTheme(){document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'☀ Light':'☾ Dark';$('theme').setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`);document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#111315':'#f8f7f4'}
showTheme();$('theme').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';try{localStorage.setItem('timebridge-theme',theme)}catch{}showTheme()});
let selected=null,selectedChoice=0,displayedSlots=[];
const customClocks=mountLinkedClocks({
  getInstant:()=>selected===null?Date.now():selected,deviceZone,
  getParticipants:()=>participants, addLocation, removeLocation, maxLocations:MAX_PARTICIPANTS
});
renderClockVisibility();
function pickerFrom(ms){let p=parts(ms,$('base').value);$('day').value=`${p.year}-${p.month}-${p.day}`;$('time').value=`${p.hour}:${p.minute}`;updateRepeat()}
function updateRepeat(){const day=$('day').value,time=$('time').value,zone=$('base').value;let options=resolveWall(day,time,zone);$('repeat-wrap').hidden=options.length!==2;if(options.length===2){$('repeat').value=String(Math.min(selectedChoice,1))}else{selectedChoice=0;$('repeat').value='0'}return options}
function paintClocks(ms){for(const z of ZONE_KEYS){$('clock-'+z).textContent=formatTime(ms,z);$('date-'+z).textContent=formatDate(ms,z)}$('zone-et').textContent=shortOffset(ms,'et');if(visitorClock){const local=visitorClock.at(ms);$('clock-local').textContent=local.time;$('date-local').textContent=local.date;$('zone-local').textContent=local.zoneLabel}customClocks.paint(ms)}
function rangeCells(slot){let grid=el('div','times');for(const p of participants){const clock=createVisitorClock(p.zone),cell=el('div'),range=clock.rangeText(slot.ms,slot.duration);cell.append(el('div','meeting-location',p.name),el('div','meeting-time',range));grid.append(cell)}return grid}
function explanation(slot){const compromises=[];participants.forEach((p,i)=>{const q=slot.values[i];if(q.early)compromises.push(`${p.name} joins before preferred hours`);if(q.late)compromises.push(`${p.name} joins after preferred hours`)});return compromises.length?compromises.join(' · ')+'.':'All participants are within their preferred working hours.'}
function feedback(text){$('feedback').textContent=text}
async function writeClipboard(text){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true}catch{}}let field=el('textarea');field.value=text;field.setAttribute('aria-label','Text to copy');field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let worked=false;try{worked=document.execCommand('copy')}catch{}field.remove();return worked}
function meetingURL(slot){let u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('at',String(slot.ms));u.searchParams.set('team',encodeParticipantGroup(participants));return u.toString()}
async function copyTimes(slot){let text=meetingText(slot,participants);if(visitorClock)text=text.replace('Please confirm your availability.',`Local (${visitorClock.timeZone}): ${visitorClock.rangeText(slot.ms,slot.duration)}\nPlease confirm your availability.`);let ok=await writeClipboard(text);feedback(ok?'Meeting times copied.':'Could not copy automatically. Select and copy the meeting times from the card.')}
async function copyLink(slot){if(!/^https?:$/.test(location.protocol)){feedback('A shareable web link becomes available after deployment. Use Copy times for now.');return}let ok=await writeClipboard(meetingURL(slot));feedback(ok?'Shareable link copied.':'Copy failed. Please use your browser address bar.')}
function addCalendar(slot){let file=new Blob([toICS(slot)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(file),a=el('a');a.href=url;a.download='TimeBridge-meeting.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback('Calendar file downloaded. Import it and confirm attendees before sending.')}
function actionButton(txt,fn,primary=false){let b=el('button','button button-small'+(primary?' button-primary':''),txt);b.type='button';b.addEventListener('click',fn);return b}
function card(slot,best,index){let c=el('article',best?'best-card':'other-card');let head=el('div','best-head');head.append(el('strong','',best?($('priority').value==='fair'?'Best compromise':$('priority').value==='earliest'?'Earliest available':'Within working hours'):`Option ${index+1}`));if(best)head.append(el('span','badge','Recommended'));c.append(head,rangeCells(slot));const fit=el('p','fit-summary',`Working-hours fit: ${slot.fit}/100 · ${slot.normalCount}/${participants.length} within preferred hours`);fit.setAttribute('aria-label',`Estimated working-hours fit ${slot.fit} out of 100; ${slot.normalCount} of ${participants.length} participants within preferred hours. Illustrative scheduling heuristic, not a statistical probability.`);c.append(fit);if(visitorClock)c.append(el('p','visitor-conversion',`Local in ${visitorClock.name}: ${visitorClock.rangeText(slot.ms,slot.duration)}`));c.append(el('p','explanation',explanation(slot)));const actions=el('div','actions');actions.append(actionButton('Copy times',()=>copyTimes(slot),best),actionButton('Add to calendar',()=>addCalendar(slot)));if(/^https?:$/.test(location.protocol))actions.append(actionButton('Copy link',()=>copyLink(slot)));c.append(actions);return c}
const holidayStore=new Map();
let plannerRevision=0,calendarRevision=0;
function plannerPlaces(){return [...new Set(participants.map(p=>p.country))].map(code=>[code,COUNTRY_NAMES[code]||code]);}
function neededPlannerYears(){
  const start=selected===null?Date.now():selected;
  return requiredHolidayYears(start-3*86400000,selected===null?50:5);
}
async function retrieveHolidayData(countries,years){
  const items=await Promise.all(countries.flatMap(([code])=>years.map(async year=>({code,year,data:await holidaysFor(code,year)}))));
  for(const {code,year,data} of items)holidayStore.set(`${code}-${year}`,data);
}
function allConflict(slot){return participantHolidayConflicts(slot,participants,holidayStore)}
function chosenMeeting(){
  const zone=$('base').value,duration=Number($('length').value),preference=$('priority').value,after=Date.now();
  const primary=participants[0]?.zone;if(!primary)return {day:'',slots:[],conflicts:[]};const start=selected===null?formatZoneDay(after,primary):formatZoneDay(selected,primary),days=selected===null?45:1;
  let result={day:start,slots:[]},lastConflict=[];
  for(let i=0;i<days;i++){
    const day=addDay(start,i),candidate=rankMeetingDay(day,{participants,duration,after,preference});
    const slots=candidate.filter(slot=>{const conflicts=allConflict(slot);if(conflicts.length)lastConflict.push(...conflicts);return conflicts.length===0});
    if(slots.length){result={day,slots};break;}
  }
  return {...result,conflicts:lastConflict};
}
function showNoRecommendations(reason){$('best').replaceChildren(el('p','empty',reason));$('more').replaceChildren();$('alternatives').hidden=true;displayedSlots=[];}
async function paintRecommendations(){
  const revision=++plannerRevision;
  $('recommend-date').textContent='Checking public holidays across all meeting locations…';
  showNoRecommendations('Validating holiday calendars before recommending a time.');
  feedback('');
  if(!participants.length){$('recommend-date').textContent='No meeting participants';showNoRecommendations('Add at least one meeting participant.');return;}
  try{
    await retrieveHolidayData(plannerPlaces(),neededPlannerYears());
    if(revision!==plannerRevision)return;
    const provisional=plannerPlaces().filter(([code])=>neededPlannerYears().some(year=>holidayInfo(code,year)?.completeness==='partial')).map(([,name])=>name);
    const result=chosenMeeting();
    const z=$('base').value,a=$('best'),others=$('more');a.replaceChildren();others.replaceChildren();displayedSlots=result.slots;
    $('recommend-date').textContent=(selected===null?'Next published-holiday-checked weekday: ':'Selected date: ')+new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(result.day+'T12:00:00Z'))+` · ${participants[0].name} calendar`+(provisional.length?` · Provisional calendar: ${provisional.join(', ')} has unannounced holidays. Confirm before booking.`:'');
    if(!result.slots.length){
      const unique=[...new Map(result.conflicts.map(c=>[c.country+'-'+c.day,c])).values()].slice(0,4);
      showNoRecommendations(unique.length?'No recommendation: public holiday conflict ('+unique.map(c=>`${COUNTRY_NAMES[c.country]||c.country}, ${c.day} — ${c.name}`).join('; ')+'). Choose another date or press Now.':'No future weekday meeting time available within the next 45 days under working-hour constraints.');return;
    }
    a.append(card(result.slots[0],true,0));for(let i=1;i<result.slots.length;i++)others.append(card(result.slots[i],false,i));
    $('alternatives').hidden=result.slots.length<2;$('alternatives').querySelector('summary').textContent=`See ${result.slots.length-1} other meeting time${result.slots.length===2?'':'s'}`;
  }catch(e){if(revision!==plannerRevision)return;$('recommend-date').textContent='Holiday verification unavailable';showNoRecommendations('A required holiday calendar could not be verified. No unverified recommendation will be shown. Try Now again, or check the Holidays tab for provider coverage.');}
}
function addCalendarPanel(country,name,data,year){
  const card=el('details','holiday-group');card.open=false;card.name='holiday-location';card.addEventListener('toggle',()=>{if(card.open){for(const peer of card.parentElement?.querySelectorAll('details.holiday-group[open]')||[]){if(peer!==card)peer.open=false}}});
  const summary=el('summary');summary.append(document.createTextNode(name));
  summary.append(el('span','holiday-count',`${data.length} listed`));card.append(summary);
  const info=holidayInfo(country,year);if(info){const note=el('p','fineprint holiday-provenance',`Source: ${info.source} · ${info.coverage}`);card.append(note)}
  const list=el('ul','holiday-list');
  for(const h of data){const li=el('li');const date=el('time','',new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(h.date+'T12:00:00Z')));date.dateTime=h.date;
    const span=el('span','',h.name);if(h.regional)span.append(el('span','holiday-note','· Regional'));li.append(date,span);list.append(li)}
  card.append(list);return card;
}
async function renderHolidayYear(){
  const myRevision=++calendarRevision,year=Number($('holiday-year').value),countries=plannerPlaces(),grid=$('holiday-grid');
  $('holiday-status').textContent=`Retrieving ${year} public holidays…`;grid.replaceChildren();
  if(!participants.length){$('holiday-status').textContent='Add a meeting participant to see relevant public holidays.';return;}
  try{await retrieveHolidayData(countries,[year]);if(myRevision!==calendarRevision)return;
    for(const [country,name] of countries)grid.append(addCalendarPanel(country,name,holidayStore.get(`${country}-${year}`),year));
    const partial=countries.filter(([code])=>holidayInfo(code,year)?.completeness==='partial').map(([,name])=>name);
    $('holiday-status').textContent=`${year}: ${countries.length} participating holiday calendars available. Published holidays are excluded.${partial.length?' Provisional: '+partial.join(', ')+' does not yet include unannounced Eid/Maulud closures.':''}${year===2026&&countries.some(([code])=>code==='IN')?' India coverage: central-government gazetted holidays; state and regional holidays may differ.':''}${([2026,2027].includes(year))&&countries.some(([code])=>code==='SA')?' Saudi Arabia coverage: conservative official sector closure dates; employers may differ.':''}`;
  }catch(e){if(myRevision!==calendarRevision)return;$('holiday-status').textContent='Holiday calendar unavailable. The app will not recommend a date until the selected locations can be verified. Try again later or remove an unavailable participant.';}
}
function initializeHolidays(){
  const year=new Date().getUTCFullYear();for(let i=-1;i<=2;i++){const opt=el('option','',String(year+i));opt.value=year+i;$('holiday-year').append(opt)}$('holiday-year').value=String(year);
  const initial=el('option','', 'Select country…');initial.value='';$('visitor-country').append(initial);
  for(const [code,name] of Object.entries(COUNTRY_NAMES).sort((a,b)=>a[1].localeCompare(b[1]))){const opt=el('option','',name);opt.value=code;$('visitor-country').append(opt)}
  $('visitor-country').value=visitorCountry;
  $('holiday-year').addEventListener('change',renderHolidayYear);
  $('visitor-country').addEventListener('change',()=>{visitorCountry=$('visitor-country').value;updateVisitor();paintClocks(selected===null?Date.now():selected);renderHolidayYear();paintRecommendations()});
  renderHolidayYear();
}
initializeHolidays();

function showCurrent(){selected=null;selectedChoice=0;const now=Date.now();paintClocks(now);pickerFrom(now);$('clock-context').textContent=liveContext;$('status').textContent='';paintRecommendations()}
function renderSelection(){const ms=selected===null?Date.now():selected;paintClocks(ms);if(selected===null)pickerFrom(ms);paintRecommendations()}
function apply(){let day=$('day').value,time=$('time').value,zone=$('base').value;let options=updateRepeat();if(!validDay(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){$('status').textContent='Select a valid date and time.';return}if(options.length===0){$('status').textContent='This local time does not exist because the clocks jump forward. Choose another time.';return}let index=options.length===2?Number($('repeat').value):0;selected=options[index];selectedChoice=index;paintClocks(selected);$('clock-context').textContent='Selected date and time · not live';$('status').textContent=options.length===2?`Showing the ${index===0?'first (daylight time)':'second (standard time)'} occurrence of this repeated hour.`:'Converted successfully.';paintRecommendations()}
$('now').addEventListener('click',showCurrent);$('meeting-now').addEventListener('click',showCurrent);$('length').addEventListener('change',paintRecommendations);$('priority').addEventListener('change',paintRecommendations);$('base').addEventListener('change',()=>{pickerFrom(selected===null?Date.now():selected);paintRecommendations()});for(const id of ['day','time'])$(id).addEventListener('change',()=>{selectedChoice=0;updateRepeat()});$('repeat').addEventListener('change',e=>{selectedChoice=Number(e.target.value)});$('apply').addEventListener('click',apply);
/* A link carries one unambiguous UTC timestamp; no personal data or credentials. */
try{const params=new URLSearchParams(location.search),param=params.get('at');if(param!==null&&/^\d{13}$/.test(param)){const ms=Number(param);if(Number.isFinite(ms)&&ms>=0&&ms<=4102444800000){selected=ms;$('clock-context').textContent='Shared date and time · not live'}}}catch{}
if(selected!==null){pickerFrom(selected);paintClocks(selected);paintRecommendations()}else showCurrent();
/* Live clocks are cheap; avoid expensive planner reranking on each tick. */
setInterval(()=>{if(selected===null){paintClocks(Date.now());/* New day or elapsed suggestions: update without user input */ if(displayedSlots[0]&&displayedSlots[0].ms<Date.now()+15*60000)paintRecommendations()}},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&selected===null){paintClocks(Date.now());paintRecommendations()}});

window.addEventListener('storage',event=>{
  if(event.key!==PARTICIPANT_KEY)return;
  try{participants=event.newValue===null?DEFAULT_PARTICIPANTS.map(p=>({...p})):cleanParticipants(JSON.parse(event.newValue));}catch{return;}
  renderClockVisibility();renderParticipants();customClocks.render();refreshPlanning();
});

/* Switch one logical workspace at a time; legacy time/holiday behavior stays intact. */
initTabs();
