const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const model=require('../src/adventure-model'),quests=require('../src/adventure-quests'),memory=require('../src/adventure-memory');
const {contextFor,MAX_CHARS}=require('../src/adventure-context'),{journalMemory}=require('../src/adventure-recollections'),categories=require('../src/journal-categories');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
function makeQuest(draft){const input={heroName:'Mira',worldIdea:'Islands of stories',language:'en'};return model.makeAdventure({...model.fallbackSeed(input),quests:[draft]},input).quests[0];}

function setup(){
  const input={heroName:'Mira',worldIdea:'Islands of stories',language:'en'},adventure=model.makeAdventure(model.fallbackSeed(input),input);
  const hero={id:'hero',name:'Mira',level:1,hp:{current:8,max:8},ac:12,conditions:[],abilities:{},skillProficiencies:[],resources:[],inventory:[]};
  adventure.quests=[makeQuest({id:'jade-task',title:'Jade delivery',summary:'Deliver jade parcels to the guide.',sequential:false,objectives:[{kind:'deliver',text:'Deliver jade parcels.',targetId:'jade',recipientId:'guide',quantity:20}]})];adventure.quests[0].status='active';
  return {state:{party:{heroId:'hero',members:[hero]},facts:[],flags:{}},adventure};
}
function noise(adventure){for(let i=0;i<610;i++){adventure.turn=200+i;model.addEvent(adventure,'story','start',`Ordinary road ${i}`);}}
function receipt(adventure,id,turn=1,extra={}){const objective=adventure.quests[0].objectives[0];const event={id,turn,kind:'deliver',targetId:'jade',recipientId:'guide',questId:'jade-task',objectiveId:objective.id,inventoryItemId:'real-jade',fromId:'hero',quantity:1,success:true,text:'One jade parcel delivered.',...extra};adventure.events.push(event);adventure.journal.unshift({...event});model.processQuestEvent(adventure,event);return event;}

test('partial delivery counts and last exact receipt survive six hundred turns without putting the receipt array into context',()=>{
  const {state,adventure}=setup();receipt(adventure,'first');receipt(adventure,'second',2);noise(adventure);
  const before=JSON.stringify({state,adventure}),context=contextFor(state,adventure,'How many jade parcels remain?');
  const goal=context.packet.quests.find(q=>q.id==='jade-task').objectives[0];
  assert.equal(goal.quantity,20);assert.equal(goal.deliveredQuantity,2);assert.equal(goal.remainingQuantity,18);assert.equal(goal.completed,false);assert.equal(goal.evidenceEventId,'second');assert.ok(!Object.hasOwn(goal,'evidenceEventIds'));
  assert.ok(context.metrics.chars<=MAX_CHARS);assert.equal(JSON.stringify({state,adventure}),before);
  const past=journalMemory(state,adventure,'jade');for(const row of past){assert.equal(row.quantity,1);assert.equal(row.evidenceLinks[0].objectiveCompleted,false);assert.equal(row.evidenceLinks[0].questStatus,'active');assert.equal(row.confidence,'confirmed');}
});

