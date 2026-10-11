import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { suggestedClips, covers } from '../consultation.mjs';
import { createApp } from '../server.mjs';
const scenario=JSON.parse(await readFile(new URL('../data/scenario.json',import.meta.url),'utf8'));
const clips=new Map(scenario.clips.map(c=>[c.id,c]));
const ids=(current,excluded=[])=>suggestedClips(clips.get(current),clips,new Set(excluded)).map(c=>c.id);

test('suggestions retain original three-list priorities and fallback orders',()=>{
  assert.deepEqual(ids('0'),['1','2B','3']);
  assert.deepEqual(ids('1',['1']),['4','149','2B']);
  assert.deepEqual(ids('4',['1','4']),['7','55B','50']);
  assert.deepEqual(ids('7',['1','4','7','43']),['8','10','54']);
  assert.deepEqual(ids('44',['1','4','44']),['7','6','30']); // empty second list, undefined 55
  const before=JSON.stringify(clips.get('7').options);ids('7');ids('7');
  assert.equal(JSON.stringify(clips.get('7').options),before);
});
test('suggestions avoid duplicate IDs and exhaust gracefully',()=>{
  const current={options:[['1','4'],['1'],[]],end:false};
  assert.deepEqual(suggestedClips(current,clips,new Set()).map(c=>c.id),['1','4']);
  assert.deepEqual(suggestedClips(current,clips,new Set(['1','4'])),[]);
  assert.deepEqual(suggestedClips({...current,end:true},clips,new Set()),[]);
});
test('coverage and original feedback retain AND within and OR between combinations',()=>{
  const what=scenario.areas.find(a=>a.name==='What taken');
  assert.equal(covers(what,['3']),false);
  assert.equal(covers(what,['104']),false);
  assert.equal(covers(what,['3','104']),true);
  assert.equal(covers(what,['19']),true);
  const stress=scenario.areas.find(a=>a.name==='Stressors');
  assert.equal(covers(stress,['7']),false);
  assert.equal(covers(stress,['7','11']),true);
  assert.equal(covers(stress,['4']),true);
  for(const rule of scenario.feedback){
    assert.equal(covers(rule,[]),false);
    for(const combination of rule.sets) assert.equal(covers(rule,combination),true);
  }
});
test('sessions suppress played and equivalent clips; matching may use an eligible unsuggested clip',async t=>{
  const server=createApp({engine:'script',model:''});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const post=async(route,body)=>(await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
  const s=await post('/api/session',{});
  assert.equal(s.options.length,3);assert.equal(s.endings.length,3);
  for(const id of ['1','4','7','8','10']) {
    const r=await post('/api/question',{sessionId:s.sessionId,question:clips.get(id).doctor});
    assert.equal(r.current.id,id);assert.ok(r.options.length<=3);
    if(['7','8','10'].includes(id)) assert.equal(r.options.some(c=>c.id==='43'||c.id==='7'),false);
  }
  const r=await post('/api/question',{sessionId:s.sessionId,question:clips.get('43').doctor});
  assert.equal(r.matched,false);assert.equal(r.current.id,'10');
  const other=await post('/api/session',{});
  const initial=await post('/api/question',{sessionId:other.sessionId,question:clips.get('1').doctor});
  assert.equal(initial.options.some(c=>c.id==='6'),false);
  const unsuggested=await post('/api/question',{sessionId:other.sessionId,question:clips.get('6').doctor});
  assert.equal(unsuggested.current.id,'6');
});
