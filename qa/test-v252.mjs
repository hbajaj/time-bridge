import assert from 'node:assert/strict';
import handler from '../api/holidays.mjs';
import {SA_2026_OFFICIAL_CLOSURES as sa} from '../lib/saudi-2026.mjs';
import {SA_2027_OFFICIAL_CLOSURES as sa27} from '../lib/saudi-2027.mjs';
import {participantQuality,participantHolidayConflicts} from '../planner-v25.mjs';
import {normalizeHolidays} from '../holidays.mjs';
let tests=0;
const check=(description,test)=>{test();console.log('PASS',description);tests++};
const makeRes=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.code=n;return this},json(v){this.payload=v;return this}});
const call=async(country,year,method='GET')=>{const res=makeRes();await handler({method,query:{country,year}},res);return res};
check('Saudi official fallback has unique ISO dates and recognized public type',()=>{
 assert.equal(sa.length,24);assert.equal(new Set(sa.map(x=>x.date)).size,sa.length);assert.equal(normalizeHolidays(sa,'SA').length,24)
});
for(const day of ['2026-02-22','2026-03-14','2026-03-24','2026-05-22','2026-06-01','2026-09-23'])check('Saudi official date '+day,()=>assert(sa.some(x=>x.date===day)));
const saved=globalThis.fetch;let hits=0;
globalThis.fetch=async()=>{hits++;return {ok:false,status:500,json:async()=>null}};
try{
 const result=await call('SA',2026);
 check('SA 2026 returns 200 when providers are down',()=>{assert.equal(result.code,200);assert.equal(result.payload.length,24);assert.equal(hits,0)});
 check('SA 2026 endpoint identifies conservative sector coverage',()=>assert.match(result.headers['X-Holiday-Coverage'],/Saudi official aviation-sector/));
 const india=await call('IN',2026);
 check('India 2026 official fallback remains available',()=>{assert.equal(india.code,200);assert(india.payload.length>=16)});
 const next=await call('SA',2027);
 check('SA 2027 official SAMA fallback is available',()=>{assert.equal(next.code,200);assert.equal(next.payload.length,12);assert.equal(hits,0)});
 check('Saudi 2027 official subset normalized',()=>assert.equal(normalizeHolidays(sa27,'SA').length,12));
 const other=await call('SA',2028);
 check('unsupported Saudi 2028 fails closed after providers exhausted',()=>{assert.equal(other.code,503);assert.equal(hits,2)});
 const forbidden=await call('SA',2026,'POST');check('non-GET method denied',()=>assert.equal(forbidden.code,405));
 const invalid=await call('SA',2018);check('invalid years rejected',()=>assert.equal(invalid.code,400));
 let from=0;
 globalThis.fetch=async()=>{from++;return from===1?{ok:false,status:503}:{ok:true,json:async()=>[{date:'2026-01-01',name:'New Years Day',countryCode:'GB',types:['Public']}]}};
 const gb=await call('GB',2026);
 check('other-country secondary provider works if first fails',()=>{assert.equal(gb.code,200);assert.equal(from,2)});
}finally{globalThis.fetch=saved}
const p={zone:'Asia/Riyadh',country:'SA',start:'09:00',end:'18:00',name:'Riyadh'};
const quality=(day)=>participantQuality(Date.parse(day+'T09:00:00+03:00'),60,p);
check('Saudi Friday excluded as weekend',()=>assert.equal(quality('2026-10-23'),null));
check('Saudi Saturday excluded as weekend',()=>assert.equal(quality('2026-10-24'),null));
check('Saudi Sunday is valid working day',()=>assert(quality('2026-10-25')!==null));
const slot={ms:Date.parse('2026-09-23T09:00:00+03:00'),duration:60},calendar=new Map([['SA-2026',normalizeHolidays(sa,'SA')]]);
check('Saudi National Day blocks selected meeting',()=>assert(participantHolidayConflicts(slot,[p],calendar).length>0));
check('Saudi calendar missing fails closed',()=>assert.throws(()=>participantHolidayConflicts(slot,[p],new Map()),/Holiday data missing/));
console.log('TOTAL PASS',tests)