test('one of three acquired units remains partial after six hundred turns and its exact receipt stays bounded and recallable',()=>{
  const {state,adventure}=setup(),goal=adventure.quests[0].objectives[0];goal.kind='acquire';goal.quantity=3;goal.acquiredQuantity=0;delete goal.deliveredQuantity;delete goal.recipientId;
  const event=model.addEvent(adventure,'acquire','jade','One jade parcel was collected.',{quantity:1,fromId:'hero',success:true});model.processQuestEvent(adventure,event);noise(adventure);
  const before=JSON.stringify({state,adventure}),packet=contextFor(state,adventure,'jade parcels').packet,selected=packet.quests[0].objectives[0];
  assert.deepEqual([selected.quantity,selected.acquiredQuantity,selected.remainingQuantity],[3,1,2]);assert.equal(selected.completed,false);assert.equal(selected.evidenceEventId,event.id);assert.ok(!Object.hasOwn(selected,'evidenceEventIds'));assert.ok(!Object.hasOwn(selected,'deliveredQuantity'));
  const past=journalMemory(state,adventure,'jade')[0];assert.equal(past.id,event.id);assert.equal(past.quantity,1);assert.equal(past.evidenceLinks[0].objectiveCompleted,false);
  const history=memory.questHistoryRecords(adventure,'jade-task','campaign');assert.equal(history.total,1);assert.equal(history.entries[0].id,event.id);assert.equal(history.entries[0].quantity,1);assert.ok(JSON.stringify(history).length<=16000);assert.equal(JSON.stringify({state,adventure}),before);
  quests.decide(state,adventure,{type:'abandon_quest',questId:'jade-task',reason:'I must leave.'},'acquire-abandon');const archived=contextFor(state,adventure,'jade parcels').packet.questHistory[0].objectives[0];assert.deepEqual([archived.quantity,archived.acquiredQuantity,archived.remainingQuantity],[3,1,2]);
});

test('acceptance-time inventory confirmation keeps its real new turn/source and never rewrites an older record or repeats credit',()=>{
  const {state,adventure}=setup(),goal=adventure.quests[0].objectives[0];goal.kind='acquire';goal.quantity=3;goal.acquiredQuantity=0;delete goal.deliveredQuantity;delete goal.recipientId;
  state.party.members[0].inventory=[{itemId:'native-jade',name:'Jade parcel',quantity:2,tags:['world_item','jade']}];
  const old=model.addEvent(adventure,'player_note','jade','I think I collected all three jade parcels.',{source:'player_statement'}),oldBefore=JSON.stringify(old);adventure.turn=23;
  quests.reconcileEvidence(state,adventure);
  const event=adventure.events.find(e=>e.source==='inventory_confirmation');assert.ok(event);assert.equal(event.kind,'acquire');assert.equal(event.turn,23);assert.equal(event.quantity,2);assert.equal(event.confirmedHeldQuantity,2);assert.equal(goal.acquiredQuantity,2);assert.equal(goal.completed,false);assert.equal(JSON.stringify(old),oldBefore);
  const receipts=[...goal.evidenceEventIds];quests.reconcileEvidence(state,adventure);assert.deepEqual(goal.evidenceEventIds,receipts);assert.equal(goal.acquiredQuantity,2);noise(adventure);
  const before=JSON.stringify({state,adventure}),past=journalMemory(state,adventure,'jade').find(e=>e.id===event.id);assert.equal(past.source,'resolved_event');assert.equal(past.eventSource,'inventory_confirmation');assert.equal(past.confidence,'confirmed');assert.equal(past.turn,23);assert.equal(past.quantity,2);assert.equal(past.evidenceLinks[0].objectiveCompleted,false);
  const claim=journalMemory(state,adventure,'jade').find(e=>e.id===old.id);assert.equal(claim.source,'player_note');assert.notEqual(claim.confidence,'confirmed');assert.ok(!claim.evidenceLinks);
  const history=memory.questHistoryRecords(adventure,'jade-task','campaign');assert.equal(history.entries[0].source,'inventory_confirmation');assert.equal(history.entries[0].id,event.id);assert.equal(history.entries[0].turn,23);assert.deepEqual(history.missingEvidenceIds,[]);assert.equal(JSON.stringify({state,adventure}),before);
});

