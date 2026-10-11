const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),model=require('../src/adventure-model'),access=require('../src/adventure-access');
const {contextFor}=require('../src/adventure-context');
let directory,original,view;
const gate=(conditions,mode='any')=>({mode,conditions,label:'Sealed cabinet',description:'Use a recorded clue or the right key.',concealed:true});
const world={title:'The sealed workshop',opening:'A locked cabinet awaits a choice of approach.',startLocationId:'camp',
  locations:[{id:'camp',name:'Camp',description:'A sheltered village.',kind:'settlement',connectsTo:['vault']},{id:'vault',name:'Workshop',description:'Cabinets and old mechanical sentinels.',kind:'ruins',connectsTo:['camp']}],
  npcs:[{id:'keeper',name:'Iris',role:'Keeper',locationId:'camp'}],
  checks:[{id:'history',locationId:'vault',trigger:'manual',skill:'investigation',dc:25,title:'Read the difficult cipher',prompt:'Study the new symbols.',discoveredFact:'The ivory wheel releases the cabinet.'},{id:'map-route',locationId:'vault',trigger:'manual',skill:'history',dc:5,title:'Use the familiar old chart',prompt:'Compare the older chart.',discoveredFact:'The older chart shows the ivory release wheel.'}],
  items:[{id:'key',name:'Glass key',description:'A reusable workshop key.',locationId:'camp',kind:'tool'},
    {id:'prism',name:'Cobalt dream seed',description:'A secret seed singing in eleven forgotten voices.',locationId:'vault',kind:'quest',access:gate([{kind:'check',targetId:'history'},{kind:'check',targetId:'map-route'}])},
    {id:'both',name:'Gilded lens',description:'A lens behind two precautions.',locationId:'vault',kind:'tool',access:gate([{kind:'check',targetId:'map-route'},{kind:'item',targetId:'key'}],'all')},
    {id:'key-box',name:'Amber chalk',description:'Chalk kept behind a key lock.',locationId:'vault',kind:'tool',access:gate([{kind:'item',targetId:'key'}])},
    {id:'guarded',name:'Sentinel’s token',description:'A token guarded by the workshop sentinel.',locationId:'vault',kind:'tool',access:gate([{kind:'victory',targetId:'vault'}])}],
  quests:[{id:'find-seed',title:'Find the dream seed',summary:'Find a route through the old cabinet.',rewardTheme:'A chart token',objectives:[{text:'Find either way',kind:'check',targetId:'history',alternativeTargetIds:['map-route']},{text:'Collect the seed',kind:'acquire',targetId:'prism'}]},
    {id:'return-key',title:'Return the borrowed key',summary:'Hand back the key.',rewardTheme:'A small token',objectives:[{text:'Give Iris the key',kind:'deliver',targetId:'key',recipientId:'keeper'}]}]};
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-access-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';
  original=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>type==='adventure_world'?structuredClone(world):fallback();
});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(classId='wizard'){view=await engine.create({heroName:'Mira',worldIdea:'A world of sealed workshops and original artifacts',classId,language:'en'});}
async function act(command,seed='access-roll'){
  const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};view=await engine.perform(body,{seed});return body;
}
async function rejectUnchanged(command,pattern){
  const loaded=await engine.loaded(view.campaign.id),snapshot=JSON.stringify(loaded.service.loadCampaign(view.campaign.id));await assert.rejects(act(command),pattern);assert.equal(JSON.stringify(loaded.service.loadCampaign(view.campaign.id)),snapshot);
}
test('access validates targets, duplicate conditions, impossible key cycles and a genuine alternative escape',()=>{
  model.validateSeed(structuredClone(world));
  for(const mutate of [s=>s.items[1].access.conditions[0].targetId='missing',s=>s.items[0].access=gate([{kind:'item',targetId:'key'}]),s=>s.items[1].access.conditions.push({...s.items[1].access.conditions[0]}),s=>s.items[1].access.price=0]){const w=structuredClone(world);mutate(w);assert.throws(()=>model.validateSeed(w));}
  const w=structuredClone(world);w.items[0].access=gate([{kind:'item',targetId:'key-box'}]);assert.throws(()=>model.validateSeed(w),/Unreachable item access/);
  w.items[0].access.conditions.push({kind:'check',targetId:'map-route'});assert.doesNotThrow(()=>model.validateSeed(w));
});
test('a concealed cache exposes its obstacle but no actual item properties or secret content before access',async()=>{
  await create();await act({type:'travel',locationId:'vault'});
  const sealed=view.items.find(i=>i.id==='prism');assert.equal(sealed.name,'Sealed cabinet');assert.equal(sealed.accessState.available,false);assert.equal(sealed.focus,undefined);assert.equal(sealed.lootInput,undefined);
  assert.ok(!view.actions.some(a=>a.id==='pickup:prism'));assert.ok(view.actions.some(a=>a.id==='scene-check:map-route'),'manual access methods work without an accepted quest');
  const l=await engine.loaded(view.campaign.id),ctx=contextFor(l.state,l.adventure,'open the cabinet');assert.doesNotMatch(JSON.stringify(ctx.packet),/Cobalt dream seed|eleven forgotten voices/);assert.ok(ctx.metrics.chars<=12000);
  await rejectUnchanged({type:'pickup',itemId:'prism'},/пока недоступен/);
});
test('an ordinary History roll cannot impersonate a declared check with the same id',async()=>{
  await create();await act({type:'accept_quest',questId:'find-seed'});await act({type:'travel',locationId:'vault'});
  await act({type:'check',ability:'int',skill:'history',dc:5});assert.equal(view.quests[0].objectives[0].completed,false);assert.equal(view.items.find(i=>i.id==='prism').accessState.available,false);
  await rejectUnchanged({type:'pickup',itemId:'prism'},/пока недоступен/);
});
test('a failed access method stays closed, a distinct successful method opens it and reopening never rerolls',async()=>{
  await create();await act({type:'accept_quest',questId:'find-seed'});await act({type:'travel',locationId:'vault'});
  await act({type:'scene_check',checkId:'history'});assert.equal(view.questChecks.find(c=>c.id==='history').success,false);await rejectUnchanged({type:'pickup',itemId:'prism'},/пока недоступен/);
  await act({type:'scene_check',checkId:'map-route'});assert.equal(view.questChecks.find(c=>c.id==='map-route').success,true);assert.equal(view.items.find(i=>i.id==='prism').name,'Cobalt dream seed');assert.ok(view.actions.some(a=>a.id==='pickup:prism'));
  const rolls=view.rolls.length;await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.rolls.length,rolls);assert.equal(view.items.find(i=>i.id==='prism').accessState.available,true);
  await rejectUnchanged({type:'scene_check',checkId:'history'},/уже проверен/);const body=await act({type:'pickup',itemId:'prism'});assert.equal(view.quests[0].status,'completed');assert.ok(view.hero.inventory.some(i=>i.tags.includes('prism')));
  const xp=view.hero.xp;view=await engine.perform(body);assert.equal(view.replayed,true);assert.equal(view.hero.xp,xp);
});
test('all requires both real evidence and the held key; a reusable key is not consumed by pickup',async()=>{
  await create();await act({type:'pickup',itemId:'key'});await act({type:'travel',locationId:'vault'});assert.equal(view.items.find(i=>i.id==='both').accessState.available,false);
  await act({type:'pickup',itemId:'key-box'});assert.ok(view.hero.inventory.some(i=>i.tags.includes('key')));await act({type:'scene_check',checkId:'map-route'});assert.equal(view.items.find(i=>i.id==='both').accessState.available,true);
  await act({type:'pickup',itemId:'both'});assert.ok(view.hero.inventory.some(i=>i.tags.includes('key')));
});
test('passing the key to an NPC removes its eligibility for another not-yet-opened object',async()=>{
  await create();await act({type:'pickup',itemId:'key'});await act({type:'travel',locationId:'vault'});await act({type:'scene_check',checkId:'map-route'});await act({type:'pickup',itemId:'both'});await act({type:'travel',locationId:'camp'});await act({type:'accept_quest',questId:'return-key'});await act({type:'deliver',questId:'return-key',objectiveId:'return-key-objective-1'});await act({type:'travel',locationId:'vault'});
  assert.equal(view.items.find(i=>i.id==='both').name,'Gilded lens','a previously collected find does not become concealed again');
  assert.equal(view.items.find(i=>i.id==='key-box').accessState.available,false);await rejectUnchanged({type:'pickup',itemId:'key-box'},/пока недоступен/);
});
test('actual victory can open guarded loot while retreat and failed victory evidence cannot',async()=>{
  await create('fighter');await act({type:'travel',locationId:'vault'});const l=await engine.loaded(view.campaign.id),item=l.adventure.items.find(i=>i.id==='guarded');
  model.addEvent(l.adventure,'retreat','vault','Retreated.');model.addEvent(l.adventure,'victory','vault','Failed fixture.',{success:false});assert.equal(access.describe(l.state,l.adventure,item).available,false);
  await act({type:'combat',difficulty:'easy',theme:'An old workshop sentinel'},'adventure-loop');await rejectUnchanged({type:'pickup',itemId:'guarded'},/Сейчас идёт бой/);let turns=0;
  while(view.combat&&turns++<40){const action=view.actions.find(a=>a.id.startsWith('core:combat.attack.longsword.'))||view.actions.find(a=>a.id==='core:combat.end_turn');assert.ok(action);await act({type:'action',actionId:action.id},`loop-roll-${turns}`);}
  assert.equal(view.combat,null);assert.ok(view.journal.some(e=>e.kind==='victory'));assert.equal(view.items.find(i=>i.id==='guarded').accessState.available,true);await act({type:'pickup',itemId:'guarded'});assert.ok(view.hero.inventory.some(i=>i.tags.includes('guarded')));
});
test('old successful scene evidence can satisfy a quest but a generic colliding event cannot',async()=>{
  await create();await act({type:'travel',locationId:'vault'});await act({type:'scene_check',checkId:'map-route'});const l=await engine.loaded(view.campaign.id);
  for(const e of l.adventure.events)if(e.kind==='check')delete e.source;await engine.save(l.service,l.state,l.adventure,'legacy_check_evidence');view=await engine.getView(view.campaign.id);await act({type:'accept_quest',questId:'find-seed'});assert.equal(view.quests[0].objectives[0].completed,true);
});

