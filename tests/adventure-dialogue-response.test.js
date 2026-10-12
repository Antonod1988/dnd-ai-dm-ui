const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),discussion=require('../src/adventure-discussion'),ai=require('../src/ai-bridge'),srd=require('../src/srd-engine');
const {MAX_CHARS}=require('../src/adventure-context');
let directory,originalGenerate,handler,calls,view,interrupted;
const world={title:'Bridge dialogue',opening:'The guide and scholar wait.',startLocationId:'bridge',locations:[{id:'bridge',name:'Bridge',description:'A sheltered bridge.',kind:'settlement',connectsTo:['road']},{id:'road',name:'Road',description:'A quiet road.',kind:'road',connectsTo:['bridge']}],npcs:[{id:'guide',name:'Iris',role:'Guide',locationId:'bridge'},{id:'scholar',name:'Ren',role:'Scholar',locationId:'bridge'},{id:'absent',name:'Absent',role:'Far traveller',locationId:'road'}],quests:[],items:[],checks:[]};
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-dialogue-response-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';originalGenerate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls.push({type,payload});return type==='adventure_world'?structuredClone(world):handler(type,payload,fallback);};});
beforeEach(async()=>{
  calls=[];handler=(type,payload,fallback)=>fallback();view=await engine.create({heroName:'Mira',worldIdea:'An original world of old bridges',language:'en'});
  handler=()=>({narration:'Iris looks at the crossing.',lines:[{speakerId:'guide',text:'We could inspect the bridge.',proposal:{actionId:'inspect',label:'Inspect bridge'}},{speakerId:'scholar',text:'CANCELLED_UNHEARD_REPLY'}]});
  view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command:{type:'talk',npcId:'guide'}});
  const queue=await discussion.status(view.campaign.id);await discussion.next(view.campaign.id,queue.id);interrupted=await discussion.intervene(view.campaign.id,'Wait. Tell me why the crossing worries you.',queue.id);
  calls=[];handler=()=>({lines:[{speakerId:'guide',text:'The stone has shifted. We should study it.',proposal:{actionId:'inspect',label:'Inspect safely'}},{speakerId:'scholar',text:'I can explain what the marks mean.',interruptsSpeakerId:'guide'}]});
});
after(async()=>{ai.generateStructured=originalGenerate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
test('one explicit response batch preserves heard/interjected lines and withdrawn proposals without spending a world turn',async()=>{
  const before=await engine.getView(view.campaign.id),heard=structuredClone(interrupted.spoken),proposal=interrupted.proposals[0];
  assert.equal(interrupted.canRespond,true);const replied=await discussion.respond(view.campaign.id,interrupted.id);
  assert.notEqual(replied.id,interrupted.id);assert.equal(replied.source,'scene');assert.equal(replied.sceneId,'bridge');assert.equal(replied.canRespond,false);
  assert.deepEqual(replied.spoken.slice(0,heard.length),heard);assert.equal(replied.spoken.at(-1).speakerId,'guide');assert.equal(replied.remaining,1);
  assert.equal(replied.proposals.find(p=>p.id===proposal.id).status,'withdrawn');assert.equal(replied.proposals.filter(p=>p.status==='offered').length,1);
  const after=await engine.getView(view.campaign.id);assert.equal(after.campaign.turn,before.campaign.turn);assert.equal(after.campaign.hours,before.campaign.hours);assert.deepEqual(after.hero,before.hero);assert.deepEqual(after.facts,before.facts);
  assert.deepEqual(calls.map(c=>c.type),['adventure_dialogue_response']);assert.ok(!JSON.stringify(calls).includes('CANCELLED_UNHEARD_REPLY'));assert.ok(!JSON.stringify(after.messages).includes('CANCELLED_UNHEARD_REPLY'));
  const count=calls.length;await discussion.next(view.campaign.id,replied.id);assert.equal(calls.length,count);
  await srd.closeSessions();const persisted=await discussion.status(view.campaign.id);assert.equal(persisted.id,replied.id);assert.equal(persisted.spoken.length,heard.length+2);assert.equal(persisted.proposals.find(p=>p.id===proposal.id).status,'withdrawn');
});
test('successful response cannot run twice, and status/next/intervene/reject never request another batch',async()=>{
  const replied=await discussion.respond(view.campaign.id,interrupted.id),count=calls.length;
  await assert.rejects(discussion.respond(view.campaign.id,interrupted.id),e=>e.status===409);await assert.rejects(discussion.respond(view.campaign.id,replied.id),e=>e.status===409);
  await discussion.status(view.campaign.id);await discussion.next(view.campaign.id,replied.id);
  const current=await discussion.status(view.campaign.id);await discussion.decide(view.campaign.id,current.proposals.find(p=>p.status==='offered').id,'reject',replied.id);
  const again=await discussion.intervene(view.campaign.id,'A new question.',replied.id);assert.equal(again.canRespond,true);assert.equal(calls.length,count);
});
test('provider failure retains the player input and previous queue and allows an explicit retry',async()=>{
  handler=()=>{throw new Error('Simulated provider outage');};await assert.rejects(discussion.respond(view.campaign.id,interrupted.id),/provider outage/);
  const failed=await discussion.status(view.campaign.id);assert.equal(failed.id,interrupted.id);assert.equal(failed.status,'interrupted');assert.equal(failed.canRespond,true);assert.equal(failed.responseFailure,'provider');assert.deepEqual(failed.spoken,interrupted.spoken);assert.deepEqual(failed.proposals,interrupted.proposals);assert.equal(calls.length,1);
  handler=()=>({lines:[{speakerId:'scholar',text:'Let me answer your question.'}]});const retried=await discussion.respond(view.campaign.id,interrupted.id);
  assert.equal(retried.spoken.at(-1).speakerName,'Ren');assert.equal(retried.responseFailure,null);assert.equal(calls.length,2);assert.equal((await engine.getView(view.campaign.id)).campaign.turn,view.campaign.turn);
});
test('invalid response has only one repair; rejected actor/mechanics/oversized batches never partially enter history',async()=>{
  const drafts=[{lines:[{speakerId:'player',text:'Do not speak for me.'}]},{lines:[{speakerId:'absent',text:'Not nearby.'}]},{lines:[{speakerId:'guide',text:'Bad proposal',proposal:{actionId:'mint-money',label:'Free money'}}]},{lines:[{speakerId:'guide',text:'x'.repeat(651)}]},{lines:Array.from({length:6},()=>({speakerId:'guide',text:'Too many.'}))},{lines:[{speakerId:'guide',text:'A reply.'}],hp:999}];
  for(const draft of drafts){calls=[];handler=()=>structuredClone(draft);await assert.rejects(discussion.respond(view.campaign.id,interrupted.id));assert.deepEqual(calls.map(c=>c.type),['adventure_dialogue_response','adventure_dialogue_response_repair']);const current=await discussion.status(view.campaign.id);assert.equal(current.id,interrupted.id);assert.deepEqual(current.spoken,interrupted.spoken);assert.equal(current.canRespond,true);}
  calls=[];handler=type=>type.endsWith('_repair')?{lines:[{speakerId:'scholar',text:'A corrected reply.'}]}:drafts[0];const repaired=await discussion.respond(view.campaign.id,interrupted.id);assert.equal(repaired.spoken.at(-1).text,'A corrected reply.');assert.equal(calls.length,2);
});
test('current eligible actors replace the old speaking roster without erasing already heard speakers',async()=>{
  const loaded=await engine.loaded(view.campaign.id);loaded.adventure.environment={version:1,props:[],npcStates:[{npcId:'guide',body:{hp:{current:0,max:4},conditions:['dead']}}],consequences:[],appliedPlans:[]};await engine.save(loaded.service,loaded.state,loaded.adventure,'dead_fixture');
  handler=(type,payload)=>{assert.deepEqual(payload.actors.map(a=>a.id),['dm','scholar']);return {lines:[{speakerId:'scholar',text:'I heard Iris, but I must respond now.'}]};};
  const replied=await discussion.respond(view.campaign.id,interrupted.id);assert.ok(replied.spoken.some(line=>line.speakerId==='guide'));assert.equal(replied.spoken.at(-1).speakerId,'scholar');
});
test('short heard window and model context stay bounded, with cancelled replies absent',async()=>{
  const loaded=await engine.loaded(view.campaign.id);loaded.adventure.dialogue.spoken.unshift(...Array.from({length:30},(_,i)=>({id:`old-${i}`,speakerId:'guide',speakerName:'Iris',text:`Long heard line ${i} `+'x'.repeat(2000)})));
  loaded.adventure.notes=Array.from({length:40},(_,i)=>({id:`n${i}`,text:'Pinned note '.repeat(60),pinned:true}));await engine.save(loaded.service,loaded.state,loaded.adventure,'history_fixture');
  handler=(type,payload)=>{assert.ok(payload.heard.length<=8);assert.ok(JSON.stringify(payload.heard).length<=4000);assert.ok(JSON.stringify(payload.context).length<=MAX_CHARS);assert.ok(JSON.stringify(payload).length<=18500);assert.equal(payload.heard.at(-1).source,'player_statement');assert.match(payload.heard.at(-1).text,/Tell me why/);return {lines:[{speakerId:'scholar',text:'A short answer.'}]};};
  await discussion.respond(view.campaign.id,interrupted.id);assert.equal(calls.length,1);
});
test('stale turn, wrong dialogue identity and combat fail before any provider call',async()=>{
  await assert.rejects(discussion.respond(view.campaign.id,'old-id'),e=>e.status===409);assert.equal(calls.length,0);
  const loaded=await engine.loaded(view.campaign.id),core=await import('../vendor/dnd-core/dist/engine.mjs'),hero=core.characterToCombatant(loaded.state.party.members[0]);
  loaded.state.combat=core.startCombat([hero,{...structuredClone(hero),id:'foe',sourceCharacterId:undefined,kind:'enemy',name:'Foe'}],{id:'combat-fixture',name:'Combat',description:'Fixture',victory:[],defeat:[],escape:[]},new core.SeededRng('fixture'));await engine.save(loaded.service,loaded.state,loaded.adventure,'combat_fixture');
  await assert.rejects(discussion.respond(view.campaign.id,interrupted.id),e=>e.status===409);assert.equal(calls.length,0);
  delete loaded.state.combat;loaded.adventure.turn+=1;await engine.save(loaded.service,loaded.state,loaded.adventure,'stale_fixture');
  await assert.rejects(discussion.respond(view.campaign.id,interrupted.id),e=>e.status===409);assert.equal(calls.length,0);
});
test('overlapping response requests create one batch, and an intervention during generation cannot be overwritten',async()=>{
  let release,entered;const active=new Promise(resolve=>entered=resolve);handler=async()=>{entered();await new Promise(resolve=>release=resolve);return {lines:[{speakerId:'scholar',text:'A delayed response.'}]};};
  const response=discussion.respond(view.campaign.id,interrupted.id);await active;
  await assert.rejects(discussion.respond(view.campaign.id,interrupted.id),e=>e.status===409);assert.equal(calls.length,1);
  await discussion.intervene(view.campaign.id,'This is my newer interjection.',interrupted.id);release();await assert.rejects(response,e=>e.status===409);
  const preserved=await discussion.status(view.campaign.id);assert.equal(preserved.spoken.at(-1).text,'This is my newer interjection.');assert.equal(preserved.id,interrupted.id);assert.equal(preserved.status,'interrupted');assert.ok(!preserved.spoken.some(line=>line.text==='A delayed response.'));
});
test('explicit NPC address is persisted in spoken/chat/journal and the selected real NPC answers first',async()=>{
  const addressed=await discussion.intervene(view.campaign.id,'Ren, what do those marks mean?',interrupted.id,'scholar');assert.equal(calls.length,0);
  assert.equal(addressed.spoken.at(-1).targetSpeakerId,'scholar');assert.equal(addressed.spoken.at(-1).targetSpeakerName,'Ren');assert.deepEqual(addressed.eligibleAddressees.map(actor=>actor.id),['guide','scholar']);
  const before=await engine.getView(view.campaign.id),journal=before.journal.find(event=>event.lineId===addressed.spoken.at(-1).id);assert.equal(journal.targetSpeakerId,'scholar');assert.equal(journal.targetSpeakerName,'Ren');assert.equal(journal.source,'player_statement');assert.equal(before.messages.at(-1).targetSpeakerId,'scholar');
  handler=(type,payload)=>{assert.equal(payload.responseTarget.id,'scholar');assert.equal(payload.responseTarget.name,'Ren');assert.equal(payload.heard.at(-1).targetSpeakerId,'scholar');assert.match(payload.instruction,/FIRST line MUST/);return {lines:[{speakerId:'scholar',text:'These marks record the old water level.'},{speakerId:'guide',text:'That is why I want caution.'}]};};
  const replied=await discussion.respond(view.campaign.id,addressed.id);assert.equal(replied.spoken.at(-1).speakerId,'scholar');assert.equal(calls.length,1);assert.ok(!JSON.stringify(calls).includes('CANCELLED_UNHEARD_REPLY'));
  const after=await engine.getView(view.campaign.id);assert.equal(after.campaign.turn,before.campaign.turn);assert.deepEqual(after.hero,before.hero);assert.deepEqual(after.facts,before.facts);
  await srd.closeSessions();const persisted=await discussion.status(view.campaign.id);assert.ok(persisted.spoken.some(line=>line.targetSpeakerId==='scholar'));assert.ok((await engine.getView(view.campaign.id)).journal.some(event=>event.lineId===journal.lineId&&event.targetSpeakerId==='scholar'));
});
test('a wrong first response is corrected once instead of silently reordering speaker text',async()=>{
  const addressed=await discussion.intervene(view.campaign.id,'Ren, answer me first.',interrupted.id,'scholar');
  handler=type=>type.endsWith('_repair')?{lines:[{speakerId:'scholar',text:'My own answer.'}]}:{lines:[{speakerId:'guide',text:'REJECTED_WRONG_FIRST'},{speakerId:'scholar',text:'Late reply.'}]};
  const replied=await discussion.respond(view.campaign.id,addressed.id);assert.deepEqual(calls.map(call=>call.type),['adventure_dialogue_response','adventure_dialogue_response_repair']);assert.equal(replied.spoken.at(-1).text,'My own answer.');assert.ok(!replied.spoken.some(line=>line.text==='REJECTED_WRONG_FIRST'));assert.match(calls[1].payload.correction.reason,/answer first/);
});
test('invalid/missing/human/DM addressees and unavailable historical NPCs reject before interjection or AI',async()=>{
  for(const target of ['dm','player',view.hero.id,'absent','missing','',null,42]){
    const before=await discussion.status(view.campaign.id),revision=(await engine.getView(view.campaign.id)).campaign.revision;
    await assert.rejects(discussion.intervene(view.campaign.id,'Invalid address.',interrupted.id,target));assert.deepEqual((await discussion.status(view.campaign.id)).spoken,before.spoken);assert.equal((await engine.getView(view.campaign.id)).campaign.revision,revision);assert.equal(calls.length,0);
  }
  const loaded=await engine.loaded(view.campaign.id);loaded.adventure.environment={version:1,props:[],npcStates:[{npcId:'guide',body:{hp:{current:0,max:4},conditions:['dead']}}],consequences:[],appliedPlans:[]};await engine.save(loaded.service,loaded.state,loaded.adventure,'dead_address_fixture');
  const current=await discussion.status(view.campaign.id);assert.ok(current.actors.some(actor=>actor.id==='guide'));assert.ok(!current.eligibleAddressees.some(actor=>actor.id==='guide'));
  await assert.rejects(discussion.intervene(view.campaign.id,'Dead guide, answer.',interrupted.id,'guide'),error=>error.status===409);assert.equal(calls.length,0);
});
test('a saved addressed interjection cannot silently switch to someone else when its NPC disappears',async()=>{
  const addressed=await discussion.intervene(view.campaign.id,'Ren, tell me.',interrupted.id,'scholar'),loaded=await engine.loaded(view.campaign.id);
  loaded.adventure.npcs.find(npc=>npc.id==='scholar').hidden=true;await engine.save(loaded.service,loaded.state,loaded.adventure,'hidden_address_fixture');
  const status=await discussion.status(view.campaign.id);assert.equal(status.canRespond,false);assert.equal(status.responseTargetUnavailable,true);assert.ok(!status.eligibleAddressees.some(actor=>actor.id==='scholar'));
  await assert.rejects(discussion.respond(view.campaign.id,addressed.id),error=>error.status===409);assert.equal(calls.length,0);assert.equal((await discussion.status(view.campaign.id)).spoken.at(-1).targetSpeakerId,'scholar');
  const untargeted=await discussion.intervene(view.campaign.id,'Then I ask everyone else.',addressed.id);assert.ok(!Object.hasOwn(untargeted.spoken.at(-1),'targetSpeakerId'));assert.equal(untargeted.canRespond,true);
});
test('an addressed NPC disappearing during generation cannot commit a ghost reply even without a turn change',async()=>{
  const addressed=await discussion.intervene(view.campaign.id,'Ren, please reply.',interrupted.id,'scholar');
  let entered,release;const pending=new Promise(resolve=>entered=resolve);handler=async()=>{entered();await new Promise(resolve=>release=resolve);return {lines:[{speakerId:'scholar',text:'GHOST_REPLY'}]};};
  const response=discussion.respond(view.campaign.id,addressed.id);await pending;const loaded=await engine.loaded(view.campaign.id);loaded.adventure.npcs.find(npc=>npc.id==='scholar').hidden=true;await engine.save(loaded.service,loaded.state,loaded.adventure,'disappeared_address_fixture');release();
  await assert.rejects(response,error=>error.status===409);assert.equal(calls.length,1);const after=await discussion.status(view.campaign.id);assert.equal(after.id,addressed.id);assert.ok(!after.spoken.some(line=>line.text==='GHOST_REPLY'));assert.equal(after.spoken.at(-1).targetSpeakerId,'scholar');
});
