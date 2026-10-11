const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let directory,originalGenerate,originalConfig,view,handler,usage,worldDraft,calls=[];
const world={title:'The patient workshop',opening:'A quiet workshop waits for the hero.',startLocationId:'camp',locations:[{id:'camp',name:'Camp',description:'A sheltered trading post.',kind:'settlement',connectsTo:[]}],npcs:[],items:[],quests:[],checks:[]};
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-narration-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';originalGenerate=ai.generateStructured;originalConfig=ai.getAiConfig;
  ai.getAiConfig=()=>({...originalConfig(),usage});
  ai.generateStructured=async(type,payload,fallback)=>{
    calls.push({type,payload});usage={reportedByProvider:true,inputTokens:10,outputTokens:2,cachedTokens:0,model:'test-provider'};
    return type==='adventure_world'?worldDraft():handler(type,payload,fallback);
  };
});
beforeEach(()=>{calls=[];usage=undefined;worldDraft=()=>structuredClone(world);handler=(type,payload,fallback)=>fallback();});
after(async()=>{ai.generateStructured=originalGenerate;ai.getAiConfig=originalConfig;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){view=await engine.create({heroName:'Mira',worldIdea:'A world of patient workshops and original discoveries',language:'en'});calls=[];}
async function act(command){view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command});}
test('valid narration uses one request and no paid correction',async()=>{
  await create();await act({type:'inspect'});assert.deepEqual(calls.map(c=>c.type),['adventure_narration']);assert.equal(view.pendingNarration,false);
});
test('a bad world reference is corrected once before any rejected records are applied',async()=>{
  await create();const beforeHp=view.hero.hp.current,beforeCalls=view.inferenceUsage.reportedCalls;
  handler=(type,payload)=>{
    if(type==='adventure_narration')return {narration:'A stranger arrives through an impossible doorway.',developments:{locations:[{id:'rejected-place',name:'Rejected doorway',description:'A proposed place.',kind:'interior',connectsTo:['camp']}],npcs:[{id:'rejected-person',name:'Stranger',role:'Visitor',locationId:'missing'}]}};
    assert.equal(type,'adventure_narration_repair');assert.match(payload.correction.reason,/Unknown NPC/);assert.ok(payload.correction.rejectedDevelopments.length<=3000);assert.equal(payload.outcome.type,'inspect');
    return {narration:'A visitor waves from the trading post.',developments:{npcs:[{id:'visitor',name:'Iris',role:'Visitor',locationId:'camp'}]}};
  };
  await act({type:'inspect'});assert.deepEqual(calls.map(c=>c.type),['adventure_narration','adventure_narration_repair']);assert.equal(view.pendingNarration,false);
  assert.ok(view.npcs.some(n=>n.id==='visitor'));assert.ok(!view.locations.some(l=>l.id==='rejected-place'));assert.ok(!view.npcs.some(n=>n.id==='rejected-person'));assert.equal(view.hero.hp.current,beforeHp);assert.equal(view.campaign.turn,2);assert.equal(view.journal.filter(e=>e.kind==='inspect').length,1);assert.equal(view.inferenceUsage.reportedCalls,beforeCalls+2);
});
test('malformed narrative text gets one bounded correction without repeating the action',async()=>{
  await create();handler=type=>type==='adventure_narration'?{narration:''}:{narration:'The hero finishes examining the post.'};await act({type:'inspect'});
  assert.equal(calls.length,2);assert.equal(view.pendingNarration,false);assert.equal(view.campaign.turn,2);assert.equal(view.messages.at(-1).text,'The hero finishes examining the post.');
});
test('two bad drafts stop after one correction and a later retry reuses saved diagnostics and mechanics',async()=>{
  await create();handler=()=>({narration:'An unsupported proposal.',developments:{npcs:[{id:'bad',name:'Bad',role:'Visitor',locationId:'camp',hp:999}]}});await act({type:'inspect'});
  assert.equal(calls.length,2);assert.equal(view.pendingNarration,true);assert.equal(view.npcs.length,0);const turn=view.campaign.turn,hours=view.campaign.hours,rolls=view.rolls.length,hp=view.hero.hp.current,recorded=view.inferenceUsage.reportedCalls;
  await srd.closeSessions();view=await engine.getView(view.campaign.id);handler=(type,payload)=>{assert.equal(type,'adventure_narration');assert.ok(payload.correction.issues.some(i=>i.code==='unrecognized_keys'));return {narration:'The post remains quiet; the hero has finished examining it.'};};
  view=await engine.retryNarration(view.campaign.id);assert.equal(calls.length,3);assert.equal(view.pendingNarration,false);assert.equal(view.campaign.turn,turn);assert.equal(view.campaign.hours,hours);assert.equal(view.rolls.length,rolls);assert.equal(view.hero.hp.current,hp);assert.equal(view.inferenceUsage.reportedCalls,recorded+1);assert.equal(view.journal.filter(e=>e.kind==='inspect').length,1);
});
test('an unavailable provider does not trigger a repair loop and failed manual retry usage persists',async()=>{
  await create();handler=()=>{throw new Error('simulated outage');};await act({type:'inspect'});assert.equal(calls.length,1);assert.equal(view.pendingNarration,true);const recorded=view.inferenceUsage.reportedCalls,turn=view.campaign.turn,hours=view.campaign.hours;
  view=await engine.retryNarration(view.campaign.id);assert.equal(calls.length,2);assert.equal(view.pendingNarration,true);assert.equal(view.campaign.turn,turn);assert.equal(view.campaign.hours,hours);assert.equal(view.inferenceUsage.reportedCalls,recorded+1);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.inferenceUsage.reportedCalls,recorded+1);
});
test('ordinary commerce still makes no narrative or repair request',async()=>{
  await create();const count=view.inferenceUsage.reportedCalls;handler=()=>{throw new Error('Commerce must not call AI');};const market=view.economy.markets[0],offer=market.offers.find(o=>o.kind==='supplies');
  await act({type:'trade',direction:'buy',marketId:market.id,offerId:offer.id});assert.equal(calls.length,0);assert.equal(view.inferenceUsage.reportedCalls,count);
});

