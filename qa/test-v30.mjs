import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanParticipants,rankMeetingDay,scoreMeeting,DEFAULT_PARTICIPANTS} from '../planner-v25.mjs';
import {parseSavedTeams,upsertSavedTeam,removeSavedTeam,findSavedTeam,SAVED_TEAMS_LIMIT} from '../teams-v3.mjs';
const team=DEFAULT_PARTICIPANTS.map(p=>({...p}));
test('saved teams: round trip with working hours and deep copies',()=>{
 const us=[{...team[0],start:'08:00',end:'16:00'},{...team[2]}];
 const saved=upsertSavedTeam([], ' US–India weekly ',us);
 assert.equal(saved[0].name,'US–India weekly');
 assert.equal(saved[0].participants[0].start,'08:00');
 const restored=findSavedTeam(JSON.stringify(saved),'US–India weekly');
 assert.equal(restored.length,2);assert.equal(restored[0].start,'08:00');assert.equal(restored[1].country,'IN');
 restored[0].start='10:00';assert.equal(saved[0].participants[0].start,'08:00');
 assert.equal(removeSavedTeam(saved,'US–India weekly').length,0);
});
test('saved teams: reject invalid, deduplicate by name, cap and normalize',()=>{
 let saved=[];
 for(let i=0;i<SAVED_TEAMS_LIMIT;i++)saved=upsertSavedTeam(saved,'Team '+i,team);
 assert.throws(()=>upsertSavedTeam(saved,'Extra',team),/Maximum/);
 saved=upsertSavedTeam(saved,'TEAM 0',team.slice(0,2));
 assert.equal(saved.length,SAVED_TEAMS_LIMIT);assert.equal(saved[0].participants.length,2);
 assert.throws(()=>upsertSavedTeam([], '<bad>',team));
 assert.throws(()=>upsertSavedTeam([],'ok',[]));
 assert.deepEqual(parseSavedTeams('not json'),[]);
 assert.deepEqual(parseSavedTeams([{name:'x',participants:[{zone:'Invalid/Zone'}]}]),[]);
 assert.equal(parseSavedTeams([{name:'x',participants:team},{name:'X',participants:team}]).length,1);
});
test('working-hours fit: complete overlap scores 100 and is explainable',()=>{
 const lone=[{...team[0],start:'08:00',end:'20:00'}];
 const at=Date.parse('2026-10-22T15:00:00Z');
 const fit=scoreMeeting(at,60,lone);
 assert.equal(fit.fit,100);assert.equal(fit.normalCount,1);
 assert.equal(fit.maxOutsideMinutes,0);assert.equal(fit.values[0].penalty,0);
});
test('strict preference never returns a slot outside any requested working window',()=>{
 const after=Date.parse('2026-10-21T00:00:00Z');
 const slots=rankMeetingDay('2026-10-22',{participants:[{...team[0],start:'08:00',end:'19:00'}],duration:30,after,preference:'strict'});
 assert.ok(slots.length>0);
 for(const item of slots)assert.equal(item.normalCount,1);
 assert.deepEqual(rankMeetingDay('2026-10-22',{participants:team,duration:60,after,preference:'unknown'}),[]);
});
test('earliest selection is chronological and balanced selection is bounded',()=>{
 const after=Date.parse('2026-10-21T00:00:00Z');
 const p=[{...team[0],start:'09:00',end:'18:00'}];
 const slots=rankMeetingDay('2026-10-22',{participants:p,duration:60,after,preference:'earliest'});
 assert.ok(slots.length>0);assert.equal(slots[0].ms,Math.min(...slots.map(s=>s.ms)));
 const balanced=rankMeetingDay('2026-10-22',{participants:p,duration:60,after,preference:'fair'});
 assert.ok(balanced.length>0);assert.ok(balanced.every(x=>x.fit>=0&&x.fit<=100));
});

test('release smoke checks v3 version rather than a previous version',()=>{
 const source=readFileSync(new URL('../scripts/smoke.mjs',import.meta.url),'utf8');
 assert.match(source,/TimeBridge v3\.0\.0/);
 assert.doesNotMatch(source,/TimeBridge v2\.6\.0/);
});
