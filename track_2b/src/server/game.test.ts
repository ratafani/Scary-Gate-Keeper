import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,snapshot,decide,parseReply,actionReply,current,prompt} from './game.ts';
test('Apertus actions require a complete valid envelope',()=>{
  assert.equal(parseReply('{"speech":"Yes","action":"jump"}').action,'jump');
  for(const bad of ['Sure, I will jump','{"speech":"Jump"}','{"speech":"Yes","action":"fly"}','{"speech":"Yes","action":"jump","score":100}'])assert.throws(()=>parseReply(bad));
  assert.equal(parseReply('{"speech":"I will not jump","action":"none"}').action,'none');
});
test('Repeated actions and later visitors get unique event identities',()=>{
  const s=createSession();const a=actionReply(s,{speech:'Okay',action:'turn_around'});const b=actionReply(s,{speech:'Okay',action:'turn_around'});
  assert.notEqual(a.id,b.id);assert.equal(a.encounterId,b.encounterId);
  decide(s,current(s).llmPromptContext.roleType==='resident');
  const c=actionReply(s,{speech:'Okay',action:'turn_around'});assert.notEqual(a.encounterId,c.encounterId);
});
test('Full correct shift wins and resets history between visitors',()=>{
  const s=createSession();for(let i=0;i<8;i++){s.history.push({role:'user',content:'Hello'});decide(s,current(s).llmPromptContext.roleType==='resident');assert.equal(s.history.length,0);}
  assert.equal(snapshot(s).won,true);assert.equal(snapshot(s).score,800);assert.equal(snapshot(s).visitor,null);assert.throws(()=>decide(s,true));
});
test('Three wrong decisions lose and busy visitors cannot leave',()=>{
  const s=createSession();s.busy=true;assert.throws(()=>decide(s,true));s.busy=false;
  for(let i=0;i<3;i++)decide(s,current(s).llmPromptContext.roleType!=='resident');
  assert.equal(snapshot(s).over,true);assert.equal(snapshot(s).won,false);
});
test('Jump physics depend on trusted profile, not model parameters',()=>{
  const s=createSession();for(const e of s.queue){s.queue[s.index]=e;const r=actionReply(s,{speech:'Okay',action:'jump'});assert.equal(r.fallSeconds,e.llmPromptContext.roleType==='anomaly'?2.2:0.65);}
});
test('Prompt retains contract and selected language',()=>{assert.match(prompt(current(createSession()),'de'),/German/);assert.match(prompt(current(createSession()),'en'),/turn_around/);});
