const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let directory,original,view,calls,intent;
const world={title:'A personal promise',opening:'Iris asks for parcels.',startLocationId:'camp',locations:[{id:'camp',name:'Camp',description:'A quiet supply counter.',connectsTo:['road']},{id:'road',name:'Road',description:'The distant road.',connectsTo:['camp']}],npcs:[{id:'iris',name:'Iris',role:'Supplier',locationId:'camp'},{id:'tarn',name:'Tarn',role:'Apprentice',locationId:'camp'}],items:[{id:'parcel',name:'Parcel',description:'An ordinary parcel.',kind:'quest',locationId:'camp',quantity:3}],checks:[],quests:[{id:'promise',title:'Bring three parcels',summary:'Iris needs three actual parcels.',giverId:'iris',objectives:[{text:'Hand over three parcels',kind:'deliver',targetId:'parcel',recipientId:'iris',quantity:3}]}]};
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-lifecycle-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';original=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls.push(type);return type==='adventure_world'?structuredClone(world):type==='adventure_intent'?structuredClone(intent):fallback();};});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){calls=[];view=await engine.create({heroName:'Rae',worldIdea:'Promises are real',language:'en'});calls=[];}
async function act(command,extra={}){const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command,...extra};view=await engine.perform(body,{seed:'lifecycle-real-rules'});return body;}
async function snapshot(){const l=await engine.loaded(view.campaign.id);return JSON.stringify({state:l.service.loadCampaign(view.campaign.id),adventure:l.adventure});}
async function reject(command,pattern){const before=await snapshot();await assert.rejects(act(command),pattern);assert.equal(await snapshot(),before);}

test('private offered decline records a claimed reason without a promise breach, time, resources, NPC notification or AI',async()=>{
  await create();const loaded=await engine.loaded(view.campaign.id),before=structuredClone({state:loaded.state,adventure:loaded.adventure}),reason='I believe Iris stole the parcels.';calls=[];
  const body=await act({type:'decline_quest',questId:'promise',reason}),quest=view.quests[0];assert.equal(quest.status,'declined');assert.equal(quest.endedReason,reason);assert.equal(quest.decision.reasonConfidence,'player_statement');assert.equal(quest.decision.commitmentBroken,false);assert.equal(quest.decision.npcNotified,false);assert.deepEqual(calls,[]);
  const after=await engine.loaded(view.campaign.id);assert.equal(after.adventure.turn,before.adventure.turn);assert.equal(after.adventure.hours,before.adventure.hours);assert.equal(after.adventure.day,before.adventure.day);assert.deepEqual(after.state.party,before.state.party);assert.deepEqual(after.state.rollLog,before.state.rollLog);assert.deepEqual(after.adventure.npcs,before.adventure.npcs);
  const event=after.adventure.events.find(e=>e.id===quest.terminalEventId);assert.equal(event.kind,'quest_decline');assert.equal(event.reasonConfidence,'player_statement');assert.equal(event.npcNotified,false);assert.ok(!after.state.facts.some(f=>f.text.includes('stole')));assert.equal(quest.rewardClaimed,false);
  view=await engine.perform(body);assert.equal(view.replayed,true);await srd.closeSessions();view=await engine.getView(view.campaign.id);view=await engine.perform(body);assert.equal(view.replayed,true);assert.equal(view.quests[0].status,'declined');
  await reject({type:'accept_quest',questId:'promise'},/уже принята|недоступна/);await reject({type:'decline_quest',questId:'promise'},/недоступно/);await reject({type:'abandon_quest',questId:'promise'},/недоступно/);
});

test('private abandonment preserves partial delivered receipts and does not refund, reward or reactivate',async()=>{
  await create();await act({type:'accept_quest',questId:'promise'});await act({type:'pickup',itemId:'parcel',quantity:2});await act({type:'deliver',questId:'promise',objectiveId:view.quests[0].objectives[0].id,quantity:1});
  const l=await engine.loaded(view.campaign.id),party=structuredClone(l.state.party),turn=l.adventure.turn,hours=l.adventure.hours,receipts=structuredClone(l.adventure.npcs[0].receivedItems);calls=[];
  const body=await act({type:'abandon_quest',questId:'promise',reason:'I am going elsewhere.'});assert.equal(view.quests[0].status,'abandoned');assert.equal(view.quests[0].decision.commitmentBroken,true);assert.equal(view.quests[0].objectives[0].deliveredQuantity,1);assert.equal(view.quests[0].rewardClaimed,false);assert.equal(view.npcs[0].trust,0);assert.deepEqual(calls,[]);
  let after=await engine.loaded(view.campaign.id);assert.deepEqual(after.state.party,party);assert.equal(after.adventure.turn,turn);assert.equal(after.adventure.hours,hours);assert.deepEqual(after.adventure.npcs[0].receivedItems,receipts);assert.equal(after.adventure.events.filter(e=>e.kind==='quest_reward').length,0);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);view=await engine.perform(body);assert.equal(view.replayed,true);after=await engine.loaded(view.campaign.id);assert.deepEqual(after.adventure.npcs[0].receivedItems,receipts);assert.equal(after.adventure.events.filter(e=>e.kind==='quest_abandon').length,1);
  await reject({type:'accept_quest',questId:'promise'},/недоступна|уже принята/);await reject({type:'deliver',questId:'promise',objectiveId:view.quests[0].objectives[0].id,quantity:1},/этап/);
});

