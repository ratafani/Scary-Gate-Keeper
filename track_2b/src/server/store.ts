import type { Session } from './game.ts';
import { ServiceError } from './apertus.ts';

type Command = (args:(string|number)[])=>Promise<any>;
const memory=new Map<string,string>();
export function redisConfig() {
  const e=process.env;
  return {url:e.storage_KV_REST_API_URL||e.UPSTASH_REDIS_REST_URL||e.KV_REST_API_URL,
    token:e.storage_KV_REST_API_TOKEN||e.UPSTASH_REDIS_REST_TOKEN||e.KV_REST_API_TOKEN};
}
const command:Command=async args=>{
  const {url,token}=redisConfig();
  if(!url||!token)throw new ServiceError(503,'Connect the Redis database to this Vercel project and redeploy.');
  try {
    const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
    const body=await response.json();
    if(!response.ok||body.error)throw new Error('Redis request failed');
    return body.result;
  }catch{throw new ServiceError(503,'Session storage is unavailable. Please try again.');}
};
// Compare-and-set prevents concurrent decisions or dialogue overwriting newer progress.
export const saveScript="if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3]); return 1";
export function createStore(remote:Command|null) {
  const key=(id:string)=>`scary-gate:shift:${id}`;
  const ttl=(s:Session)=>Math.max(1,s.expires-Date.now());
  return {
    async create(s:Session) {
      const value=JSON.stringify(s);
      if(remote)await remote(['SET',key(s.id),value,'PX',ttl(s)]);
      else {
        for(const [id,raw] of memory)if(JSON.parse(raw).expires<=Date.now())memory.delete(id);
        if(memory.size>=500)throw new ServiceError(503,'The game is busy. Please try again later.');
        memory.set(s.id,value);
      }
    },
    async update<T>(id:string,fn:(s:Session)=>T|Promise<T>):Promise<T> {
      const raw=remote?await remote(['GET',key(id)]):memory.get(id);
      if(!raw)throw new ServiceError(404,'Your shift expired. Start a new shift.');
      const s:Session=JSON.parse(raw);
      if(s.expires<=Date.now())throw new ServiceError(404,'Your shift expired. Start a new shift.');
      const result=await fn(s);
      if(s.expires<=Date.now())throw new ServiceError(404,'Your shift expired. Start a new shift.');
      const value=JSON.stringify(s);
      if(remote) {
        if(await remote(['EVAL',saveScript,1,key(id),raw,value,ttl(s)])!==1)throw new ServiceError(409,'Your shift changed while this request was running. Please try again.');
      } else {
        if(memory.get(id)!==raw)throw new ServiceError(409,'Your shift changed. Please try again.');
        memory.set(id,value);
      }
      return result;
    }
  };
}
export const store=createStore(process.env.VERCEL==='1'||redisConfig().url?command:null);
