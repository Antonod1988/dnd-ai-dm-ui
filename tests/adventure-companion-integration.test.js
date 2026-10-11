const {test,before,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),companions=require('../src/adventure-companions'),model=require('../src/adventure-model');
const {contextFor}=require('../src/adventure-context');
let directory,generate,view,intent,offer=true;
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'companion-integration-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{if(type.startsWith('adventure_world')){const seed=fallback();seed.npcs[0].role='An apprentice wizard willing to travel';seed.npcs[0].personality='Practical and curious';if(offer)seed.npcs[0].companionOffer={classId:'wizard',raceId:'human',backgroundId:'sage',reason:'Wants to study the old road together'};return seed;}if(type.startsWith('adventure_intent'))return intent||fallback();return fallback();};});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(hasOffer=true,classId='fighter'){offer=hasOffer;intent=null;view=await engine.create({heroName:'Companion fixture',classId,worldIdea:'An ordinary road adventure',language:'en'});}
const body=(command,input='')=>({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command,input});
async function recruitSeed(adventure){const loaded=await engine.loaded(view.campaign.id);for(let i=0;i<80;i++){const seed=`companion-join-${i}`,r=await companions.resolve({state:loaded.state,adventure:adventure||loaded.adventure,command:{type:'recruit',npcId:'guide'},sourceId:`fixture-${i}`,seed});if(r.ok&&r.outcome.success)return seed;}assert.fail('No successful real invitation seed');}
async function join(){const request=body({type:'recruit',npcId:'guide'});view=await engine.perform(request,{seed:await recruitSeed()});assert.equal(view.party.length,2);return request;}

test('free input selecting an available recruitment action creates a real ally and a replay cannot duplicate class gear or money',async()=>{
  await create();intent={type:'action',actionId:'recruit:guide'};const request=body(undefined,'I invite the apprentice to travel with me'),seed=await recruitSeed();view=await engine.perform(request,{seed});assert.equal(view.party.length,2);const ally=view.party.find(p=>p.id==='guide');assert.equal(ally.kind,'ally');assert.ok(ally.spellcasting.slots[1]);assert.ok(ally.spells.some(s=>s.name==='Magic Missile'));assert.equal(ally.inventory.some(i=>i.itemId==='gold_piece'),false);assert.equal(view.hero.xp,0);assert.equal(view.npcs[0].companion.joined,true);assert.equal(view.economy.markets.length,0);
  assert.ok(!view.actions.some(a=>a.id==='fight:guide'));
  const replay=await engine.perform(request);assert.equal(replay.replayed,true);assert.deepEqual(replay.party,view.party);assert.equal(replay.campaign.turn,view.campaign.turn);
});

test('a new offer for an existing person is validated in the same explicit invitation, while invented classes and immutable foundations cannot be rewritten',async()=>{
  await create(false);const command={type:'recruit',npcId:'guide',developments:{companionOffers:[{npcId:'guide',classId:'wizard',raceId:'human',backgroundId:'sage',reason:'Offers to study the route together'}]}};
  const loaded=await engine.loaded(view.campaign.id),proposed=structuredClone(loaded.adventure);model.applyDevelopments(proposed,model.validateDevelopments(command.developments,proposed));view=await engine.perform(body(command),{seed:await recruitSeed(proposed)});assert.equal(view.party.length,2);
  const current=await engine.loaded(view.campaign.id);assert.throws(()=>model.validateDevelopments({companionOffers:[{npcId:'missing',classId:'wizard',reason:'Unrelated'}]},current.adventure));assert.throws(()=>model.validateDevelopments({companionOffers:[{npcId:'guide',classId:'god',reason:'Invented power'}]},current.adventure));assert.throws(()=>model.validateDevelopments({companionOffers:[{npcId:'guide',classId:'fighter',reason:'Rebuild spent resources'}]},current.adventure));
  for(const id of ['hero','player','dm'])assert.throws(()=>model.validateDevelopments({npcs:[{id,name:'Colliding role',role:'A person',locationId:'start'}]},current.adventure));
  const before=structuredClone(view);view=await engine.perform(body({type:'recruit',npcId:'guide',developments:{items:[{id:'fake',name:'Extra reward',description:'Unrequested',locationId:'start',kind:'weapon'}]}}));assert.ok(view.refusal);assert.deepEqual(view.party,before.party);assert.equal(view.campaign.turn,before.campaign.turn);
});

