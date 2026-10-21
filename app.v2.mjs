/* TimeBridge UI controller — DOM and optional browser capabilities only. */
import { ZONE_KEYS, NAMES, localDay, localClock, formatTime, formatDate, formatRange, shortOffset, identifyDeviceZone, resolveWall, rankDay, addDay, parts, toICS, shareText, validDay } from './time-core.mjs';
import { COUNTRY_NAMES, inferCountry } from './country-map.mjs';
import { holidaysFor, holidayConflicts, requiredHolidayYears } from './holidays.mjs';
import { createVisitorClock } from './visitor-time.mjs';
const $ = id => document.getElementById(id);
const labels = { et:'🇺🇸 Eastern',ng:'🇳🇬 Nigeria',in:'🇮🇳 India' };
function el(tag,cls,txt){let node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node}
function zoneFromDevice(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch{return ''}}
const deviceZone=zoneFromDevice(),timeHome=identifyDeviceZone(deviceZone);
let visitorCountry=inferCountry(deviceZone);let home=null,visitorClock=null,liveContext='';
const regionCountry={et:'US',ng:'NG',in:'IN'};
function updateVisitor(){
  home=timeHome && visitorCountry===regionCountry[timeHome]?timeHome:null;
  visitorClock=home?null:createVisitorClock(deviceZone);
  $('base').value=home||$('base').value||'et';
  for(const k of ZONE_KEYS){$('card-'+k).classList.toggle('is-home',home===k);$('you-'+k).hidden=home!==k}
  $('card-local').hidden=!visitorClock;
  $('clocks').classList.toggle('has-local',Boolean(visitorClock));
  if(visitorClock)$('card-local').setAttribute('aria-label',`Your local time in ${deviceZone}`);
  liveContext=visitorClock?`Live times · Your device time zone: ${deviceZone}`:home?'Live times · updates automatically':'Live times · Eastern reference (device time zone unavailable)';
  $('clock-context').textContent=liveContext;
}
$('base').value=timeHome||'et';
updateVisitor();
let theme='light';try{theme=localStorage.getItem('timebridge-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{theme=window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'}
function showTheme(){document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'☀ Light':'☾ Dark';$('theme').setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`);document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#111315':'#f8f7f4'}
showTheme();$('theme').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';try{localStorage.setItem('timebridge-theme',theme)}catch{}showTheme()});
let selected=null,selectedChoice=0,displayedSlots=[];
function pickerFrom(ms){let p=parts(ms,$('base').value);$('day').value=`${p.year}-${p.month}-${p.day}`;$('time').value=`${p.hour}:${p.minute}`;updateRepeat()}
function updateRepeat(){const day=$('day').value,time=$('time').value,zone=$('base').value;let options=resolveWall(day,time,zone);$('repeat-wrap').hidden=options.length!==2;if(options.length===2){$('repeat').value=String(Math.min(selectedChoice,1))}else{selectedChoice=0;$('repeat').value='0'}return options}
function paintClocks(ms){for(const z of ZONE_KEYS){$('clock-'+z).textContent=formatTime(ms,z);$('date-'+z).textContent=formatDate(ms,z)}$('zone-et').textContent=shortOffset(ms,'et');if(visitorClock){const local=visitorClock.at(ms);$('clock-local').textContent=local.time;$('date-local').textContent=local.date;$('zone-local').textContent=local.zoneLabel}}
function rangeCells(slot){let grid=el('div','times');for(let zone of ZONE_KEYS){let cell=el('div');cell.append(el('div','meeting-location',labels[zone]));cell.append(el('div','meeting-time',`${formatTime(slot.ms,zone)} – ${formatTime(slot.ms+slot.duration*60000,zone)}`));cell.append(el('div','meeting-date',localDay(slot.ms,zone)===localDay(slot.ms+slot.duration*60000,zone)?formatDate(slot.ms,zone):`${formatDate(slot.ms,zone)} → ${formatDate(slot.ms+slot.duration*60000,zone)}`));grid.append(cell)}return grid}
function explanation(slot){const compromises=[];for(let z of ZONE_KEYS){let q=slot.values[z];if(q.early)compromises.push(`${NAMES[z]} joins early`);if(q.late)compromises.push(`${NAMES[z]} joins in the evening`)}return compromises.length?compromises.join(' · ')+'.':'All participants are within 9 AM–6 PM local working hours.'}
function feedback(text){$('feedback').textContent=text}
async function writeClipboard(text){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true}catch{}}let field=el('textarea');field.value=text;field.setAttribute('aria-label','Text to copy');field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let worked=false;try{worked=document.execCommand('copy')}catch{}field.remove();return worked}
function meetingURL(slot){let u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('at',String(slot.ms));return u.toString()}
async function copyTimes(slot){let text=shareText(slot);if(visitorClock)text=text.replace('Please confirm your availability.',`Local (${visitorClock.timeZone}): ${visitorClock.rangeText(slot.ms,slot.duration)}\nPlease confirm your availability.`);let ok=await writeClipboard(text);feedback(ok?'Meeting times copied.':'Could not copy automatically. Select and copy the meeting times from the card.')}
async function copyLink(slot){if(!/^https?:$/.test(location.protocol)){feedback('A shareable web link becomes available after deployment. Use Copy times for now.');return}let ok=await writeClipboard(meetingURL(slot));feedback(ok?'Shareable link copied.':'Copy failed. Please use your browser address bar.')}
function addCalendar(slot){let file=new Blob([toICS(slot)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(file),a=el('a');a.href=url;a.download='TimeBridge-meeting.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback('Calendar file downloaded. Import it and confirm attendees before sending.')}
function actionButton(txt,fn,primary=false){let b=el('button','button button-small'+(primary?' button-primary':''),txt);b.type='button';b.addEventListener('click',fn);return b}
function card(slot,best,index){let c=el('article',best?'best-card':'other-card');let head=el('div','best-head');head.append(el('strong','',best?($('priority').value==='fair'?'Best compromise':'Best matching time'):`Option ${index+1}`));if(best)head.append(el('span','badge','Recommended'));c.append(head,rangeCells(slot));if(visitorClock)c.append(el('p','visitor-conversion',`Local in ${visitorClock.name}: ${visitorClock.rangeText(slot.ms,slot.duration)}`));c.append(el('p','explanation',explanation(slot)));const actions=el('div','actions');actions.append(actionButton('Copy times',()=>copyTimes(slot),best),actionButton('Add to calendar',()=>addCalendar(slot)));if(/^https?:$/.test(location.protocol))actions.append(actionButton('Copy link',()=>copyLink(slot)));c.append(actions);return c}
const holidayStore=new Map();
let plannerRevision=0,calendarRevision=0;
function plannerPlaces(){return [['US','United States'],['NG','Nigeria'],['IN','India'],...(visitorCountry&&!['US','NG','IN'].includes(visitorCountry)?[[visitorCountry,COUNTRY_NAMES[visitorCountry]||visitorCountry]]:[])];}
function neededPlannerYears(){
  const start=selected===null?Date.now():selected;
  return requiredHolidayYears(start-3*86400000,selected===null?50:5);
}
async function retrieveHolidayData(countries,years){
  const items=await Promise.all(countries.flatMap(([code])=>years.map(async year=>({code,year,data:await holidaysFor(code,year)}))));
  for(const {code,year,data} of items)holidayStore.set(`${code}-${year}`,data);
}
function allConflict(slot){return holidayConflicts(slot,holidayStore,visitorClock?deviceZone:null,visitorCountry)}
function chosenMeeting(){
  const zone=$('base').value,duration=Number($('length').value),preference=$('priority').value,after=Date.now();
  const start=selected===null?localDay(after,zone):localDay(selected,zone),days=selected===null?45:1;
  let result={day:start,slots:[]},lastConflict=[];
  for(let i=0;i<days;i++){
    const day=addDay(start,i),candidate=rankDay(day,{zone,duration,preference,after});
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
  if(!visitorCountry){$('recommend-date').textContent='Country confirmation needed';showNoRecommendations('Select your country in the Public holiday calendar section to verify holiday-safe meetings.');return;}
  try{
    await retrieveHolidayData(plannerPlaces(),neededPlannerYears());
    if(revision!==plannerRevision)return;
    const result=chosenMeeting();
    const z=$('base').value,a=$('best'),others=$('more');a.replaceChildren();others.replaceChildren();displayedSlots=result.slots;
    $('recommend-date').textContent=(selected===null?'Next holiday-free weekday: ':'Selected date: ')+new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(result.day+'T12:00:00Z'))+` · ${NAMES[z]} calendar`;
    if(!result.slots.length){
      const unique=[...new Map(result.conflicts.map(c=>[c.country+'-'+c.day,c])).values()].slice(0,4);
      showNoRecommendations(unique.length?'No recommendation: public holiday conflict ('+unique.map(c=>`${COUNTRY_NAMES[c.country]||c.country}, ${c.day} — ${c.name}`).join('; ')+'). Choose another date or press Now.':'No future weekday meeting time available within the next 45 days under working-hour constraints.');return;
    }
    a.append(card(result.slots[0],true,0));for(let i=1;i<result.slots.length;i++)others.append(card(result.slots[i],false,i));
    $('alternatives').hidden=result.slots.length<2;$('alternatives').querySelector('summary').textContent=`See ${result.slots.length-1} other meeting time${result.slots.length===2?'':'s'}`;
  }catch(e){if(revision!==plannerRevision)return;$('recommend-date').textContent='Holiday verification unavailable';showNoRecommendations('No recommendation shown because public holidays could not be checked. '+String(e.message)+'. Please retry when data is available.');}
}
function addCalendarPanel(country,name,data,year){
  const card=el('details','holiday-group');card.open=false;
  const summary=el('summary');summary.append(document.createTextNode(name));
  summary.append(el('span','holiday-count',`${data.length} listed`));card.append(summary);
  const list=el('ul','holiday-list');
  for(const h of data){const li=el('li');const date=el('time','',new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(h.date+'T12:00:00Z')));date.dateTime=h.date;
    const span=el('span','',h.name);if(h.regional)span.append(el('span','holiday-note','· Regional'));li.append(date,span);list.append(li)}
  card.append(list);return card;
}
async function renderHolidayYear(){
  const myRevision=++calendarRevision,year=Number($('holiday-year').value),countries=plannerPlaces(),grid=$('holiday-grid');
  $('holiday-status').textContent=`Retrieving ${year} public holidays…`;grid.replaceChildren();
  if(!visitorCountry){$('holiday-status').textContent='Choose a visitor country to complete the holiday calendar.';return;}
  try{await retrieveHolidayData(countries,[year]);if(myRevision!==calendarRevision)return;
    for(const [country,name] of countries)grid.append(addCalendarPanel(country,name,holidayStore.get(`${country}-${year}`),year));
    $('holiday-status').textContent=`${year}: ${countries.length} holiday calendars ready. All recorded public holiday dates are excluded from meeting recommendations.`;
  }catch(e){if(myRevision!==calendarRevision)return;$('holiday-status').textContent='Holiday data unavailable: '+e.message+'. Recommendations are blocked until verification succeeds.';}
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
$('now').addEventListener('click',showCurrent);$('length').addEventListener('change',paintRecommendations);$('priority').addEventListener('change',paintRecommendations);$('base').addEventListener('change',()=>{pickerFrom(selected===null?Date.now():selected);paintRecommendations()});for(const id of ['day','time'])$(id).addEventListener('change',()=>{selectedChoice=0;updateRepeat()});$('repeat').addEventListener('change',e=>{selectedChoice=Number(e.target.value)});$('apply').addEventListener('click',apply);
/* A link carries one unambiguous UTC timestamp; no personal data or credentials. */
try{const params=new URLSearchParams(location.search),param=params.get('at');if(param!==null&&/^\d{13}$/.test(param)){const ms=Number(param);if(Number.isFinite(ms)&&ms>=0&&ms<=4102444800000){selected=ms;$('clock-context').textContent='Shared date and time · not live'}}}catch{}
if(selected!==null){pickerFrom(selected);paintClocks(selected);paintRecommendations()}else showCurrent();
/* Live clocks are cheap; avoid expensive planner reranking on each tick. */
setInterval(()=>{if(selected===null){paintClocks(Date.now());/* New day or elapsed suggestions: update without user input */ if(displayedSlots[0]&&displayedSlots[0].ms<Date.now()+15*60000)paintRecommendations()}},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&selected===null){paintClocks(Date.now());paintRecommendations()}});
