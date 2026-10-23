import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from '../planner-v25.mjs';
import * as t from '../time-core.mjs';
import * as h from '../holidays.mjs';
import * as c from '../custom-clocks.mjs';
import * as tabs from '../tabs.mjs';
import {createVisitorClock} from '../visitor-time.mjs';
import {inferCountry, COUNTRY_NAMES} from '../country-map.mjs';
import handler from '../api/holidays.mjs';
let assertions=0;function check(fn){fn(); assertions++}
const at=(iso)=>Date.parse(iso);
const attendee=(zone,country,start='09:00',end='18:00')=>({zone,name:zone,country,start,end});
const D=JSON.parse(JSON.stringify(p.DEFAULT_PARTICIPANTS));

test('v2.5 participant normalization, invalid inputs, and limits',()=>{
 check(()=>assert.equal(p.cleanParticipants(null).length,3));
 check(()=>assert.deepEqual(p.cleanParticipants([]),[]));
 check(()=>assert.equal(p.cleanParticipants([D[0],D[0]]).length,1));
 check(()=>assert.equal(p.cleanParticipants([D[0],{...D[0],zone:'US/Eastern'}]).length,1));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],zone:'Invalid/Fake'}]).length,0));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],country:'USA'}]).length,0));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],start:'25:30'}]).length,0));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],end:'18:60'}]).length,0));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],start:'18:00',end:'09:00'}]).length,0));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],start:'09:00',end:'09:29'}]).length,0));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],start:'09:00',end:'09:30'}]).length,1));
 check(()=>assert.equal(p.cleanParticipants([{...D[0],name:'x'.repeat(200)}])[0].name.length,60));
 const zones=Intl.supportedValuesOf('timeZone').slice(0,20);
 check(()=>assert.equal(p.cleanParticipants(zones.map(zone=>attendee(zone,'US'))).length,8));
 check(()=>assert.equal(p.mins('00:00'),0));
 check(()=>assert.equal(p.mins('23:59'),1439));
});

test('global time zone conversions, daylight saving, calendar boundaries',()=>{
 const probes=[
 ['America/Los_Angeles','2026-01-15T18:00:00Z','10','00'],
 ['America/Los_Angeles','2026-07-15T17:00:00Z','10','00'],
 ['Europe/London','2026-01-15T12:00:00Z','12','00'],
 ['Europe/London','2026-07-15T12:00:00Z','13','00'],
 ['Asia/Kolkata','2026-04-15T12:00:00Z','17','30'],
 ['Asia/Kathmandu','2026-04-15T12:00:00Z','17','45'],
 ['Australia/Sydney','2026-01-15T12:00:00Z','23','00'],
 ['Australia/Sydney','2026-07-15T12:00:00Z','22','00'],
 ['Africa/Lagos','2026-07-15T12:00:00Z','13','00'],
 ['America/Phoenix','2026-07-15T12:00:00Z','05','00']
 ];
 for(const [zone,iso,hour,minute]of probes){const v=p.localParts(at(iso),zone);check(()=>assert.equal(v.hour,hour,zone));check(()=>assert.equal(v.minute,minute,zone))}
 for(const [zone,expected] of [['Europe/London','GB'],['Asia/Kathmandu','NP'],['Asia/Kolkata','IN'],['Africa/Lagos','NG'],['America/Los_Angeles','US']])check(()=>assert.equal(inferCountry(zone),expected));
 check(()=>assert.ok(COUNTRY_NAMES.GB));
 const years=[2025,2026,2027];
 for(const year of years)for(const zone of ['Europe/London','America/New_York','Asia/Kathmandu','Australia/Sydney']){
  const dt=at(`${year}-12-31T23:45:00Z`); const value=p.localParts(dt,zone);
  check(()=>assert.match(`${value.year}-${value.month}-${value.day}`,/^\d{4}-\d{2}-\d{2}$/));
 }
 const clock=createVisitorClock('Europe/London');
 check(()=>assert.ok(clock.at(at('2026-07-15T12:00:00Z')).zoneLabel.includes('BST')));
 check(()=>assert.ok(clock.at(at('2026-01-15T12:00:00Z')).zoneLabel.includes('GMT')));
 check(()=>assert.equal(createVisitorClock('Not/AZone'),null));
});