test('real travel moves only joined companions, preserves persona and avoids duplicate voices; dismissal/rejoin retain exact HP/slots/items across SQLite reopen',async()=>{
  await create();await join();view=await engine.perform(body({type:'travel',locationId:'threshold'}));assert.equal(view.npcs[0].locationId,'threshold');let loaded=await engine.loaded(view.campaign.id);const packet=contextFor(loaded.state,loaded.adventure).packet;assert.equal(packet.party[0].id,'guide');assert.ok(JSON.stringify(packet).length<=12000);
  const actors=require('../src/adventure-narration').scenePacket(loaded.state,loaded.adventure,view.actions).actors;assert.equal(actors.filter(a=>a.id==='guide').length,1);assert.equal(actors.find(a=>a.id==='guide').kind,'companion');assert.equal(actors.find(a=>a.id==='guide').personality,'Practical and curious');
  // Explicit isolated fixture of earlier wounds and a spent prepared spell.
  const ally=loaded.state.party.members.find(p=>p.id==='guide');ally.hp.current=2;ally.spellcasting.slots[1].current=0;ally.resources.find(r=>r.id==='spell_slots_1').current=0;ally.inventory=ally.inventory.filter(i=>i.itemId!=='healing_potion');await engine.save(loaded.service,loaded.state,loaded.adventure,'companion_spent_fixture');view=await engine.getView(view.campaign.id);
  view=await engine.perform(body({type:'dismiss',npcId:'guide'}));assert.equal(view.party.length,1);assert.equal(view.npcs[0].locationId,'threshold');const id=view.campaign.id;await srd.closeSessions();view=await engine.getView(id);view=await engine.perform(body({type:'recruit',npcId:'guide'}));const rejoined=view.party.find(p=>p.id==='guide');assert.equal(rejoined.hp.current,2);assert.equal(rejoined.spellcasting.slots[1].current,0);assert.equal(rejoined.inventory.some(i=>i.itemId==='healing_potion'),false);assert.equal(rejoined.inventory.some(i=>i.itemId==='gold_piece'),false);
});

test('a genuine companion opening cast can end a generated encounter, award its real rewards once and keep the spent slot with recorded automatic action',async()=>{
  await create();await join();let loaded=await engine.loaded(view.campaign.id);const hero=loaded.state.party.members.find(p=>p.id===loaded.state.party.heroId),ally=loaded.state.party.members.find(p=>p.id==='guide');
  // Initiative and fragile-opponent fixtures isolate the controller's opening-terminal branch.
  hero.abilities.dex=1;ally.abilities.dex=50;await engine.save(loaded.service,loaded.state,loaded.adventure,'companion_opening_fixture');view=await engine.getView(view.campaign.id);
  const original=loaded.service.planGeneratedEncounter;loaded.service.planGeneratedEncounter=()=>({monsters:[{name:'Fragile generated foe',role:'brute',level:1,hitPoints:1,armorClass:10}]});
  const request=body({type:'combat',difficulty:'easy'}),beforeSlot=view.party.find(p=>p.id==='guide').spellcasting.slots[1].current;
  try{view=await engine.perform(request,{seed:'opening-companion'});}finally{loaded.service.planGeneratedEncounter=original;}
  assert.equal(view.combat,null);assert.ok(view.hero.xp>0);assert.equal(view.party.find(p=>p.id==='guide').spellcasting.slots[1].current,beforeSlot-1);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,1);assert.ok(view.journal.some(e=>e.kind==='companion_action'&&e.targetId==='guide'));
  const replay=await engine.perform(request);assert.equal(replay.hero.xp,view.hero.xp);assert.deepEqual(replay.party,view.party);assert.equal(replay.items.filter(i=>i.origin?.kind==='combat').length,1);
});

