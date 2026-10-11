const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDZkAAAAASUVORK5CYII=';
let dir,server,url,view;
before(async()=>{dir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-images-'));process.env.DND_DATA_DIR=path.join(dir,'data');process.env.CHATGPT_AUTH_DIR=path.join(dir,'auth');process.env.AI_PROVIDER='fallback';process.env.IMAGE_PROVIDER='none';server=await require('../src/server').createAlphaServer({port:0});url=`http://127.0.0.1:${server.address().port}`;view=(await post('create',{heroName:'Художник',worldIdea:'Мир картин и облачных островов'})).body;});
after(async()=>{await new Promise(resolve=>server.close(resolve));await require('../src/srd-engine').closeSessions();await fs.rm(dir,{recursive:true,force:true});});
async function post(route,body,headers={}){const r=await fetch(`${url}/api/adventure/${route}`,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
function payload(extra={}){return {campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),target:'scene',targetId:view.scene.id,...extra};}
test('upload is durable, deduplicated, idempotent and does not change game state or model context',async()=>{
  const before=structuredClone(view),engine=require('../src/adventure-engine'),context=require('../src/adventure-context');
  const loaded=await engine.loaded(view.campaign.id),packet=JSON.stringify(context.contextFor(loaded.state,loaded.adventure).packet);
  const body=payload({name:'scene.png',mime:'image/png',data:png}),r=await post('images/upload',body);assert.equal(r.status,200);view=r.body;
  assert.equal(view.images.assets.length,1);const asset=view.images.assets[0];assert.equal(asset.width,1);assert.equal(asset.height,1);assert.equal(view.images.bindings[`scene:${view.scene.id}`],asset.id);
  assert.equal(view.campaign.turn,before.campaign.turn);assert.equal(view.campaign.hours,before.campaign.hours);assert.deepEqual(view.hero,before.hero);assert.deepEqual(view.quests,before.quests);assert.deepEqual(view.inferenceUsage,before.inferenceUsage);
  const afterLoad=await engine.loaded(view.campaign.id);assert.equal(JSON.stringify(context.contextFor(afterLoad.state,afterLoad.adventure).packet),packet);
  const replay=await post('images/upload',body);assert.equal(replay.body.replayed,true);assert.equal(replay.body.images.assets.length,1);
  const bytes=await fetch(url+asset.url);assert.equal(bytes.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await bytes.arrayBuffer()),Buffer.from(png,'base64'));
  const duplicate=await post('images/upload',payload({target:'hero',targetId:view.hero.id,name:'portrait.png',mime:'image/png',data:png}));assert.equal(duplicate.status,200);view=duplicate.body;assert.equal(view.images.assets.length,1);assert.equal(view.images.bindings[`hero:${view.hero.id}`],asset.id);
  await require('../src/srd-engine').closeSessions();const saved=await fetch(`${url}/api/adventure/state?campaignId=${view.campaign.id}`).then(r=>r.json());assert.deepEqual(saved.images,view.images);
});
test('unbind retains gallery file, NPC binding works, stale concurrent choices are refused',async()=>{
  const asset=view.images.assets[0];const unbound=await post('images/bind',payload({imageId:null}));assert.equal(unbound.status,200);view=unbound.body;assert.equal(view.images.bindings[`scene:${view.scene.id}`],undefined);assert.equal((await fetch(url+asset.url)).status,200);
  const npc=payload({target:'npc',targetId:view.npcs[0].id,imageId:asset.id});const results=await Promise.all([post('images/bind',npc),post('images/bind',{...npc,operationId:crypto.randomUUID()})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);view=results.find(r=>r.status===200).body;assert.equal(view.images.bindings[`npc:${view.npcs[0].id}`],asset.id);
});
test('malformed, huge, unsupported, foreign-origin and missing-target images leave the campaign intact',async()=>{
  const before=view.campaign.revision;
  for(const extra of [{mime:'image/svg+xml',data:png},{mime:'image/png',data:'AAAA'},{mime:'image/jpeg',data:png},{mime:'image/png',data:png,targetId:'missing'},{mime:'image/png',data:png.repeat(110000)}]){const r=await post('images/upload',payload({name:'bad',...extra}));assert.ok([400,413].includes(r.status));}
  assert.equal((await post('images/upload',payload({name:'bad',mime:'image/png',data:png}),{origin:'https://evil.example'})).status,403);
  assert.equal((await fetch(`${url}/api/adventure/images/file?campaignId=${view.campaign.id}&imageId=../../.env.local`)).status,404);
  const saved=await fetch(`${url}/api/adventure/state?campaignId=${view.campaign.id}`).then(r=>r.json());assert.equal(saved.campaign.revision,before);
});
test('an image is owned by its campaign, not available through another campaign',async()=>{
  const original=view,created=await post('create',{heroName:'Другой',worldIdea:'Другой мир и другой герой'});view=created.body;const id=original.images.assets[0].id;
  assert.equal((await fetch(`${url}/api/adventure/images/file?campaignId=${view.campaign.id}&imageId=${id}`)).status,404);
  assert.equal((await post('images/bind',payload({imageId:id}))).status,400);view=original;
});
test('generator requires independent explicit setup and one explicit request; mocked Images API output is stored',async()=>{
  const input=payload({prompt:'A floating cloud port at dawn',confirmedBilling:true});assert.equal((await post('images/generate',input)).status,503);
  process.env.IMAGE_PROVIDER='openai_compatible';process.env.IMAGE_BASE_URL='http://127.0.0.1:1/v1';process.env.IMAGE_MODEL='test-image';
  const oldFetch=global.fetch;let calls=0;global.fetch=async(endpoint,options)=>{if(endpoint.startsWith('http://127.0.0.1:1/')){calls++;const body=JSON.parse(options.body);assert.equal(body.n,1);assert.equal(body.model,'test-image');assert.equal(options.redirect,'error');return new Response(JSON.stringify({data:[{b64_json:png}]}),{headers:{'content-type':'application/json'}});}return oldFetch(endpoint,options);};
  try{assert.equal((await post('images/generate',{...input,confirmedBilling:false})).status,400);assert.equal(calls,0);const generated=await post('images/generate',input);assert.equal(generated.status,200);view=generated.body;assert.equal(calls,1);assert.equal((await post('images/generate',input)).body.replayed,true);assert.equal(calls,1);}finally{global.fetch=oldFetch;process.env.IMAGE_PROVIDER='none';delete process.env.IMAGE_BASE_URL;delete process.env.IMAGE_MODEL;}
});
test('provider settings reject remote plaintext/embedded credentials and never borrow the text API key',()=>{
  const images=require('../src/adventure-images');process.env.IMAGE_PROVIDER='openai';process.env.IMAGE_MODEL='gpt-image-2.5-flare';process.env.OPENAI_API_KEY='test-text-only';delete process.env.IMAGE_API_KEY;assert.equal(images.provider().configured,false);
  process.env.IMAGE_PROVIDER='openai_compatible';for(const endpoint of ['http://example.com/v1','https://user:password@example.com/v1','file:///tmp']){process.env.IMAGE_BASE_URL=endpoint;assert.equal(images.provider().configured,false);}
  delete process.env.OPENAI_API_KEY;delete process.env.IMAGE_BASE_URL;delete process.env.IMAGE_MODEL;process.env.IMAGE_PROVIDER='none';
});
test('oversized dimensions, gallery quotas and generator failures cannot mutate the campaign',async()=>{
  const images=require('../src/adventure-images'),engine=require('../src/adventure-engine');const oversized=Buffer.from(png,'base64');oversized.writeUInt32BE(100000,16);assert.throws(()=>images.decode(oversized.toString('base64'),'image/png'));
  const loaded=await engine.loaded(view.campaign.id),original=structuredClone(loaded.adventure.images),revision=loaded.adventure.revision;
  loaded.adventure.images=Array.from({length:20},(_,i)=>({id:crypto.randomUUID(),hash:`fixture-${i}`,bytes:100,mime:'image/png'}));await engine.save(loaded.service,loaded.state,loaded.adventure,'quota_fixture');
  assert.equal((await post('images/upload',payload({name:'new',mime:'image/png',data:png}))).status,413);
  loaded.adventure.images=original;await engine.save(loaded.service,loaded.state,loaded.adventure,'quota_fixture_restore');
  process.env.IMAGE_PROVIDER='openai_compatible';process.env.IMAGE_BASE_URL='http://127.0.0.1:1/v1';process.env.IMAGE_MODEL='test-image';
  const oldFetch=global.fetch;let calls=0;global.fetch=async(endpoint,options)=>{if(endpoint.startsWith('http://127.0.0.1:1/')){calls++;return new Response(JSON.stringify({data:[{url:'https://example.com/not-followed'}]}));}return oldFetch(endpoint,options);};
  try{assert.equal((await post('images/generate',payload({prompt:'A portrait of a scholar',confirmedBilling:true}))).status,502);assert.equal(calls,1);const saved=await engine.getView(view.campaign.id);assert.equal(saved.campaign.revision,revision);assert.deepEqual(saved.images.assets,view.images.assets);}finally{global.fetch=oldFetch;process.env.IMAGE_PROVIDER='none';delete process.env.IMAGE_BASE_URL;delete process.env.IMAGE_MODEL;}
});
