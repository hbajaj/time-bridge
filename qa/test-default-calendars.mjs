import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/holidays.mjs';
import {publishedDefaultCalendar} from '../lib/default-calendars.mjs';
import {normalizeHolidays} from '../holidays.mjs';
const years=[['US',2026,11],['US',2027,11],['IN',2026,17],['IN',2027,17],['NG',2026,13],['NG',2027,8]];
const response=()=>({code:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(c){this.code=c;return this},json(data){this.data=data;return this}});
for(const [country,year,count] of years){
 test(`Default calendar ${country}-${year} requires no network`,async()=>{
  const before=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network access would be unsafe here');};
  try{
   const res=response();await handler({method:'GET',query:{country,year:String(year)}},res);
   assert.equal(res.code,200);assert.equal(res.data.length,count);
   assert.equal(normalizeHolidays(res.data,country).length,count);
   for(const name of ['X-Holiday-Source','X-Holiday-Coverage','X-Holiday-Completeness'])assert.ok(res.headers[name]);
  }finally{globalThis.fetch=before;}
 });
}
test('Nigeria 2027 is visibly partial, with no invented confirmed Eid dates',()=>{
 const c=publishedDefaultCalendar('NG',2027);
 assert.equal(c.completeness,'partial');assert.match(c.coverage,/await official announcement/);
 assert.ok(c.data.every(p=>!/Eid|Maulud/i.test(p.name)));
});
test('Nigeria 2026 includes officially confirmed Eid dates',()=>{
 const dates=publishedDefaultCalendar('NG',2026).data.map(p=>p.date);
 for(const d of ['2026-03-19','2026-03-20','2026-05-27','2026-05-28'])assert.ok(dates.includes(d));
});
test('US 2026 and 2027 observed federal dates are included',()=>{
 assert.ok(publishedDefaultCalendar('US',2026).data.some(p=>p.date==='2026-07-03'));
 for(const d of ['2027-06-18','2027-07-05','2027-12-24'])assert.ok(publishedDefaultCalendar('US',2027).data.some(p=>p.date===d));
});
test('No invented calendars for other years/countries',()=>{
 for(const [c,y] of [['NG',2028],['US',2028],['GB',2026],['SA',2026]])assert.equal(publishedDefaultCalendar(c,y),null);
});
