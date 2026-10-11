const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const ai=require('../src/ai-bridge');
const srd=require('../src/srd-engine');
const engine=require('../src/adventure-engine');
const contextFor=require('../src/adventure-context').contextFor;
let directory,generate,view,intent,calls=[];
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'adventure-npc-combat-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;
  ai.generateStructured=async(type,payload,fallback)=>{calls.push({type,payload});if(type.startsWith('adventure_intent'))return intent||fallback();return fallback();};
});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(classId='fighter'){intent=null;view=await engine.create({heroName:'NPC combat fixture',classId,worldIdea:'Ordinary village',language:'en'});}
const body=(command,input='')=>({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command,input});
// A documented fixture selects the player turn to isolate a specific rules mutation.
async function heroTurn(){const loaded=await engine.loaded(view.campaign.id);assert.ok(loaded.state.combat);loaded.state.combat.turnIndex=loaded.state.combat.participants.findIndex(p=>(p.sourceCharacterId||p.id)===loaded.state.party.heroId);delete loaded.state.combat.turnBudget;await engine.save(loaded.service,loaded.state,loaded.adventure,'npc_player_turn_fixture');view=await engine.getView(view.campaign.id);}

test('freeform fight and legacy exact NPC name use the permanent identity, real initiative and no generated rewards',async()=>{
  await create();const before=structuredClone(view);intent={type:'npc_combat',npcId:'guide',description:'I challenge the local.'};const request=body(undefined,'I start a fight with the Guide');view=await engine.perform(request,{seed:'npc-initiative'});
  assert.ok(view.combat);assert.equal(view.combat.participants.filter(p=>p.kind==='enemy').length,1);assert.equal(view.combat.participants.find(p=>p.kind==='enemy').id,'guide');assert.equal(view.hero.xp,before.hero.xp);assert.equal(view.campaign.hours,before.campaign.hours);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,0);
  const loaded=await engine.loaded(view.campaign.id);assert.ok(loaded.state.combat.environment.id.startsWith('npc_encounter:'));assert.deepEqual(loaded.state.combat.environment.victory,[]);assert.ok(loaded.adventure.activeNpcEncounter);assert.equal(loaded.adventure.activeEncounter,null);
  const replay=await engine.perform(request);assert.equal(replay.replayed,true);assert.deepEqual(replay.combat,view.combat);assert.deepEqual(replay.hero,view.hero);
  await create();view=await engine.perform(body({type:'combat',enemyName:' THE GUIDE!!! ',difficulty:'hard'}),{seed:'npc-initiative'});assert.ok(view.combat);assert.equal(view.combat.participants.find(p=>p.kind==='enemy').id,'guide');assert.equal(view.hero.xp,0);
  await create();intent={type:'action',actionId:'fight:guide',developments:{}};view=await engine.perform(body(undefined,'I begin a duel with the Guide'),{seed:'npc-initiative'});assert.ok(view.combat);assert.equal(view.combat.participants.find(p=>p.kind==='enemy').id,'guide');assert.equal(view.journal[0].kind,'npc_combat');assert.ok(view.journal[0].text.includes('Инициатива'));
});

test('a real sword killing blow persists the exact corpse before the core removes combat and cannot grant location quest victory or loot',async()=>{
  await create();view=await engine.perform(body({type:'npc_combat',npcId:'guide'}),{seed:'npc-initiative'});const xp=view.hero.xp,coins=view.economy.coins;
  let attacks=0;
  for(let i=0;i<12&&view.combat;i++){
    await heroTurn();const action=view.actions.find(a=>a.id.startsWith('core:combat.attack.')&&a.id.endsWith('.guide'));assert.ok(action);view=await engine.perform({...body(),actionId:action.id},{seed:`npc-sword-${i}`});attacks++;
  }
  assert.equal(view.combat,null);assert.ok(attacks>0);const npc=view.npcs.find(n=>n.id==='guide');assert.equal(npc.body.hp.current,0);assert.equal(npc.canInteract,false);assert.equal(view.hero.xp,xp);assert.equal(view.economy.coins,coins);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,0);assert.equal(view.quests.flatMap(q=>q.objectives).some(o=>o.kind==='victory'&&o.completed),false);
  const id=view.campaign.id;await srd.closeSessions();view=await engine.getView(id);assert.equal(view.npcs.find(n=>n.id==='guide').body.hp.current,0);const loaded=await engine.loaded(id);assert.equal(loaded.state.flags.ui_bound_npc_combat_snapshot,undefined);const before=structuredClone(view);view=await engine.perform(body({type:'npc_combat',npcId:'guide'}));assert.ok(view.refusal);assert.equal(view.campaign.turn,before.campaign.turn);assert.deepEqual(view.rolls,before.rolls);assert.deepEqual(view.npcs,before.npcs);
  view=await engine.perform(body({type:'combat',enemyName:'A distinct roadside threat',difficulty:'easy'}),{seed:'adventure-loop'});assert.ok(view.combat);assert.equal(view.npcs.find(n=>n.id==='guide').body.hp.current,0);assert.ok(view.combat.participants.some(p=>p.id.startsWith('enemy_generated_')));
});

