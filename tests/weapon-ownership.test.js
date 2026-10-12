const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let core,dir,original,view;
before(async()=>{dir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-weapon-'));process.env.DND_DATA_DIR=dir;process.env.AI_PROVIDER='fallback';original=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();core=await import('../vendor/dnd-core/dist/engine.mjs');});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(dir,{recursive:true,force:true});});
function character(classId='cleric'){return core.createSrdLevelOneCharacter({id:'hero',name:'Dwarf cleric',classId,raceId:'dwarf',backgroundId:'acolyte'});}
function fight(hero){const runner=new core.RpgGameService(null,new Map()).runner,state=runner.createNewCampaign({heroName:'Pure probe',heroClass:'cleric'}),foe=core.characterToCombatant(core.createSrdLevelOneCharacter({id:'foe',name:'Native fighter',classId:'fighter',raceId:'human'}));foe.kind='enemy';delete foe.sourceCharacterId;state.party={heroId:'hero',members:[hero]};state.flags.ui_player_turn_control=true;state.combat=core.ensureTurnBudget({id:'equipment-fight',round:1,turnIndex:0,participants:[core.characterToCombatant(hero),foe],log:[],distances:{hero:{foe:'engaged'}},environment:{id:'probe',name:'Probe',description:'',victory:[],defeat:[],escape:[]}});return {runner,state};}
function ids(state){return JSON.stringify(core.buildTurnView(state));}
function resolve(fixture,id){return fixture.runner.chooseAction(fixture.state,id,new core.SeededRng('ownership-preflight-proof'));}
async function act(command){const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};view=await engine.perform(body,{seed:'ownership-controller-proof'});return body;}

test('new cleric foundation owns and equips its modeled mace without an unsourced longsword attack',()=>{
  const hero=character();assert.ok(hero.inventory.some(i=>i.itemId==='mace'&&i.quantity===1));assert.equal(hero.equipment.mainHand,'mace');assert.ok(hero.attacks.some(a=>a.id==='mace'&&a.damageDice==='1d6'&&a.damageType==='bludgeoning'));assert.ok(!hero.inventory.some(i=>i.itemId==='longsword'));assert.ok(!hero.attacks.some(a=>a.id==='longsword'));
  const {state}=fight(hero);assert.match(ids(state),/combat\.attack\.mace\.foe/);assert.match(ids(state),/combat\.action\.cast_spell\.spell_sacred_flame\.foe/);assert.doesNotMatch(ids(state),/combat\.attack\.longsword\.foe/);
});

test('stale missing or unequipped catalog weapon attempts are omitted and refused before RNG, budgets or state changes',()=>{
  for(const mode of ['missing','unequipped']){
    const hero=character('fighter'),attack=hero.attacks.find(a=>a.id==='longsword');assert.ok(attack);
    if(mode==='missing')hero.inventory=hero.inventory.filter(i=>i.itemId!=='longsword');else delete hero.equipment.mainHand;
    const fixture=fight(hero),before=structuredClone(fixture.state);assert.doesNotMatch(ids(fixture.state),/combat\.attack\.longsword\.foe/);
    let rngCalls=0;const result=fixture.runner.chooseAction(fixture.state,'combat.attack.longsword.foe',{next(){rngCalls++;return .5;}});assert.equal(result.ok,false);assert.match(result.message,/requires inventory item|requires an equipped weapon/);assert.equal(rngCalls,0);assert.deepEqual(result.state,before);assert.deepEqual(fixture.state,before);
  }
});

test('actual equipped fighter weapon, monk unarmed strike and innate NPC profile remain executable',()=>{
  for(const [hero,attackId]of [[character('fighter'),'longsword'],[character('monk'),'unarmed_strike']]){const fixture=fight(hero),result=resolve(fixture,`combat.attack.${attackId}.foe`);assert.equal(result.ok,true);assert.ok(result.state.rollLog.length>0);}
  const hero=character('fighter');hero.attacks=[{id:'npc_civilian_unarmed',name:'Mundane fist',ability:'str',damageDice:'1',damageType:'bludgeoning',range:'melee',proficient:false}];hero.inventory=[];hero.equipment={};const result=resolve(fight(hero),'combat.attack.npc_civilian_unarmed.foe');assert.equal(result.ok,true);assert.ok(result.state.rollLog.length>0);
});

test('real generated weapon requires its exact owned equipped instance and a sold or unequipped instance cannot leave a ghost',()=>{
  const item=core.createGeneratedInventoryItem({name:'Native river blade',itemType:'weapon',weapon:{ability:'str',damageDice:'1d6',damageType:'slashing',range:'melee',proficient:true}}),hero=character('fighter');hero.inventory.push(item);hero.equipment.mainHand=item.itemId;hero.attacks.push(item.mechanics.equip.attack);
  assert.equal(resolve(fight(hero),`combat.attack.${item.itemId}.foe`).ok,true);
  for(const mode of ['missing','unequipped']){const copy=structuredClone(hero);if(mode==='missing')copy.inventory=copy.inventory.filter(i=>i.itemId!==item.itemId);else delete copy.equipment.mainHand;const fixture=fight(copy);assert.ok(!ids(fixture.state).includes(`combat.attack.${item.itemId}.foe`));const before=structuredClone(fixture.state),result=resolve(fixture,`combat.attack.${item.itemId}.foe`);assert.equal(result.ok,false);assert.deepEqual(result.state,before);}
});

test('real cleric controller filters an old saved ghost sword, refuses a direct attempt without cost, and never grants old campaigns a free mace on reopening',async()=>{
  view=await engine.create({heroName:'Brin',classId:'cleric',raceId:'dwarf',backgroundId:'acolyte',worldIdea:'A river-trade cleric watches the road',language:'en'});let loaded=await engine.loaded(view.campaign.id),hero=loaded.state.party.members.find(p=>p.id===loaded.state.party.heroId);
  hero.inventory=hero.inventory.filter(i=>i.itemId!=='mace');delete hero.equipment.mainHand;hero.attacks=hero.attacks.filter(a=>a.id!=='mace');hero.attacks.push(character('fighter').attacks.find(a=>a.id==='longsword'));
  await engine.save(loaded.service,loaded.state,loaded.adventure,'legacy_ghost_attack_fixture');view=await engine.getView(view.campaign.id);await act({type:'combat',difficulty:'easy',theme:'A real unrelated road threat'});const target=view.combat.participants.find(p=>p.kind==='enemy'&&p.hp.current>0);assert.ok(target);assert.ok(!view.actions.some(a=>a.id===`core:combat.attack.longsword.${target.id}`));assert.ok(view.actions.some(a=>a.id===`core:combat.action.cast_spell.spell_sacred_flame.${target.id}`));
  const before=structuredClone({hero:view.hero,budget:view.turnBudget,rolls:view.rolls,revision:view.campaign.revision});await assert.rejects(act({type:'action',actionId:`combat.attack.longsword.${target.id}`}),/Действие сейчас недоступно|requires inventory item/);const after=await engine.getView(view.campaign.id);assert.deepEqual({hero:after.hero,budget:after.turnBudget,rolls:after.rolls,revision:after.campaign.revision},before);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.ok(!view.hero.inventory.some(i=>['mace','longsword'].includes(i.itemId)));assert.ok(!view.actions.some(a=>a.id.includes('combat.attack.longsword.')));assert.deepEqual(view.hero.resources,before.hero.resources);assert.deepEqual(view.hero.spellcasting.slots,before.hero.spellcasting.slots);
});
