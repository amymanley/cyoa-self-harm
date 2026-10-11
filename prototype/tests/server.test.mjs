import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

async function running(t,server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return 'http://127.0.0.1:'+server.address().port;}
async function post(base,route,body){return fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}

test('script preview selects real clips, updates coverage, and isolates sessions',async t=>{
  const base=await running(t,createApp({model:''}));
  const a=await (await post(base,'/api/session',{})).json(),b=await (await post(base,'/api/session',{})).json();
  assert.notEqual(a.sessionId,b.sessionId);assert.equal(a.current.id,'0');
  const option=a.options.find(c=>c.id==='1');assert.ok(option);
  const selected=await (await post(base,'/api/question',{sessionId:a.sessionId,question:option.doctor})).json();
  assert.equal(selected.matched,true);assert.equal(selected.current.id,'1');assert.deepEqual(selected.choices,['1']);assert.ok(selected.feedback.length);assert.equal(selected.current.videoAvailable,false);
  const untouched=await (await post(base,'/api/finish',{sessionId:b.sessionId})).json();assert.equal(untouched.current.id,'0');
});
test('unsupported questions do not fabricate replies or advance the consultation',async t=>{
  const base=await running(t,createApp({model:''}));const s=await (await post(base,'/api/session',{})).json();
  const result=await (await post(base,'/api/question',{sessionId:s.sessionId,question:'Invent a new patient story'})).json();
  assert.equal(result.matched,false);assert.equal(result.current.id,'0');assert.deepEqual(result.choices,[]);
});
test('local AI selection is constrained to eligible clips',async t=>{
  let reply={id:'1',confidence:0.97};let captured;
  const ai=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;captured=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify(reply)}}));});
  const aiUrl=await running(t,ai);const base=await running(t,createApp({model:'test-local',aiUrl}));
  const s=await (await post(base,'/api/session',{})).json();
  let result=await (await post(base,'/api/question',{sessionId:s.sessionId,question:'Could you tell me what has been going on?'})).json();
  assert.equal(result.current.id,'1');assert.equal(result.selection,'ai');assert.equal(captured.model,'test-local');
  reply={id:'invented-clip',confidence:1};result=await (await post(base,'/api/question',{sessionId:s.sessionId,question:'Choose any video you like'})).json();
  assert.equal(result.matched,false);assert.equal(result.current.id,'1');
  reply={id:'4',confidence:0.2};result=await (await post(base,'/api/question',{sessionId:s.sessionId,question:'Something unclear'})).json();assert.equal(result.matched,false);
});
test('video streaming supports ranges and refuses unknown files',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'vp-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(path.join(dir,'0.mp4'),Buffer.from('0123456789'));
  const base=await running(t,createApp({model:'',videoDir:dir}));
  const response=await fetch(base+'/videos/0.mp4',{headers:{Range:'bytes=2-5'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 2-5/10');assert.equal(await response.text(),'2345');
  assert.equal((await fetch(base+'/videos/0.mp4',{headers:{Range:'bytes=20-30'}})).status,416);
  assert.equal((await fetch(base+'/videos/unknown.mp4')).status,404);
  const s=await (await post(base,'/api/session',{})).json();assert.equal(s.current.videoAvailable,true);
});
test('invalid sessions and cross-origin writes are refused',async t=>{
  const base=await running(t,createApp({model:''}));assert.equal((await post(base,'/api/question',{sessionId:'missing',question:'Hello'})).status,404);
  assert.equal((await fetch(base+'/api/session',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'})).status,403);
});
test('ended consultation cannot advance and front end loads',async t=>{
  const base=await running(t,createApp({model:''}));const s=await (await post(base,'/api/session',{})).json();const end=s.endings[0];
  const result=await (await post(base,'/api/question',{sessionId:s.sessionId,question:end.doctor})).json();assert.equal(result.current.end,true);
  assert.equal((await post(base,'/api/question',{sessionId:s.sessionId,question:'Anything else?'})).status,409);
  for(const route of ['/','/app.js','/style.css'])assert.equal((await fetch(base+route)).status,200);
});