test('participant working-hour preferences, tolerance, DST and weekends',()=>{
 const fri=at('2026-10-23T12:00:00Z');
 check(()=>assert.equal(p.participantQuality(at('2026-10-24T14:00:00Z'),60,D[0]),null));
 check(()=>assert.equal(p.participantQuality(at('2026-10-25T14:00:00Z'),60,D[0]),null));
 check(()=>assert.notEqual(p.participantQuality(fri,60,D[0]),null));
 check(()=>assert.notEqual(p.participantQuality(at('2026-10-23T10:00:00Z'),60,{...D[0],start:'06:00',end:'14:00'}),null));
 check(()=>assert.equal(p.participantQuality(at('2026-10-23T10:00:00Z'),60,D[0]),null));
 check(()=>assert.notEqual(p.participantQuality(at('2026-10-23T21:00:00Z'),60,{...D[0],start:'09:00',end:'20:00'}),null));
 check(()=>assert.equal(p.participantQuality(at('2026-10-23T22:00:00Z'),60,D[0])?.normal,false));
 check(()=>assert.equal(p.scoreMeeting(fri,60,[]),null));
 check(()=>assert.equal(p.scoreMeeting(at('2026-10-24T12:00:00Z'),60,D),null));
 check(()=>assert.equal(p.scoreMeeting(fri,90,[D[0]])?.ms,fri));
 check(()=>assert.ok(p.scoreMeeting(fri,90,[D[0]])?.score>=0));
 check(()=>assert.equal(p.participantQuality(at('2026-10-23T23:45:00Z'),90,D[0]),null));
});

test('meeting candidates: sorting, primary-local alignment and intervals',()=>{
 check(()=>assert.deepEqual(p.rankMeetingDay('2026-10-23',{participants:[],after:0}),[]));
 check(()=>assert.deepEqual(p.rankMeetingDay('bad-date',{participants:D,after:0}),[]));
 check(()=>assert.deepEqual(p.rankMeetingDay('2026-10-23',{participants:D,duration:45,after:0}),[]));
 for(const zone of ['America/New_York','Europe/London','Asia/Kathmandu','Pacific/Chatham','Asia/Kolkata','Australia/Adelaide']){
  const country=inferCountry(zone)||'NZ';const person=attendee(zone,country);
  const slots=p.rankMeetingDay('2026-10-23',{participants:[person],after:0});
  check(()=>assert.ok(slots.length>0,zone));
  for(const slot of slots){const parts=p.localParts(slot.ms,zone);check(()=>assert.equal(Number(parts.minute)%30,0,`${zone} ${parts.minute}`));check(()=>assert.equal(parts.weekday,'Fri'));}
  for(let j=1;j<slots.length;j++){check(()=>assert.ok(slots[j].score>=slots[j-1].score,zone));check(()=>assert.ok(Math.abs(slots[j].ms-slots[j-1].ms)>=3600000,zone));}
 }
 for(const length of [30,60,90]){
  const slots=p.rankMeetingDay('2026-10-23',{participants:D,duration:length,after:0});
  check(()=>assert.ok(slots.length<=3));
  for(const slot of slots){check(()=>assert.equal(slot.duration,length));check(()=>assert.ok(slot.values.length===3));}
 }
 // More than 1-day offsets and a near-midnight candidate do not shift the anchor day.
 const kath=p.rankMeetingDay('2026-10-23',{participants:[attendee('Asia/Kathmandu','NP')],after:0});
 check(()=>assert.equal(p.localParts(kath[0].ms,'Asia/Kathmandu').day,'23'));
});

test('holiday parser, deduplication and strict fail-closed errors',()=>{
 const payload=[
 {date:'2026-11-26',name:'Thanksgiving',types:['Public'],countryCode:'US'},
 {date:'2026-11-26',name:'Thanksgiving',types:['Public'],countryCode:'US'},
 {date:'2026-07-03',name:'Regional',holidayTypes:['Public'],global:false,countryCode:'US'},
 {date:'2026-01-10',name:'Bank',types:['Bank'],countryCode:'US'},
 {date:'2026-01-11',name:'Elsewhere',types:['Public'],countryCode:'CA'},
 {date:'garbage',name:'Invalid',types:['Public'],countryCode:'US'}];
 const normalized=h.normalizeHolidays(payload,'US');
 check(()=>assert.equal(normalized.length,2));
 check(()=>assert.deepEqual(normalized.map(x=>x.date),['2026-07-03','2026-11-26']));
 check(()=>assert.equal(normalized[0].regional,true));
 check(()=>assert.throws(()=>h.normalizeHolidays([], 'US')));
 check(()=>assert.throws(()=>h.normalizeHolidays([{date:'2026-01-01',name:'Bank',types:['Bank']}],'US')));
 check(()=>assert.equal(h.formatZoneDay(at('2026-01-01T02:00:00Z'),'America/Los_Angeles'),'2025-12-31'));
 check(()=>assert.deepEqual(h.requiredHolidayYears(at('2026-12-25T12:00:00Z'),45),[2026,2027]));
 const slot={ms:at('2026-11-26T16:00:00Z'),duration:60};const calendars=new Map([['US-2026',normalized]]);
 check(()=>assert.equal(p.participantHolidayConflicts(slot,[D[0]],calendars).length,1));
 check(()=>assert.throws(()=>p.participantHolidayConflicts(slot,D,calendars),/Holiday data missing/));
 check(()=>assert.equal(p.participantHolidayConflicts(slot,[],new Map()).length,0));
 const ca=attendee('America/Los_Angeles','US');const jan={ms:at('2027-01-01T02:00:00Z'),duration:60};
 const crossYear=new Map([['US-2026',[{date:'2026-12-31',name:'Eve'}]],['US-2027',[{date:'2027-01-01',name:'Day'}]]]);
 check(()=>assert.equal(p.participantHolidayConflicts(jan,[ca],crossYear).length,1));
});

