const {test,before}=require('node:test');
const assert=require('node:assert/strict');
let core,runner;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');runner=new core.RpgGameService(null,new Map()).runner;});
function patient(){return core.createSrdLevelOneCharacter({id:'patient',name:'Patient',classId:'fighter',raceId:'human'});}
function fixture(character){const state=runner.createNewCampaign({heroName:'Disposable fixture',heroClass:'fighter'});state.party={heroId:character.id,members:[character]};state.rollLog=[];return state;}
function charged(dice='1d4'){return {itemId:'medical-wand',name:'Medical wand',quantity:1,weight:1,tags:[],description:'Test healing item',identified:true,source:'generated',charges:{current:2,max:2,costPerUse:1,recharge:'long_rest'},mechanics:{use:{type:'healing',dice,consume:false}}};}
test('shared XP progression never grants currentHP to a zeroHP body or fresh resources to a corpse',()=>{
  for(const phase of ['dying','stable','dead','sparse']){const original=core.createSrdLevelOneCharacter({id:'patient',name:'Patient',classId:'wizard',raceId:'human'});original.xp=299;original.hp.current=0;original.conditions=phase==='dead'?['dead']:['unconscious',...(phase==='dying'?['dying']:[])];original.deathSaves={successes:0,failures:phase==='dead'||phase==='sparse'?3:0,stable:phase==='stable',dead:phase==='dead'||phase==='sparse'};original.resources.forEach(resource=>resource.current=0);Object.values(original.spellcasting.slots).forEach(slot=>slot.current=0);const copy=structuredClone(original),grown=core.addXp(original,25);assert.deepEqual(original,copy);assert.equal(grown.level,2);assert.ok(grown.hp.max>original.hp.max);assert.equal(grown.hp.current,0);assert.deepEqual(grown.deathSaves,original.deathSaves);assert.deepEqual(grown.conditions,original.conditions);if(original.deathSaves.dead){assert.ok(grown.resources.every(resource=>resource.current===0));assert.ok(Object.values(grown.spellcasting.slots).every(slot=>slot.current===0));}}
});
test('dead conditions and sparse deathSaves.dead both prevent all positive healing and preserve exact input',()=>{
  for(const conditions of [['dead'],[]]){const original=patient();original.hp.current=0;original.conditions=conditions;original.deathSaves={successes:0,failures:3,stable:false,dead:true};const copied=structuredClone(original);
    assert.equal(core.applyHealing(original,100),original);assert.deepEqual(original,copied);
  }
});
test('nonpositive/nonfinite amounts, full HP and healing prevention cannot alter life state or counters',()=>{
  for(const amount of [0,-1,NaN,Infinity,-Infinity,'5']){const original=patient();original.hp.current=0;original.conditions=['dying','unconscious'];original.deathSaves={successes:1,failures:2,stable:false,dead:false};assert.equal(core.applyHealing(original,amount),original);}
  const blocked=patient();blocked.hp.current=0;blocked.conditions=['dying','unconscious'];blocked.activeEffects=[{id:'lock',label:'Healing lock',sourceId:'foe',healingPrevented:true}];assert.equal(core.applyHealing(blocked,5),blocked);
  const full=patient();full.conditions=['unconscious'];assert.equal(core.applyHealing(full,5),full);assert.ok(full.conditions.includes('unconscious'));
});
test('genuine healing clears past death saves and a new drop to0 starts fresh',()=>{
  const original=patient();original.kind='ally';original.hp.current=0;original.conditions=['dying','unconscious'];original.deathSaves={successes:1,failures:2,stable:false,dead:false};
  const healed=core.applyHealing(original,5);assert.equal(healed.hp.current,5);assert.equal(healed.deathSaves,undefined);assert.ok(!healed.conditions.includes('dying'));assert.ok(!healed.conditions.includes('unconscious'));assert.equal(original.hp.current,0);
  const down=core.applyDamage(core.characterToCombatant(healed),6,'bludgeoning');assert.equal(down.hp.current,0);assert.equal(down.deathSaves.failures,0);assert.equal(down.deathSaves.successes,0);
});
test('potion/charged item refuse corpses, blocked healing and fullHP before any cost, roll or mutation',()=>{
  for(const modify of [p=>{p.hp.current=0;p.conditions=['dead'];},p=>{p.hp.current=0;p.conditions=[];p.deathSaves={successes:0,failures:3,stable:false,dead:true};},p=>{p.hp.current=1;p.activeEffects=[{id:'lock',label:'Blocked',sourceId:'foe',healingPrevented:true}];},()=>{}]){
    for(const itemId of ['healing_potion','medical-wand']){const p=patient();p.inventory.push(charged());modify(p);const state=fixture(p),original=structuredClone(state);const result=runner.useItem(state,itemId,p.id,{next:()=>{throw new Error('Refusal must happen before dice');}});
      assert.equal(result.ok,false);assert.deepEqual(result.state,original);assert.deepEqual(state,original);
    }
  }
});
test('a zero-result healing item does not remove unconscious/dying or spend its charge',()=>{
  const p=patient();p.hp.current=0;p.conditions=['dying','unconscious'];p.deathSaves={successes:0,failures:2,stable:false,dead:false};p.inventory.push(charged('0'));
  const state=fixture(p),original=structuredClone(state),result=runner.useItem(state,'medical-wand',p.id,new core.SeededRng('zero'));
  assert.equal(result.ok,false);assert.deepEqual(result.state,original);assert.equal(result.state.party.members[0].inventory.find(i=>i.itemId==='medical-wand').charges.current,2);
});
test('real potion consumes one quantity, charge healing spends once, and combat/party share the same cleared life state',()=>{
  const p=patient();p.hp.current=0;p.conditions=['dying','unconscious'];p.deathSaves={successes:0,failures:2,stable:false,dead:false};p.inventory.find(i=>i.itemId==='healing_potion').quantity=2;p.inventory.push(charged());
  const state=fixture(p),actor=core.characterToCombatant(p),foe={...structuredClone(actor),id:'foe',sourceCharacterId:undefined,kind:'enemy',hp:{current:50,max:50,temp:0},conditions:[],deathSaves:undefined};
  state.combat=core.ensureTurnBudget({id:'fixture-fight',round:1,turnIndex:0,participants:[actor,foe],log:[],environment:{id:'fixture',name:'Fixture',description:'',victory:[]}});
  const original=structuredClone(state),result=runner.useItem(state,'healing_potion',p.id,new core.SeededRng('heal'));
  assert.equal(result.ok,true);const member=result.state.party.members[0],body=result.state.combat.participants[0];assert.ok(member.hp.current>0);assert.deepEqual(member.hp,body.hp);assert.equal(member.deathSaves,undefined);assert.equal(body.deathSaves,undefined);
  assert.equal(member.inventory.find(i=>i.itemId==='healing_potion').quantity,1);assert.equal(result.state.rollLog.length,1);assert.deepEqual(state,original);
  const synced=core.syncPartyFromCombat(result.state);assert.equal(synced.party.members[0].deathSaves,undefined);
  member.hp.current=1;body.hp.current=1;const chargedResult=runner.useItem(result.state,'medical-wand',p.id,new core.SeededRng('charge'));
  assert.equal(chargedResult.ok,true);assert.equal(chargedResult.state.party.members[0].inventory.find(i=>i.itemId==='medical-wand').charges.current,1);assert.equal(chargedResult.state.rollLog.length,2);
});
test('an alive healed incoming body clears cached failed saves while an omitted0HP state still inherits them',()=>{
  const cached=patient();cached.kind='ally';cached.hp.current=0;cached.conditions=['dying','unconscious'];cached.deathSaves={successes:1,failures:2,stable:false,dead:false};
  const body=core.applyHealing(core.characterToCombatant(cached),4);assert.equal(body.deathSaves,undefined);const synced=core.syncCombatantToCharacter(cached,body);assert.equal(synced.hp.current,4);assert.equal(synced.deathSaves,undefined);
  const partial=core.characterToCombatant(cached);delete partial.deathSaves;assert.deepEqual(core.syncCombatantToCharacter(cached,partial).deathSaves,cached.deathSaves);
  const corpse={...cached,conditions:['dead'],deathSaves:{...cached.deathSaves,dead:true}};assert.equal(core.syncCombatantToCharacter(corpse,body).deathSaves.dead,true);
});
test('actual catalog Cure Wounds uses shared healing life rules and consumes its real slot without file storage',async()=>{
  for(const dead of [false,true]){
    const p=patient();p.kind='ally';p.hp.current=0;p.conditions=dead?[]:['dying','unconscious'];p.deathSaves={successes:0,failures:dead?3:2,stable:false,dead};
    const state=fixture(p),caster=core.createSrdLevelOneCharacter({id:'caster',name:'Cleric',classId:'cleric',raceId:'human'});state.party={heroId:caster.id,members:[caster,p]};
    const original=structuredClone(state);let persisted;
    const service=new core.RpgGameService({loadGameState:()=>structuredClone(state),saveGameState:async updated=>{persisted=structuredClone(updated);}},new Map());
    const result=await service.castSpell(state.campaign.id,'spell_cure_wounds',p.id,'catalog-heal'),target=result.state.party.members.find(member=>member.id===p.id);
    assert.deepEqual(state,original);assert.equal(result.state.party.members.find(member=>member.id===caster.id).spellcasting.slots['1'].current,1);
    if(dead){assert.equal(target.hp.current,0);assert.equal(target.deathSaves.dead,true);}else{assert.ok(target.hp.current>0);assert.equal(target.deathSaves,undefined);assert.ok(!target.conditions.includes('dying'));}
    assert.deepEqual(persisted.party.members.find(member=>member.id===p.id),target);
  }
});
