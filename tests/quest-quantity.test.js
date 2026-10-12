const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),model=require('../src/adventure-model');
let directory,original,view,draft,intent,calls;
function world(kind='quest'){return {title:'Finite parcels',opening:'Iris offers two separate deliveries.',startLocationId:'camp',locations:[{id:'camp',name:'Camp',description:'A supply counter.',kind:'settlement',connectsTo:['road']},{id:'road',name:'Road',description:'An empty road.',connectsTo:['camp']}],npcs:[{id:'iris',name:'Iris',role:'Supplier',locationId:'camp'}],items:[{id:'supply',name:'Travel parcels',description:'Useful ordinary supplies.',locationId:'camp',kind,quantity:6}],checks:[],quests:['first','second'].map(id=>({id,title:id,summary:'Deliver three separate parcels.',giverId:'iris',objectives:[{text:'Give three parcels to Iris',kind:'deliver',targetId:'supply',recipientId:'iris',quantity:3}]}))};}
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-quantity-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';original=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls.push(type);return type==='adventure_world'?structuredClone(draft):type==='adventure_intent'?structuredClone(intent):fallback();};});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(kind,custom){draft=custom??world(kind);calls=[];view=await engine.create({heroName:'Rae',worldIdea:'Finite parcels',language:'en'});}
async function act(command,extra={}){const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command,...extra};view=await engine.perform(body,{seed:'quantity-real-rules'});return body;}
const delivery=(id,quantity)=>({type:'deliver',questId:id,objectiveId:view.quests.find(q=>q.id===id).objectives[0].id,...(quantity===undefined?{}:{quantity})});
const countHero=()=>view.hero.inventory.filter(i=>i.tags.includes('supply')).reduce((n,i)=>n+i.quantity,0);
async function conserved(){const loaded=await engine.loaded(view.campaign.id);return (loaded.adventure.items[0].remainingQuantity??(loaded.adventure.items[0].collected?0:1))+countHero()+(loaded.adventure.npcs[0].receivedItems||[]).reduce((n,r)=>n+r.item.quantity,0);}
async function reject(command,pattern){const loaded=await engine.loaded(view.campaign.id),before=JSON.stringify({state:loaded.state,adventure:loaded.adventure});await assert.rejects(act(command),pattern);const after=await engine.loaded(view.campaign.id);assert.equal(JSON.stringify({state:after.state,adventure:after.adventure}),before);}

test('bounded quantity schemas permit acquisition and delivery only and legacy defaults stay one',()=>{
  const valid=model.validateSeed(world());assert.equal(valid.items[0].quantity,6);assert.equal(valid.quests[0].objectives[0].quantity,3);
  for(const quantity of [0,9,NaN,1.5]){const w=world();w.items[0].quantity=quantity;assert.throws(()=>model.validateSeed(w));}
  for(const quantity of [0,21,NaN,1.5]){const w=world();w.quests[0].objectives[0].quantity=quantity;assert.throws(()=>model.validateSeed(w));}
  const w=world();w.quests[0].objectives[0]={text:'Get it',kind:'acquire',targetId:'supply',quantity:3};assert.equal(model.validateSeed(w).quests[0].objectives[0].quantity,3);w.quests[0].objectives[0]={text:'Talk',kind:'talk',targetId:'iris',quantity:3};assert.throws(()=>model.validateSeed(w));
});

test('known finite sources reject impossible promised amounts; competing offers and unknown legacy sources are not invented shortages',()=>{
  const w=world();w.items[0].quantity=8;w.quests[0].objectives[0].quantity=20;assert.throws(()=>model.validateSeed(w),/finite item source/);
  w.quests.forEach(q=>q.objectives[0].quantity=8);assert.equal(model.validateSeed(w).quests.length,2,'competing offers are not summed');
  const a=model.makeAdventure(model.validateSeed(world()),{language:'en',worldIdea:'Finite'}),patch={quests:[{id:'larger-order',title:'Larger order',summary:'A declared amount.',objectives:[{text:'Give twenty',kind:'deliver',targetId:'supply',recipientId:'iris',quantity:20}]}]};
  assert.throws(()=>model.validateDevelopments(patch,a),/finite item source/);delete a.items[0].quantity;delete a.items[0].remainingQuantity;assert.equal(model.validateDevelopments(patch,a).quests[0].objectives[0].quantity,20,'unknown old source capacity is not guessed from display default one');
});