test('legacy completed and incomplete delivery goals have canonical one-unit progress without fabricating receipt IDs or mutating saves',()=>{
  const {state,adventure}=setup(),goal=adventure.quests[0].objectives[0];delete goal.quantity;delete goal.deliveredQuantity;delete goal.evidenceEventIds;goal.completed=true;goal.evidenceEventId=null;
  const before=JSON.stringify(adventure),closed=contextFor(state,adventure,'jade').packet.quests[0].objectives[0];
  assert.deepEqual([closed.quantity,closed.deliveredQuantity,closed.remainingQuantity],[1,1,0]);assert.equal(closed.evidenceEventId,null);assert.equal(JSON.stringify(adventure),before);
  goal.completed=false;const open=contextFor(state,adventure,'jade').packet.quests[0].objectives[0];assert.deepEqual([open.quantity,open.deliveredQuantity,open.remainingQuantity],[1,0,1]);
  assert.deepEqual(memory.questHistoryRecords(adventure,'jade-task','campaign').missingEvidenceIds,[]);
});

test('canonical delivery stock counts only actual hero world-tagged possessions and separates worn/attuned gear',()=>{
  const {state,adventure}=setup(),hero=state.party.members[0];
  hero.inventory=[{itemId:'free',name:'Jade',quantity:4,tags:['world_item','jade']},{itemId:'worn',name:'Jade',quantity:2,tags:['world_item','jade']},{itemId:'bound',name:'Jade',quantity:1,tags:['world_item','jade'],attuned:true},{itemId:'wrong-tag',name:'Jade',quantity:99,tags:['jade']},{itemId:'different',name:'Jade',quantity:99,tags:['world_item','opal']}];hero.equipment={mainHand:'worn'};
  state.party.members.push({...structuredClone(hero),id:'guide',kind:'ally',name:'Guide',inventory:[{itemId:'npc-jade',name:'Jade',quantity:99,tags:['world_item','jade']}],equipment:{}});
  const before=JSON.stringify({state,adventure}),goal=contextFor(state,adventure,'jade').packet.quests[0].objectives[0];assert.equal(goal.ownedQuantity,7);assert.equal(goal.eligibleQuantity,4);assert.equal(JSON.stringify({state,adventure}),before);
});

test('decline and abandonment remain terminal history; a player reason cannot become NPC knowledge or a confirmed world fact',()=>{
  const {state,adventure}=setup();
  const other=makeQuest({id:'opal-task',title:'Opal delivery',summary:'Deliver opal parcels.',objectives:[{kind:'deliver',text:'Deliver opal.',targetId:'opal',recipientId:'guide',quantity:2}]});adventure.quests.push(other);
  quests.decide(state,adventure,{type:'abandon_quest',questId:'jade-task',reason:'The guide secretly stole my boat.'},'abandon-request');
  quests.decide(state,adventure,{type:'decline_quest',questId:'opal-task',reason:'I cannot carry more opal.'},'decline-request');noise(adventure);
  const before=JSON.stringify(adventure),packet=contextFor(state,adventure,'Jade opal delivery').packet;
  assert.deepEqual(packet.quests,[]);assert.deepEqual(packet.questIndex,[]);assert.deepEqual(new Set(packet.questHistory.map(q=>q.status)),new Set(['abandoned','declined']));
  const jade=packet.questHistory.find(q=>q.id==='jade-task');assert.equal(jade.endedReason,'The guide secretly stole my boat.');assert.equal(jade.decision.reasonConfidence,'player_statement');assert.equal(jade.decision.npcNotified,false);assert.equal(jade.decision.commitmentBroken,true);assert.equal(jade.terminalEventId,adventure.quests[0].terminalEventId);
  const past=journalMemory(state,adventure,'Jade opal');assert.equal(past.length,2);for(const e of past){assert.equal(e.confidence,'confirmed');assert.equal(e.reasonConfidence,'player_statement');assert.equal(e.npcNotified,false);assert.equal(categories.categoryOf(e.kind),'quests');}
  assert.equal(JSON.stringify(adventure),before);
});

