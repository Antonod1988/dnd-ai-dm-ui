const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
let dir,server,url,view;
before(async()=>{
  dir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-adventure-http-'));process.env.DND_DATA_DIR=path.join(dir,'data');process.env.CHATGPT_AUTH_DIR=path.join(dir,'auth');process.env.AI_PROVIDER='fallback';
  server=await require('../src/server').createAlphaServer({port:0});url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await require('../src/srd-engine').closeSessions();await fs.rm(dir,{recursive:true,force:true});});
async function post(route,body){const r=await fetch(url+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
async function act(command){const result=await post('/api/adventure/act',{campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command});assert.equal(result.status,200);view=result.body;return result;}
test('main page serves the new UI while the old alpha remains accessible',async()=>{
  const main=await fetch(url).then(r=>r.text()),legacy=await fetch(url+'/legacy').then(r=>r.text());
  assert.match(main,/worldMap/);assert.match(main,/createForm/);assert.match(legacy,/Нимарис/);assert.match(legacy,/legacy-app.js/);
  assert.equal((await fetch(url+'/app.js')).status,200);assert.equal((await fetch(url+'/adventure.css')).status,200);
});
test('HTTP creation and state use the same real rules-backed campaign',async()=>{
  const result=await post('/api/adventure/create',{heroName:'Путник',worldIdea:'Океан звёзд и острова из камня',survival:true});assert.equal(result.status,200);view=result.body;
  assert.equal(view.hero.level,1);assert.equal(view.survival.foodDays,3);
  const saved=await fetch(url+'/api/adventure/state').then(r=>r.json());assert.equal(saved.campaign.id,view.campaign.id);
  assert.equal(saved.hero.hp.current,view.hero.hp.current);
});
test('supplies spend real inventory currency and survival consumes the same supplies',async()=>{
  const coins=view.hero.inventory.find(i=>i.itemId==='gold_piece').quantity;
  await act({type:'supplies'});assert.equal(view.survival.foodDays,6);assert.equal(view.hero.inventory.find(i=>i.itemId==='gold_piece').quantity,coins-2);
  const {service,state,adventure}=await require('../src/adventure-engine').loaded(view.campaign.id);adventure.hours=23.9;await require('../src/adventure-engine').save(service,state,adventure,'time_fixture');
  await act({type:'narrative',description:'Отряд завершает день пути.'});assert.equal(view.campaign.day,2);assert.equal(view.survival.foodDays,5);assert.equal(view.hero.inventory.find(i=>i.itemId==='travel_food').quantity,5);
});
test('discussion uses this world roster and does not spend a rules turn',async()=>{
  const before=view.campaign.turn;
  const started=await post('/api/adventure/discussion/start',{campaignId:view.campaign.id,topic:'Куда идти?'});assert.equal(started.status,200);assert.equal(started.body.spoken[0].speakerName,'Проводник');
  const interrupted=await post('/api/adventure/discussion/intervene',{campaignId:view.campaign.id,text:'Сначала осмотримся.'});assert.equal(interrupted.status,200);
  const saved=await fetch(url+'/api/adventure/state').then(r=>r.json());assert.equal(saved.campaign.turn,before);assert.equal(saved.messages.at(-1).author,'Путник');
});
test('HTTP notes, pinning and full journal search use revision checks without taking a game turn',async()=>{
  view=await fetch(url+'/api/adventure/state').then(r=>r.json());const turn=view.campaign.turn;
  const note={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),text:'Я обещал вернуть карту капитану Тарену.',pinned:true};
  const created=await post('/api/adventure/memory/note',note);assert.equal(created.status,200);view=created.body;
  assert.equal(view.campaign.turn,turn);assert.equal(view.notes.length,1);
  const replay=await post('/api/adventure/memory/note',note);assert.equal(replay.body.replayed,true);assert.equal(replay.body.notes.length,1);
  const stale=await post('/api/adventure/memory/pin',{campaignId:view.campaign.id,expectedRevision:note.expectedRevision,operationId:crypto.randomUUID(),kind:'note',recordId:view.notes[0].id,pinned:false});assert.equal(stale.status,409);
  const search=await fetch(url+`/api/adventure/history?campaignId=${encodeURIComponent(view.campaign.id)}&query=${encodeURIComponent('капитану Тарену')}`).then(r=>r.json());assert.equal(search.total,1);assert.equal(search.entries[0].kind,'player_note');
});