test('partial source pickup and delivery conserve units; only exact completion grants trust and one reward across replay/reopen',async()=>{
  await create();for(const questId of ['first','second'])await act({type:'accept_quest',questId});
  const beforeXp=view.hero.xp;
  await act({quantity:2},{actionId:'pickup:supply'});assert.equal(countHero(),2);assert.equal(view.items[0].remainingQuantity,4);assert.equal(await conserved(),6);
  const template=(await engine.loaded(view.campaign.id)).adventure.items[0].lootInput;
  const action=view.actions.find(a=>a.id.startsWith('deliver:first:'));assert.deepEqual([action.quantity,action.maxQuantity,action.remainingQuantity,action.ownedQuantity],[1,2,3,2]);assert.match(action.label,/1/);
  const partial=await act({quantity:1},{actionId:action.id});assert.equal(view.quests[0].objectives[0].deliveredQuantity,1);assert.equal(view.quests[0].status,'active');assert.equal(view.hero.xp,beforeXp);assert.equal(view.npcs[0].trust,0);assert.equal(countHero(),1);assert.equal(await conserved(),6);
  await reject(delivery('first',3),/остаток/);
  await act({type:'pickup',itemId:'supply',quantity:4});assert.equal(view.items[0].collected,true);assert.equal(view.items[0].remainingQuantity,0);assert.equal(countHero(),5);assert.equal(await conserved(),6);
  assert.deepEqual((await engine.loaded(view.campaign.id)).adventure.items[0].lootInput,template);
  await act(delivery('first',2));assert.equal(view.quests[0].status,'completed');assert.equal(view.quests[0].objectives[0].deliveredQuantity,3);assert.equal(view.quests[0].objectives[0].evidenceEventIds.length,3);assert.equal(view.quests[1].objectives[0].deliveredQuantity,0);assert.equal(countHero(),3);assert.equal(view.npcs[0].trust,1);assert.equal(view.hero.xp-beforeXp,75);
  let loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.reputation.camp,1);assert.equal(loaded.adventure.events.filter(e=>e.kind==='quest_reward').length,1);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);view=await engine.perform(partial);assert.equal(view.replayed,true);assert.equal(view.quests[0].objectives[0].deliveredQuantity,3);assert.equal(countHero(),3);assert.equal(view.hero.xp-beforeXp,75);
  await reject({type:'pickup',itemId:'supply'},/уже взят/);await act(delivery('second',3));assert.equal(view.quests[1].status,'completed');assert.equal(view.hero.xp-beforeXp,150);assert.equal(countHero(),0);assert.equal(await conserved(),6);
  loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.events.filter(e=>e.kind==='quest_reward').length,2);assert.equal(loaded.adventure.npcs[0].receivedItems.length,6);assert.equal(new Set(loaded.adventure.npcs[0].receivedItems.map(r=>r.eventId)).size,6);assert.equal(loaded.adventure.reputation.camp,2);
});