test('available finite world quantities are visible but inaccessible concealed quantities stay hidden',()=>{
  const {state,adventure}=setup();adventure.items=[{id:'open-jade',name:'Jade parcels',description:'A visible supply.',kind:'quest',locationId:'start',quantity:8,remainingQuantity:3,collected:false},{id:'hidden-jade',name:'Secret eight jade',description:'A concealed supply.',kind:'quest',locationId:'start',quantity:8,remainingQuantity:7,collected:false,access:{concealed:true,mode:'all',label:'Closed cache',description:'Sealed box.',conditions:[{kind:'item',targetId:'absent-key'}]}}];
  const before=JSON.stringify(adventure),objects=contextFor(state,adventure,'jade parcels').packet.objects;
  assert.equal(objects.find(i=>i.id==='open-jade').quantity,8);assert.equal(objects.find(i=>i.id==='open-jade').remainingQuantity,3);
  const hidden=objects.find(i=>i.id==='hidden-jade');assert.equal(hidden.available,false);assert.ok(!Object.hasOwn(hidden,'quantity')||hidden.quantity===undefined);assert.ok(!Object.hasOwn(hidden,'remainingQuantity')||hidden.remainingQuantity===undefined);assert.ok(!JSON.stringify(hidden).includes('Secret eight jade'));assert.equal(JSON.stringify(adventure),before);
});

test('actually addressed lifecycle preserves exact giver and notification without promoting the stated reason',()=>{
  const {state,adventure}=setup(),quest=adventure.quests[0];quest.giverId='guide';
  const outcome=quests.decide(state,adventure,{type:'abandon_quest',questId:quest.id,npcId:'guide',reason:'I think the guide lost my boat.'},'addressed-request');assert.equal(outcome.npcNotified,true);
  const before=JSON.stringify(adventure),packet=contextFor(state,adventure,'Jade delivery').packet,q=packet.questHistory.find(q=>q.id===quest.id);
  assert.equal(q.decision.npcNotified,true);assert.equal(q.decision.reasonConfidence,'player_statement');assert.equal(q.giverId,'guide');assert.equal(packet.recentEvents[0].npcNotified,true);assert.equal(packet.recentEvents[0].giverId,'guide');assert.equal(packet.recentEvents[0].reasonConfidence,'player_statement');
  const row=memory.questHistoryRecords(adventure,quest.id,'campaign').entries[0];assert.equal(row.npcNotified,true);assert.equal(row.giverId,'guide');assert.equal(row.reasonConfidence,'player_statement');assert.equal(JSON.stringify(adventure),before);
});

test('all one hundred exact receipts and every lifecycle event are retrievable by deterministic chronological pages',()=>{
  const {adventure}=setup();adventure.quests[0].objectives=Array.from({length:5},(_,i)=>({id:`goal-${i}`,kind:'deliver',targetId:'jade',recipientId:'guide',quantity:20,deliveredQuantity:20,completed:true,evidenceEventIds:Array.from({length:20},(_,j)=>`receipt-${i*20+j}`),evidenceEventId:`receipt-${i*20+19}`}));
  adventure.quests[0].status='completed';
  const events=Array.from({length:100},(_,i)=>({id:`receipt-${i}`,turn:i+2,kind:'deliver',targetId:'jade',questId:'jade-task',objectiveId:`goal-${Math.floor(i/20)}`,recipientId:'guide',inventoryItemId:`native-jade-${i}`,quantity:1,success:true,source:'resolved_event',confidence:'confirmed',text:`Actual jade receipt ${i}.`}));
  events.unshift({id:'accept',turn:1,kind:'quest_accept',targetId:'jade-task',text:'Accepted.'});events.push({id:'reward',turn:102,kind:'quest_reward',targetId:'jade-task',text:'Reward paid.'});
  adventure.events=events;adventure.journal=events.toReversed().map(e=>({...e}));noise(adventure);
  const before=JSON.stringify(adventure),ids=[];let offset=0;
  do{const page=memory.questHistoryRecords(adventure,'jade-task','campaign',{offset,limit:13});assert.equal(page.offset,offset);assert.equal(page.total,102);assert.ok(page.entries.length<=13);assert.ok(JSON.stringify(page).length<=16000);for(const e of page.entries)if(e.kind==='deliver'){assert.equal(e.quantity,1);assert.equal(e.recipientId,'guide');assert.equal(e.source,'resolved_event');assert.equal(e.confidence,'confirmed');}ids.push(...page.entries.map(e=>e.id));offset=page.nextOffset;}while(offset!==null);
  assert.deepEqual(ids,['accept',...Array.from({length:100},(_,i)=>`receipt-${i}`),'reward']);assert.equal(new Set(ids).size,102);assert.equal(JSON.stringify(adventure),before);
  assert.deepEqual(memory.questHistoryRecords(adventure,'jade-task','campaign',{offset:200}).entries,[]);
});

