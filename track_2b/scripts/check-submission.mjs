import {existsSync,readdirSync,statSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const track=fileURLToPath(new URL('..',import.meta.url));const root=resolve(track,'..');let failures=0;
function check(ok,message){console.log(`${ok?'PASS':'FAIL'} ${message}`);if(!ok)failures++;}
for(const name of ['README.md','technical_report.md','Makefile','Dockerfile','compose.yaml','src','data','docs','KampungSambau_Report.pdf'])check(existsSync(join(track,name)),`track_2b/${name}`);
for(const name of ['track_1a','track_1b','track_2a'])check(!existsSync(join(root,name)),`${name} excluded`);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const bytes=files(join(track,'data')).reduce((n,p)=>n+statSync(p).size,0);check(bytes<=100_000_000,`data size ${bytes} bytes <= 100 MB`);
const compose=readFileSync(join(track,'compose.yaml'),'utf8');for(const key of ['LLM_NAME','LLM_BASE_URL','LLM_API_KEY'])check(compose.includes(key),`${key} configured`);
try{execFileSync('git',['check-ignore','--quiet','track_2b/.env'],{cwd:root});check(true,'.env excluded by Git');}catch{check(false,'.env excluded by Git');}
console.log('File/configuration checks only. See docs/SUBMISSION.md for unverified launch, hosting, publishing and demo requirements.');process.exitCode=failures?1:0;
