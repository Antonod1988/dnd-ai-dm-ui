const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),model=require('../src/adventure-model');
const {contextFor}=require('../src/adventure-context');
let directory,original,view,calls=0,core;
const seedWorld={title:'The Glass Road',opening:'Two settlements exchange light and water.',startLocationId:'lens',
  locations:[{id:'lens',name:'Lensmakers',description:'Workshops polish light into glass.',kind:'settlement',connectsTo:['spring']},{id:'spring',name:'Springfolk',description:'Water gathers in quiet stone cisterns.',kind:'settlement',connectsTo:['lens']}],
  npcs:[{id:'merchant',name:'Iris',role:'Glass merchant',locationId:'lens'},{id:'boatman',name:'Tarn',role:'Water carrier',locationId:'spring'}],items:[],quests:[],checks:[],
  markets:[{id:'glass-market',locationId:'lens',merchantId:'merchant',name:'Iris’s exchange',livelihood:'Glass tools and medical draughts.',shortage:'Water deliveries have become unreliable.',scarcity:'none',
    offers:[{id:'food',name:'Travel kit',description:'Food and water for the road.',kind:'supplies'},{id:'remedy',name:'Amber restorative',description:'A warm restorative brewed by the guild.',kind:'goods',focus:'healing'},{id:'bed',name:'A quiet room',description:'A safe place to prepare.',kind:'lodging'},{id:'care',name:'A healer’s care',description:'Treat minor wounds.',kind:'healing'},{id:'rumor',name:'A route keeper’s secret',description:'A useful clue about the road.',kind:'rumor',discovery:'The secret aqueduct lies beneath the blue glass arch.'},{id:'ferry',name:'Water ferry',description:'A short ride to Springfolk.',kind:'transport',targetId:'spring'}],
    encounter:{title:'The delayed delivery',description:'Iris needs help organizing water deliveries.',choices:[{id:'help',label:'Offer two coins',kind:'donate'},{id:'plan',label:'Study the route',kind:'check',skill:'investigation',dc:12}]}},
    {id:'water-market',locationId:'spring',merchantId:'boatman',name:'Tarn’s landing',livelihood:'Water and passage between islands.',shortage:'Medicines are scarce here.',scarcity:'medicine',offers:[{id:'remedy',name:'Amber restorative',description:'A warm restorative brewed by the guild.',kind:'goods',focus:'healing'},{id:'food',name:'Travel kit',description:'Food and water for the road.',kind:'supplies'}]}]};
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-economy-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';original=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls++;return type==='adventure_world'?structuredClone(seedWorld):fallback();};core=await import('../vendor/dnd-core/dist/engine.mjs');});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){view=await engine.create({heroName:'Mira',classId:'wizard',worldIdea:'A realm of glass and water',language:'en',survival:true});return view;}
async function act(command,options={}){const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};view=await engine.perform(body,options);return body;}
const trade=(direction,offerId,extra={})=>({type:'trade',marketId:'glass-market',direction,offerId,...extra});
test('two original settlements have distinct prices and transactions preserve real money, stock, loot and history without AI calls',async()=>{
  await create();assert.equal(view.economy.coins,10);assert.doesNotMatch(JSON.stringify(view),/secret aqueduct/);
  const beforeCalls=calls;const body=await act(trade('buy','remedy'));assert.equal(calls,beforeCalls);assert.equal(view.economy.coins,2);assert.equal(view.economy.markets[0].offers.find(o=>o.id==='remedy').stock,2);
  const bought=view.hero.inventory.find(i=>i.origin?.kind==='purchase');assert.equal(bought.name,'Amber restorative');assert.equal(bought.mechanics.use.type,'healing');
  const repeat=await engine.perform(body);assert.equal(repeat.replayed,true);assert.equal(repeat.economy.coins,2);assert.equal(repeat.hero.inventory.find(i=>i.itemId===bought.itemId).quantity,1);
  await act(trade('sell',undefined,{itemId:bought.itemId}));assert.equal(calls,beforeCalls);assert.equal(view.economy.coins,5);assert.ok(!view.hero.inventory.some(i=>i.itemId===bought.itemId));
  assert.equal(view.economy.ledgerTotal,2);assert.equal(view.economy.ledger[0].amount,3);assert.ok(view.journal.some(e=>e.kind==='economy'));
  const id=view.campaign.id;await srd.closeSessions();view=await engine.getView(id);assert.equal(view.economy.coins,5);assert.equal(view.economy.ledgerTotal,2);assert.equal(view.economy.markets[0].cash,45);
  await act({type:'travel',locationId:'spring'});assert.equal(view.economy.markets[0].name,'Tarn’s landing');assert.equal(view.economy.markets[0].offers.find(o=>o.id==='remedy').price,12);
});
test('stock, affordability, location, equipped gear, arbitrary prices and stale writes are guarded before saving',async()=>{
  await create();for(let i=0;i<3;i++)await act(trade('buy','food'));assert.equal(view.economy.coins,4);assert.equal(view.survival.foodDays,12);
  const before=JSON.stringify(view.hero),revision=view.campaign.revision;
  await assert.rejects(act(trade('buy','food')),/закончился/);
  await assert.rejects(act(trade('buy','remedy')),/Недостаточно/);
  await assert.rejects(act({...trade('buy','food'),price:-100}));
  await assert.rejects(act(trade('sell',undefined,{itemId:'dagger'})),/экипировку/);
  await assert.rejects(act({...trade('buy','food'),marketId:'water-market'}),/не рядом/);
  const after=await engine.getView(view.campaign.id);assert.equal(JSON.stringify(after.hero),before);assert.equal(after.campaign.revision,revision);
  await assert.rejects(engine.perform({campaignId:view.campaign.id,expectedRevision:revision-1,operationId:crypto.randomUUID(),command:trade('buy','food')}),/Кампания уже/);
});
test('paid lodging restores real slots and grants a nonstacking bonus that a later check consumes; rumor and transport have persistent effects',async()=>{
  await create();view=await engine.learnSpell(view.campaign.id,{name:'Paper shield',description:'A fold of protective light.',level:1,rangeFeet:0,target:'self',durationTurns:1,effects:[{type:'armor',amount:1}]});
  await act({type:'cast_created_spell',spellId:view.createdSpells[0].id,targetId:view.hero.id});assert.equal(view.hero.spellcasting.slots['1'].current,1);
  let count=calls;await act({type:'service',marketId:'glass-market',offerId:'bed'});assert.equal(calls,count);assert.equal(view.hero.spellcasting.slots['1'].current,2);assert.equal(view.campaign.hours,16+6/3600);assert.equal(view.economy.coins,8);
  assert.equal(view.hero.activeEffects.filter(e=>e.id.startsWith('comfortable-rest-')).length,1);
  await act({type:'service',marketId:'glass-market',offerId:'bed'});assert.equal(view.hero.activeEffects.filter(e=>e.id.startsWith('comfortable-rest-')).length,1);
  await act({type:'market_choice',marketId:'glass-market',choiceId:'plan'},{seed:'economy-check'});assert.ok(!view.hero.activeEffects?.some(e=>e.id.startsWith('comfortable-rest-')));assert.ok(view.rolls.some(r=>r.label.includes('comfortable')||r.label.includes('Comfortable')));
  await act({type:'service',marketId:'glass-market',offerId:'rumor'});assert.ok(view.facts.some(f=>f.text.includes('secret aqueduct')));
  await assert.rejects(act({type:'service',marketId:'glass-market',offerId:'rumor'}),/недоступна|уже получены/);
  // Sell the unused starting potion to fund the ferry; this is an ordinary inventory sale.
  await act(trade('sell',undefined,{itemId:'healing_potion'}));
  const hours=view.campaign.hours;await act({type:'service',marketId:'glass-market',offerId:'ferry'});assert.equal(view.scene.id,'spring');assert.ok(Math.abs(view.campaign.hours-hours-0.25)<1e-8);
});
test('an encounter check cannot reroll; a distinct paid approach changes trust, reputation and prices only once',async()=>{
  await create();const base=view.economy.markets[0].offers.find(o=>o.id==='remedy').price;
  let failureSeed;for(let i=0;i<100;i++)if(!core.rollAbilityCheck(view.hero,{ability:'int',skill:'investigation',dc:12,rng:new core.SeededRng(String(i))}).success){failureSeed=String(i);break;}
  await act({type:'market_choice',marketId:'glass-market',choiceId:'plan'},{seed:failureSeed});assert.equal(view.economy.markets[0].encounter.attempts[0].success,false);
  const rolls=view.rolls.length;await assert.rejects(act({type:'market_choice',marketId:'glass-market',choiceId:'plan'}),/уже проверен/);assert.equal((await engine.getView(view.campaign.id)).rolls.length,rolls);
  const body=await act({type:'market_choice',marketId:'glass-market',choiceId:'help'});assert.equal(view.economy.coins,8);assert.equal(view.economy.markets[0].discount,0.15);assert.ok(view.economy.markets[0].offers.find(o=>o.id==='remedy').price<base);assert.equal(view.npcs.find(n=>n.id==='merchant').trust,1);assert.equal(view.reputation.lens,1);
  const replay=await engine.perform(body);assert.equal(replay.npcs.find(n=>n.id==='merchant').trust,1);assert.equal(replay.economy.coins,8);
  await assert.rejects(act({type:'market_choice',marketId:'glass-market',choiceId:'help'}),/уже разрешена/);
});
test('a day refreshes supplies while page reads do not, and market secrets never enter an unpaid model context',async()=>{
  await create();const id=view.campaign.id;await act(trade('buy','food'));const stock=view.economy.markets[0].offers.find(o=>o.id==='food').stock;
  for(let i=0;i<3;i++)assert.equal((await engine.getView(id)).economy.markets[0].offers.find(o=>o.id==='food').stock,stock);
  await act({type:'rest',kind:'long'});await act({type:'rest',kind:'long'});assert.equal(view.campaign.day,2);assert.equal(view.economy.markets[0].offers.find(o=>o.id==='food').stock,3);
  const loaded=await engine.loaded(id),context=contextFor(loaded.state,loaded.adventure,'secret aqueduct, buy a rumor');assert.doesNotMatch(JSON.stringify(context.packet),/The secret aqueduct lies/);assert.ok(context.metrics.chars<=12000);assert.equal(context.packet.hero.coins,8);
  const invalid=structuredClone(seedWorld);invalid.markets[0].offers.find(o=>o.kind==='transport').targetId='unknown';assert.throws(()=>model.validateSeed(invalid),/transport/);
});
test('a reachable ferry can skip intermediate roads with a proportional cost and duration',async()=>{
  const savedGenerator=ai.generateStructured;
  ai.generateStructured=async(type,payload,fallback)=>{calls++;if(type!=='adventure_world')return fallback();const draft=structuredClone(seedWorld);draft.locations[0].connectsTo=['bridge'];draft.locations[1].connectsTo=['bridge'];draft.locations.push({id:'bridge',name:'Cloud bridge',description:'A road between the islands.',kind:'road',connectsTo:['lens','spring']});return draft;};
  try{await create();const ferry=view.economy.markets[0].offers.find(o=>o.id==='ferry');assert.equal(ferry.price,6);assert.equal(ferry.travelMinutes,30);const hour=view.campaign.hours;await act({type:'service',marketId:'glass-market',offerId:'ferry'});assert.equal(view.scene.id,'spring');assert.equal(view.economy.coins,4);assert.equal(view.campaign.hours-hour,0.5);}finally{ai.generateStructured=savedGenerator;}
});
test('spending the last coin and later selling an item recreates a valid currency record without instant buyback profit',async()=>{
  await create();await act(trade('buy','remedy'));await act({type:'service',marketId:'glass-market',offerId:'bed'});assert.equal(view.economy.coins,0);assert.ok(!view.hero.inventory.some(i=>i.itemId==='gold_piece'));
  await act(trade('sell',undefined,{itemId:'healing_potion'}));assert.equal(view.economy.coins,3);assert.equal(view.hero.inventory.find(i=>i.itemId==='gold_piece').quantity,3);
  const bought=view.hero.inventory.find(i=>i.origin?.kind==='purchase');await act(trade('sell',undefined,{itemId:bought.itemId}));const offer=view.economy.markets[0].offers.find(o=>o.name==='Amber restorative'&&o.id.startsWith('resale-'));assert.ok(offer.price>3);assert.equal(view.economy.coins,6);
});
test('lodging at a named inn moves the hero there and includes the ordinary journey before eight hours of rest',async()=>{
  const savedGenerator=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls++;if(type!=='adventure_world')return fallback();const draft=structuredClone(seedWorld);draft.locations[0].connectsTo.push('inn');draft.locations.push({id:'inn',name:'The Copper Lamp',description:'A quiet inn.',kind:'interior',connectsTo:['lens']});draft.markets[0].offers.find(o=>o.id==='bed').targetId='inn';return draft;};
  try{await create();assert.equal(view.economy.markets[0].offers.find(o=>o.id==='bed').arrivalMinutes,60);const time=view.campaign.hours;await act({type:'service',marketId:'glass-market',offerId:'bed'});assert.equal(view.scene.id,'inn');assert.equal(view.campaign.hours-time,9);assert.equal(view.economy.coins,8);assert.ok(view.journal.some(e=>e.kind==='visit'&&e.targetId==='inn'));}finally{ai.generateStructured=savedGenerator;}
});
test('a market cannot relocate an existing merchant through an ignored duplicate NPC draft',()=>{
  const world=model.makeAdventure(model.validateSeed(structuredClone(seedWorld)),{worldIdea:'Glass roads',heroConcept:'',language:'en'});
  assert.throws(()=>model.validateDevelopments({npcs:[{id:'merchant',name:'Iris',role:'Merchant',locationId:'spring'}],markets:[{id:'ghost-market',locationId:'spring',name:'Ghost market',livelihood:'Trade',merchantId:'merchant',offers:[{id:'goods',name:'Medicine',description:'A restorative.',kind:'goods',focus:'healing'}]}]},world),/Unknown local merchant/);
});
test('an original traveling trader can offer real goods on a road instead of requiring a settlement template',async()=>{
  const savedGenerator=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls++;if(type!=='adventure_world')return fallback();const draft=structuredClone(seedWorld);draft.locations[0].connectsTo.push('road');draft.locations.push({id:'road',name:'The crossing',description:'A caravan pauses on the road.',kind:'road',connectsTo:['lens']});draft.npcs.push({id:'traveler',name:'Nell',role:'Traveling trader',locationId:'road'});draft.markets.push({id:'caravan',locationId:'road',name:'Nell’s caravan',livelihood:'Medicines for travelers.',merchantId:'traveler',offers:[{id:'remedy',name:'Road remedy',description:'A restorative carried by the caravan.',kind:'goods',focus:'healing'}]});return draft;};
  try{await create();await act({type:'travel',locationId:'road'});assert.equal(view.economy.markets[0].name,'Nell’s caravan');await act({type:'trade',marketId:'caravan',direction:'buy',offerId:'remedy'});assert.equal(view.economy.coins,2);assert.ok(view.hero.inventory.some(i=>i.name==='Road remedy'));}finally{ai.generateStructured=savedGenerator;}
});
test('a long attributed report recalls its final clue instead of clipping it away',async()=>{
  const savedGenerator=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls++;if(type!=='adventure_world')return fallback();const draft=structuredClone(seedWorld);draft.markets[0].name='Iris '.repeat(31).trim();draft.markets[0].offers.find(o=>o.id==='rumor').discovery='a '.repeat(240)+'Jade Compass';return draft;};
  try{await create();await act({type:'service',marketId:'glass-market',offerId:'rumor'});const report=view.facts.find(f=>f.tags.includes('rumor'));assert.ok(report.text.length>650);let loaded=await engine.loaded(view.campaign.id),context=contextFor(loaded.state,loaded.adventure,'Jade Compass');const fact=context.packet.activeFacts.find(f=>f.confidence==='reported');assert.ok(fact.text.includes('Jade Compass'));assert.equal(fact.sourceSceneId,'lens');assert.ok(context.metrics.chars<=12000);
    view=await require('../src/adventure-memory').pin({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),recordId:report.id,kind:'fact',pinned:true});loaded=await engine.loaded(view.campaign.id);context=contextFor(loaded.state,loaded.adventure,'Jade Compass');assert.ok(context.packet.bookmarks.some(b=>b.kind==='reported_information'&&b.sourceSceneId==='lens'&&b.text.includes('Jade Compass')));assert.equal(context.packet.omitted.facts,0);
  }finally{ai.generateStructured=savedGenerator;}
});