test('joined-companion payments and deliveries enter the real inventory once and the old merchant reserve cannot duplicate them',async()=>{
  await create();await join();let loaded=await engine.loaded(view.campaign.id);const npc=loaded.adventure.npcs[0],market=loaded.adventure.economy.markets[0];npc.receivedCoins=2;market.cash+=2;npc.receivedItems=[{eventId:'real-delivery-fixture',item:{itemId:'gift',name:'Delivered object',quantity:1,weight:1,tags:['quest_item'],description:'Actual acknowledged delivery',identified:true}}];await engine.save(loaded.service,loaded.state,loaded.adventure,'new_receipt_fixture');view=await engine.getView(view.campaign.id);
  view=await engine.perform(body({type:'inspect'}));let ally=view.party.find(p=>p.id==='guide');assert.equal(ally.inventory.find(i=>i.itemId==='gold_piece').quantity,2);assert.equal(ally.inventory.find(i=>i.itemId==='gift').quantity,1);loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.economy.markets[0].cash,40);
  view=await engine.perform(body({type:'inspect'}));ally=view.party.find(p=>p.id==='guide');assert.equal(ally.inventory.find(i=>i.itemId==='gold_piece').quantity,2);assert.equal(ally.inventory.find(i=>i.itemId==='gift').quantity,1);
});

test('a dead companion cannot regain HP, slots, class resources or item charges from the party rest, including a sparse death-save-only marker',async()=>{
  for(const sparse of [false,true]){
    await create();await join();let loaded=await engine.loaded(view.campaign.id);const ally=loaded.state.party.members.find(p=>p.id==='guide');ally.hp.current=0;ally.conditions=sparse?['unconscious']:['dead'];ally.deathSaves={successes:0,failures:3,stable:false,dead:true};for(const resource of ally.resources)resource.current=0;for(const slot of Object.values(ally.spellcasting.slots))slot.current=0;
    await engine.save(loaded.service,loaded.state,loaded.adventure,'dead_companion_fixture');view=await engine.getView(view.campaign.id);const before=structuredClone(view.party.find(p=>p.id==='guide'));
    view=await engine.perform(body({type:'rest',kind:'long'}));const after=view.party.find(p=>p.id==='guide');assert.equal(after.hp.current,0);assert.equal(after.deathSaves.dead,true);assert.deepEqual(after.resources,before.resources);assert.deepEqual(after.spellcasting.slots,before.spellcasting.slots);assert.deepEqual(after.inventory,before.inventory);
    loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.companions.records[0].character.hp.current,0);assert.equal(loaded.adventure.environment.npcStates[0].body.hp.current,0);
  }
});

test('narration identifies the actual healed companion and records initial automatic death-save actions before the first player turn',async()=>{
  await create(true,'bard');await join();const loaded=await engine.loaded(view.campaign.id);
  const ally=loaded.state.party.members.find(m=>m.id==='guide');ally.hp.current=0;ally.conditions=['unconscious','dying'];ally.deathSaves={successes:0,failures:0,stable:false,dead:false};
  // Controlled HP and initiative isolate the opening death-save branch; no live save is used.
  ally.abilities.dex=50;const hero=loaded.state.party.members.find(m=>m.id==='hero');hero.abilities.dex=1;
  await engine.save(loaded.service,loaded.state,loaded.adventure,'opening_death_save_fixture');view=await engine.getView(view.campaign.id);
  let payload;const original=ai.generateStructured;ai.generateStructured=async(type,p,fallback)=>{if(type==='adventure_narration')payload=p;return original(type,p,fallback);};
  try{
    view=await engine.perform(body({type:'combat',difficulty:'easy'}),{seed:'opening-dying-npc'});
    assert.ok(view.journal.some(e=>e.kind==='companion_action'&&e.targetId==='guide'));
    assert.ok(payload.outcome.combatActions.some(e=>e.actorId==='guide'));
    view=await engine.perform(body({type:'cast_spell',spellId:'spell_cure_wounds',targetId:'guide'}),{seed:'heal-exact-npc'});
    const change=payload.outcome.partyChanges.find(m=>m.id==='guide');assert.ok(change);assert.equal(change.name,view.party.find(m=>m.id==='guide').name);assert.equal(change.hpBefore.current,0);assert.ok(change.hpAfter.current>0);assert.ok(!change.conditionsAfter.includes('unconscious'));
    assert.match(payload.instruction,/caster is not necessarily the recipient/);
  }finally{ai.generateStructured=original;}
});
