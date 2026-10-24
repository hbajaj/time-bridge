import test from 'node:test';
import assert from 'node:assert/strict';
import {citySearchInput,citySearchURL,normalizeGlobalCities} from '../lib/city-search.mjs';
import handler from '../api/cities.mjs';

test('worldwide city search validates requests and fixes upstream origin',()=>{
  assert.equal(citySearchInput('  Cedar Rapids, Iowa  '),'Cedar Rapids, Iowa');
  assert.equal(citySearchInput('A'),'');
  assert.equal(citySearchInput('<script>'),'');
  assert.equal(citySearchInput(''.padEnd(100,'z')),'');
  const url=new URL(citySearchURL('Bandung, West Java','ID',300));
  assert.equal(url.hostname,'geocoding-api.open-meteo.com');
  assert.equal(url.searchParams.get('name'),'Bandung, West Java');
  assert.equal(url.searchParams.get('countryCode'),'ID');
  assert.equal(url.searchParams.get('count'),'100');
});

test('normalize foreign and US cities preserving administrative state, country and IANA zone',()=>{
  const cities=normalizeGlobalCities({results:[
    {id:1,name:'Cedar Rapids',admin1:'Iowa',country_code:'US',country:'United States',timezone:'America/Chicago',feature_code:'PPL',population:137000},
    {id:2,name:'Bandung',admin1:'West Java',country_code:'ID',country:'Indonesia',timezone:'Asia/Jakarta',feature_code:'PPLA',population:2460000},
    {id:3,name:'Invalid TZ',admin1:'Iowa',country_code:'US',timezone:'Fake/Zone',feature_code:'PPL'},
    {id:4,name:'Some region',country_code:'US',timezone:'America/Chicago',feature_code:'ADM1'}
  ]});
  assert.deepEqual(cities.map(x=>x.name),['Cedar Rapids','Bandung']);
  assert.equal(cities[0].region,'Iowa');assert.equal(cities[0].country,'US');
  assert.equal(cities[1].region,'West Java');assert.equal(cities[1].country,'ID');
  assert.equal(cities[1].zone,'Asia/Jakarta');
});

function response(){
  const headers={};let status=200;
  return {headers, get statusCode(){return status},
    setHeader(k,v){headers[k]=v},
    status(code){status=code;return this},
    json(body){this.body=body;return this}
  };
}
test('city endpoint handles method and input validation without touching upstream',async()=>{
  const wrong=response();await handler({method:'POST',query:{name:'Bandung'}},wrong);
  assert.equal(wrong.statusCode,405);
  const bad=response();await handler({method:'GET',query:{name:'<script>'}},bad);
  assert.equal(bad.statusCode,400);
});

test('city endpoint returns global results and degrades safely when provider fails',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async uri=>({ok:true,json:async()=>({results:[{id:190,name:'Bandung',admin1:'West Java',country_code:'ID',country:'Indonesia',timezone:'Asia/Jakarta',feature_code:'PPLA',population:2000000}]})});
    const res=response();await handler({method:'GET',query:{name:'Bandung'}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.results[0].region,'West Java');
    assert.equal(res.body.results[0].country,'ID');
    globalThis.fetch=async()=>{throw Error('network down')};
    const unavailable=response();await handler({method:'GET',query:{name:'Zanzibar'}},unavailable);
    assert.equal(unavailable.statusCode,503);assert.deepEqual(unavailable.body.results,[]);
  }finally{globalThis.fetch=old}
});
