/* TimeBridge v2.5: independently selected meeting participants and their working windows. */
import {formatZoneDay} from './holidays.mjs';
export const PARTICIPANT_KEY='timebridge-participants-v25';
export const DEFAULT_PARTICIPANTS=[{zone:'America/New_York',name:'Eastern US',country:'US',start:'09:00',end:'18:00'},{zone:'Africa/Lagos',name:'Nigeria',country:'NG',start:'09:00',end:'18:00'},{zone:'Asia/Kolkata',name:'India',country:'IN',start:'09:00',end:'18:00'}];
export const MAX_PARTICIPANTS=8;
export function validZone(zone){try{return new Intl.DateTimeFormat('en-US',{timeZone:zone}).resolvedOptions().timeZone}catch{return null}}
export function cleanParticipants(raw){if(!Array.isArray(raw))return DEFAULT_PARTICIPANTS.map(x=>({...x}));const out=[],seen=new Set();for(const p of raw.slice(0,30)){const zone=validZone(p?.zone),start=p?.start,end=p?.end,country=p?.country;if(!zone||seen.has(zone)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||!/^([A-Z]{2})$/.test(country))continue;const a=mins(start),b=mins(end);if(b-a<30)continue;out.push({zone,name:String(p.name||zone).slice(0,60),country,start,end});seen.add(zone);if(out.length>=MAX_PARTICIPANTS)break}return out}
/* Explicit share links carry the selected team (never saved automatically on receipt).
 * The decoder validates shape, size and zones before it reaches the planner.
 */
export function encodeParticipantGroup(participants){
  const clean=cleanParticipants(participants);
  if(clean.length!==participants?.length)throw Error('Invalid participant group');
  return JSON.stringify(clean);
}
export function decodeParticipantGroup(raw){
  if(typeof raw!=='string'||raw.length>3000||!raw.length)return null;
  try{
    const data=JSON.parse(raw);
    if(!Array.isArray(data)||data.length<1||data.length>MAX_PARTICIPANTS)return null;
    const clean=cleanParticipants(data);
    return clean.length===data.length?clean:null;
  }catch{return null}
}
export function mins(s){const [h,m]=s.split(':').map(Number);return h*60+m}
const dtf=new Map();function fmt(zone,options){const key=zone+JSON.stringify(options);if(!dtf.has(key))dtf.set(key,new Intl.DateTimeFormat('en-US',{timeZone:zone,...options}));return dtf.get(key)}
export function localParts(ms,zone){return Object.fromEntries(fmt(zone,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))}
export function participantQuality(ms,duration,p){const a=localParts(ms,p.zone),b=localParts(ms+duration*60000,p.zone);const day=`${a.year}-${a.month}-${a.day}`,endDay=`${b.year}-${b.month}-${b.day}`;const weekends=p.country==='SA'?['Fri','Sat']:['Sat','Sun'];if(day!==endDay||weekends.includes(a.weekday)||weekends.includes(b.weekday))return null;const start=Number(a.hour)*60+Number(a.minute),end=Number(b.hour)*60+Number(b.minute);// Treat selected hours as the desired window; retain a humane default outer bound,
// but allow explicitly chosen early/late hours beyond 07:00–21:00.
const hardStart=Math.min(420,mins(p.start)),hardEnd=Math.max(1260,mins(p.end));
if(end<start||start<hardStart||end>hardEnd)return null;const early=Math.max(0,mins(p.start)-start),late=Math.max(0,end-mins(p.end));return {penalty:early+late,early,late,normal:early===0&&late===0}}
export function scoreMeeting(ms,duration,participants,{preference='fair'}={}){if(!participants.length)return null;const values=participants.map(p=>participantQuality(ms,duration,p));if(values.some(v=>v===null))return null;const penalties=values.map(v=>v.penalty),maximum=Math.max(...penalties),total=penalties.reduce((a,b)=>a+b,0);const normalCount=values.filter(v=>v.normal).length;const fit=Math.max(0,Math.min(100,Math.round(100-maximum*.25-total*.08)));return {ms,duration,values,score:maximum*4+total,fit,normalCount,maxOutsideMinutes:maximum,totalOutsideMinutes:total}}
export function rankMeetingDay(day,{participants,duration=60,after=Date.now(),noticeMinutes=15,preference='fair'}={}){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!participants?.length||![30,60,90].includes(duration)||!['fair','earliest','strict'].includes(preference))return [];const start=Date.parse(day+'T00:00:00Z');if(!Number.isFinite(start))return [];// Anchor candidate minutes to the first participant's local half-hour grid.
// This matters for UTC+05:45 (Kathmandu), UTC+12:45 (Chatham), etc.
const localMinute=Number(localParts(start,participants[0].zone).minute);
const alignment=((30-localMinute%30)%30)*60000;
const options=[];for(let n=-1;n<=2;n++)for(let i=0;i<48;i++){const ms=start+n*86400000+i*1800000+alignment;if(ms<after+noticeMinutes*60000||formatZoneDay(ms,participants[0].zone)!==day)continue;const score=scoreMeeting(ms,duration,participants);if(score && (preference!=='strict'||score.normalCount===participants.length))options.push(score)}options.sort((a,b)=>preference==='earliest'?(a.ms-b.ms):(a.score-b.score||a.ms-b.ms));const selected=[];for(const s of options){if(selected.some(x=>Math.abs(x.ms-s.ms)<duration*60000))continue;selected.push(s);if(selected.length===3)break}return selected}
export function participantHolidayConflicts(slot,participants,calendars){const conflicts=[];for(const p of participants){const start=formatZoneDay(slot.ms,p.zone),end=formatZoneDay(slot.ms+slot.duration*60000,p.zone);for(const day of new Set([start,end])){const holidays=calendars.get(`${p.country}-${day.slice(0,4)}`);if(!holidays)throw Error(`Holiday data missing for ${p.country} ${day.slice(0,4)}`);for(const h of holidays)if(h.date===day)conflicts.push({country:p.country,day,name:h.name,regional:h.regional})}}return conflicts}
export function meetingText(slot,participants){const date=new Date(slot.ms),end=new Date(slot.ms+slot.duration*60000);return ['Proposed meeting · TimeBridge',...participants.map(p=>{const f=fmt(p.zone,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});return `${p.name}: ${f.format(date)} – ${f.format(end)} (${p.zone})`;}),'Please confirm your availability.'].join('\n')}
