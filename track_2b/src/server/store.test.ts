import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from './store.ts';
import {createSession,decide,snapshot} from './game.ts';

test('separate instances share progress, history and reject concurrent overwrites',async()=>{
  const db=new Map<string,string>();
  const command=async(args:(string|number)[])=>{
    if(args[0]==='SET'){db.set(String(args[1]),String(args[2]));return 'OK';}
    if(args[0]==='GET')return db.get(String(args[1]))??null;
    const key=String(args[3]);
    if(db.get(key)!==args[4])return 0;
    db.set(key,String(args[5]));return 1;
  };
  const a=createStore(command),b=createStore(command),s=createSession();
  await a.create(s);
  await b.update(s.id,s=>{s.history.push({role:'user',content:'Hello'});});
  await a.update(s.id,s=>assert.equal(s.history[0].content,'Hello'));
  let release!:()=>void;
  const wait=new Promise<void>(r=>release=r);
  const old=a.update(s.id,async s=>{await wait;return decide(s,true);});
  const next=await b.update(s.id,s=>decide(s,false));
  assert.equal(next.shift.index,1);
  release();await assert.rejects(old,/shift changed/);
  assert.equal(await createStore(command).update(s.id,s=>snapshot(s).index),1);
  await assert.rejects(a.update('missing',()=>{}),/expired/);
  const expired=createSession();expired.expires=Date.now()-1;await a.create(expired);
  await assert.rejects(b.update(expired.id,()=>{}),/expired/);
});
