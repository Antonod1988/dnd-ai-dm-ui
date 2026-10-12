const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),lore=require('../src/scene-checks'),model=require('../src/adventure-model'),prompts=require('../src/adventure-prompts');
let directory,originalGenerate;
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-new-check-preflight-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';originalGenerate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();});
after(async()=>{ai.generateStructured=originalGenerate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});

for(const condition of ['dead','unconscious','hidden','remote'])for(const mode of ['direct','intent'])test(`${mode} newly proposed manual method with ${condition} NPC refuses before registration, dice, narration or any persistent change`,async()=>{
  const view=await engine.create({heroName:'Mira',worldIdea:'Islands of old inscriptions',language:'en'}),loaded=await engine.loaded(view.campaign.id),{state,adventure}=loaded,hero=state.party.members.find(m=>m.id===state.party.heroId),npc=adventure.npcs.find(n=>n.locationId===adventure.currentLocationId);
  adventure.environment||={props:[],npcStates:[]};adventure.environment.npcStates.push({npcId:npc.id,body:{...structuredClone(hero),id:npc.id,kind:'ally',hp:{current:condition==='dead'?0:8,max:8},conditions:condition==='dead'?['dead']:condition==='unconscious'?['unconscious']:[],...(condition==='dead'?{deathSaves:{dead:true,failures:3,successes:0}}:{})}});
  if(condition==='hidden')npc.hidden=true;if(condition==='remote')npc.locationId=adventure.locations.find(l=>l.id!==adventure.currentLocationId).id;
  await engine.save(loaded.service,state,adventure,'new_check_preflight_fixture');const snapshot=JSON.stringify((await engine.loaded(view.campaign.id)).state);
  const id=`method-${condition}-${mode}`,command={type:'scene_check',checkId:id,description:'Inspect a copied route with the guide.',developments:{checks:[{id,locationId:condition==='remote'?npc.locationId:adventure.currentLocationId,npcId:npc.id,trigger:'manual',skill:'investigation',dc:12,title:`Copied route ${condition} ${mode}`,prompt:'Compare the copied route against visible landmarks.',discoveredFact:'A route mark matches the inscription.',alternativeFor:adventure.loreDefinitions[0].id}]}};
  assert.doesNotThrow(()=>model.validateDevelopments(command.developments,adventure));let registerCalls=0,writes=0;const calls=[],register=lore.registerSceneCheck,save=loaded.service.store.saveGameState;
  lore.registerSceneCheck=async()=>{registerCalls++;throw new Error('Bad actor registered a new core check');};loaded.service.store.saveGameState=async()=>{writes++;throw new Error('Invalid approach wrote state');};ai.generateStructured=async(type,payload)=>{calls.push({type,payload});assert.equal(type,'adventure_intent');return structuredClone(command);};
  try{
    await assert.rejects(engine.perform({campaignId:view.campaign.id,expectedRevision:adventure.revision,operationId:crypto.randomUUID(),input:'Try another way to read the inscription.',...(mode==='direct'?{command}: {})}),error=>error.status===400&&/подхода|недоступен/i.test(error.message));
    assert.equal(registerCalls,0);assert.equal(writes,0);assert.deepEqual(calls.map(call=>call.type),mode==='intent'?['adventure_intent']:[]);assert.equal(JSON.stringify((await engine.loaded(view.campaign.id)).state),snapshot);
    const after=await engine.loaded(view.campaign.id);assert.ok(!after.adventure.loreDefinitions.some(d=>d.id===id));assert.ok(!Object.hasOwn(after.adventure.loreCheckIds,id));assert.equal(lore.publicChecks(after.state).length,lore.publicChecks(state).length);assert.deepEqual(after.state.rollLog,state.rollLog);
  }finally{lore.registerSceneCheck=register;loaded.service.store.saveGameState=save;ai.generateStructured=async(type,payload,fallback)=>fallback();}
});

test('intent teaches the exact compact manual-check schema and all supported skills without duplicating the full world record contract',()=>{
  const payload=prompts.intentPayload({adventure:{language:'en'},input:'Try a different inscription method.',candidates:[],knownSpells:[],companionSpellOrders:[],context:{packet:{checks:[]}}}),instruction=payload.instruction;
  const skills=lore.definitionSchema.shape.skill.options;for(const skill of skills)assert.ok(instruction.includes(skill),skill);
  for(const field of ['locationId','trigger:"manual"','title1-120','prompt1-300','discoveredFact1-650','alternativeFor','checkId equal'])assert.ok(instruction.includes(field),field);assert.ok(!instruction.includes('World records: locations'));assert.ok(!instruction.includes('checks:{ability'));
  assert.doesNotThrow(()=>model.developmentSchema.parse({checks:[{id:'new-method',locationId:'start',trigger:'manual',skill:'investigation',dc:12,title:'Compare route',prompt:'Inspect visible landmarks.',discoveredFact:'A landmark matches.',alternativeFor:'old-sign'}]}));
});

test('a healthy local NPC supports one genuine new native approach and the same method cannot reroll',async()=>{
  const view=await engine.create({heroName:'Mira',worldIdea:'Islands of old inscriptions',language:'en'}),loaded=await engine.loaded(view.campaign.id),adventure=loaded.adventure,npc=adventure.npcs.find(n=>n.locationId===adventure.currentLocationId),command={type:'scene_check',checkId:'positive-new-method',description:'Compare the copied route with the local guide.',developments:{checks:[{id:'positive-new-method',locationId:adventure.currentLocationId,npcId:npc.id,trigger:'manual',skill:'investigation',dc:12,title:'Compare a copied coastal route',prompt:'Compare coastlines rather than interpreting the original glyphs.',discoveredFact:'The coastlines establish a corresponding route.',alternativeFor:adventure.loreDefinitions[0].id}]}};
  const calls=[];ai.generateStructured=async(type,payload,fallback)=>{calls.push(type);return type==='adventure_intent'?structuredClone(command):fallback();};
  try{
    const result=await engine.perform({campaignId:view.campaign.id,expectedRevision:adventure.revision,operationId:crypto.randomUUID(),input:'Compare a copied coastal route with the guide.'},{seed:'new-native-approach'});assert.deepEqual(calls,['adventure_intent','adventure_narration']);
    const after=await engine.loaded(view.campaign.id),mapped=after.adventure.loreCheckIds[command.checkId],check=lore.publicChecks(after.state).find(c=>c.id===mapped);assert.ok(mapped);assert.equal(check.attempted,true);assert.equal(after.state.rollLog.length,loaded.state.rollLog.length+1);assert.equal(after.adventure.events.filter(e=>e.kind==='check'&&e.targetId===command.checkId&&e.source==='scene_check').length,1);
    const snapshot=JSON.stringify(after.state);await assert.rejects(engine.perform({campaignId:view.campaign.id,expectedRevision:result.campaign.revision,operationId:crypto.randomUUID(),command:{type:'scene_check',checkId:command.checkId}}),e=>e.status===400&&/уже проверен/.test(e.message));assert.equal(JSON.stringify((await engine.loaded(view.campaign.id)).state),snapshot);assert.equal(calls.length,2);
  }finally{ai.generateStructured=async(type,payload,fallback)=>fallback();}
});