test('freeform private decision retains the original player statement with one intent call and no narration',async()=>{
  await create();const input='I privately decide to decline because I suspect Iris stole these parcels.';intent={type:'decline_quest',questId:'promise',reason:'I suspect Iris stole these parcels.',description:'Private decision.'};calls=[];
  await act(undefined,{input});assert.deepEqual(calls,['adventure_intent']);assert.equal(view.quests[0].status,'declined');const l=await engine.loaded(view.campaign.id);assert.ok(l.adventure.messages.some(m=>m.role==='player'&&m.text===input));assert.equal(l.adventure.turn,1);assert.equal(l.adventure.hours,8);assert.equal(l.adventure.events.find(e=>e.kind==='quest_decline').reasonConfidence,'player_statement');assert.equal(l.adventure.npcs[0].receivedQuestDecisions,undefined);
});

test('an explicit spoken decision reaches only its available local giver and uses one ordinary speech/narration turn',async()=>{
  for(const type of ['decline_quest','abandon_quest']){
    await create();if(type==='abandon_quest')await act({type:'accept_quest',questId:'promise'});
    const before=await engine.loaded(view.campaign.id),input='Iris, I cannot take this task.',reason='I must leave.';intent={type,questId:'promise',npcId:'iris',reason,description:input};calls=[];
    const body=await act(undefined,{input});assert.equal(view.quests[0].decision.npcNotified,true);assert.equal(view.quests[0].decision.commitmentBroken,type==='abandon_quest');assert.deepEqual(calls,['adventure_intent','adventure_narration']);
    const after=await engine.loaded(view.campaign.id);assert.equal(after.adventure.turn,before.adventure.turn+1);assert.equal(Math.round((after.adventure.hours-before.adventure.hours)*3600),600);assert.equal(after.adventure.npcs[0].receivedQuestDecisions.length,1);assert.equal(after.adventure.npcs[1].receivedQuestDecisions,undefined);assert.equal(after.adventure.npcs[0].trust,before.adventure.npcs[0].trust);assert.deepEqual(after.state.party,before.state.party);assert.equal(after.adventure.npcs[0].receivedQuestDecisions[0].reasonConfidence,'player_statement');
    view=await engine.perform(body);assert.equal(view.replayed,true);assert.equal((await engine.loaded(view.campaign.id)).adventure.npcs[0].receivedQuestDecisions.length,1);
  }
});

test('lifecycle preflight rejects wrong state, invented/remote/dead/foreign giver, oversized reason, combat and incapacitation',async()=>{
  await create();await reject({type:'abandon_quest',questId:'promise'},/недоступно/);await reject({type:'decline_quest',questId:'unknown'},/недоступно/);await reject({type:'decline_quest',questId:'promise',reason:'x'.repeat(401)},/./);
  await reject({type:'decline_quest',questId:'promise',npcId:'tarn'},/предложил/);await reject({type:'decline_quest',questId:'promise',npcId:'unknown'},/предложил/);
  await act({type:'travel',locationId:'road'});await reject({type:'decline_quest',questId:'promise',npcId:'iris'},/предложил/);await act({type:'travel',locationId:'camp'});
  let l=await engine.loaded(view.campaign.id);l.adventure.environment={props:[],consequences:[],npcStates:[{npcId:'iris',body:{hp:{current:0,max:4},conditions:['dead']}}]};await engine.save(l.service,l.state,l.adventure,'dead_giver_fixture');view=await engine.getView(view.campaign.id);await reject({type:'decline_quest',questId:'promise',npcId:'iris'},/предложил/);
  l=await engine.loaded(view.campaign.id);const hero=l.state.party.members.find(m=>m.id===l.state.party.heroId);hero.conditions=['incapacitated'];await engine.save(l.service,l.state,l.adventure,'incapacitated_decision_fixture');view=await engine.getView(view.campaign.id);assert.equal(view.quests[0].canDecline,false);await reject({type:'decline_quest',questId:'promise'},/не может/);
  await create();await act({type:'combat',theme:'Separate threats',difficulty:'easy'});assert.equal(view.quests[0].canDecline,false);await reject({type:'decline_quest',questId:'promise'},/во время боя/);
});

test('HTTP oversized lifecycle reason returns a human 400 without a decision, turn or resource changes',async()=>{
  await create();const server=await require('../src/server').createAlphaServer({port:0}),url=`http://127.0.0.1:${server.address().port}`;
  try{
    const before=await snapshot(),response=await fetch(`${url}/api/adventure/act`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command:{type:'decline_quest',questId:'promise',reason:'x'.repeat(401)}})});
    assert.equal(response.status,400);const body=await response.json();assert.match(body.error,/Причина.*400 символов/);assert.doesNotMatch(body.error,/reason|too_big|path|\[|\{/);assert.equal(await snapshot(),before);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
