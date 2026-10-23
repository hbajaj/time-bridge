/* v3.0: local-only saved meeting teams. No accounts or remote data transfer. */
import {cleanParticipants,MAX_PARTICIPANTS} from './planner-v25.mjs';
export const SAVED_TEAMS_KEY='timebridge-saved-teams-v3';
export const SAVED_TEAMS_LIMIT=10;
export function validTeamName(input){
  if(typeof input!=='string')return null;
  const name=input.normalize('NFKC').trim().replace(/\s+/g,' ');
  if(!name||name.length>48||/[<>\x00-\x1f]/.test(name))return null;
  return name;
}
export function parseSavedTeams(raw){
  if(raw===null||raw===undefined||raw==='')return [];
  let entries;try{entries=typeof raw==='string'?JSON.parse(raw):raw}catch{return []}
  if(!Array.isArray(entries))return [];
  const out=[],seen=new Set();
  for(const item of entries.slice(0,30)){
    const name=validTeamName(item?.name);
    if(!name||seen.has(name.toLocaleLowerCase('en-US'))||!Array.isArray(item.participants)||item.participants.length<1||item.participants.length>MAX_PARTICIPANTS)continue;
    const participants=cleanParticipants(item.participants);
    if(participants.length!==item.participants.length)continue;
    out.push({name,participants});seen.add(name.toLocaleLowerCase('en-US'));
    if(out.length>=SAVED_TEAMS_LIMIT)break;
  }
  return out;
}
export function upsertSavedTeam(existing,name,participants){
  const normalized=validTeamName(name);
  const list=cleanParticipants(participants);
  if(!normalized)throw Error('Enter a team name (1–48 characters).');
  if(!Array.isArray(participants)||!participants.length||participants.length>MAX_PARTICIPANTS||list.length!==participants.length)throw Error('Select a valid participant group first.');
  const teams=parseSavedTeams(existing);
  const matching=teams.findIndex(x=>x.name.toLowerCase()===normalized.toLowerCase());
  if(matching>=0)teams.splice(matching,1);
  else if(teams.length>=SAVED_TEAMS_LIMIT)throw Error('Maximum 10 saved teams. Delete one first.');
  teams.unshift({name:normalized,participants:list.map(x=>({...x}))});
  return teams;
}
export function removeSavedTeam(existing,name){return parseSavedTeams(existing).filter(x=>x.name!==name)}
export function findSavedTeam(existing,name){const found=parseSavedTeams(existing).find(x=>x.name===name);return found?found.participants.map(p=>({...p})):null}
