import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allowedInContext,resolveShortPrompt} from '../context.mjs';
import {createApp} from '../server.mjs';

const scenario=JSON.parse(await readFile(new URL('../data/scenario.json',import.meta.url),'utf8'));
const clips=new Map(scenario.clips.map(c=>[c.id,c]));
const eligible=current=>clips.get(current).options.flat().map(id=>clips.get(id)).filter(Boolean);

test('short prompts follow their immediate topic rather than wording alone',()=>{
  for(const [current,question,expected] of [
    ['7','hmm','8'],['211','go on','8'],['14','go on','2C'],['31','go on','32'],
    ['86','tell me more','85'],['142','tell me more','143'],['16','what do you mean?','17'],
    ['191','what was that like?','192'],['208','how was that?','209'],
    ['3','how much?','102'],['106','how much?','107'],['102','what strength?','103'],
    ['107','what dose?','108'],['104','which ones?','105'],['164','of each?','163'],
    ['109','when?','110'],['149','how has that affected you?','150'],
    ['180-79','how has that affected you?','181'],['188','how old were you?','191'],
    ['227','how old was she?','228'],['209','what happened next?','210']
  ])assert.equal(resolveShortPrompt(question,current,eligible(current)).clip?.id,expected,`${current}: ${question}`);
});

test('unestablished references, missing branches and excluded clips never get a default reply',()=>{
  for(const current of ['0','1','3','8','181']) {
    for(const question of ['hmm','go on','when?','what was that like?','why?']) {
      const result=resolveShortPrompt(question,current,eligible(current));
      assert.equal(result.handled,true);assert.equal(result.clip,null,`${current}: ${question}`);
    }
  }
  assert.equal(resolveShortPrompt('hmm','7',eligible('7').filter(c=>c.id!=='8')).clip,null);
  // The source has no incoming branch to 146; a plausible date association must not invent one.
  assert.equal(resolveShortPrompt('when?','43',eligible('43')).clip,null);
  assert.equal(allowedInContext(clips.get('192'),'181'),false);
  assert.equal(allowedInContext(clips.get('102'),'106'),false);
  assert.equal(allowedInContext(clips.get('150'),'180-79'),false);
});

test('sample opposite-meaning questions cannot use clips whose answers reverse the meaning',()=>{
  for(const [id,current,question] of [
    ['112','111','Was anyone with you?'],['215','214','Do you forget to take your medication?'],
    ['120','119','Did you expect to survive?'],['124','123','Did you expect to die?']
  ])assert.equal(allowedInContext(clips.get(id),current,question),false,question);
});

test('server declines vague prompts without advancing and honours only currently offered script IDs',async t=>{
  const server=createApp({model:''});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const post=async(route,body)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let state=await(await post('/api/session',{})).json();const sessionId=state.sessionId;
  let r=await(await post('/api/question',{sessionId,question:'hmm'})).json();
  assert.equal(r.matched,false);assert.equal(r.current.id,'0');assert.deepEqual(r.choices,[]);
  assert.equal((await post('/api/question',{sessionId,question:clips.get('8').doctor,clipId:'8'})).status,400);
  for(const id of ['1','4','7']) {
    const option=r.options.find(c=>c.id===id);assert.ok(option,id);
    r=await(await post('/api/question',{sessionId,question:option.doctor,clipId:id})).json();
    assert.equal(r.current.id,id);
  }
  r=await(await post('/api/question',{sessionId,question:'hmm'})).json();
  assert.equal(r.current.id,'8');assert.equal(r.selection,'context');
  const choices=r.choices;
  r=await(await post('/api/question',{sessionId,question:'go on'})).json();
  assert.equal(r.matched,false);assert.equal(r.current.id,'8');assert.deepEqual(r.choices,choices);
  assert.ok(r.options.length<=3);
});