test('explicit quantities survive AI action routing, and source/recipient/gear refusals are atomic',async()=>{
  await create();await act({type:'accept_quest',questId:'first'});
  intent={type:'action',actionId:'pickup:supply',quantity:2,description:'Take two parcels.'};await act(undefined,{input:'Take two parcels.'});assert.equal(countHero(),2);
  intent={type:'action',actionId:view.actions.find(a=>a.id.startsWith('deliver:first:')).id,quantity:1,description:'Give one parcel.'};await act(undefined,{input:'Give one parcel.'});assert.equal(countHero(),1);assert.equal(view.quests[0].objectives[0].deliveredQuantity,1);
  for(const quantity of [0,-1,1.5,9,NaN])await reject({type:'pickup',itemId:'supply',quantity},/./);
  await reject({type:'pickup',itemId:'supply',quantity:5},/количества/);await reject(delivery('first',3),/остаток/);await reject({...delivery('first',1),objectiveId:'unknown'},/этап/);
  await act({type:'travel',locationId:'road'});await reject(delivery('first',1),/не рядом/);await act({type:'travel',locationId:'camp'});
  let loaded=await engine.loaded(view.campaign.id),hero=loaded.state.party.members.find(m=>m.id===loaded.state.party.heroId),item=hero.inventory.find(i=>i.tags.includes('supply'));item.attuned=true;await engine.save(loaded.service,loaded.state,loaded.adventure,'quantity_attuned_fixture');view=await engine.getView(view.campaign.id);await reject(delivery('first',1),/снимите/);
  loaded=await engine.loaded(view.campaign.id);hero=loaded.state.party.members.find(m=>m.id===loaded.state.party.heroId);item=hero.inventory.find(i=>i.tags.includes('supply'));item.attuned=false;hero.equipment.test_slot=item.itemId;await engine.save(loaded.service,loaded.state,loaded.adventure,'quantity_equipped_fixture');view=await engine.getView(view.campaign.id);await reject(delivery('first',1),/снимите/);
  loaded=await engine.loaded(view.campaign.id);hero=loaded.state.party.members.find(m=>m.id===loaded.state.party.heroId);delete hero.equipment.test_slot;loaded.adventure.environment={props:[],consequences:[],npcStates:[{npcId:'iris',body:{hp:{current:0,max:4},conditions:['dead']}}]};await engine.save(loaded.service,loaded.state,loaded.adventure,'quantity_dead_fixture');view=await engine.getView(view.campaign.id);const coins=countHero(),xp=view.hero.xp;await act(delivery('first',1));assert.ok(view.refusal);assert.equal(countHero(),coins);assert.equal(view.hero.xp,xp);assert.equal(view.quests[0].objectives[0].deliveredQuantity,1);
});

test('separate native weapon, consumable and charged tool instances retain mechanics and spent charges on handover',async()=>{
  for(const kind of ['weapon','consumable','tool']){
    await create(kind);await act({type:'accept_quest',questId:'first'});
    if(kind==='tool'){const l=await engine.loaded(view.campaign.id);l.adventure.items[0].lootInput={name:'Travel parcels',description:'A modeled three-charge tool.',itemType:'wondrous',rarity:'common',charges:{current:3,max:3,costPerUse:1,recharge:'none'},useEffect:{type:'ability_check_bonus',dice:'1d4',durationTurns:1,consume:false}};await engine.save(l.service,l.state,l.adventure,'native_charged_template_fixture');view=await engine.getView(view.campaign.id);}
    await act({type:'pickup',itemId:'supply',quantity:2});
    const items=view.hero.inventory.filter(i=>i.tags.includes('supply'));assert.equal(items.length,2);assert.equal(new Set(items.map(i=>i.itemId)).size,2);assert.ok(items.every(i=>i.quantity===1));
    if(kind==='weapon')assert.ok(items.every(i=>i.mechanics.equip.attack.id===i.itemId));
    if(kind==='consumable')assert.ok(items.every(i=>i.mechanics.use.type==='healing'&&i.mechanics.use.consume));
    if(kind==='tool'){
      const loaded=await engine.loaded(view.campaign.id),hero=loaded.state.party.members.find(m=>m.id===loaded.state.party.heroId),owned=hero.inventory.filter(i=>i.tags.includes('supply'));assert.ok(owned.every(i=>i.charges));owned[0].charges.current=0;owned[1].charges.current=1;
      await engine.save(loaded.service,loaded.state,loaded.adventure,'spent_independent_charges');view=await engine.getView(view.campaign.id);
    }
    const before=await engine.loaded(view.campaign.id),physical=structuredClone(before.state.party.members.find(m=>m.id===before.state.party.heroId).inventory.filter(i=>i.tags.includes('supply')));await act(delivery('first',2));const loaded=await engine.loaded(view.campaign.id),receipts=loaded.adventure.npcs[0].receivedItems;assert.deepEqual(receipts.map(r=>r.item),physical);assert.equal(countHero(),0);assert.equal(view.quests[0].status,'active');assert.equal(view.npcs[0].trust,0);
  }
});