test('holiday API request errors and verified India central fallback',async()=>{
 const mockRes=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(x){this.statusCode=x;return this},json(payload){this.payload=payload;return this}});
 let res=mockRes();await handler({method:'POST',query:{}},res);
 check(()=>assert.equal(res.statusCode,405));
 res=mockRes();await handler({method:'GET',query:{country:'X!',year:2026}},res);
 check(()=>assert.equal(res.statusCode,400));
 res=mockRes();await handler({method:'GET',query:{country:'IN',year:2026}},res);
 check(()=>assert.equal(res.statusCode,200));
 check(()=>assert.equal(res.payload.length,17));
 check(()=>assert.ok(res.payload.some(x=>x.date==='2026-10-20')));
 check(()=>assert.equal(res.headers['X-Holiday-Coverage'],'India central-government gazetted dates only; state and regional holidays not complete'));
 const savedFetch=globalThis.fetch;try{
  globalThis.fetch=async()=>({ok:false,status:502});res=mockRes();await handler({method:'GET',query:{country:'NZ',year:2026}},res);
  check(()=>assert.equal(res.statusCode,503));
  let count=0;globalThis.fetch=async()=>{count++;if(count===1)return {ok:false,status:503};return {ok:true,json:async()=>[{date:'2026-12-25',name:'Christmas',types:['Public'],countryCode:'GB'}]};};
  res=mockRes();await handler({method:'GET',query:{country:'GB',year:2026}},res);
  check(()=>assert.equal(res.statusCode,200));check(()=>assert.equal(count,2));
 }finally{globalThis.fetch=savedFetch}
});

test('custom clock search, aliases, storage corruption, user zone and limits',()=>{
 check(()=>assert.equal(c.canonicalZone('America/Los_Angeles'),'America/Los_Angeles'));
 check(()=>assert.equal(c.canonicalZone('Bad/Zone'),null));
 check(()=>assert.equal(c.CLOCK_LIMIT,6));
 check(()=>assert.ok(c.searchClockZones('London',[],'America/New_York').some(x=>x.zone==='Europe/London')));
 check(()=>assert.ok(c.searchClockZones('PST',[],'America/New_York').some(x=>x.zone==='America/Los_Angeles')));
 check(()=>assert.ok(c.clockUnavailable('America/New_York',[],'Europe/London')));
 check(()=>assert.ok(c.clockUnavailable('Europe/London',[],'Europe/London')));
 check(()=>assert.ok(c.clockUnavailable('Europe/London',[{zone:'Europe/London'}],'Asia/Tokyo')));
 check(()=>assert.ok(!c.clockUnavailable('Europe/London',[],'Asia/Tokyo')));
 check(()=>assert.equal(c.searchClockZones('no-such-place-zzz').length,0));
 check(()=>assert.equal(c.cleanSavedClocks(null).length,0));
 check(()=>assert.equal(c.cleanSavedClocks([{zone:'Bad/Zone'}]).length,0));
 check(()=>assert.equal(c.cleanSavedClocks([{zone:'Europe/London'},{zone:'Europe/London'}]).length,1));
 check(()=>assert.equal(c.cleanSavedClocks([{zone:'Europe/London'}],'Europe/London').length,0));
 check(()=>assert.equal(c.readClockStorage({getItem(){return '{INVALID'}},'Asia/Kolkata').length,0));
 check(()=>assert.equal(c.makeClockFormatter('Europe/London')(at('2026-07-15T12:00:00Z')).time,'1:00 PM'));
 check(()=>assert.throws(()=>c.makeClockFormatter('Bad/Zone')));
});

