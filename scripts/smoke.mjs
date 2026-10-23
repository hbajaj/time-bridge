/* Manual post-deploy smoke test. Run only against an owner-approved preview/staging URL. */
const base=process.argv[2];
if(!base||!/^https:\/\//.test(base)){console.error('Usage: node scripts/smoke.mjs https://timebridge-PREVIEW.vercel.app');process.exit(2)}
const root=new URL(base);const required=[['US',2026],['IN',2026],['NG',2026],['US',2027],['IN',2027],['NG',2027]];
let issues=0;
const valid=rec=>typeof rec?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(rec.date)&&typeof rec.name==='string'&&Array.isArray(rec.holidayTypes)&&rec.holidayTypes.includes('Public');
const fail=(label,message)=>{console.error('FAIL',label,message);issues++};
try{
 const page=await fetch(root,{signal:AbortSignal.timeout(12000)});
 const html=await page.text();
 if(!page.ok||!html.includes('TimeBridge v3.0.0'))fail('home','wrong version or HTTP');else console.log('PASS home page v3.0.0');
}catch(e){fail('home',e.message)}
for(const [country,year] of required){
 try{
  const u=new URL(`/api/holidays?country=${country}&year=${year}`,root);
  const resp=await fetch(u,{signal:AbortSignal.timeout(12000)});
  const body=await resp.json();
  if(!resp.ok||!Array.isArray(body)||!body.length||!body.every(valid)){fail(country,`HTTP ${resp.status} or unverified response`);continue}
  const source=resp.headers.get('x-holiday-source')||'';
  const coverage=resp.headers.get('x-holiday-coverage')||'';
  if(!source||!coverage)fail(country,'provenance headers absent');else console.log(`PASS ${country} ${year}: ${body.length} holidays; source=${source}; coverage=${coverage.slice(0,60)}`);
 }catch(e){fail(country,e.message)}
}
if(issues){console.error(`SMOKE FAILURE: ${issues} checks failed; release BLOCKED`);process.exit(1)}
console.log('All live smoke checks passed');
