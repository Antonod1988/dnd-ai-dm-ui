const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const companions=require('../src/adventure-companions'),npcEncounters=require('../src/npc-encounters');
let core;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(classId='wizard',hasBody=false){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Гость',classId:'bard',raceId:'human'});
  const npc={id:'traveler',name:'Путешественник',role:'Любознательный маг',personality:'Осторожный, но доброжелательный.',locationId:'town',trust:4,disposition:'neutral',companionOffer:{classId,raceId:'human',backgroundId:'sage',reason:'Хочет увидеть соседние острова.'},receivedCoins:3,receivedItems:[{eventId:'delivery-one',item:{itemId:'keepsake',name:'Подарок',quantity:1,weight:1,tags:['quest'],description:'Настоящий вручённый предмет',identified:true,source:'generated'}}]};
  const result={state:{campaign:{rules:{zeroHpPolicy:'standard5e'}},party:{heroId:'hero',members:[hero]},flags:{},rollLog:[]},adventure:{currentLocationId:'town',locations:[{id:'town'},{id:'road'}],npcs:[npc]}};
  if(hasBody){const body=npcEncounters.createBody({...npc,companionOffer:undefined},core);body.hp={current:2,max:4,temp:1};body.ac=17;body.abilities={str:10,dex:12,con:10,int:12,wis:10,cha:11};body.conditions=['poisoned'];body.activeEffects=[{id:'real-ward',label:'Существующий щит',armorClassBonus:1}];body.damageResistances=['cold'];body.resources=[{id:'spell_slots_1',label:'Level 1 slots',current:0,max:2,recoversOn:'long_rest'}];result.adventure.environment={version:1,props:[],npcStates:[{npcId:npc.id,profile:'civilian',disposition:'neutral',body}],consequences:[],appliedPlans:[]};}
  return result;
}
async function run(input,type='recruit',sourceId='invitation',seed='invitation-test'){return companions.resolve({...input,command:{type,npcId:'traveler',statement:'Пойдём вместе?'},sourceId,seed});}
async function invite(input,success=true,sourceId='invitation'){
  for(let n=0;n<50;n++){const result=await run(input,'recruit',sourceId,`invite-${n}`);if(result.ok&&result.outcome.success===success)return result;}
  assert.fail('no requested invitation roll');
}
test('a real persuasion invitation creates one full same-id ally foundation without template money or duplicate real receipts',async()=>{
  const input=fixture(),original=structuredClone(input),result=await invite(input);
  assert.deepEqual(input,original);assert.equal(result.ok,true);assert.equal(result.outcome.check.ability,'cha');assert.equal(result.outcome.check.skill,'persuasion');assert.ok(result.outcome.check.dc>=12&&result.outcome.check.dc<=18);
  const ally=result.state.party.members.find(p=>p.id==='traveler');assert.equal(ally.kind,'ally');assert.equal(ally.classLevels[0].classId,'class_wizard');assert.ok(ally.spellcasting);assert.equal(ally.spellcasting.slots['1'].current,2);assert.equal(ally.inventory.find(i=>i.itemId==='gold_piece').quantity,3);assert.equal(ally.inventory.find(i=>i.itemId==='keepsake').quantity,1);
  assert.ok(ally.features.length);assert.ok(ally.skillProficiencies.length);assert.equal(result.adventure.companions.records[0].character.id,'traveler');assert.equal(result.adventure.npcs[0].role,input.adventure.npcs[0].role);assert.equal(result.adventure.npcs[0].personality,input.adventure.npcs[0].personality);
  assert.deepEqual(JSON.parse(result.state.flags.ui_companion_ai_ids),['traveler']);assert.equal(companions.publicStatus(result.adventure,'traveler',result.state).joined,true);
  const replay=await run(result);assert.equal(replay.outcome.replayed,true);assert.deepEqual(replay.state,result.state);assert.deepEqual(replay.adventure,result.adventure);
});
test('old NPC body HP/max/AC/abilities/attacks/effects/resists and spent slots override class defaults and determine spell DC',async()=>{
  const input=fixture('wizard',true),oldBody=structuredClone(input.adventure.environment.npcStates[0].body),result=await invite(input),ally=result.state.party.members.find(p=>p.id==='traveler');
  for(const field of ['hp','ac','abilities','conditions','attacks','activeEffects','damageResistances'])assert.deepEqual(ally[field],oldBody[field],field);
  assert.equal(ally.spellcasting.slots['1'].current,0);assert.equal(ally.resources.find(r=>r.id==='spell_slots_1').current,0);assert.equal(ally.spellcasting.spellAttackBonus,ally.proficiencyBonus+1);assert.equal(ally.spellcasting.spellSaveDc,8+ally.spellcasting.spellAttackBonus);
  assert.ok(result.outcome.limitations.length);assert.equal(result.adventure.environment.npcStates[0].body.hp.current,2);
  assert.deepEqual(ally.equipment,{},'carried template armor is not silently equipped over preserved AC');
});
test('failed invitation consumes inspiration once and locks word retries and NPC renaming without spawning class gear',async()=>{
  const input=fixture();input.state.party.members[0].abilities.cha=1;input.state.party.members[0].bardicInspirationDie='1d6';const failed=await invite(input,false);
  assert.equal(failed.state.party.members.length,1);assert.equal(failed.state.party.members[0].bardicInspirationDie,undefined);assert.equal(failed.adventure.companions.records.length,0);
  failed.adventure.npcs[0].name='Другое имя';failed.adventure.npcs[0].companionOffer.reason='Перефразированная мотивация';
  const repeated=await companions.resolve({...failed,command:{type:'recruit',npcId:'traveler',statement:'Новая формулировка приглашения.'},sourceId:'retry'});assert.equal(repeated.refusal.code,'companion_attempt_locked');assert.deepEqual(repeated.state,failed.state);
});
test('dismissal and repeated cached rejoin preserve spent slots, wounded HP, used items, levels and actual money without building a new character',async()=>{
  let result=await invite(fixture());let ally=result.state.party.members.find(p=>p.id==='traveler');ally.hp.current=1;ally.spellcasting.slots['1'].current=0;ally.resources.find(r=>r.id==='spell_slots_1').current=0;ally.inventory=ally.inventory.filter(i=>!['gold_piece','keepsake'].includes(i.itemId));ally.xp=900;ally.level=3;
  result=await companions.sync(result);result=await run(result,'dismiss','dismiss-one');assert.equal(result.state.party.members.length,1);assert.deepEqual(JSON.parse(result.state.flags.ui_companion_ai_ids),[]);
  result.adventure.npcs[0].companionOffer.classId='cleric';const joined=await run(result,'recruit','rejoin');assert.equal(joined.ok,true);assert.equal(joined.outcome.rejoined,true);assert.equal(joined.outcome.check,null);
  ally=joined.state.party.members.find(p=>p.id==='traveler');assert.equal(ally.classLevels[0].classId,'class_wizard');assert.equal(ally.hp.current,1);assert.equal(ally.spellcasting.slots['1'].current,0);assert.equal(ally.level,3);assert.equal(ally.xp,900);assert.equal(ally.inventory.some(i=>['gold_piece','keepsake'].includes(i.itemId)),false);
  const left=await run(joined,'dismiss','dismiss-two'),again=await run(left,'recruit','rejoin-two');assert.deepEqual(again.state.party.members.find(p=>p.id==='traveler'),ally);
});
test('sync follows real travel, caches combat damage/resources and leaves dismissed NPC at its current actual location',async()=>{
  let joined=await invite(fixture()),ally=joined.state.party.members.find(p=>p.id==='traveler');joined.adventure.currentLocationId='road';joined=await companions.sync(joined);assert.equal(joined.adventure.npcs[0].locationId,'road');
  const actor=core.characterToCombatant(joined.state.party.members[0]),companion=core.characterToCombatant(joined.state.party.members.find(p=>p.id==='traveler'));companion.hp.current=2;companion.resources.find(r=>r.id==='spell_slots_1').current=0;
  joined.state.combat={id:'combat',round:1,turnIndex:0,participants:[actor,companion],log:[],environment:{id:'test',name:'test',description:'',victory:[]}};
  const synced=await companions.sync(joined);ally=synced.state.party.members.find(p=>p.id==='traveler');assert.equal(ally.hp.current,2);assert.equal(ally.spellcasting.slots['1'].current,0);assert.equal(synced.adventure.companions.records[0].character.hp.current,2);assert.equal(synced.adventure.environment.npcStates[0].body.hp.current,2);
  delete synced.state.combat;const dismissed=await run(synced,'dismiss','after-combat-dismiss');assert.equal(dismissed.adventure.npcs[0].locationId,'road');dismissed.adventure.currentLocationId='town';const afterTravel=await companions.sync(dismissed);assert.equal(afterTravel.adventure.npcs[0].locationId,'road');assert.equal((await run(afterTravel,'recruit','remote-rejoin')).refusal.code,'npc_absent');
});
test('new received receipts are collected exactly once while cached outside party and later injury does not reset on rejoin',async()=>{
  const joined=await invite(fixture()),left=await run(joined,'dismiss','leave');left.adventure.npcs[0].receivedCoins+=2;left.adventure.npcs[0].receivedItems.push({eventId:'delivery-two',item:{itemId:'second-gift',name:'Вторая вещь',quantity:1,weight:1,tags:[],description:'Настоящий подарок',identified:true,source:'generated'}});const body=left.adventure.environment.npcStates[0].body;body.hp.current=1;
  const synced=await companions.sync(left),again=await companions.sync(synced),rejoined=await run(again,'recruit','return');const ally=rejoined.state.party.members.find(p=>p.id==='traveler');assert.equal(ally.hp.current,1);assert.equal(ally.inventory.find(i=>i.itemId==='gold_piece').quantity,5);assert.equal(ally.inventory.find(i=>i.itemId==='second-gift').quantity,1);
});
test('combat, hostility, dead/unaware/remote/hidden NPC, no validated offer and party cap refuse before rolls or changes',async()=>{
  for(const change of ['combat','hostile','dead','unconscious','captured','remote','hidden','no-offer','bad-class','full']){const input=fixture('fighter',true);
    if(change==='combat')input.state.combat={id:'active'};if(change==='hostile')input.adventure.npcs[0].disposition='hostile';if(['dead','unconscious','captured'].includes(change)){input.adventure.environment.npcStates[0].body.conditions.push(change);if(change==='dead')input.adventure.environment.npcStates[0].body.hp.current=0;}if(change==='remote')input.adventure.npcs[0].locationId='road';if(change==='hidden')input.adventure.npcs[0].hidden=true;if(change==='no-offer')delete input.adventure.npcs[0].companionOffer;if(change==='bad-class')input.adventure.npcs[0].companionOffer.classId='imaginary';if(change==='full')for(let n=0;n<3;n++)input.state.party.members.push({...structuredClone(input.state.party.members[0]),id:`ally-${n}`,kind:'ally'});
    const original=structuredClone(input),result=await run(input);assert.equal(result.ok,false,change);assert.deepEqual(result.state,input.state);assert.deepEqual(input,original);
  }
});
test('all twelve offers create real class foundations once and existing spent distinct class resources never refill',async()=>{
  for(const classId of core.srdClassIds){const result=await invite(fixture(classId));assert.equal(result.state.party.members.find(p=>p.id==='traveler').classLevels[0].classId,`class_${classId}`);}
  const input=fixture('barbarian',true);input.adventure.environment.npcStates[0].body.resources.push({id:'rage',label:'Rage',current:0,max:2,recoversOn:'long_rest'});const result=await invite(input);assert.equal(result.state.party.members.find(p=>p.id==='traveler').resources.find(r=>r.id==='rage').current,0);
});
test('a merchant transfers actual receipt cash into companion wallet once, including spent receipts and later payments',async()=>{
  const input=fixture();input.adventure.npcs[0].receivedCoins=12;input.adventure.economy={markets:[{id:'shop',merchantId:'traveler',locationId:'town',cash:52}]};
  const joined=await invite(input);assert.equal(joined.state.party.members.find(p=>p.id==='traveler').inventory.find(i=>i.itemId==='gold_piece').quantity,12);assert.equal(joined.adventure.economy.markets[0].cash,40);assert.equal(joined.adventure.companions.records[0].lastReceivedCoins,12);
  const left=await run(joined,'dismiss','merchant-leave'),again=await run(left,'recruit','merchant-return');assert.equal(again.adventure.economy.markets[0].cash,40);assert.equal(again.state.party.members.find(p=>p.id==='traveler').inventory.find(i=>i.itemId==='gold_piece').quantity,12);
  const spent=fixture();spent.adventure.npcs[0].receivedCoins=12;spent.adventure.economy={markets:[{id:'shop',merchantId:'traveler',locationId:'town',cash:5}]};const partial=await invite(spent);assert.equal(partial.state.party.members.find(p=>p.id==='traveler').inventory.find(i=>i.itemId==='gold_piece').quantity,5);assert.equal(partial.adventure.economy.markets[0].cash,0);assert.equal(partial.adventure.companions.records[0].lastReceivedCoins,12);
  partial.adventure.npcs[0].receivedCoins+=2;partial.adventure.economy.markets[0].cash+=2;const paid=await companions.sync(partial),syncedAgain=await companions.sync(paid);assert.equal(syncedAgain.state.party.members.find(p=>p.id==='traveler').inventory.find(i=>i.itemId==='gold_piece').quantity,7);assert.equal(syncedAgain.adventure.economy.markets[0].cash,0);assert.equal(syncedAgain.adventure.companions.records[0].lastReceivedCoins,14);
});
test('payments to a following merchant away from its shop do not debit unrelated old-shop reserves',async()=>{
  const input=fixture();input.adventure.npcs[0].receivedCoins=0;input.adventure.economy={markets:[{id:'shop',merchantId:'traveler',locationId:'town',cash:40}]};let joined=await invite(input);joined.adventure.currentLocationId='road';joined=await companions.sync(joined);joined.adventure.npcs[0].receivedCoins=2;
  const paid=await companions.sync(joined);assert.equal(paid.state.party.members.find(p=>p.id==='traveler').inventory.find(i=>i.itemId==='gold_piece').quantity,2);assert.equal(paid.adventure.economy.markets[0].cash,40);
});
test('dismissed cache imports actual NPC-side weapon injury and incapacitation instead of restoring the pre-dismissal body',async()=>{
  const joined=await invite(fixture()),left=await run(joined,'dismiss','dismiss-before-npc-fight'),oldHp=left.adventure.companions.records[0].character.hp.current;
  const hero=core.characterToCombatant(left.state.party.members[0]),enemy=structuredClone(left.adventure.environment.npcStates[0].body);hero.abilities.str=10;hero.attacks=[{id:'small-real-hit',name:'Лёгкий удар',ability:'str',damageDice:'1',damageType:'bludgeoning',range:'melee',proficient:false}];enemy.kind='enemy';enemy.ac=5;
  const combat={id:'npc-side-fight',round:1,turnIndex:0,participants:[hero,enemy],log:[],environment:{id:'test',name:'test',description:'',victory:[]}};let resolved;
  for(let n=0;n<20;n++){const attempt=core.resolveAttack(combat,hero.id,enemy.id,'small-real-hit',new core.SeededRng(`outside-hit-${n}`),left.state.campaign.rules);if(attempt.resolution.hit){resolved=attempt;break;}}
  assert.ok(resolved);npcEncounters.updateBody(left.adventure.environment.npcStates[0],resolved.resolution.target);const synced=await companions.sync(left);assert.equal(synced.adventure.companions.records[0].character.hp.current,oldHp-1);
  const rejoined=await run(synced,'recruit','return-after-wound');assert.equal(rejoined.state.party.members.find(p=>p.id==='traveler').hp.current,oldHp-1);
  const departed=await run(rejoined,'dismiss','leave-after-wound');departed.adventure.environment.npcStates[0].body.conditions.push('unconscious');const disabled=await companions.sync(departed);assert.ok(disabled.adventure.companions.records[0].character.conditions.includes('unconscious'));assert.equal((await run(disabled,'recruit','incapacitated-return')).refusal.code,'npc_unavailable');
  const dead=structuredClone(departed);dead.adventure.environment.npcStates[0].body.hp.current=0;assert.equal((await run(dead,'recruit','zero-hp-return')).refusal.code,'npc_unavailable');
});
test('an old unequipped statblock retains base AC through actual core level-up, sync, dismissal and rejoin',async()=>{
  const input=fixture('fighter',true);input.adventure.environment.npcStates[0].body.ac=13;input.adventure.environment.npcStates[0].body.resources=[];
  let joined=await invite(input),index=joined.state.party.members.findIndex(p=>p.id==='traveler');assert.equal(joined.adventure.companions.records[0].physicalAcFloor,13);assert.deepEqual(joined.state.party.members[index].equipment,{});
  joined.state.party.members[index]=core.addXp(joined.state.party.members[index],300);assert.equal(joined.state.party.members[index].level,2);assert.equal(joined.state.party.members[index].ac,11,'real class recalculation exposes the old unmodeled armor baseline');
  joined=await companions.sync(joined);assert.equal(joined.state.party.members[index].ac,13);assert.equal(core.effectiveArmorClass(joined.state.party.members[index]),14,'floor clamps base only, actual ward still adds independently');assert.deepEqual(joined.adventure.environment.npcStates[0].body.equipment,{});
  const left=await run(joined,'dismiss','floor-leave'),again=await run(left,'recruit','floor-return');assert.equal(again.state.party.members.find(p=>p.id==='traveler').ac,13);assert.equal(again.adventure.companions.records[0].character.level,2);
});
test('explicit modeled equipment is projected and normal actual unequipping is not constrained by a statblock floor',async()=>{
  const input=fixture('fighter'),npc=input.adventure.npcs[0],body=npcEncounters.createBody(npc,core);input.adventure.environment={version:1,props:[],npcStates:[{npcId:npc.id,profile:'class_foundation',disposition:'neutral',body}],consequences:[],appliedPlans:[]};
  const joined=await invite(input),ally=joined.state.party.members.find(p=>p.id==='traveler');assert.equal(joined.adventure.companions.records[0].physicalAcFloor,undefined);assert.deepEqual(ally.equipment,body.equipment);assert.deepEqual(joined.adventure.environment.npcStates[0].body.equipment,ally.equipment);
  ally.equipment={};ally.ac=10+Math.floor((ally.abilities.dex-10)/2);const synced=await companions.sync(joined);assert.equal(synced.state.party.members.find(p=>p.id==='traveler').ac,ally.ac);assert.deepEqual(synced.adventure.environment.npcStates[0].body.equipment,{});
});