test('tabs deep links and saved preference',()=>{
 check(()=>assert.equal(tabs.chooseInitialTab({}), 'clocks'));
 check(()=>assert.equal(tabs.chooseInitialTab({stored:'holidays'}),'holidays'));
 check(()=>assert.equal(tabs.chooseInitialTab({hash:'#meetings',stored:'clocks'}),'meetings'));
 check(()=>assert.equal(tabs.chooseInitialTab({search:'?tab=holidays'}),'clocks'));
 check(()=>assert.equal(tabs.chooseInitialTab({search:'?at=1792750000000',stored:'holidays'}),'meetings'));
 check(()=>assert.equal(tabs.chooseInitialTab({hash:'#bad'}),'clocks'));
});

test('legacy meeting conversion and ICS export safely work after customization',()=>{
 check(()=>assert.equal(t.validDay('2026-02-29'),false));
 check(()=>assert.equal(t.validDay('2028-02-29'),true));
 check(()=>assert.equal(t.resolveWall('2026-03-08','02:30','et').length,0));
 check(()=>assert.equal(t.resolveWall('2026-11-01','01:30','et').length,2));
 const slot={ms:at('2026-10-23T13:00:00Z'),duration:60};
 const ics=t.toICS(slot);
 check(()=>assert.ok(ics.includes('BEGIN:VCALENDAR')));
 check(()=>assert.ok(ics.includes('SUMMARY:TimeBridge global meeting')));
 check(()=>assert.ok(!ics.includes('Meeting across Eastern US, Nigeria and India')));
 check(()=>assert.ok(ics.includes('DTSTART:20261023T130000Z')));
 check(()=>assert.ok(ics.includes('DTEND:20261023T140000Z')));
 const text=p.meetingText(slot,[attendee('Europe/London','GB')]);
 check(()=>assert.ok(text.includes('Europe/London')));
 check(()=>assert.ok(!text.includes('Nigeria')));
});

test('randomized meeting invariants across zones and dates',()=>{
 const zones=['America/New_York','America/Los_Angeles','Europe/London','Europe/Berlin','Africa/Lagos','Asia/Kolkata','Asia/Kathmandu','Asia/Tokyo','Asia/Dubai','Australia/Sydney','Pacific/Auckland'];
 let checks=0;
 for(let seed=1;seed<=200;seed++){
  const day=String(1+seed%27).padStart(2,'0');const month=String(1+(seed*7)%12).padStart(2,'0');const date=`2026-${month}-${day}`;
  const n=seed%3+1,ps=[];
  for(let k=0;k<n;k++){const z=zones[(seed+k*3)%zones.length],country=inferCountry(z);ps.push(attendee(z,country))}
  const slots=p.rankMeetingDay(date,{participants:ps,after:0,duration:[30,60,90][seed%3]});
  check(()=>assert.ok(slots.length<=3));checks++;
  for(const s of slots){check(()=>assert.equal(p.localParts(s.ms,ps[0].zone).day,day));check(()=>assert.equal(Number(p.localParts(s.ms,ps[0].zone).minute)%30,0));check(()=>assert.ok(s.values.every(v=>v!==null)));checks+=3;}
 }
 console.log(`Property test: ${checks} checks`);
});

test('testing harness completed',()=>{console.log(`TOTAL ASSERTIONS: ${assertions}`)});

test('share links encode selected team, decode safely and reject unsafe payloads',()=>{
 const team=[D[0],attendee('Europe/London','GB','08:30','17:00')];
 const encoded=p.encodeParticipantGroup(team);
 check(()=>assert.equal(p.decodeParticipantGroup(encoded)?.length,2));
 check(()=>assert.equal(p.decodeParticipantGroup(encoded)?.[1].zone,'Europe/London'));
 check(()=>assert.equal(p.decodeParticipantGroup(encoded)?.[1].start,'08:30'));
 check(()=>assert.equal(p.decodeParticipantGroup('not-json'),null));
 check(()=>assert.equal(p.decodeParticipantGroup('a'.repeat(3001)),null));
 check(()=>assert.equal(p.decodeParticipantGroup(JSON.stringify([{zone:'Bad/Zone',country:'US',start:'09:00',end:'18:00'}])),null));
 check(()=>assert.equal(p.decodeParticipantGroup(JSON.stringify([...team,...team,...team,...team,...team])),null));
 check(()=>assert.throws(()=>p.encodeParticipantGroup([{zone:'Invalid/Zone'}])));
});
