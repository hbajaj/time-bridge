/* Byte-for-byte release manifest verification, no network dependencies. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const entries=JSON.parse(readFileSync(join(root,'qa','release-manifest.json'),'utf8'));
let failures=[];
for(const [path,sha] of Object.entries(entries)){
 try{
  const data=readFileSync(join(root,path));
  const actual=createHash('sha256').update(data).digest('hex');
  if(actual!==sha)failures.push(path);
 }catch{failures.push(path)}
}
if(failures.length){console.error('Release source integrity mismatch:',failures);process.exit(1)}
console.log('Verified',Object.keys(entries).length,'release files against SHA-256 manifest');