test('missing old pointers remain exact on every page and invalid pagination or oversized escaped metadata fails honestly',()=>{
  const {adventure}=setup(),goal=adventure.quests[0].objectives[0];goal.evidenceEventIds=['lost-first','lost-last'];goal.evidenceEventId='lost-last';
  assert.deepEqual(memory.questHistoryRecords(adventure,'jade-task','campaign',{offset:0}).missingEvidenceIds,['lost-first','lost-last']);
  for(const options of [{offset:-1},{offset:1.2},{offset:'NaN'},{offset:Infinity},{limit:0},{limit:14},{limit:'2.2'}])assert.throws(()=>memory.questHistoryRecords(adventure,'jade-task','campaign',options),e=>e.status===400);
  goal.evidenceEventIds=['bad\u0000id'];assert.throws(()=>memory.questHistoryRecords(adventure,'jade-task','campaign'),e=>e.status===400);
  adventure.quests[0].objectives=Array.from({length:5},(_,i)=>({...goal,evidenceEventIds:Array.from({length:20},(_,j)=>`${i}-${j}-`+'"'.repeat(112)),evidenceEventId:null}));assert.throws(()=>memory.questHistoryRecords(adventure,'jade-task','campaign'),e=>e.status===400);
});

test('partial receipts cannot derive evidence for a different quest/objective or promote player notes',()=>{
  const {state,adventure}=setup();receipt(adventure,'right');receipt(adventure,'wrong',2,{questId:'other-quest'});receipt(adventure,'claim',3,{kind:'player_note',source:'player_statement'});
  const goal=adventure.quests[0].objectives[0];goal.evidenceEventIds.push('wrong','claim');noise(adventure);
  const rows=journalMemory(state,adventure,'jade');assert.ok(rows.find(e=>e.id==='right').evidenceLinks);assert.ok(!rows.find(e=>e.id==='wrong').evidenceLinks);assert.ok(!rows.find(e=>e.id==='claim').evidenceLinks);assert.equal(rows.find(e=>e.id==='claim').source,'player_note');
});