test('legacy one-unit saves normalize without recreation and concealed source quantities stay private',async()=>{
  await create();let loaded=await engine.loaded(view.campaign.id);delete loaded.adventure.items[0].quantity;delete loaded.adventure.items[0].remainingQuantity;
  for(const q of loaded.adventure.quests){delete q.objectives[0].quantity;delete q.objectives[0].deliveredQuantity;delete q.objectives[0].evidenceEventIds;}
  await engine.save(loaded.service,loaded.state,loaded.adventure,'legacy_quantity_fixture');view=await engine.getView(view.campaign.id);assert.equal(view.items[0].remainingQuantity,1);assert.equal(view.quests[0].objectives[0].quantity,1);
  await act({type:'accept_quest',questId:'first'});await act({type:'pickup',itemId:'supply'});await act(delivery('first'));assert.equal(view.quests[0].status,'completed');await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.items[0].remainingQuantity,0);assert.equal(view.quests[0].objectives[0].deliveredQuantity,1);
  await create();loaded=await engine.loaded(view.campaign.id);loaded.adventure.items[0].access={mode:'all',conditions:[{kind:'victory',targetId:'road'}],description:'A sealed container.',label:'Closed container',concealed:true};await engine.save(loaded.service,loaded.state,loaded.adventure,'concealed_quantity_fixture');view=await engine.getView(view.campaign.id);assert.equal(view.items[0].concealed,true);assert.equal(view.items[0].quantity,undefined);assert.equal(view.items[0].remainingQuantity,undefined);assert.ok(!view.actions.some(a=>a.id==='pickup:supply'));await reject({type:'pickup',itemId:'supply',quantity:1},/недоступен/);
});

test('legacy charge pools expose only feasible quantities and explicit action amounts never silently become the default',async()=>{
  await create('tool');await act({type:'accept_quest',questId:'first'});await act({type:'pickup',itemId:'supply',quantity:3});
  let l=await engine.loaded(view.campaign.id),hero=l.state.party.members.find(m=>m.id===l.state.party.heroId),units=hero.inventory.filter(i=>i.tags.includes('supply')),pool=units[0];pool.quantity=3;pool.charges={current:1,max:3,costPerUse:1,recharge:'none'};hero.inventory=hero.inventory.filter(i=>!i.tags.includes('supply')||i.itemId===pool.itemId);
  await engine.save(l.service,l.state,l.adventure,'legacy_charge_pool');view=await engine.getView(view.campaign.id);
  const action=view.actions.find(a=>a.id.startsWith('deliver:first:'));assert.deepEqual(action.allowedQuantities,[3]);assert.equal(action.quantity,3);assert.match(action.label,/3/);
  const before=JSON.stringify((await engine.loaded(view.campaign.id)).state.party);await assert.rejects(act({quantity:1},{actionId:action.id}),/нельзя разделить/);assert.equal(JSON.stringify((await engine.loaded(view.campaign.id)).state.party),before);
  intent={type:'action',actionId:action.id,quantity:1,description:'Give only one.'};await assert.rejects(act(undefined,{input:'Give only one.'}),/нельзя разделить/);assert.equal(countHero(),3);assert.equal(view.quests[0].objectives[0].deliveredQuantity,0);
  await act({quantity:3},{actionId:action.id});l=await engine.loaded(view.campaign.id);assert.equal(l.adventure.npcs[0].receivedItems[0].item.quantity,3);assert.equal(l.adventure.npcs[0].receivedItems[0].item.charges.current,1);assert.equal(view.quests[0].status,'completed');assert.equal(view.quests[1].status,'offered');assert.equal(view.quests[1].objectives[0].deliveredQuantity,0);
  await create('tool');await act({type:'accept_quest',questId:'first'});await act({type:'pickup',itemId:'supply',quantity:4});
  l=await engine.loaded(view.campaign.id);hero=l.state.party.members.find(m=>m.id===l.state.party.heroId);units=hero.inventory.filter(i=>i.tags.includes('supply'));pool=units[0];pool.quantity=3;pool.charges={current:0,max:3,costPerUse:1,recharge:'none'};hero.inventory=hero.inventory.filter(i=>!i.tags.includes('supply')||[pool.itemId,units[1].itemId].includes(i.itemId));l.adventure.quests[0].objectives[0].quantity=4;
  await engine.save(l.service,l.state,l.adventure,'mixed_charge_pool');view=await engine.getView(view.campaign.id);const mixed=view.actions.find(a=>a.id.startsWith('deliver:first:'));assert.deepEqual(mixed.allowedQuantities,[1,3,4]);assert.equal(mixed.quantity,1);
  await act(delivery('first',1));l=await engine.loaded(view.campaign.id);assert.equal(l.adventure.npcs[0].receivedItems[0].item.itemId,units[1].itemId);assert.equal(countHero(),3);assert.equal(view.hero.inventory.find(i=>i.itemId===pool.itemId).charges.current,0);
  await act(delivery('first',3));assert.equal(view.quests[0].status,'completed');assert.equal(await conserved(),6);
});