test('catalog Magic Missile can target the same NPC and its terminal damage, slots and dialogue exclusion survive reopening',async()=>{
  await create('wizard');view=await engine.perform(body({type:'npc_combat',npcId:'guide'}),{seed:'npc-initiative'});await heroTurn();const slot=view.hero.spellcasting.slots[1].current;
  view=await engine.perform(body({type:'cast_spell',spellId:'spell_magic_missile',targetId:'guide'}),{seed:'npc-missile'});
  assert.equal(view.combat,null);assert.equal(view.npcs.find(n=>n.id==='guide').body.hp.current,0);assert.equal(view.hero.spellcasting.slots[1].current,slot-1);assert.equal(view.hero.xp,0);
  const narrationPayload=calls.findLast(c=>c.type==='adventure_narration').payload;
  assert.equal(narrationPayload.outcome.permanentNpcCombat.rewardsGranted,false);assert.equal(narrationPayload.outcome.permanentNpcCombat.participants[0].hp.current,0);
  const loaded=await engine.loaded(view.campaign.id);const packet=require('../src/adventure-narration').scenePacket(loaded.state,loaded.adventure,view.actions);assert.equal(packet.actors.some(a=>a.id==='guide'),false);assert.equal(contextFor(loaded.state,loaded.adventure,'Guide').packet.npcs.find(n=>n.id==='guide').body.hp.current,0);
});

test('retreat keeps an injured NPC body and is never confused with a stale generated victory',async()=>{
  await create();let loaded=await engine.loaded(view.campaign.id);loaded.adventure.npcs[0].combatProfile='guard';await engine.save(loaded.service,loaded.state,loaded.adventure,'guard_profile_fixture');view=await engine.getView(view.campaign.id);
  view=await engine.perform(body({type:'npc_combat',npcId:'guide'}),{seed:'npc-initiative'});await heroTurn();loaded=await engine.loaded(view.campaign.id);const npc=loaded.state.combat.participants.find(p=>p.id==='guide');npc.hp.current=3;loaded.state.flags.ui_last_combat_outcome='victory';await engine.save(loaded.service,loaded.state,loaded.adventure,'injured_guard_stale_flag_fixture');view=await engine.getView(view.campaign.id);
  const flee=view.actions.find(a=>a.id.includes('flee'));assert.ok(flee);view=await engine.perform({...body(),actionId:flee.id},{seed:'npc-flee'});assert.equal(view.combat,null);assert.equal(view.npcs.find(n=>n.id==='guide').body.hp.current,3);assert.equal(view.hero.xp,0);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,0);loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.state.flags.ui_last_combat_outcome,'retreat');
  view=await engine.perform(body({type:'npc_combat',npcId:'guide'}),{seed:'npc-initiative'});assert.equal(view.combat.participants.find(p=>p.id==='guide').hp.current,3);
});

test('missing remote hidden and incapacitated NPC starts refuse before mechanics time or rolls change',async()=>{
  for(const kind of ['missing','remote','hidden','unconscious']){
    await create();const loaded=await engine.loaded(view.campaign.id);if(kind==='remote')loaded.adventure.npcs[0].locationId='threshold';if(kind==='hidden')loaded.adventure.npcs[0].hidden=true;if(kind==='unconscious'){
      const rules=await import('../vendor/dnd-core/dist/engine.mjs');const npc=loaded.adventure.npcs[0],record={npcId:npc.id,profile:'civilian',body:require('../src/npc-encounters').createBody(npc,rules),disposition:'neutral'};record.body.conditions=['unconscious'];loaded.adventure.environment={version:1,props:[],npcStates:[record],consequences:[],appliedPlans:[]};
    }
    await engine.save(loaded.service,loaded.state,loaded.adventure,'invalid_npc_fixture');view=await engine.getView(view.campaign.id);const before=structuredClone(view);view=await engine.perform(body({type:'npc_combat',npcId:kind==='missing'?'absent':'guide'}));assert.ok(view.refusal);assert.equal(view.combat,null);assert.equal(view.campaign.turn,before.campaign.turn);assert.equal(view.campaign.hours,before.campaign.hours);assert.deepEqual(view.hero,before.hero);assert.deepEqual(view.rolls,before.rolls);assert.deepEqual(view.environment,before.environment);
  }
});

test('real Sleep incapacitates the NPC without killing it, and exploration time expires that saved effect without healing injuries',async()=>{
  await create('wizard');let loaded=await engine.loaded(view.campaign.id);
  // Select a known first-level spell in this wizard's prepared-spell fixture.
  loaded.state.party.members.find(p=>p.id===loaded.state.party.heroId).spellcasting.prepared=['spell_sleep'];
  await engine.save(loaded.service,loaded.state,loaded.adventure,'sleep_preparation_fixture');view=await engine.getView(view.campaign.id);
  view=await engine.perform(body({type:'npc_combat',npcId:'guide'}),{seed:'npc-initiative'});await heroTurn();
  loaded=await engine.loaded(view.campaign.id);loaded.state.combat.participants.find(p=>p.id==='guide').hp.current=2;
  await engine.save(loaded.service,loaded.state,loaded.adventure,'sleep_injured_target_fixture');view=await engine.getView(view.campaign.id);
  view=await engine.perform(body({type:'cast_spell',spellId:'spell_sleep',targetId:'guide'}),{seed:'npc-sleep'});
  assert.equal(view.combat,null);const asleep=view.npcs.find(n=>n.id==='guide');assert.equal(asleep.body.hp.current,2);assert.ok(asleep.body.conditions.includes('unconscious'));assert.equal(asleep.canInteract,false);assert.equal(view.hero.xp,0);
  loaded=await engine.loaded(view.campaign.id);assert.ok(loaded.adventure.environment.npcStates[0].body.activeEffects.length);
  view=await engine.perform(body({type:'rest',kind:'long'}));const awake=view.npcs.find(n=>n.id==='guide');assert.equal(awake.body.hp.current,2);assert.equal(awake.body.conditions.includes('unconscious'),false);assert.equal(awake.canInteract,true);assert.equal(awake.disposition,'hostile');
  const id=view.campaign.id;await srd.closeSessions();view=await engine.getView(id);assert.equal(view.npcs.find(n=>n.id==='guide').canInteract,true);
});