let directory,originalGenerate;
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-quantity-memory-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';originalGenerate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();});
after(async()=>{ai.generateStructured=originalGenerate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
test('native partial handover persists quantity, exact receipts and owner inventory across reopen; memory reads cannot advance or reward it',async()=>{
  const view=await engine.create({heroName:'Mira',worldIdea:'Islands of stories',language:'en'}),loaded=await engine.loaded(view.campaign.id),{state,adventure}=loaded,hero=state.party.members.find(m=>m.id===state.party.heroId);
  const npc=adventure.npcs.find(n=>n.locationId===adventure.currentLocationId);adventure.quests=[makeQuest({id:'parcel-task',title:'Jade parcels',summary:'Deliver jade parcels.',objectives:[{kind:'deliver',text:'Deliver jade parcels.',targetId:'jade',recipientId:npc.id,quantity:20}]})];adventure.quests[0].status='active';
  hero.inventory.push({...structuredClone(hero.inventory.find(i=>i.itemId==='gold_piece')),itemId:'real-jade',name:'Jade parcel',tags:['world_item','jade'],quantity:20});
  const result=quests.deliver(state,adventure,{type:'deliver',questId:'parcel-task',objectiveId:adventure.quests[0].objectives[0].id,quantity:3});assert.equal(result.deliveredQuantity,3);assert.equal(result.remainingQuantity,17);assert.equal(hero.inventory.find(i=>i.itemId==='real-jade').quantity,17);
  noise(adventure);await engine.save(loaded.service,state,adventure,'quantity_memory_fixture');await engine.loaded(view.campaign.id);await srd.closeSessions();
  const before=await engine.loaded(view.campaign.id),snapshot=JSON.stringify(before.state),xp=before.state.party.members.find(m=>m.id===state.party.heroId).xp;let writes=0,calls=0;const save=before.service.store.saveGameState;
  before.service.store.saveGameState=async()=>{writes++;throw new Error('History is read-only');};ai.generateStructured=async()=>{calls++;throw new Error('History cannot call AI');};
  try{const history=await memory.questHistory(view.campaign.id,'parcel-task');assert.equal(history.total,1);assert.deepEqual(history.entries.map(e=>e.id),result.evidenceEventIds);assert.equal(history.entries[0].quantity,3);assert.equal(history.entries[0].inventoryItemId,'real-jade');const goal=contextFor(before.state,before.adventure,'jade parcels').packet.quests[0].objectives[0];assert.deepEqual([goal.quantity,goal.deliveredQuantity,goal.remainingQuantity],[20,3,17]);assert.equal(writes,0);assert.equal(calls,0);}finally{before.service.store.saveGameState=save;ai.generateStructured=async(type,payload,fallback)=>fallback();}
  const after=await engine.loaded(view.campaign.id);assert.equal(JSON.stringify(after.state),snapshot);assert.equal(after.state.party.members.find(m=>m.id===state.party.heroId).xp,xp);assert.equal(after.adventure.quests[0].status,'active');assert.equal(after.adventure.quests[0].rewardClaimed,false);
});

function archiveDays(adventure){for(let day=0;day<610;day++){adventure.turn++;model.addMessage(adventure,'dm','Master',`Ordinary day ${day}.`);model.addEvent(adventure,'story','start',`Ordinary day ${day}.`);}}
test('native private decision stays quiet and private in recent/archive recall after six hundred turns and native reopen',async()=>{
  const view=await engine.create({heroName:'Mira',worldIdea:'Islands of stories',language:'en'});await require('../src/adventure-discussion').start(view.campaign.id,'Which route?');
  const before=await engine.loaded(view.campaign.id),quest=before.adventure.quests[0],turn=before.adventure.turn,queue=JSON.stringify(before.adventure.dialogue),people=JSON.stringify(before.adventure.npcs),hero=JSON.stringify(before.state.party),input='Privately I decline this task. My private compass vow is EMERALD-PRIVACY-42.';let calls=0;
  ai.generateStructured=async()=>{calls++;throw new Error('Private decision must stay quiet');};
  try{
    await engine.perform({campaignId:view.campaign.id,expectedRevision:before.adventure.revision,operationId:crypto.randomUUID(),input,command:{type:'decline_quest',questId:quest.id,reason:'I cannot commit.'}});
    const after=await engine.loaded(view.campaign.id),message=after.adventure.messages.find(m=>m.text===input);assert.ok(message);assert.equal(message.privateDecision,true);assert.equal(message.source,'player_private_decision');assert.equal(after.adventure.turn,turn);assert.equal(JSON.stringify(after.adventure.dialogue),queue);assert.equal(JSON.stringify(after.adventure.npcs),people);assert.equal(JSON.stringify(after.state.party),hero);assert.equal(calls,0);
    const recent=contextFor(after.state,after.adventure,'EMERALD-PRIVACY-42').packet.recentDialogue.find(m=>m.text===input);assert.equal(recent.privateDecision,true);assert.equal(recent.source,'player_private_decision');assert.equal(recent.npcNotified,false);
    archiveDays(after.adventure);await engine.save(after.service,after.state,after.adventure,'private_memory_fixture');await srd.closeSessions();const reopened=await engine.loaded(view.campaign.id),stored=reopened.adventure.archive.find(m=>m.id===message.id),snapshot=JSON.stringify(reopened.adventure);assert.equal(stored.text,input);assert.equal(stored.privateDecision,true);assert.equal(stored.source,'player_private_decision');
    const recalled=contextFor(reopened.state,reopened.adventure,'EMERALD-PRIVACY-42').packet.recollections.find(m=>m.id===message.id);assert.ok(recalled);assert.equal(recalled.source,'player_private_decision');assert.equal(recalled.privateDecision,true);assert.equal(recalled.npcNotified,false);assert.equal(recalled.confidence,'player_private_decision');
    const decision=journalMemory(reopened.state,reopened.adventure,'Beyond Familiar').find(e=>e.kind==='quest_decline');assert.ok(decision);assert.equal(decision.privateDecision,true);assert.equal(decision.npcNotified,false);assert.equal(JSON.stringify(reopened.adventure.npcs),people);assert.equal(JSON.stringify(reopened.adventure),snapshot);assert.equal(calls,0);
  }finally{ai.generateStructured=async(type,payload,fallback)=>fallback();}
});

test('actually addressed native decision remains player speech and real NPC notification in recent/archive recall after reopen',async()=>{
  const view=await engine.create({heroName:'Mira',worldIdea:'Islands of stories',language:'en'}),before=await engine.loaded(view.campaign.id),quest=before.adventure.quests[0],input='I tell the guide I decline. My explanation is EMERALD-ADDRESS-42.';let calls=0;
  ai.generateStructured=async(type,payload,fallback)=>{calls++;return fallback();};
  try{
    await engine.perform({campaignId:view.campaign.id,expectedRevision:before.adventure.revision,operationId:crypto.randomUUID(),input,command:{type:'decline_quest',questId:quest.id,npcId:quest.giverId,reason:'I cannot commit.'}});
    const after=await engine.loaded(view.campaign.id),message=after.adventure.messages.find(m=>m.role==='player'&&m.text===input);assert.ok(message);assert.ok(!message.privateDecision);assert.notEqual(message.source,'player_private_decision');assert.equal(calls,1);assert.equal(after.adventure.quests[0].decision.npcNotified,true);assert.equal(after.adventure.npcs.find(n=>n.id===quest.giverId).receivedQuestDecisions.length,1);
    const recent=contextFor(after.state,after.adventure,'EMERALD-ADDRESS-42').packet.recentDialogue.find(m=>m.text===input);assert.equal(recent.source,'player_statement');assert.ok(!recent.privateDecision);
    archiveDays(after.adventure);await engine.save(after.service,after.state,after.adventure,'addressed_memory_fixture');await srd.closeSessions();const reopened=await engine.loaded(view.campaign.id),stored=reopened.adventure.archive.find(m=>m.id===message.id);assert.equal(stored.text,input);assert.ok(!stored.privateDecision);
    const recalled=contextFor(reopened.state,reopened.adventure,'EMERALD-ADDRESS-42').packet.recollections.find(m=>m.id===message.id);assert.equal(recalled.source,'player_statement');assert.ok(!recalled.privateDecision);assert.equal(recalled.confidence,'player_claim');assert.equal(reopened.adventure.npcs.find(n=>n.id===quest.giverId).receivedQuestDecisions.length,1);
    const decision=journalMemory(reopened.state,reopened.adventure,'Beyond Familiar').find(e=>e.kind==='quest_decline');assert.equal(decision.npcNotified,true);assert.ok(!decision.privateDecision);assert.equal(calls,1);
  }finally{ai.generateStructured=async(type,payload,fallback)=>fallback();}
});

