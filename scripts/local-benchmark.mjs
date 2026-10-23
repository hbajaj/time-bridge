/* Local CPU-only algorithm benchmark; not a Core Web Vitals or real-user result. */
import {rankMeetingDay,DEFAULT_PARTICIPANTS} from '../planner-v25.mjs';
const start=Date.now(),durations=[];
for(let i=0;i<120;i++){
 const day=new Date(Date.UTC(2026,9,22+i)).toISOString().slice(0,10);
 const t=performance.now();rankMeetingDay(day,{participants:DEFAULT_PARTICIPANTS,duration:60,after:0});durations.push(performance.now()-t);
}
durations.sort((a,b)=>a-b);
const p=q=>durations[Math.min(durations.length-1,Math.ceil(durations.length*q)-1)];
console.log(JSON.stringify({samples:durations.length,meanMs:+(durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(2),p50Ms:+p(.5).toFixed(2),p95Ms:+p(.95).toFixed(2),p99Ms:+p(.99).toFixed(2),totalMs:Date.now()-start},null,2));