test('combat and zero-HP heroes cannot spend inventory on a delivery or pickup',async()=>{
  await create();await act({type:'accept_quest',questId:'first'});await act({type:'pickup',itemId:'supply'});await act({type:'combat',theme:'Unrelated raiders',difficulty:'easy'});await reject(delivery('first',1),/Сейчас идёт бой/);await reject({type:'pickup',itemId:'supply'},/Сейчас идёт бой/);
  await create();await act({type:'accept_quest',questId:'first'});await act({type:'pickup',itemId:'supply'});const l=await engine.loaded(view.campaign.id);l.state.party.members.find(m=>m.id===l.state.party.heroId).hp.current=0;await engine.save(l.service,l.state,l.adventure,'zero_hp_quantity_fixture');view=await engine.getView(view.campaign.id);await reject(delivery('first',1),/0 HP/);await reject({type:'pickup',itemId:'supply'},/0 HP/);
});

test('HTTP pickup invalid amounts return human 400 messages without saving or spending anything',async()=>{
  await create();const server=await require('../src/server').createAlphaServer({port:0}),url=`http://127.0.0.1:${server.address().port}`;
  try{
    const l=await engine.loaded(view.campaign.id),before=JSON.stringify({state:l.service.loadCampaign(view.campaign.id),adventure:l.adventure});
    for(const quantity of [0,1.5,9]){
      const response=await fetch(`${url}/api/adventure/act`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command:{type:'pickup',itemId:'supply',quantity}})});
      assert.equal(response.status,400);const body=await response.json();assert.match(body.error,/целое количество от 1 до 8/);assert.doesNotMatch(body.error,/quantity|invalid_type|too_small|path|\[|\{/);
      const after=await engine.loaded(view.campaign.id);assert.equal(JSON.stringify({state:after.service.loadCampaign(view.campaign.id),adventure:after.adventure}),before);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('HTTP delivery invalid amounts return a human 400 and preserve held units and partial progress',async()=>{
  await create();await act({type:'accept_quest',questId:'first'});await act({type:'pickup',itemId:'supply',quantity:2});
  const server=await require('../src/server').createAlphaServer({port:0}),url=`http://127.0.0.1:${server.address().port}`;
  try{
    const l=await engine.loaded(view.campaign.id),before=JSON.stringify({state:l.service.loadCampaign(view.campaign.id),adventure:l.adventure});
    for(const quantity of [0,1.5,21]){
      const response=await fetch(`${url}/api/adventure/act`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command:delivery('first',quantity)})});
      assert.equal(response.status,400);const body=await response.json();assert.match(body.error,/целое количество от 1 до 20/);assert.doesNotMatch(body.error,/quantity|invalid_type|too_small|path|\[|\{/);
      const after=await engine.loaded(view.campaign.id);assert.equal(JSON.stringify({state:after.service.loadCampaign(view.campaign.id),adventure:after.adventure}),before);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});

function acquisitionWorld(){const w=world();w.quests=[{id:'first',title:'Collect and give three',summary:'Three real parcels are needed.',giverId:'iris',objectives:[{text:'Collect three parcels',kind:'acquire',targetId:'supply',quantity:3},{text:'Give all three to Iris',kind:'deliver',targetId:'supply',recipientId:'iris',quantity:3}]}];return w;}

test('sequential acquire3 and deliver3 retain two exact pickup receipts and never complete after one',async()=>{
  await create(undefined,acquisitionWorld());await act({type:'accept_quest',questId:'first'});const first=await act({type:'pickup',itemId:'supply',quantity:1});
  assert.equal(view.quests[0].objectives[0].acquiredQuantity,1);assert.equal(view.quests[0].objectives[0].completed,false);assert.ok(!view.actions.some(a=>a.id.startsWith('deliver:first:')));assert.equal(view.hero.xp,0);
  await act({type:'pickup',itemId:'supply',quantity:2});assert.equal(view.quests[0].objectives[0].acquiredQuantity,3);assert.equal(view.quests[0].objectives[0].completed,true);assert.equal(view.quests[0].objectives[0].evidenceEventIds.length,2);assert.equal(view.quests[0].status,'active');
  let l=await engine.loaded(view.campaign.id),receipts=l.adventure.events.filter(e=>e.kind==='acquire');assert.deepEqual(receipts.map(e=>e.quantity),[1,2]);assert.equal(l.adventure.events.filter(e=>e.source==='inventory_confirmation').length,0);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);view=await engine.perform(first);assert.equal(view.replayed,true);assert.equal(view.quests[0].objectives[0].acquiredQuantity,3);
  const objectiveId=view.quests[0].objectives[1].id;await act({type:'deliver',questId:'first',objectiveId,quantity:1});assert.equal(view.quests[0].status,'active');assert.equal(view.hero.xp,0);await act({type:'deliver',questId:'first',objectiveId,quantity:2});assert.equal(view.quests[0].status,'completed');assert.equal(view.hero.xp,100);
  l=await engine.loaded(view.campaign.id);assert.equal(l.adventure.events.filter(e=>e.kind==='quest_reward').length,1);assert.deepEqual(l.adventure.events.filter(e=>e.kind==='acquire'),receipts);
});

test('preaccept partial and complete native acquisition receipts are reused without claiming one pickup was three',async()=>{
  for(const initial of [1,3]){
    await create(undefined,acquisitionWorld());await act({type:'pickup',itemId:'supply',quantity:initial});let l=await engine.loaded(view.campaign.id),past=structuredClone(l.adventure.events.filter(e=>e.kind==='acquire'));
    await act({type:'accept_quest',questId:'first'});assert.equal(view.quests[0].objectives[0].acquiredQuantity,initial);assert.equal(view.quests[0].objectives[0].completed,initial===3);
    if(initial===1)await act({type:'pickup',itemId:'supply',quantity:2});assert.equal(view.quests[0].objectives[0].acquiredQuantity,3);assert.equal(view.quests[0].objectives[0].completed,true);
    l=await engine.loaded(view.campaign.id);for(const old of past)assert.deepEqual(l.adventure.events.find(e=>e.id===old.id),old);await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.quests[0].objectives[0].acquiredQuantity,3);
  }
});

test('missing old receipts use a new current inventory confirmation without rewriting old history or fabricating unheld stock',async()=>{
  await create(undefined,acquisitionWorld());await act({type:'pickup',itemId:'supply',quantity:3});let l=await engine.loaded(view.campaign.id),old=structuredClone(l.adventure.events.find(e=>e.kind==='acquire'));
  delete l.adventure.events.find(e=>e.id===old.id).quantity;l.adventure.events=l.adventure.events.filter(e=>e.id!==old.id);l.adventure.journal=l.adventure.journal.filter(e=>e.id!==old.id);l.adventure.events.push({id:'old-note',turn:1,kind:'story',targetId:'supply',text:'A claim that all three parcels were collected.'});const note=structuredClone(l.adventure.events.at(-1));
  const claim={id:'acquire-claim',turn:1,kind:'acquire',targetId:'supply',quantity:3,source:'player_statement',role:'player',confidence:'unverified',text:'I claim three parcels.'};l.adventure.events.push(claim);
  await engine.save(l.service,l.state,l.adventure,'missing_acquisition_history_fixture');view=await engine.getView(view.campaign.id);await act({type:'accept_quest',questId:'first'});
  l=await engine.loaded(view.campaign.id);const confirmation=l.adventure.events.find(e=>e.source==='inventory_confirmation');assert.ok(confirmation);assert.equal(confirmation.quantity,3);assert.equal(confirmation.confirmedHeldQuantity,3);assert.equal(confirmation.questId,'first');assert.equal(confirmation.objectiveId,view.quests[0].objectives[0].id);assert.equal(confirmation.fromId,view.hero.id);assert.equal(confirmation.turn,view.campaign.turn);assert.match(confirmation.text,/confirmed now.*already carries 3/i);assert.deepEqual(l.adventure.events.find(e=>e.id===note.id),note);assert.deepEqual(l.adventure.events.find(e=>e.id===claim.id),claim);assert.equal(view.quests[0].objectives[0].evidenceEventIds.includes(claim.id),false);assert.equal(l.adventure.events.some(e=>e.id===old.id),false);assert.equal(view.quests[0].objectives[0].acquiredQuantity,3);
  await act({type:'inspect'});assert.equal((await engine.loaded(view.campaign.id)).adventure.events.filter(e=>e.source==='inventory_confirmation').length,1);
  await create(undefined,acquisitionWorld());await act({type:'accept_quest',questId:'first'});assert.equal(view.quests[0].objectives[0].acquiredQuantity,0);assert.equal((await engine.loaded(view.campaign.id)).adventure.events.some(e=>e.source==='inventory_confirmation'),false);
});

test('native acquisition proof is shared between quests but the same receipt never increments an objective twice',()=>{
  const w=world();w.quests.forEach(q=>q.objectives=[{text:'Acquire three',kind:'acquire',targetId:'supply',quantity:3}]);const a=model.makeAdventure(model.validateSeed(w),{language:'en',worldIdea:'Shared acquisition'});a.quests.forEach(q=>q.status='active');
  const first={id:'pickup-one',kind:'acquire',targetId:'supply',quantity:1,success:true};model.processQuestEvent(a,first);model.processQuestEvent(a,first);assert.ok(a.quests.every(q=>q.objectives[0].acquiredQuantity===1&&!q.objectives[0].completed));
  model.processQuestEvent(a,{id:'claim-one',kind:'acquire',targetId:'supply',quantity:3,source:'player_claim',role:'player',confidence:'unverified'});assert.ok(a.quests.every(q=>q.objectives[0].acquiredQuantity===1&&!q.objectives[0].completed));
  const second={id:'pickup-two',kind:'acquire',targetId:'supply',quantity:2,success:true};model.processQuestEvent(a,second);assert.ok(a.quests.every(q=>q.status==='completed'&&q.objectives[0].acquiredQuantity===3&&q.objectives[0].evidenceEventIds.length===2));
  const invalid=world();invalid.quests[0].objectives=[{text:'Acquire twenty',kind:'acquire',targetId:'supply',quantity:20}];assert.throws(()=>model.validateSeed(invalid),/finite item source/);
});

test('a partial real inventory with missing receipts receives only its current confirmed quantity and never repeats credit',async()=>{
  await create(undefined,acquisitionWorld());await act({type:'pickup',itemId:'supply',quantity:2});let l=await engine.loaded(view.campaign.id);l.adventure.events=l.adventure.events.filter(e=>e.kind!=='acquire');l.adventure.journal=l.adventure.journal.filter(e=>e.kind!=='acquire');
  await engine.save(l.service,l.state,l.adventure,'missing_partial_receipts');view=await engine.getView(view.campaign.id);await act({type:'accept_quest',questId:'first'});assert.equal(view.quests[0].objectives[0].acquiredQuantity,2);assert.equal(view.quests[0].objectives[0].completed,false);assert.equal(view.quests[0].objectives[0].remainingQuantity,1);
  l=await engine.loaded(view.campaign.id);const confirmation=l.adventure.events.find(e=>e.source==='inventory_confirmation');assert.equal(confirmation.quantity,2);assert.equal(confirmation.confirmedHeldQuantity,2);
  await act({type:'inspect'});l=await engine.loaded(view.campaign.id);assert.equal(l.adventure.events.filter(e=>e.source==='inventory_confirmation').length,1);assert.equal(view.quests[0].objectives[0].acquiredQuantity,2);
  await act({type:'pickup',itemId:'supply',quantity:1});assert.equal(view.quests[0].objectives[0].acquiredQuantity,3);assert.equal(view.quests[0].objectives[0].completed,true);assert.equal(view.hero.xp,0);assert.deepEqual((await engine.loaded(view.campaign.id)).adventure.events.find(e=>e.id===confirmation.id),confirmation);
});
