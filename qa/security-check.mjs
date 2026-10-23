import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
const txt=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(txt('vercel.json'));
const headers=Object.fromEntries(config.headers[0].headers.map(x=>[x.key,x.value]));
for(const k of ['Content-Security-Policy','X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Permissions-Policy'])assert.ok(headers[k],`Missing ${k}`);
assert.match(headers['Content-Security-Policy'],/script-src 'self'/);
assert.match(headers['Content-Security-Policy'],/connect-src 'self'/);
assert.match(headers['Content-Security-Policy'],/object-src 'none'/);
assert.match(headers['Content-Security-Policy'],/frame-ancestors 'none'/);
const html=txt('index.html');
assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>/i,'Disallow inline scripts');
const jsFiles=['api/holidays.mjs','lib/holiday-providers.mjs','holidays.mjs','app.v2.mjs'];
for(const p of jsFiles){
 const source=txt(p);
 assert.doesNotMatch(source, /eval\s*\(|new\s+Function\s*\(/,`Unsafe eval in ${p}`);
 assert.doesNotMatch(source, /(?<!process\.env\.)CALENDARIFIC_API_KEY\s*[:=]\s*['"][^'"]{5,}/,`Hardcoded key in ${p}`);
}
assert.doesNotMatch(txt('app.v2.mjs'),/\binnerHTML\s*=/,'Avoid dynamic HTML sinks in controller');
console.log('Security and CSP static checks passed');