test('an invalid initial world gets one correction before creating exactly one campaign',async()=>{
  const service=await srd.session(),before=service.listCampaigns().length;worldDraft=()=>({...structuredClone(world),startLocationId:'missing'});
  handler=(type,payload)=>{assert.equal(type,'adventure_world_repair');assert.match(payload.instruction,/No campaign or character has been created/);assert.match(payload.correction.reason,/Unknown starting location/);assert.ok(payload.correction.rejectedWorld.length<=4000);return structuredClone(world);};
  await create();assert.equal(service.listCampaigns().length,before+1);assert.equal(view.inferenceUsage.reportedCalls,2);assert.equal(view.scene.id,'camp');
});
test('two invalid world drafts leave the previous campaign active and create no partial character',async()=>{
  const service=await srd.session(),before=service.listCampaigns().length,active=(await engine.getView()).campaign.id;
  worldDraft=()=>({...structuredClone(world),startLocationId:'missing'});handler=()=>worldDraft();
  await assert.rejects(engine.create({heroName:'Rejected',worldIdea:'An invalid proposed workshop world',language:'en'}),/Unknown starting location/);assert.equal(calls.length,2);assert.equal(service.listCampaigns().length,before);assert.equal((await engine.getView()).campaign.id,active);
});

test('a malformed provider response gets one correction and never rerolls its already resolved check',async()=>{
  await create();handler=(type,payload)=>{if(type==='adventure_narration')throw Object.assign(new Error('Malformed provider draft'),{code:'INVALID_AI_DRAFT',draftText:'[broken-json'});assert.equal(type,'adventure_narration_repair');assert.equal(payload.correction.rejectedText,'[broken-json');return {narration:'The hero interprets the old symbols after the recorded check.'};};
  await act({type:'check',ability:'int',skill:'history',dc:5});assert.equal(calls.length,2);assert.equal(view.pendingNarration,false);assert.equal(view.rolls.length,1);assert.equal(view.campaign.turn,2);assert.equal(view.journal.filter(e=>e.kind==='check').length,1);
});

test('an invalid intent is corrected before executing its operation and does not create a second turn',async()=>{
  await create();handler=(type,payload,fallback)=>{
    if(type==='adventure_intent')return {type:'unsupported_operation',hp:999};
    if(type==='adventure_intent_repair'){assert.match(payload.instruction,/intended operation has NOT executed/);assert.ok(payload.correction.issues.length>0);return {type:'narrative',description:'Examine the posted workshop notice.'};}
    return fallback();
  };
  view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'Examine the posted notice.'});
  assert.deepEqual(calls.map(c=>c.type),['adventure_intent','adventure_intent_repair','adventure_narration']);assert.equal(view.campaign.turn,2);assert.equal(view.hero.hp.current,view.hero.hp.max);assert.equal(view.journal.filter(e=>e.kind==='story').length,1);
});
