const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const inventory=require('../src/adventure-party-inventory'),companions=require('../src/adventure-companions');
let core;before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(){
  const runner=new core.RpgGameService(null,new Map()).runner,state=runner.createNewCampaign({heroName:'Fixture',heroClass:'fighter'});
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Hero',classId:'fighter',raceId:'human'}),one=core.createSrdLevelOneCharacter({id:'npc-one',name:'One',classId:'fighter',raceId:'human'}),two=core.createSrdLevelOneCharacter({id:'npc-two',name:'Two',classId:'cleric',raceId:'human'});
  for(const member of [one,two]){member.kind='ally';member.equipment={};member.attacks=[];member.ac=core.calculateSrdArmorClass(member);member.inventory=member.inventory.filter(item=>item.itemId!=='gold_piece');}
  one.inventory.push({itemId:'gold_piece',name:'Монеты',quantity:3,weight:0,tags:['currency'],description:'Полученные монеты',identified:true,source:'generated'});
  two.spellcasting.slots['1'].current=1;two.resources.find(r=>r.id==='spell_slots_1').current=1;
  state.party={heroId:hero.id,members:[hero,one,two]};state.flags.ui_companion_ai_ids=JSON.stringify([one.id,two.id]);
  const adventure={version:2,turn:1,day:1,hours:8,currentLocationId:'camp',language:'ru',npcs:[one,two].map(m=>({id:m.id,name:m.name,role:'Traveller',locationId:'camp',disposition:'neutral',trust:2,receivedCoins:m.id===one.id?3:0,receivedItems:[],companionOffer:{classId:m.id===one.id?'fighter':'cleric',raceId:'human',backgroundId:'acolyte',reason:'Travel together'}})),quests:[],items:[],lootLedger:[{itemId:'loot-sword',eventId:'drop-one',kind:'combat'}],economy:{markets:[{id:'market',locationId:'camp',merchantId:one.id,cash:40}],ledger:[]},companions:{records:[one,two].map(m=>({npcId:m.id,state:'joined',joined:true,initialized:true,character:structuredClone(m),foundation:{classId:m.id===one.id?'fighter':'cleric',raceId:'human',backgroundId:'acolyte'},receivedItemIds:[],lastReceivedCoins:m.id===one.id?3:0})),history:[],attempts:[]},environment:{version:1,props:[],npcStates:[one,two].map(m=>({npcId:m.id,profile:'companion',disposition:'neutral',body:core.characterToCombatant(m)})),consequences:[],appliedPlans:[]},reputation:{}};
  return {state,adventure};
}
function item(overrides={}){return {itemId:'loot-sword',name:'Recovered blade',quantity:2,weight:2,tags:['weapon'],description:'A real find.',hiddenDescription:'Unidentified history',identified:false,source:'generated',rarity:'common',origin:{kind:'combat',eventId:'drop-one',worldItemId:'blade-cache'},mechanics:{equip:{attack:{id:'loot-sword',name:'Blade',ability:'str',range:'melee',damageDice:'1d6',damageType:'slashing',proficient:true}}},...overrides};}
function member(input,id){return input.state.party.members.find(m=>m.id===id);}
function coins(input,id){return member(input,id).inventory.filter(i=>i.itemId==='gold_piece').reduce((n,i)=>n+i.quantity,0);}
function share(input,overrides={},sourceId='share-one'){return inventory.resolve({...input,command:{type:'party_item',fromId:'hero',toId:'npc-one',itemId:'loot-sword',quantity:1,...overrides},sourceId});}
function gear(input,characterId,itemId,mode,sourceId='gear-one'){return inventory.resolve({...input,command:{type:'party_gear',characterId,itemId,mode},sourceId});}
function battle(input){const hero=core.characterToCombatant(member(input,'hero')),one=core.characterToCombatant(member(input,'npc-one')),two=core.characterToCombatant(member(input,'npc-two')),foe={...structuredClone(hero),id:'foe',sourceCharacterId:undefined,kind:'enemy',name:'Foe',hp:{current:100,max:100,temp:0}};
  input.state.combat=core.ensureTurnBudget({id:'party-fight',round:1,turnIndex:0,participants:[hero,one,two,foe],log:[],distances:{hero:{'npc-one':'engaged','npc-two':'engaged',foe:'near'}},environment:{id:'camp',name:'Camp',description:'',victory:[],defeat:[],escape:[]}});return input;
}
test('stack split preserves complete metadata, resources, provenance, inventory conservation and immutable inputs',async()=>{
  const input=fixture();member(input,'hero').inventory.push(item());const original=structuredClone(input),result=await share(input);
  assert.equal(result.ok,true);assert.deepEqual(input,original);const sent=member(result,'npc-one').inventory.find(i=>i.itemId==='loot-sword'),left=member(result,'hero').inventory.find(i=>i.itemId==='loot-sword');
  assert.deepEqual(sent,{...item(),quantity:1});assert.deepEqual(left,{...item(),quantity:1});assert.deepEqual(member(result,'npc-one').equipment,member(input,'npc-one').equipment);assert.deepEqual(member(result,'npc-one').attacks,member(input,'npc-one').attacks);
  assert.deepEqual(member(result,'npc-two').spellcasting,member(input,'npc-two').spellcasting);assert.deepEqual(member(result,'npc-two').resources,member(input,'npc-two').resources);assert.deepEqual(result.adventure.lootLedger,input.adventure.lootLedger);assert.deepEqual(result.adventure.economy,input.adventure.economy);
  assert.equal(result.outcome.walletDelta,null);assert.equal(result.adventure.companions.records[0].character.inventory.find(i=>i.itemId==='loot-sword').quantity,1);
  const second=await share(result,{},'share-two');assert.equal(member(second,'npc-one').inventory.find(i=>i.itemId==='loot-sword').quantity,2);assert.equal(member(second,'hero').inventory.some(i=>i.itemId==='loot-sword'),false);
});
test('metadata/provenance collisions refuse instead of overwriting, and charged items transfer only one whole instance',async()=>{
  const input=fixture();member(input,'hero').inventory.push(item({quantity:1,charges:{current:1,max:3,costPerUse:1,recharge:'long_rest'}}));
  member(input,'npc-one').inventory.push(item({quantity:1,charges:{current:3,max:3,costPerUse:1,recharge:'long_rest'}}));let result=await share(input);assert.equal(result.refusal.code,'item_identity_collision');assert.deepEqual(result.state,input.state);
  member(input,'npc-one').inventory=member(input,'npc-one').inventory.filter(i=>i.itemId!=='loot-sword');result=await share(input);assert.equal(result.ok,true);assert.deepEqual(member(result,'npc-one').inventory.find(i=>i.itemId==='loot-sword').charges,{current:1,max:3,costPerUse:1,recharge:'long_rest'});
  const duplicate=fixture();member(duplicate,'hero').inventory.push(item({charges:{current:1,max:3}}));assert.equal((await share(duplicate)).refusal.code,'ambiguous_charged_stack');
  const origins=fixture();member(origins,'hero').inventory.push(item());member(origins,'npc-one').inventory.push(item({quantity:1,origin:{eventId:'different-drop'}}));assert.equal((await share(origins)).refusal.code,'item_identity_collision');
});
test('real SRD gold merges with receipt coin presentation without creating money, receipts, earnings or recharge on rejoin',async()=>{
  const input=fixture(),before=coins(input,'hero')+coins(input,'npc-one');const result=await share(input,{itemId:'gold_piece',quantity:5});assert.equal(result.ok,true);
  assert.equal(coins(result,'hero'),10);assert.equal(coins(result,'npc-one'),8);assert.equal(coins(result,'hero')+coins(result,'npc-one'),before);assert.equal(member(result,'npc-one').inventory.filter(i=>i.itemId==='gold_piece').length,1);
  assert.deepEqual(result.outcome.walletDelta,{fromId:'hero',toId:'npc-one',amount:5,from:-5,to:5,heroDelta:-5,internal:true});assert.deepEqual(result.adventure.npcs,input.adventure.npcs);assert.deepEqual(result.adventure.economy,input.adventure.economy);
  assert.equal(result.adventure.partyInventory.history[0].items[0].weight,0.01);assert.deepEqual(result.adventure.partyInventory.history[0].items[0].tags,['currency','treasure']);assert.equal(result.adventure.partyInventory.history[0].recipientCoinsBefore[0].name,'Монеты');
  let synced=await companions.sync(result);assert.equal(coins(synced,'npc-one'),8);synced=await companions.resolve({...synced,command:{type:'dismiss',npcId:'npc-one'},sourceId:'leave'});const rejoined=await companions.resolve({...synced,command:{type:'recruit',npcId:'npc-one'},sourceId:'return'});assert.equal(rejoined.ok,true);assert.equal(coins(rejoined,'npc-one'),8);assert.equal(rejoined.adventure.npcs[0].receivedCoins,3);assert.equal(rejoined.adventure.economy.markets[0].cash,40);
});
test('NPC-to-NPC allocation is internal; another human or unknown arbitrary NPC is never accessible',async()=>{
  const input=fixture();member(input,'npc-one').inventory.push(item());const result=await share(input,{fromId:'npc-one',toId:'npc-two'});assert.equal(result.ok,true);assert.deepEqual(member(result,'npc-two').inventory.find(i=>i.itemId==='loot-sword'),{...item(),quantity:1});
  input.state.party.members.push({...structuredClone(member(input,'hero')),id:'human-two',name:'Human two'});
  assert.equal((await share(input,{fromId:'human-two',toId:'hero',itemId:'gold_piece'})).refusal.code,'human_inventory_private');assert.equal((await share(input,{toId:'not-party'})).refusal.code,'member_absent');
});
test('a spare copy of an equipped weapon transfers while its last worn copy and attack stay protected',async()=>{
  const input=fixture(),hero=member(input,'hero'),blade=hero.inventory.find(i=>i.itemId==='longsword');blade.quantity=2;
  const beforeAttack=structuredClone(hero.attacks),beforeGear=structuredClone(hero.equipment);
  const options=await inventory.publicOptions(input);assert.equal(options.participants.find(p=>p.id==='hero').items.find(i=>i.itemId==='longsword').maxQuantity,1);
  const result=await share(input,{itemId:'longsword'},'spare-blade');assert.equal(result.ok,true);
  assert.equal(member(result,'hero').inventory.find(i=>i.itemId==='longsword').quantity,1);assert.deepEqual(member(result,'hero').equipment,beforeGear);assert.deepEqual(member(result,'hero').attacks,beforeAttack);
  assert.equal(member(result,'npc-one').inventory.find(i=>i.itemId==='longsword').quantity,2);
  const denied=await share(result,{itemId:'longsword'},'last-blade');assert.equal(denied.ok,false);assert.deepEqual(denied.state,result.state);
  const afterOptions=await inventory.publicOptions(result);assert.equal(afterOptions.participants.find(p=>p.id==='hero').items.find(i=>i.itemId==='longsword').maxQuantity,0);
});
test('equipped, attuned, active quest, key and scene props protect custody and never fake delivery',async()=>{
  for(const kind of ['equipped','attuned','quest','key','prop']){const input=fixture(),owned=item();if(kind==='attuned')owned.attuned=true;if(kind==='prop')owned.itemId='scene_prop_cup';member(input,'hero').inventory.push(owned);
    if(kind==='equipped'){owned.quantity=1;member(input,'hero').equipment.mainHand=owned.itemId;}
    if(kind==='quest')input.adventure.quests=[{id:'q',status:'active',objectives:[{kind:'deliver',targetId:owned.itemId,recipientId:'npc-one',completed:false}]}];
    if(kind==='key')input.adventure.items=[{id:'closed',access:{conditions:[{kind:'item',targetId:owned.itemId}]}}];
    const original=structuredClone(input),result=await share(input,{itemId:owned.itemId});assert.equal(result.ok,false,kind);assert.deepEqual(result.state,input.state);assert.deepEqual(result.adventure,input.adventure);assert.deepEqual(input,original);
  }
});
test('exact quantity validation, inaccessible actors, private identities and combat refuse before mutation',async()=>{
  for(const quantity of [0,-1,1.5,NaN,Infinity,1001,'1']){const input=fixture();member(input,'hero').inventory.push(item());assert.equal((await share(input,{quantity})).refusal.code,'invalid_party_item');}
  for(const kind of ['remote','hidden','hostile','captured','fled','dead-recipient','unconscious-recipient','dismissed','hero-down','combat-wrong-turn']){
    const input=fixture();member(input,'hero').inventory.push(item());const npc=input.adventure.npcs[0],ally=member(input,'npc-one');
    if(kind==='remote')npc.locationId='road';if(kind==='hidden')npc.hidden=true;if(kind==='hostile')npc.disposition='hostile';if(['captured','fled','unconscious-recipient'].includes(kind))ally.conditions=[kind==='unconscious-recipient'?'unconscious':kind];if(kind==='dead-recipient'){ally.hp.current=0;ally.conditions=['dead'];}
    if(kind==='dismissed')input.adventure.companions.records[0].state='dismissed';if(kind==='hero-down')member(input,'hero').hp.current=0;if(kind==='combat-wrong-turn'){battle(input);input.state.combat.turnIndex=3;}
    const original=structuredClone(input),result=await share(input);assert.equal(result.ok,false,kind);assert.deepEqual(input,original);assert.deepEqual(result.state,input.state);
  }
});
test('fake currency is refused and coin pools retain traces when consolidating several real provenance rows',async()=>{
  for(const change of [{mechanics:{use:{type:'healing'}}},{charges:{current:1,max:1}},{bound:true},{protected:true},{tags:['currency','magical']},{rarity:'legendary'},{attackBonus:99}]){
    const input=fixture();Object.assign(member(input,'hero').inventory.find(i=>i.itemId==='gold_piece'),change);assert.equal((await share(input,{itemId:'gold_piece'})).ok,false);
  }
  const input=fixture();member(input,'hero').inventory.find(i=>i.itemId==='gold_piece').quantity=2;member(input,'hero').inventory.push({itemId:'gold_piece',name:'Old coins',quantity:4,weight:0,tags:['currency'],identified:true,origin:{eventId:'chest'}});
  const result=await share(input,{itemId:'gold_piece',quantity:5});assert.equal(result.ok,true);assert.equal(coins(result,'hero'),1);assert.equal(coins(result,'npc-one'),8);assert.equal(result.adventure.partyInventory.history[0].items.length,2);assert.equal(result.adventure.partyInventory.history[0].items[1].origin.eventId,'chest');
});
test('source operation replay is exact and mismatched reuse refuses without a second transfer',async()=>{
  const input=fixture();member(input,'hero').inventory.push(item());const result=await share(input),again=await share(result);assert.equal(again.outcome.replayed,true);assert.deepEqual(again.state,result.state);assert.deepEqual(again.adventure,result.adventure);
  assert.equal((await share(result,{quantity:2})).refusal.code,'replay_mismatch');assert.equal(result.adventure.partyInventory.history.length,1);
});
test('real NPC weapon and armor equip/unequip change attacks and AC without dropping or altering inventory',async()=>{
  const input=fixture();member(input,'hero').inventory.push(item({identified:true}));let result=await share(input);const before=structuredClone(member(result,'npc-one').inventory),baseAc=member(result,'npc-one').ac;
  result=await gear(result,'npc-one','loot-sword','equip');assert.equal(result.ok,true);assert.equal(member(result,'npc-one').equipment.mainHand,'loot-sword');assert.ok(member(result,'npc-one').attacks.some(a=>a.id==='loot-sword'));assert.deepEqual(member(result,'npc-one').inventory,before);
  const armored=await gear(result,'npc-one','chainmail','equip','armor-on');assert.equal(armored.ok,true);assert.ok(member(armored,'npc-one').ac>baseAc);const inventoryBefore=structuredClone(member(armored,'npc-one').inventory);
  const stripped=await gear(armored,'npc-one','chainmail','unequip','armor-off');assert.equal(stripped.ok,true);assert.equal(member(stripped,'npc-one').ac,baseAc);assert.deepEqual(member(stripped,'npc-one').inventory,inventoryBefore);
  const unarmed=await gear(stripped,'npc-one','loot-sword','unequip','blade-off');assert.equal(unarmed.ok,true);assert.ok(!member(unarmed,'npc-one').attacks.some(a=>a.id==='loot-sword'));assert.deepEqual(member(unarmed,'npc-one').inventory,inventoryBefore);
  assert.equal((await gear(unarmed,'npc-one','loot-sword','unequip','double-off')).refusal.code,'gear_already_in_state');
});
test('known corpse items can be unequipped and retrieved by hero without healing, refilling or inventing receipts',async()=>{
  const input=fixture(),ally=member(input,'npc-one');ally.inventory.push(item({quantity:1,charges:{current:1,max:3}}));ally.equipment.mainHand='loot-sword';ally.hp.current=0;ally.conditions=['dead'];ally.deathSaves={successes:0,failures:3,stable:false,dead:true};ally.resources[0].current=0;
  input.adventure.environment.npcStates[0].body=core.characterToCombatant(ally);input.adventure.companions.records[0].character=structuredClone(ally);
  const stripped=await gear(input,'npc-one','loot-sword','unequip');assert.equal(stripped.ok,true);assert.equal(stripped.outcome.retrieval,true);assert.deepEqual(member(stripped,'npc-one').inventory,ally.inventory);
  const result=await share(stripped,{fromId:'npc-one',toId:'hero'},'retrieve');assert.equal(result.ok,true);assert.equal(result.outcome.retrieval,true);assert.equal(member(result,'hero').inventory.find(i=>i.itemId==='loot-sword').charges.current,1);
  for(const field of ['hp','conditions','deathSaves','resources'])assert.deepEqual(member(result,'npc-one')[field],ally[field]);assert.deepEqual(result.adventure.npcs,input.adventure.npcs);
  const options=await inventory.publicOptions(result),corpse=options.participants.find(p=>p.id==='npc-one');assert.equal(corpse.retrieval,true);assert.equal(corpse.canReceive,false);assert.equal(corpse.items.some(i=>i.itemId==='loot-sword'),false);
  assert.equal((await gear(result,'npc-one','chainmail','equip','corpse-equip')).ok,false);
});
test('public options remain readonly and hide unknown properties while exposing real gear permissions',async()=>{
  const input=fixture();member(input,'hero').inventory.push(item());const original=structuredClone(input),options=await inventory.publicOptions(input);
  assert.deepEqual(input,original);assert.equal(options.available,true);const row=options.participants.find(p=>p.id==='hero').items.find(i=>i.itemId==='loot-sword');assert.equal(row.canEquip,true);assert.equal(row.maxQuantity,2);assert.ok(!JSON.stringify(options).includes('Unidentified history'));
  const gearResult=await gear(input,'hero','loot-sword','equip'),again=await gear(gearResult,'hero','loot-sword','equip');assert.equal(again.outcome.replayed,true);assert.deepEqual(again.state,gearResult.state);
});
test('weapon slot swap removes only old inventory attacks; later sharing that loose weapon cannot leave ghosts',async()=>{
  const input=fixture(),npc=member(input,'npc-one');npc.attacks=[{id:'innate',name:'Innate spark',ability:'int',range:'spell',damageDice:'1d4',damageType:'force'}];npc.inventory.push(item({quantity:1,identified:true,mechanics:{equip:{attack:{id:'modeled-edge',name:'New edge',ability:'str',range:'melee',damageDice:'1d6',damageType:'slashing'}}}}));
  let result=await gear(input,'npc-one','longsword','equip','old-on');assert.equal(result.ok,true);assert.ok(member(result,'npc-one').attacks.some(a=>a.id==='longsword'));
  result=await gear(result,'npc-one','loot-sword','equip','new-on');assert.equal(result.ok,true);assert.equal(member(result,'npc-one').equipment.mainHand,'loot-sword');assert.ok(!member(result,'npc-one').attacks.some(a=>a.id==='longsword'));assert.ok(member(result,'npc-one').attacks.some(a=>a.id==='modeled-edge'));assert.ok(member(result,'npc-one').attacks.some(a=>a.id==='innate'));
  result=await share(result,{fromId:'npc-one',toId:'npc-two',itemId:'longsword'},'old-away');assert.equal(result.ok,true);assert.ok(!member(result,'npc-one').attacks.some(a=>a.id==='longsword'));
  result=await gear(result,'npc-one','loot-sword','unequip','new-off');assert.equal(result.ok,true);assert.ok(!member(result,'npc-one').attacks.some(a=>a.id==='modeled-edge'));assert.ok(member(result,'npc-one').attacks.some(a=>a.id==='innate'));
});
test('combat transfer spends one object interaction then main action, preserves assets and all other budgets',async()=>{
  const input=battle(fixture());member(input,'hero').inventory.push(item({quantity:4}));input.state.combat.turnBudget.reaction=false;const original=structuredClone(input);
  const first=await share(input,{},'combat-first');assert.equal(first.ok,true);assert.deepEqual(input,original);assert.equal(first.outcome.cost,'object_interaction');assert.equal(first.outcome.elapsedSeconds,0);assert.equal(first.state.combat.turnBudget.objectInteraction,false);assert.equal(first.state.combat.turnBudget.action,true);
  const second=await share(first,{},'combat-second');assert.equal(second.ok,true);assert.equal(second.outcome.cost,'action');assert.equal(second.state.combat.turnBudget.action,false);
  for(const key of ['bonusAction','reaction','movementFeet'])assert.equal(second.state.combat.turnBudget[key],original.state.combat.turnBudget[key]);
  assert.equal(member(second,'hero').inventory.find(i=>i.itemId==='loot-sword').quantity,2);assert.equal(member(second,'npc-one').inventory.find(i=>i.itemId==='loot-sword').quantity,2);
  const denied=await share(second,{},'combat-third');assert.equal(denied.refusal.code,'inventory_budget_spent');assert.deepEqual(denied.state,second.state);
  const again=await share(first,{},'combat-first');assert.equal(again.outcome.replayed,true);assert.deepEqual(again.state,first.state);
  const options=await inventory.publicOptions(second);assert.equal(options.available,false);assert.match(options.reason,/потрачены/);
});
test('combat handover refuses wrong turn, range, absent actual actors, unconscious hero and another human before cost',async()=>{
  for(const change of ['wrong-turn','range','missing','hero-disabled','human']){
    const input=battle(fixture());member(input,'hero').inventory.push(item());
    if(change==='wrong-turn')input.state.combat.turnIndex=3;if(change==='range')input.state.combat.distances.hero['npc-one']='near';if(change==='missing')input.state.combat.participants=input.state.combat.participants.filter(p=>p.id!=='npc-one');if(change==='hero-disabled')input.state.combat.participants[0].conditions=['stunned'];
    if(change==='human'){input.state.party.members.push({...structuredClone(member(input,'hero')),id:'human-two'});}
    const original=structuredClone(input),result=await share(input,change==='human'?{toId:'human-two'}:{});assert.equal(result.ok,false,change);assert.deepEqual(result.state,input.state);assert.deepEqual(input,original);
  }
});
test('combat retrieval of a loose known corpse item spends a real interaction and never heals or activates it',async()=>{
  const input=fixture(),npc=member(input,'npc-one');npc.hp.current=0;npc.conditions=['dead'];npc.deathSaves={successes:0,failures:3,stable:false,dead:true};npc.inventory.push(item({quantity:1}));npc.attacks=[{...item().mechanics.equip.attack},{id:'innate',range:'spell',damageDice:'1d4'}];input.adventure.environment.npcStates[0].body=core.characterToCombatant(npc);battle(input);
  const result=await share(input,{fromId:'npc-one',toId:'hero'},'combat-retrieve');assert.equal(result.ok,true);assert.equal(result.outcome.retrieval,true);assert.equal(result.outcome.cost,'object_interaction');assert.equal(member(result,'npc-one').hp.current,0);assert.equal(member(result,'npc-one').deathSaves.dead,true);
  const body=result.state.combat.participants.find(p=>p.id==='npc-one');assert.ok(!body.attacks.some(a=>a.id==='loot-sword'));assert.ok(body.attacks.some(a=>a.id==='innate'));assert.equal((await gear(result,'npc-one','chainmail','unequip','combat-gear')).refusal.code,'party_gear_in_combat');
  const options=await inventory.publicOptions(result);assert.equal(options.inCombat,true);assert.equal(options.participants.find(p=>p.id==='npc-one').canReceive,false);assert.ok(options.participants.every(p=>p.items.every(i=>!i.canEquip&&!i.canUnequip)));
});
test('English quiet confirmations describe sharing/retrieval/equipment without inventing NPC speech or trust',async()=>{
  const input=fixture();input.adventure.language='en';member(input,'hero').inventory.push(item());const result=await share(input);assert.equal(result.outcome.quiet,true);assert.match(result.outcome.text,/Hero gave One/);assert.deepEqual(result.adventure.npcs,input.adventure.npcs);
  const worn=await gear(result,'npc-one','loot-sword','equip');assert.match(worn.outcome.text,/One equips/);assert.equal(worn.outcome.quiet,true);
});
test('actual Hero18 coins to receipt-backed NPC5 merges exactly while preserving fungible history',async()=>{
  const input=fixture();member(input,'hero').inventory.find(item=>item.itemId==='gold_piece').quantity=18;member(input,'npc-one').inventory.find(item=>item.itemId==='gold_piece').quantity=5;
  const result=await share(input,{itemId:'gold_piece',quantity:7});assert.equal(result.ok,true);assert.equal(coins(result,'hero'),11);assert.equal(coins(result,'npc-one'),12);assert.equal(coins(result,'hero')+coins(result,'npc-one'),23);assert.equal(member(result,'npc-one').inventory.filter(item=>item.itemId==='gold_piece').length,1);
});
test('combat Hero-mediated NPC-to-NPC transfer requires both in reach, and hidden/captured fallen sources stay protected',async()=>{
  const input=battle(fixture());member(input,'npc-one').inventory.push(item());let result=await share(input,{fromId:'npc-one',toId:'npc-two'},'relay');assert.equal(result.ok,true);assert.equal(result.outcome.actorId,'hero');assert.equal(result.outcome.cost,'object_interaction');assert.equal(result.state.combat.turnBudget.action,true);
  const far=structuredClone(input);far.state.combat.distances.hero['npc-two']='near';assert.equal((await share(far,{fromId:'npc-one',toId:'npc-two'},'far-relay')).refusal.code,'companion_out_of_reach');
  for(const kind of ['hidden','captured','fled','remote']){const source=fixture(),npc=member(source,'npc-one');npc.hp.current=0;npc.conditions=['unconscious'];npc.inventory.push(item());
    if(kind==='hidden')source.adventure.npcs[0].hidden=true;if(kind==='remote')source.adventure.npcs[0].locationId='road';if(['captured','fled'].includes(kind))npc.conditions.push(kind);
    const denied=await share(source,{fromId:'npc-one',toId:'hero'},`retrieve-${kind}`);assert.equal(denied.ok,false,kind);assert.deepEqual(denied.state,source.state);
  }
});
