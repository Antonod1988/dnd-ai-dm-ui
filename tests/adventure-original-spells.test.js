const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let directory,core,originalGenerate,view,calls,handler;
const draft={name:'Glass pulse',description:'One pulse of glasslike light.',level:0,rangeFeet:60,cost:'action',target:'creature',saveAbility:'dex',effects:[{type:'damage',dice:'1d6',damageType:'force'}]};
test('live premature closure phrases are rejected only for an ongoing battle; negative and finished-state statements remain valid',()=>{
  const {assertOngoingCombat}=require('../src/adventure-narration');
  for(const text of ['Враг отступает в заросли, и схватка заканчивается.','Бой уже закончился.','The foe retreats, and the fight is over.'])assert.throws(()=>assertOngoingCombat(text,true),/still ongoing/);
  for(const text of ['Бой не закончился: враг только отступил.','The fight is not over.','The enemy retreats farther away.'])assert.doesNotThrow(()=>assertOngoingCombat(text,true));
  assert.doesNotThrow(()=>assertOngoingCombat('The fight is over.',false));
});
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-owned-spells-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';core=await import('../vendor/dnd-core/dist/engine.mjs');originalGenerate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls.push({type,payload});return handler(type,payload,fallback);};});
beforeEach(async()=>{
  calls=[];handler=(type,payload,fallback)=>type==='created_spell'?structuredClone(draft):fallback();
  view=await engine.create({heroName:'Hero',classId:'wizard',worldIdea:'A world of glass islands',language:'en'});
  const loaded=await engine.loaded(view.campaign.id),npc=core.createSrdLevelOneCharacter({id:'luma',name:'Luma',classId:'wizard',raceId:'human'});npc.kind='ally';npc.hp.current=2;npc.spellcasting.slots['1'].current=0;npc.resources.find(r=>r.id==='spell_slots_1').current=0;
  loaded.state.party.members.push(npc);loaded.state.flags.ui_companion_ai_ids='["luma"]';loaded.adventure.npcs.push({id:'luma',name:'Luma',role:'A glass scholar',locationId:loaded.adventure.currentLocationId,disposition:'friendly'});loaded.adventure.companions={history:[],records:[{npcId:'luma',joined:true,state:'joined',foundation:{classId:'wizard',raceId:'human',backgroundId:'sage'},character:structuredClone(npc)}]};
  await engine.save(loaded.service,loaded.state,loaded.adventure,'owned_spell_fixture');view=await engine.getView(view.campaign.id);calls=[];
});
after(async()=>{ai.generateStructured=originalGenerate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
test('NPC draft uses only selected caster identity and depleted own capacity without learning or casting',async()=>{
  const before=await engine.loaded(view.campaign.id),result=await engine.spellDraft(view.campaign.id,'Glass light','luma',view.campaign.revision),after=await engine.loaded(view.campaign.id);
  assert.equal(result.ok,true);assert.equal(result.casterId,'luma');assert.equal(result.spell.ownerId,'luma');assert.equal(result.revision,view.campaign.revision);assert.equal(calls.length,1);assert.equal(calls[0].payload.caster.id,'luma');assert.equal(calls[0].payload.caster.slots['1'].current,0);assert.deepEqual(after.state.party,before.state.party);assert.equal(after.adventure.revision,before.adventure.revision);assert.equal(after.adventure.turn,before.adventure.turn);assert.equal(after.adventure.createdSpells.length,0);
});
test('unavailable owners and stale draft requests fail before a paid model request',async()=>{
  for(const id of ['missing',view.npcs.find(n=>n.id!=='luma').id])await assert.rejects(engine.spellDraft(view.campaign.id,'Light',id,view.campaign.revision));
  await assert.rejects(engine.spellDraft(view.campaign.id,'Light','luma',view.campaign.revision-1),e=>e.status===409);assert.equal(calls.length,0);
});
test('owned NPC learning is journaled once, persists reopening, preserves injury and empty slots; replay identity is strict',async()=>{
  const before=await engine.loaded(view.campaign.id),options={expectedRevision:view.campaign.revision,operationId:'owned-study'};
  const learned=await engine.learnSpell(view.campaign.id,draft,'luma',options);assert.equal(learned.ready,true);assert.equal(learned.createdSpells.length,0);const npc=learned.party.find(p=>p.id==='luma');assert.equal(npc.createdSpells.length,1);assert.equal(npc.createdSpells[0].ownerId,'luma');assert.equal(npc.hp.current,2);assert.equal(npc.spellcasting.slots['1'].current,0);assert.equal(learned.campaign.turn,before.adventure.turn);
  const replay=await engine.learnSpell(view.campaign.id,draft,'luma',options);assert.equal(replay.replayed,true);assert.equal(replay.campaign.revision,learned.campaign.revision);assert.equal(replay.journal.filter(e=>e.kind==='spell_learned').length,1);
  const wrong=await engine.learnSpell(view.campaign.id,draft,view.hero.id,options);assert.equal(wrong.ok,false);assert.equal((await engine.learnSpell(view.campaign.id,{...draft,name:'Different'},'luma',options)).ok,false);
  await srd.closeSessions();assert.equal((await engine.getView(view.campaign.id)).party.find(p=>p.id==='luma').createdSpells[0].id,npc.createdSpells[0].id);assert.equal(calls.length,0);
});
test('Hero cannot cast the NPC book and a draft cannot silently change owner or teach beyond own capacity',async()=>{
  const learned=await engine.learnSpell(view.campaign.id,draft,'luma'),id=learned.party.find(p=>p.id==='luma').createdSpells[0].id;
  const before=await engine.loaded(view.campaign.id);await assert.rejects(srd.command({type:'cast_created_spell',campaignId:view.campaign.id,spellId:id,targetId:view.hero.id}));
  assert.equal((await engine.learnSpell(view.campaign.id,{...draft,ownerId:'luma'},view.hero.id)).ok,false);
  assert.equal((await engine.learnSpell(view.campaign.id,{...draft,level:2},'luma')).ok,false);
  const after=await engine.loaded(view.campaign.id);assert.deepEqual(after.state.party,before.state.party);assert.equal(after.adventure.revision,before.adventure.revision);
});
test('stale learning and an in-flight draft cannot overwrite a newer campaign revision',async()=>{
  await engine.learnSpell(view.campaign.id,draft,'luma');await assert.rejects(engine.learnSpell(view.campaign.id,{...draft,name:'Stale'},'luma',{expectedRevision:view.campaign.revision,operationId:'stale-study'}),e=>e.status===409);
  view=await engine.getView(view.campaign.id);let release,started;const waiting=new Promise(r=>started=r);handler=async()=>{started();await new Promise(r=>release=r);return structuredClone(draft);};
  const pending=engine.spellDraft(view.campaign.id,'Waiting light','luma',view.campaign.revision);await waiting;
  await engine.learnSpell(view.campaign.id,{...draft,name:'Current'},'luma',{expectedRevision:view.campaign.revision,operationId:'current-study'});release();await assert.rejects(pending,e=>e.status===409);
  const after=await engine.getView(view.campaign.id);assert.deepEqual(after.party.find(p=>p.id==='luma').createdSpells.map(s=>s.name),['Glass pulse','Current']);
});
test('exact owned cantrip uses the NPC turn and records one durable outcome in the adventure journal',async()=>{
  view=await engine.learnSpell(view.campaign.id,draft,'luma');const loaded=await engine.loaded(view.campaign.id),hero=core.characterToCombatant(loaded.state.party.members[0]),npc=core.characterToCombatant(loaded.state.party.members.find(p=>p.id==='luma'));
  const enemy={...structuredClone(hero),id:'foe',sourceCharacterId:undefined,name:'Foe',kind:'enemy',hp:{current:100,max:100,temp:0},tactics:{},attacks:[]};
  loaded.state.combat=core.ensureTurnBudget({id:'owned-fight',round:1,turnIndex:0,participants:[hero,npc,enemy],log:[],environment:{id:'test',name:'Test',description:'',victory:[],defeat:[],escape:[]}});await engine.save(loaded.service,loaded.state,loaded.adventure,'owned_fight_fixture');view=await engine.getView(view.campaign.id);
  const option=view.party.find(p=>p.id==='luma').order.spellOptions.find(o=>o.original&&o.targetId==='foe');assert.ok(option);
  view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command:{type:'party_order',npcId:'luma',mode:'cast',spellActionId:option.id}});
  assert.equal(view.campaign.turn,loaded.adventure.turn);calls=[];handler=(type,payload,fallback)=>{if(type==='adventure_narration'){assert.equal(payload.battleStatus.ongoing,true);return {narration:'The foe retreats, and the fight is over.'};}if(type==='adventure_narration_repair'){assert.match(payload.correction.reason,/still ongoing/);return {narration:'The fight continues. The original pulse strikes at the foe.'};}return fallback();};view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),actionId:'core:combat.end_turn'},{seed:'owned-cantrip'});
  const result=view.party.find(p=>p.id==='luma').order.lastOrderResult;assert.equal(result.status,'resolved');assert.equal(result.spellActionId,option.id);assert.equal(view.party.find(p=>p.id==='luma').spellcasting.slots['1'].current,0);assert.equal(view.journal.filter(e=>e.kind==='party_order_result'&&e.spellActionId===option.id).length,1);
  assert.deepEqual(JSON.parse((await engine.loaded(view.campaign.id)).state.flags.ui_companion_original_spells),{});
  assert.deepEqual(calls.map(c=>c.type),['adventure_narration','adventure_narration_repair']);assert.ok(!view.messages.some(m=>m.text.includes('fight is over')));assert.equal(view.messages.at(-1).text,'The fight continues. The original pulse strikes at the foe.');
});

