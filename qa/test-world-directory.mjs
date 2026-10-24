import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_DIRECTORY_REV,normalizeCountryDirectory,validCoordinates} from '../lib/geo-directory.mjs';
import {selectCities} from '../global-directory-picker.mjs';
import directoryHandler from '../api/directory.mjs';
import zoneHandler from '../api/resolve-timezone.mjs';

const countries=JSON.parse(readFileSync(new URL('../geo/countries.json',import.meta.url),'utf8'));
test('all 250 countries/territories appear in the country selector index',()=>{
 assert.equal(countries.length,250);
 assert.equal(new Set(countries.map(c=>c.code)).size,250);
 assert.ok(countries.some(c=>c.code==='US'));
 assert.ok(countries.some(c=>c.code==='IN'));
 assert.ok(countries.some(c=>c.code==='NG'));
 assert.equal(WORLD_DIRECTORY_REV,'ab77d11f438f439e3f7ed2680463cbd1f861ec15');
});
test('country, state, and all cities parse without arbitrary first-60 limits',()=>{
 const all=Array.from({length:125},(_,i)=>({name:'City '+i,latitude:12.1,longitude:77.1}));
 const data=normalizeCountryDirectory([{iso2:'IN',name:'India',states:[{code:'KA',name:'Karnataka',cities:all},{code:'MH',name:'Maharashtra',cities:[{name:'Pune',latitude:18.52,longitude:73.85}]}]}],'IN');
 assert.equal(data.regionCount,2);assert.equal(data.cityCount,126);
 assert.equal(selectCities(data.regions[0],'',60,0).items.length,60);
 assert.equal(selectCities(data.regions[0],'',60,60).items.length,60);
 assert.equal(selectCities(data.regions[0],'',60,120).items.length,5);
 assert.equal(selectCities(data.regions[1],'pUn',60,0).items[0].name,'Pune');
});
test('invalid country data, coordinates and missing lat/lon do not silently create zones',()=>{
 assert.throws(()=>normalizeCountryDirectory([{iso2:'NG',states:[]}],'US'));
 const d=normalizeCountryDirectory([{iso2:'US',name:'United States',states:[{name:'Iowa',code:'IA',cities:[{name:'Cedar Rapids',latitude:null,longitude:null}]}]}],'US');
 // Null source coordinates are represented as unavailable, never guessed as 0,0.
 assert.equal(d.regions[0].cities[0].latitude,null);
 assert.equal(validCoordinates(41.978,-91.666),true);
 assert.equal(validCoordinates(NaN,20),false);
 assert.equal(validCoordinates(95,20),false);
});
function response(){
 const headers={};let code=200;return {headers, get statusCode(){return code},
 setHeader(key,value){headers[key]=value},status(n){code=n;return this},json(body){this.body=body;return this}};
}
test('directory endpoint validates country and fetches only pinned public source',async()=>{
 const original=globalThis.fetch;
 try{
  let captured='';
  globalThis.fetch=async url=>{captured=String(url);return {ok:true,json:async()=>[{iso2:'US',name:'United States',states:[{code:'IA',name:'Iowa',cities:[{name:'Cedar Rapids',latitude:41.978,longitude:-91.666}]}]}]}};
  const r=response();await directoryHandler({method:'GET',query:{country:'US'}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.cityCount,1);
  assert.equal(r.body.regions[0].cities[0].name,'Cedar Rapids');
  assert.match(captured,/raw\.githubusercontent\.com\/srestre\/world-countries-cities-db\/ab77d11f/);
  const bad=response();await directoryHandler({method:'GET',query:{country:'../../x'}},bad);assert.equal(bad.statusCode,400);
 }finally{globalThis.fetch=original}
});
test('coordinate resolver verifies IANA zone and fails closed when upstream is down',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async url=>({ok:true,json:async()=>({timezone:'America/Chicago'})});
  const ok=response();await zoneHandler({method:'GET',query:{lat:'41.9779',lon:'-91.6656'}},ok);
  assert.equal(ok.body.zone,'America/Chicago');
  const bad=response();await zoneHandler({method:'GET',query:{lat:'-100',lon:'50'}},bad);assert.equal(bad.statusCode,400);
  globalThis.fetch=async()=>{throw Error('offline')};
  const failed=response();await zoneHandler({method:'GET',query:{lat:'-6.9175',lon:'107.6191'}},failed);
  assert.equal(failed.statusCode,503);assert.ok(!('zone' in failed.body));
 }finally{globalThis.fetch=original}
});