test('a newly invented approach can solve the same obstacle in one validated intent without rerolling its failed method',async()=>{
  await create();await act({type:'accept_quest',questId:'find-seed'});await act({type:'travel',locationId:'vault'});await act({type:'scene_check',checkId:'history'});
  const previous=ai.generateStructured;
  ai.generateStructured=async(type,payload,fallback)=>type==='adventure_intent'?{type:'scene_check',checkId:'ink-route',description:'Compare the older ink traces.',developments:{checks:[{id:'ink-route',alternativeFor:'history',locationId:'vault',trigger:'manual',skill:'history',dc:5,title:'Follow the older ink marks',prompt:'Compare old strokes under the new cipher.',discoveredFact:'The earlier marks identify the ivory release wheel.'}]}}:previous(type,payload,fallback);
  try{view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'Use the older ink marks rather than repeating the cipher.'},{seed:'new-approach'});}finally{ai.generateStructured=previous;}
  assert.equal(view.questChecks.find(c=>c.id==='history').success,false);assert.equal(view.questChecks.find(c=>c.id==='ink-route').success,true);assert.equal(view.quests[0].objectives[0].completed,true);assert.equal(view.items.find(i=>i.id==='prism').accessState.available,true);assert.equal(view.hero.xp,0);
  const l=await engine.loaded(view.campaign.id);assert.equal(l.adventure.events.find(e=>e.id===view.quests[0].objectives[0].evidenceEventId).targetId,'ink-route');
  await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.items.find(i=>i.id==='prism').accessState.available,true);await rejectUnchanged({type:'scene_check',checkId:'ink-route'},/уже проверен/);
});
test('a new alternative satisfies only its check condition and cannot bypass a separate required key',async()=>{
  await create();await act({type:'travel',locationId:'vault'});await act({type:'scene_check',checkId:'new-chart',developments:{checks:[{id:'new-chart',alternativeFor:'map-route',locationId:'vault',trigger:'manual',skill:'history',dc:5,title:'Use an annotated chart',prompt:'Compare notes on an older map.',discoveredFact:'The notes identify the same cabinet release.'}]}});
  assert.equal(view.items.find(i=>i.id==='prism').accessState.available,true);assert.equal(view.items.find(i=>i.id==='both').accessState.available,false);await rejectUnchanged({type:'pickup',itemId:'both'},/пока недоступен/);
});
test('alternative check links reject self-reference, unknown goals and cycles',()=>{
  for(const mutate of [w=>w.checks[0].alternativeFor='history',w=>w.checks[0].alternativeFor='missing',w=>{w.checks[0].alternativeFor='map-route';w.checks[1].alternativeFor='history';}]){const w=structuredClone(world);mutate(w);assert.throws(()=>model.validateSeed(w),/alternative check/);}
});

