const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let directory,original,intents=0,lastPayload;
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-quest-acceptance-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';original=ai.generateStructured;
  ai.generateStructured=async(type,payload,fallback)=>{
    if(type==='adventure_intent'){intents++;lastPayload=payload;return {type:'accept_quest',questId:payload.input.includes('missing')?'missing':'first-route',description:'I accept the task.'};}
    return fallback();
  };
});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
test('explicit freeform acceptance creates one real commitment; retry/reopen never accepts or rewards twice',async()=>{
  const before=await engine.create({heroName:'Ada',worldIdea:'Old maps and promises',language:'en'}),body={campaignId:before.campaign.id,expectedRevision:before.campaign.revision,operationId:crypto.randomUUID(),input:'I accept the task Beyond the Familiar.'};
  const result=await engine.perform(body);assert.equal(intents,1);assert.ok(lastPayload.instruction.includes('accept_quest'));assert.equal(result.quests.find(q=>q.id==='first-route').status,'active');
  let loaded=await engine.loaded(result.campaign.id);assert.equal(loaded.adventure.journal.filter(e=>e.kind==='quest_accept').length,1);assert.equal(loaded.adventure.journal.filter(e=>e.kind==='quest_reward').length,0);
  const replay=await engine.perform(body);assert.equal(replay.replayed,true);assert.equal(intents,1);assert.equal(replay.campaign.turn,result.campaign.turn);await srd.closeSessions();loaded=await engine.loaded(result.campaign.id);assert.equal(loaded.adventure.quests[0].status,'active');assert.equal(loaded.adventure.journal.filter(e=>e.kind==='quest_accept').length,1);
});
test('ordinary native talk does not accept an offer, and an unknown freeform quest cannot create a commitment',async()=>{
  const before=await engine.create({heroName:'Ada',worldIdea:'Another quiet road',language:'en'});const talked=await engine.perform({campaignId:before.campaign.id,expectedRevision:before.campaign.revision,operationId:crypto.randomUUID(),command:{type:'talk',npcId:'guide'}});assert.equal(talked.quests[0].status,'offered');
  await assert.rejects(engine.perform({campaignId:talked.campaign.id,expectedRevision:talked.campaign.revision,operationId:crypto.randomUUID(),input:'I accept missing.'}));const loaded=await engine.loaded(talked.campaign.id);assert.equal(loaded.adventure.quests[0].status,'offered');assert.equal(loaded.adventure.journal.filter(e=>e.kind==='quest_accept').length,0);
});
