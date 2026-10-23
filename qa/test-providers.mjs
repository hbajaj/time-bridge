import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchVerifiedHolidays,parseNager,parseOpenHolidays,parseCalendarific,providerPlan,OPENHOLIDAYS_COUNTRIES} from '../lib/holiday-providers.mjs';
import {holidaysFor,holidayInfo} from '../holidays.mjs';
import handler from '../api/holidays.mjs';
const date='2026-12-25';
const nager=[{date,name:'Christmas',countryCode:'GB',holidayTypes:['Public'],nationalHoliday:true}];
const open=[{startDate:date,endDate:date,name:[{language:'EN',text:'Christmas'}],nationwide:true}];
const calendarific={response:{holidays:[{name:'Christmas',date:{iso:date},type:['National holiday'],locations:'All',states:'All'}]}};
const reply=(json,code=200)=>({ok:code===200,status:code,json:async()=>json});
const res=()=>({code:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(s){this.code=s;return this},json(body){this.body=body;return this}});
test('provider parsers strict ISO and status semantics',()=>{
  assert.equal(parseNager(nager,'GB',2026).length,1);
  assert.throws(()=>parseNager([{date:'2026-02-31',name:'fake',types:['Public']}],'GB',2026));
  assert.equal(parseNager([{date,name:'X',types:['Bank']} ,...nager],'GB',2026).length,1);
  assert.equal(parseOpenHolidays(open,'GB',2026).length,1);
  assert.equal(parseCalendarific(calendarific,'GB',2026).length,1);
  assert.throws(()=>parseCalendarific({response:{holidays:[{...calendarific.response.holidays[0],type:['Observance']}]}},'GB',2026));
  assert.equal(parseOpenHolidays([{...open[0],startDate:'2026-12-24',endDate:'2026-12-25'}],'GB',2026).length,2);
  assert.equal(OPENHOLIDAYS_COUNTRIES.has('ZA'),true);
  assert.equal(OPENHOLIDAYS_COUNTRIES.has('US'),false);
});
test('independent OpenHolidays secondary is used for supported countries',async()=>{
  let seen=[];
  const fetcher=async url=>{seen.push(url);return seen.length===1?reply(null,503):reply([{...open[0],startDate:'2026-12-25'}])};
  const result=await fetchVerifiedHolidays('ZA',2026,{fetcher});
  assert.equal(result.source,'openholidays');assert.equal(result.data[0].countryCode,'ZA');
  assert.match(seen[1],/openholidaysapi\.org/);assert.equal(seen.length,2);
});
test('Nager legacy is compatibility fallback, not independent',async()=>{
  let seen=[];
  const fetcher=async url=>{seen.push(url);return seen.length===1?reply(null,503):reply(nager)};
  const result=await fetchVerifiedHolidays('GB',2026,{fetcher});
  assert.equal(result.source,'nager-v3');assert.equal(seen.length,2);
});
test('optional Calendarific can rescue countries OpenHolidays does not support',async()=>{
  let seen=[];
  const fetcher=async url=>{seen.push(url);return seen.length<2?reply(null,503):reply(calendarific)};
  const result=await fetchVerifiedHolidays('US',2026,{fetcher,apiKey:'TEST-ONLY-SECRET'});
  assert.equal(result.source,'calendarific');assert.equal(result.data[0].countryCode,'US');
  assert.equal(seen.length,2);
});
test('provider rejects invalid calendars without silently authorizing recommendations',async()=>{
  const bad=async()=>reply([{date:'2026-02-31',name:'Invalid',types:['Public']}]);
  await assert.rejects(fetchVerifiedHolidays('US',2026,{fetcher:bad}),e=>e.code==='HOLIDAY_UNVERIFIED');
  await assert.rejects(fetchVerifiedHolidays('US',2026,{fetcher:async()=>{throw Error('offline')}}),e=>e.code==='HOLIDAY_UNVERIFIED');
});
test('server official years return provenance; bad method/year rejected',async()=>{
  let r=res();await handler({method:'GET',query:{country:'SA',year:'2026'}},r);
  assert.equal(r.code,200);assert.match(r.headers['X-Holiday-Source'],/sa-aviation/);
  r=res();await handler({method:'GET',query:{country:'IN',year:'2026'}},r);
  assert.equal(r.code,200);assert.match(r.headers['X-Holiday-Coverage'],/state and regional/);
  for(const year of ['2026;DROP',null,[],2011]){r=res();await handler({method:'GET',query:{country:'US',year}},r);assert.equal(r.code,400)}
  r=res();await handler({method:'POST',query:{country:'US',year:'2026'}},r);assert.equal(r.code,405);
});
test('browser cache retains provenance when the response is valid',async()=>{
  const saved=globalThis.localStorage;
  const db=new Map();
  globalThis.localStorage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
  try{
    const meta={'X-Holiday-Source':'openholidays','X-Holiday-Coverage':'Country holidays and subdivisions'};
    const fetcher=async()=>({...reply([{date,name:'Christmas',countryCode:'ZA',types:['Public']}]),headers:{get:k=>meta[k]||null}});
    assert.equal((await holidaysFor('ZA',2026,fetcher)).length,1);
    assert.equal(holidayInfo('ZA',2026).source,'openholidays');
    assert.match(JSON.stringify([...db.values()]),/Country holidays/);
  }finally{globalThis.localStorage=saved}
});
test('provider plan is bounded and does not attach secret to client URLs',()=>{
  const enabled=providerPlan('US',2026,true).map(x=>x.id);
  assert.deepEqual(enabled,['nager-v4','calendarific','nager-v3']);
  assert.deepEqual(providerPlan('ZA',2026,false).map(x=>x.id),['nager-v4','openholidays','nager-v3']);
});