test('a long chain of 600 original approaches retains access proof and recalls the relevant late method within the context bound',async()=>{
  await create();await act({type:'accept_quest',questId:'find-seed'});await act({type:'travel',locationId:'vault'});const l=await engine.loaded(view.campaign.id),ledger=JSON.parse(l.state.flags.ui_scene_checks);
  for(let i=0;i<600;i++){const id=`long-${i}`,coreId=`core-long-${i}`,title=i===599?'Last ink trail':`Routine comparison ${i}`;l.adventure.loreDefinitions.push({id,alternativeFor:i?`long-${i-1}`:'history',locationId:'vault',trigger:'manual',skill:'history',dc:10,title,prompt:'Compare a distinct layer.',discoveredFact:'A corresponding release mark.'});l.adventure.loreCheckIds[id]=coreId;ledger.definitions.push({id:coreId,sceneId:'vault',trigger:'manual',skill:'history',dc:10,title,prompt:'Compare a distinct layer.',discoveredFact:'A corresponding release mark.'});}
  ledger.attempts.push({key:'core-long-599:hero',checkId:'core-long-599',sceneId:'vault',trigger:'manual',skill:'history',title:'Last ink trail',success:true,roll:{expression:'1d20+5',total:12}});l.state.flags.ui_scene_checks=JSON.stringify(ledger);
  const before=JSON.stringify({state:l.state,adventure:l.adventure});assert.equal(access.describe(l.state,l.adventure,l.adventure.items.find(i=>i.id==='prism')).available,true);const ctx=contextFor(l.state,l.adventure,'last ink trail');assert.ok(ctx.packet.checks.some(c=>c.id==='long-599'));assert.ok(ctx.metrics.chars<=12000);assert.equal(JSON.stringify({state:l.state,adventure:l.adventure}),before);
});

test('legal IDs matching inherited object keys still register real checks and keep reputation numeric',async()=>{
  const previous=ai.generateStructured,w=JSON.parse(JSON.stringify(world).replaceAll('"vault"','"constructor"'));w.checks[0].id='constructor';w.checks[0].skill='history';w.checks[0].dc=5;w.items[1].access.conditions[0].targetId='constructor';w.quests[0].objectives[0].targetId='constructor';w.npcs[0].locationId='constructor';
  ai.generateStructured=async(type,payload,fallback)=>type==='adventure_world'?w:previous(type,payload,fallback);
  try{await create();}finally{ai.generateStructured=previous;}
  await act({type:'pickup',itemId:'key'});await act({type:'accept_quest',questId:'return-key'});await act({type:'travel',locationId:'constructor'});await act({type:'scene_check',checkId:'constructor'});
  assert.equal(view.questChecks.find(c=>c.id==='constructor').success,true);assert.equal(view.items.find(i=>i.id==='prism').accessState.available,true);await act({type:'deliver',questId:'return-key',objectiveId:'return-key-objective-1'});assert.equal(view.reputation.constructor,1);
});