test('natural NPC instruction includes its original exact spell in the bounded intent menu without a cast or narration',async()=>{
  view=await engine.learnSpell(view.campaign.id,draft,'luma');const loaded=await engine.loaded(view.campaign.id),hero=core.characterToCombatant(loaded.state.party.members[0]),npc=core.characterToCombatant(loaded.state.party.members.find(p=>p.id==='luma'));
  const enemy={...structuredClone(hero),id:'foe',sourceCharacterId:undefined,name:'Foe',kind:'enemy',hp:{current:100,max:100,temp:0},tactics:{},attacks:[]};
  loaded.state.combat=core.ensureTurnBudget({id:'intent-fight',round:1,turnIndex:0,participants:[hero,npc,enemy],log:[],environment:{id:'test',name:'Test',description:'',victory:[],defeat:[],escape:[]}});await engine.save(loaded.service,loaded.state,loaded.adventure,'intent_fight_fixture');view=await engine.getView(view.campaign.id);const before=view.campaign.turn;calls=[];
  handler=(type,payload,fallback)=>{if(type!=='adventure_intent')return fallback();const menu=payload.companionSpellOrders;assert.ok(JSON.stringify(menu).length<=4800);const option=menu.find(row=>row.npcId==='luma').options.find(o=>o.name==='Glass pulse'&&o.targetId==='foe');assert.ok(option);return {type:'party_order',npcId:'luma',mode:'cast',spellActionId:option.spellActionId,description:'Queue the exact original spell.'};};
  view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'Luma, cast Glass pulse on Foe on your next turn.'});assert.equal(view.campaign.turn,before);assert.equal(view.party.find(p=>p.id==='luma').order.mode,'cast');assert.deepEqual(calls.map(c=>c.type),['adventure_intent']);assert.equal(view.party.find(p=>p.id==='luma').spellcasting.slots['1'].current,0);
  const context=require('../src/adventure-context').contextFor((await engine.loaded(view.campaign.id)).state,(await engine.loaded(view.campaign.id)).adventure,'Glass pulse').packet;assert.equal(context.createdSpells.length,0);assert.equal(context.party.find(p=>p.id==='luma').createdSpells[0].name,'Glass pulse');
});

test('one bounded draft repair fixes a typed effect; twice-invalid output never enters either book',async()=>{
  handler=type=>type==='created_spell_repair'?structuredClone(draft):{...draft,effects:[{type:'force',dice:'1d6'}]};
  assert.equal((await engine.spellDraft(view.campaign.id,'Glass light','luma')).ok,true);assert.deepEqual(calls.map(c=>c.type),['created_spell','created_spell_repair']);
  calls=[];handler=()=>({...draft,effects:[{type:'invented'}]});const before=await engine.loaded(view.campaign.id),result=await engine.spellDraft(view.campaign.id,'Glass light','luma');assert.equal(result.ok,false);assert.equal(calls.length,2);const after=await engine.loaded(view.campaign.id);assert.deepEqual(after.state.party,before.state.party);assert.deepEqual(after.adventure.createdSpells,before.adventure.createdSpells);assert.equal(after.adventure.revision,before.adventure.revision);
});
