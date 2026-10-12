const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
let core,directory,service;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
after(async()=>{if(service)service.store.close();if(directory)await fs.rm(directory,{recursive:true,force:true});});
function fixture(classId='wizard'){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Hero',classId:'fighter',raceId:'human'});
  const ally=core.createSrdLevelOneCharacter({id:'npc-caster',name:'Caster',classId,raceId:'human'});ally.kind='ally';
  const actor=core.characterToCombatant(ally),player=core.characterToCombatant(hero);
  const foe={...structuredClone(player),id:'foe',sourceCharacterId:undefined,kind:'enemy',name:'Foe',hp:{current:100,max:100,temp:0},ac:10,tactics:{}};
  const combat=core.ensureTurnBudget({id:'fight',round:1,turnIndex:0,participants:[actor,foe,player],log:[],environment:{id:'test',name:'Test',description:'',victory:[],defeat:[],escape:[]}});
  return {campaign:{id:'test',rules:{zeroHpPolicy:'standard5e'}},currentScene:{id:'test'},party:{heroId:hero.id,members:[hero,ally]},flags:{ui_companion_ai_ids:JSON.stringify([ally.id])},rollLog:[],combat};
}
function run(state,seed='caster-proof'){
  const rng=new core.SeededRng(seed),hook=core.createCompanionAutomaticHook(state,rng);
  const turn=hook.beforeAutomaticActor({combat:state.combat,actor:state.combat.participants[state.combat.turnIndex],rng,rules:state.campaign.rules});
  return {turn,...hook.result(turn?.combat||state.combat)};
}
function preference(state,mode,targetId,combatId=state.combat.id){state.flags.ui_companion_orders=JSON.stringify({'npc-caster':{mode,...(targetId?{targetId}:{}),...(mode==='focus'?{combatId}:{})}});return state;}
function exactCast(state,spellId,targetId='foe',cost='action',directiveId='exact-1'){
  state.flags.ui_companion_orders=JSON.stringify({'npc-caster':{mode:'cast',spellActionId:`combat.${cost}.cast_spell.${spellId}.${targetId}`,directiveId,combatId:state.combat.id}});return state;
}
function learn(state,...spells){const c=state.party.members[1];c.spellcasting.known=[...new Set([...c.spellcasting.known,...spells])];c.spellcasting.prepared=[...new Set([...c.spellcasting.prepared,...spells.filter(id=>!['spell_fire_bolt','spell_sacred_flame'].includes(id))])];return state;}
function directiveResult(result){return JSON.parse(result.state.flags.ui_companion_order_results)['npc-caster'];}
const authoredDamage={id:'spell-created-own-pulse',name:'Own Pulse',description:'An original focused pulse.',level:1,rangeFeet:60,cost:'action',target:'creature',saveAbility:'dex',effects:[{type:'damage',dice:'2d6',damageType:'force'}]};
function authoredOrder(state,definition=authoredDamage,targetId='foe'){
  state.flags.ui_companion_original_spells=JSON.stringify({'npc-caster':{ownerId:'npc-caster',spellId:definition.id,definition}});
  state.flags.ui_companion_orders=JSON.stringify({'npc-caster':{mode:'cast',spellActionId:`combat.${definition.cost==='bonus_action'?'bonus':'action'}.cast_created_spell.${definition.id}.${targetId}`,directiveId:'authored-order',combatId:state.combat.id}});return state;
}
function deterministicRun(state,value=0.01){let draws=0;const rng={next:()=>{draws++;return value;}},hook=core.createCompanionAutomaticHook(state,rng),turn=hook.beforeAutomaticActor({combat:state.combat,actor:state.combat.participants[state.combat.turnIndex],rng,rules:state.campaign.rules});return {...hook.result(turn?.combat||state.combat),draws};}
function autonomousBook(state,...definitions){state.flags.ui_companion_original_books=JSON.stringify({'npc-caster':{ownerId:'npc-caster',definitions}});return state;}
const strongOriginal={...authoredDamage,id:'spell-created-autonomous-storm',name:'Own Storm',effects:[{type:'damage',dice:'4d8',damageType:'force',halfOnSave:true}]};
const originalHeal={...authoredDamage,id:'spell-created-autonomous-heal',name:'Own Mending',cost:'bonus_action',saveAbility:undefined,effects:[{type:'healing',dice:'2d6'}]};
const originalGuard={...authoredDamage,id:'spell-created-autonomous-guard',name:'Own Ward',target:'self',saveAbility:undefined,durationTurns:3,concentration:true,effects:[{type:'armor',amount:1}]};
test('autonomous own original damage beats weaker catalog utility; weaker original leaves the useful catalog spell selected',()=>{
  const state=autonomousBook(fixture(),strongOriginal),before=structuredClone(state),result=deterministicRun(state);assert.deepEqual(state,before);assert.ok(result.combat.log.some(log=>log.title.includes('Own Storm')));assert.equal(result.combat.participants[1].hp.current,96);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.turnBudget.spellCasting.actionLeveled,true);assert.equal(result.state.flags.ui_companion_order_results,undefined);
  const weaker=deterministicRun(autonomousBook(fixture(),authoredDamage));assert.ok(weaker.combat.log.some(log=>log.title.includes('spell_magic_missile')));assert.ok(!weaker.combat.log.some(log=>log.title.includes('Own Pulse')));
});
test('autonomous original bonus healing rescues a real zero-HP ally then uses only legal main cantrip, never a second leveled spell',()=>{
  const state=autonomousBook(fixture('cleric'),originalHeal,strongOriginal);state.party.members[0].hp.current=0;state.party.members[0].conditions=['dying','unconscious'];state.party.members[0].deathSaves={successes:0,failures:2,stable:false,dead:false};state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);const result=deterministicRun(state);
  assert.equal(result.combat.participants[2].hp.current,2);assert.ok(!result.combat.participants[2].conditions.includes('dying'));assert.ok(!result.state.party.members[0].deathSaves);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.ok(result.combat.log.some(log=>log.title.includes('Own Mending')));assert.ok(result.combat.log.some(log=>log.title.includes('spell_sacred_flame')));assert.ok(!result.combat.log.some(log=>log.title.includes('Own Storm')));assert.equal(result.combat.turnBudget.spellCasting.bonusAction,true);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,false);
});
test('autonomous original control and defense apply finite owned effects; existing benefit/concentration is never overwritten or refreshed',()=>{
  const control={...authoredDamage,id:'spell-created-autonomous-snare',name:'Own Snare',saveAbility:'wis',durationTurns:3,concentration:true,effects:[{type:'condition',condition:'restrained',repeatSave:true}]},controlled=deterministicRun(autonomousBook(fixture(),control));assert.ok(controlled.combat.participants[1].conditions.includes('restrained'));assert.ok(controlled.combat.participants[1].activeEffects.some(effect=>effect.remainingSourceTurnEnds===3&&effect.concentrationSourceId==='npc-caster'));assert.equal(controlled.combat.participants[1].hp.current,100);assert.equal(controlled.state.party.members[1].spellcasting.slots['1'].current,1);
  const defending=deterministicRun(preference(autonomousBook(fixture(),originalGuard),'defend'));assert.ok(defending.combat.participants[0].activeEffects.some(effect=>effect.armorClassBonus===1));assert.equal(defending.combat.participants[1].hp.current,100);assert.equal(defending.state.party.members[1].spellcasting.slots['1'].current,1);
  const again=structuredClone(defending.state);again.combat.round+=1;again.combat.turnBudget=core.createTurnBudget(again.combat.participants[0].speed);const held=deterministicRun(again);assert.equal(held.state.party.members[1].spellcasting.slots['1'].current,1);assert.ok(held.combat.participants[0].tactics.dodging);assert.equal(held.combat.participants[0].activeEffects.filter(effect=>effect.spellId===originalGuard.id).length,1);assert.equal(held.combat.participants[0].activeEffects.find(effect=>effect.spellId===originalGuard.id).remainingSourceTurnEnds,3);
});
test('support, conserve, focus and exact orders keep their real meaning while owned original choices are available',()=>{
  const supported=autonomousBook(fixture(),originalHeal,strongOriginal);supported.party.members[0].hp.current-=3;supported.combat.participants[2].hp.current-=3;const support=deterministicRun(preference(supported,'support','hero'));assert.ok(support.combat.log.some(log=>log.title.includes('Own Mending')));assert.equal(support.combat.participants[1].hp.current,100);assert.ok(support.combat.participants[0].tactics.dodging);
  const cantrip={...strongOriginal,id:'spell-created-autonomous-cantrip',name:'Own Spark',level:0,effects:[{type:'damage',dice:'1d12',damageType:'force',halfOnSave:true}]},conserved=deterministicRun(preference(autonomousBook(fixture(),strongOriginal,cantrip),'conserve'));assert.equal(conserved.state.party.members[1].spellcasting.slots['1'].current,2);assert.ok(conserved.combat.log.some(log=>log.title.includes('Own Spark')));
  const focused=preference(autonomousBook(fixture(),strongOriginal,originalHeal),'focus','foe');focused.combat.participants.push({...structuredClone(focused.combat.participants[1]),id:'other-foe',name:'Other foe',hp:{current:1,max:1,temp:0}});const focus=deterministicRun(focused);assert.equal(focus.combat.participants.find(target=>target.id==='other-foe').hp.current,1);assert.ok(focus.combat.participants[1].hp.current<100);
  const exact=deterministicRun(exactCast(autonomousBook(fixture(),strongOriginal),'spell_magic_missile'));assert.ok(!exact.combat.log.some(log=>log.title.includes('Own Storm')));assert.equal(directiveResult(exact).spellActionId,'combat.action.cast_spell.spell_magic_missile.foe');
});
test('original auto selection cannot bypass spent budgets, ownership, range, cover, immunity, incapacitation or malformed bounded registries',()=>{
  for(const change of ['owner','large','count','invalid-spec','range','cover','immune','incap','budget']){
    const state=autonomousBook(fixture(),strongOriginal),map=JSON.parse(state.flags.ui_companion_original_books);if(change==='owner')map['npc-caster'].ownerId='hero';if(change==='large')state.flags.ui_companion_original_books='x'.repeat(10001);if(change==='count')map['npc-caster'].definitions=Array.from({length:7},(_,i)=>({...strongOriginal,id:`spell-created-many-${i}`}));if(change==='invalid-spec')map['npc-caster'].definitions[0].effects[0].dice='99d12';if(change==='range')state.combat.distances={'npc-caster':{foe:'out_of_range'}};if(change==='cover')state.combat.cover={'npc-caster':{foe:'total'}};if(change==='immune')state.combat.participants[1].damageImmunities=['force'];if(change==='incap')state.combat.participants[0].conditions=['stunned'];if(change==='budget'){state.combat.turnBudget.action=false;state.combat.turnBudget.bonusAction=false;}if(change!=='large')state.flags.ui_companion_original_books=JSON.stringify(map);
    const result=deterministicRun(state);assert.ok(!result.combat.log.some(log=>log.title.includes('Own Storm')),change);if(['incap','budget'].includes(change)){assert.equal(result.draws,0);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);}
  }
});
test('original autonomy processes disabling turn-start reactions once and never spends spell resources after the caster falls',()=>{
  const state=autonomousBook(fixture(),strongOriginal),foe=state.combat.participants[1];foe.attacks=[{id:'auto-ready',name:'Auto ready',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];foe.tactics={readiedAction:'auto-ready',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};const result=deterministicRun(state,0.99);assert.equal(result.combat.participants[0].hp.current,0);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(result.combat.turnBudget.action,true);assert.equal(result.rollLogs.filter(log=>log.label.startsWith('Ready auto-ready')).length,1);assert.ok(!result.combat.log.some(log=>log.title.includes('Own Storm')));
});
test('natural20 revives a registered NPC and permits its retained own original healing on that same actual turn',()=>{
  const state=autonomousBook(fixture('cleric'),originalHeal),npc=state.party.members[1];npc.hp.current=0;npc.conditions=['dying','unconscious'];npc.deathSaves={successes:0,failures:0,stable:false,dead:false};state.combat.participants[0]=core.characterToCombatant(npc);state.combat.participants=[state.combat.participants[0],state.combat.participants[2],state.combat.participants[1]];const before=structuredClone(state),result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>0.99});assert.deepEqual(state,before);const saved=result.partyMembers.find(member=>member.id==='npc-caster');assert.equal(saved.hp.current,Math.min(npc.hp.max,13));assert.equal(saved.spellcasting.slots['1'].current,1);assert.equal(saved.deathSaves?.failures||0,0);assert.ok(!saved.deathSaves?.dead);assert.ok(!saved.conditions.includes('dying')&&!saved.conditions.includes('unconscious'));assert.equal(result.rollLogs.filter(log=>log.label==='Death Saving Throw').length,1);assert.ok(result.combat.log.some(log=>log.title.includes('Own Mending')));
});
test('autonomous original Counterspell interruption spends its genuine attempt once without replacement offense',()=>{
  const state=autonomousBook(fixture(),strongOriginal),foe=state.combat.participants[1];foe.resources=[{id:'spell_slots_3',current:1,max:1,refresh:'long_rest'}];foe.tactics={readiedAction:'spell_counterspell',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};const result=deterministicRun(state);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.participants[1].resources[0].current,0);assert.equal(result.combat.log.filter(log=>log.title.includes('Own Storm')).length,1);assert.ok(!result.combat.log.some(log=>log.title.includes('spell_magic_missile')));
});
test('autonomous original protection expires through real automatic source turn ends and only then may spend another slot',()=>{
  let state=preference(autonomousBook(fixture(),originalGuard),'defend');for(const member of state.party.members)member.hp={current:100,max:100,temp:0};state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  for(let turn=0;turn<4;turn++){
    state.combat.turnIndex=0;state.combat.turnBudget=core.createTurnBudget(state.combat.participants[0].speed);state.combat.round=turn+1;const result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>0.99});state=result.state;const actor=state.combat.participants.find(actor=>actor.id==='npc-caster'),ward=actor.activeEffects?.find(effect=>effect.spellId===originalGuard.id),caster=state.party.members.find(member=>member.id==='npc-caster');
    if(turn<2){assert.equal(ward.remainingSourceTurnEnds,2-turn);assert.equal(caster.spellcasting.slots['1'].current,1);}if(turn===2){assert.ok(!ward);assert.equal(caster.spellcasting.slots['1'].current,1);}if(turn===3){assert.equal(ward.remainingSourceTurnEnds,2);assert.equal(caster.spellcasting.slots['1'].current,0);}
  }
});

test('exact registered authored damage uses its real selected target, own slot and shared rolls once',()=>{
  const state=authoredOrder(fixture()),other={...structuredClone(state.combat.participants[1]),id:'other-foe',name:'Other',hp:{current:1,max:1,temp:0}};state.combat.participants.push(other);const before=structuredClone(state),result=deterministicRun(state);
  assert.deepEqual(state,before);assert.equal(result.combat.participants[1].hp.current,98);assert.equal(result.combat.participants.find(p=>p.id==='other-foe').hp.current,1);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,true);assert.equal(directiveResult(result).status,'resolved');assert.equal(result.rollLogs.length,2);assert.equal(result.state.rollLog.length,2);assert.equal(result.combat.turnBudget.spellCasting.actionLeveled,true);assert.equal(result.state.flags.generated_leveled_spell_turn,undefined);assert.equal(result.state.flags.ui_companion_original_spells,state.flags.ui_companion_original_spells);
  const replay=deterministicRun({...result.state,flags:{...result.state.flags,ui_companion_orders:state.flags.ui_companion_orders}});assert.equal(replay.draws,0);assert.equal(replay.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(replay.combat.participants[1].hp.current,98);
});
test('authored NPC healing, control and protection execute shared life/effect mechanics on the real own turn',()=>{
  const heal={...authoredDamage,id:'spell-created-own-heal',name:'Own Heal',cost:'bonus_action',saveAbility:undefined,effects:[{type:'healing',dice:'1d4'}]},healing=fixture('cleric');healing.party.members[0].hp.current=1;healing.combat.participants[2].hp.current=1;const healed=deterministicRun(authoredOrder(healing,heal,'hero'));assert.equal(healed.combat.participants[2].hp.current,2);assert.equal(healed.state.party.members[0].hp.current,2);assert.equal(healed.combat.turnBudget.action,true);assert.equal(healed.combat.turnBudget.bonusAction,false);assert.equal(healed.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(directiveResult(healed).status,'resolved');
  const control={...authoredDamage,id:'spell-created-own-fear',name:'Own Fear',saveAbility:'wis',durationTurns:2,concentration:true,effects:[{type:'condition',condition:'frightened',repeatSave:true}]},held=deterministicRun(authoredOrder(fixture(),control));assert.ok(held.combat.participants[1].conditions.includes('frightened'));assert.equal(held.combat.participants[1].hp.current,100);assert.ok(held.combat.participants[1].activeEffects.some(effect=>effect.concentrationSourceId==='npc-caster'&&effect.repeatSavingThrow?.timing==='target_turn_end'));assert.equal(directiveResult(held).status,'resolved');
  const protection={...authoredDamage,id:'spell-created-own-guard',name:'Own Guard',target:'self',saveAbility:undefined,durationTurns:2,concentration:true,effects:[{type:'armor',amount:1}]},guarded=deterministicRun(authoredOrder(fixture(),protection,'npc-caster'));assert.ok(guarded.combat.participants[0].activeEffects.some(effect=>effect.armorClassBonus===1&&effect.sourceId==='npc-caster'));assert.equal(guarded.rollLogs.length,0);assert.equal(guarded.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(directiveResult(guarded).status,'resolved');
});
test('authored registry rejects unknown/borrowed/corrupt/excessive definitions without rolls, costs or automatic substitute',()=>{
  for(const change of ['absent','borrowed','id-mismatch','spec-power','unknown-spec','large','array','bad-cost','missing-target','depleted']){
    const state=authoredOrder(fixture()),registry=JSON.parse(state.flags.ui_companion_original_spells);if(change==='absent')delete state.flags.ui_companion_original_spells;if(change==='borrowed')registry['npc-caster'].ownerId='hero';if(change==='id-mismatch')registry['npc-caster'].definition.id='spell-created-other';if(change==='spec-power')registry['npc-caster'].definition.effects[0].dice='99d12';if(change==='unknown-spec')registry['npc-caster'].definition.arbitraryResource=99;if(change==='large')state.flags.ui_companion_original_spells=' '.repeat(10001);if(change==='array')state.flags.ui_companion_original_spells='[]';if(change==='bad-cost'){const order=JSON.parse(state.flags.ui_companion_orders);order['npc-caster'].spellActionId=order['npc-caster'].spellActionId.replace('combat.action','combat.bonus');state.flags.ui_companion_orders=JSON.stringify(order);}if(change==='missing-target')state.combat.participants[1].conditions=['fled'];if(change==='depleted'){state.combat.participants[0].resources.find(r=>r.id==='spell_slots_1').current=0;state.party.members[1].spellcasting.slots['1'].current=0;}
    if(!['absent','large','array'].includes(change))state.flags.ui_companion_original_spells=JSON.stringify(registry);const result=deterministicRun(state);assert.equal(directiveResult(result).status,'refused',change);assert.equal(result.draws,0,change);assert.equal(result.rollLogs.length,0,change);assert.equal(result.combat.turnBudget.action,true,change);assert.equal(result.combat.turnBudget.bonusAction,true,change);assert.equal(result.combat.participants[1].hp.current,100,change);assert.deepEqual(result.combat.participants[0].resources,state.combat.participants[0].resources,change);
  }
});
test('authored spell cannot bypass hostile-turn-start reaction: disabling shot happens exactly once before slot/action payment',()=>{
  const state=authoredOrder(fixture()),foe=state.combat.participants[1];foe.attacks=[{id:'authored-ready',name:'Authored ready shot',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];foe.tactics={readiedAction:'authored-ready',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};const result=deterministicRun(state,0.99);assert.equal(result.combat.participants[0].hp.current,0);assert.equal(result.combat.turnBudget.action,true);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(result.rollLogs.filter(log=>log.label.startsWith('Ready authored-ready')).length,1);assert.equal(directiveResult(result).status,'refused');assert.equal(result.combat.participants[1].hp.current,100);
});

test('exact spell-order preview is pure, uses the NPC repertoire and executes neither immediately nor on another human turn',()=>{
  const state=exactCast(learn(fixture(),'spell_sleep'),'spell_sleep'),before=structuredClone(state);
  state.combat.turnIndex=2;const pending=structuredClone(state);
  const preview=core.companionSpellOrderOptions(state,'npc-caster',{preview:true});assert.ok(preview.some(o=>o.id==='combat.action.cast_spell.spell_sleep.foe'));assert.deepEqual(state,pending);
  assert.deepEqual(core.companionSpellOrderOptions(state,'npc-caster'),[]);assert.deepEqual(core.companionSpellOrderOptions(state,'hero',{preview:true}),[]);
  const unchanged=run(state);assert.equal(unchanged.rollLogs.length,0);assert.equal(unchanged.state.flags.ui_companion_order_results,undefined);assert.equal(unchanged.state.flags.ui_companion_orders,state.flags.ui_companion_orders);
  for(const member of before.party.members){const actual=unchanged.state.party.members.find(m=>m.id===member.id);assert.deepEqual(actual.hp,member.hp);assert.deepEqual(actual.resources,member.resources);assert.deepEqual(actual.inventory,member.inventory);assert.deepEqual(actual.spellcasting,member.spellcasting);}
});

test('exact Sleep uses the real upstream area effect and one slot, records consumption and never substitutes the default offensive spell',()=>{
  const state=exactCast(learn(fixture(),'spell_sleep'),'spell_sleep');state.combat.participants[1].hp={current:4,max:4,temp:0};state.combat.distances={'npc-caster':{hero:'out_of_range'}};const original=structuredClone(state),result=run(state,'exact-sleep');
  assert.deepEqual(state,original);assert.equal(result.combat.participants[1].hp.current,4);assert.ok(result.combat.participants[1].conditions.includes('unconscious'));assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,true);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);
  assert.equal(result.rollLogs.length,1);assert.equal(result.rollLogs[0].label,'spell_sleep');assert.equal(directiveResult(result).status,'resolved');assert.equal(directiveResult(result).spellActionId,'combat.action.cast_spell.spell_sleep.foe');assert.deepEqual(JSON.parse(result.state.flags.ui_companion_orders)['npc-caster'],{mode:'auto'});
});

test('exact control and offense preserve the selected catalog spell and real target, rather than automatic damage priorities',()=>{
  const state=exactCast(learn(fixture(),'spell_hold_person'),'spell_hold_person');state.party.members[1].level=3;state.party.members[1].spellcasting.slots['2']={current:2,max:2};state.party.members[1].resources.push({id:'spell_slots_2',current:2,max:2,refresh:'long_rest'});state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);
  const rng={next:()=>0.01},hook=core.createCompanionAutomaticHook(state,rng),turn=hook.beforeAutomaticActor({combat:state.combat,actor:state.combat.participants[0],rng,rules:state.campaign.rules}),held=hook.result(turn.combat);
  assert.equal(directiveResult(held).status,'resolved');assert.ok(held.combat.participants[1].conditions.includes('paralyzed'));assert.equal(held.combat.participants[1].hp.current,100);assert.equal(held.state.party.members[1].spellcasting.slots['2'].current,1);
  const damage=fixture(),other={...structuredClone(damage.combat.participants[1]),id:'other-foe',hp:{current:1,max:1,temp:0}};damage.combat.participants.push(other);exactCast(damage,'spell_magic_missile','foe');const hit=run(damage);
  assert.ok(hit.combat.participants[1].hp.current<100);assert.equal(hit.combat.participants.find(p=>p.id==='other-foe').hp.current,1);assert.equal(directiveResult(hit).status,'resolved');assert.equal(hit.rollLogs.some(l=>l.label==='spell_sleep'),false);
});

test('Sleep and Color Spray expose actual creature candidates around the caster and require explicit consent for ally risk',()=>{
  for(const [spellId,condition] of [['spell_sleep','unconscious'],['spell_color_spray','blinded']]){
    const state=exactCast(learn(fixture(),spellId),spellId);state.combat.participants[1].hp={current:4,max:4,temp:0};state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
    const option=core.companionSpellOrderOptions(state,'npc-caster').find(o=>o.id===`combat.action.cast_spell.${spellId}.foe`);assert.equal(option.area.targeting,'caster_distance_bands');assert.equal(option.area.candidateTargets,true);assert.deepEqual(option.affectedIds,['foe','hero']);assert.equal(option.mayAffectAllies,true);
    const refusal=run(state);assert.equal(directiveResult(refusal).status,'refused');assert.match(directiveResult(refusal).message,/allies/);assert.equal(refusal.rollLogs.length,0);assert.equal(refusal.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(refusal.combat.turnBudget.action,true);assert.equal(refusal.combat.participants[1].hp.current,4);
    const order=JSON.parse(state.flags.ui_companion_orders);order['npc-caster'].allowFriendlyFire=true;state.flags.ui_companion_orders=JSON.stringify(order);const allowed=run(state,`allowed-${spellId}`);assert.equal(directiveResult(allowed).status,'resolved');assert.equal(allowed.state.party.members[1].spellcasting.slots['1'].current,1);assert.ok(allowed.combat.participants[1].conditions.includes(condition));assert.ok(allowed.combat.participants[2].conditions.includes(condition));assert.equal(allowed.combat.participants[0].conditions.includes(condition),false);assert.equal(allowed.combat.participants[2].hp.current,1);
  }
});

test('an ally entering the Sleep area after a safe preview invalidates the exact directive before dice, action or slot spending',()=>{
  const state=exactCast(learn(fixture(),'spell_sleep'),'spell_sleep');state.combat.distances={'npc-caster':{hero:'out_of_range'}};const option=core.companionSpellOrderOptions(state,'npc-caster',{preview:true}).find(o=>o.id==='combat.action.cast_spell.spell_sleep.foe');assert.equal(option.mayAffectAllies,false);assert.deepEqual(option.affectedIds,['foe']);
  state.combat.distances['npc-caster'].hero='near';const result=run(state);assert.equal(directiveResult(result).status,'refused');assert.equal(result.rollLogs.length,0);assert.equal(result.combat.turnBudget.action,true);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(result.combat.participants[1].hp.current,100);
});

test('common Sleep and Color Spray solvers include nearby allies for hero casts, preserve cover/range and consume their real slots',()=>{
  for(const [spellId,condition] of [['spell_sleep','unconscious'],['spell_color_spray','blinded']]){const state=learn(fixture(),spellId),caster=state.party.members[1],actor=state.combat.participants[0];state.combat.participants[0]={...actor,kind:'player'};state.combat.participants[1].hp={current:4,max:4,temp:0};state.combat.participants[2].hp.current=1;
    const result=core.resolveAutomatedSrdCombatSpellTurnAction({combat:state.combat,actorId:actor.id,actionId:`combat.action.cast_spell.${spellId}.foe`,members:state.party.members,rng:new core.SeededRng('common-area'),rules:state.campaign.rules});assert.equal(result.ok,true);assert.ok(result.combat.participants[1].conditions.includes(condition));assert.ok(result.combat.participants[2].conditions.includes(condition));assert.equal(result.combat.participants[0].conditions.includes(condition),false);assert.equal(result.partyMembers.find(m=>m.id===caster.id).spellcasting.slots['1'].current,1);
    state.combat.cover={'npc-caster':{hero:'total'}};const covered=core.resolveAutomatedSrdCombatSpellTurnAction({combat:state.combat,actorId:actor.id,actionId:`combat.action.cast_spell.${spellId}.foe`,members:state.party.members,rng:new core.SeededRng('common-area'),rules:state.campaign.rules});assert.equal(covered.ok,true);assert.equal(covered.combat.participants[2].conditions.includes(condition),false);
  }
});

test('readied Counterspell interrupts a permitted Sleep area before any friend or foe receives its condition',()=>{
  const state=exactCast(learn(fixture(),'spell_sleep'),'spell_sleep'),order=JSON.parse(state.flags.ui_companion_orders);order['npc-caster'].allowFriendlyFire=true;state.flags.ui_companion_orders=JSON.stringify(order);const foe=state.combat.participants[1];foe.resources=[{id:'spell_slots_3',current:1,max:1,refresh:'long_rest'}];foe.tactics={readiedAction:'spell_counterspell',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};const result=run(state);assert.equal(directiveResult(result).status,'refused');assert.equal(result.combat.participants.some(p=>p.conditions.includes('unconscious')),false);assert.equal(result.combat.participants[1].resources[0].current,0);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.turnBudget.action,false);
});

test('real Healing Word restores a wounded positive-HP sleeper without removing magical unconsciousness, its condition source or Sleep effect',()=>{
  const sleep=learn(fixture(),'spell_sleep');sleep.combat.participants[2].hp.current=3;sleep.party.members[0].hp.current=3;
  const asleep=core.resolveAutomatedSrdCombatSpellTurnAction({combat:sleep.combat,actorId:'npc-caster',actionId:'combat.action.cast_spell.spell_sleep.foe',members:sleep.party.members,rng:{next:()=>0.99},rules:sleep.campaign.rules});assert.equal(asleep.ok,true);
  const patient=asleep.combat.participants.find(p=>p.id==='hero');assert.equal(patient.hp.current,3);assert.ok(patient.conditions.includes('unconscious'));assert.ok(patient.activeEffects.some(e=>e.spellId==='spell_sleep'));
  const state=exactCast(fixture('cleric'),'spell_healing_word','hero','bonus');state.combat.participants[2]=structuredClone(patient);state.party.members[0]=structuredClone(asleep.partyMembers.find(m=>m.id==='hero'));
  const original=structuredClone(state),healed=run(state);assert.deepEqual(state,original);const after=healed.combat.participants.find(p=>p.id==='hero');assert.ok(after.hp.current>3);assert.ok(after.conditions.includes('unconscious'));assert.deepEqual(after.activeEffects,patient.activeEffects);assert.deepEqual(after.conditionInstances,patient.conditionInstances);assert.equal(directiveResult(healed).status,'resolved');assert.equal(healed.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(healed.combat.participants[1].hp.current,100);
});

test('ordinary 0-HP healing revives and resets death saves, while zero gain, healing prevention and dead bodies preserve every life field',()=>{
  const state=dyingCompanion(fixture(),1,2),patient=state.combat.participants[0],original=structuredClone(patient),revived=core.applyHealing(patient,3);assert.deepEqual(patient,original);assert.equal(revived.hp.current,3);assert.equal(revived.deathSaves,undefined);assert.equal(revived.conditions.includes('unconscious'),false);assert.equal(revived.conditions.includes('dying'),false);
  for(const [target,amount] of [[patient,0],[patient,-1],[patient,NaN],[{...patient,activeEffects:[{id:'no-heal',healingPrevented:true}]},5],[{...patient,conditions:['dead','unconscious'],deathSaves:{...patient.deathSaves,dead:true}},5]]){const before=structuredClone(target),result=core.applyHealing(target,amount);assert.equal(result,target);assert.deepEqual(result,before);}
});

test('an exact bonus healing order heals only the selected wounded ally and leaves its main action idle; a now-healed target refuses',()=>{
  const state=exactCast(fixture('cleric'),'spell_healing_word','hero','bonus');state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);const result=run(state);
  assert.ok(result.state.party.members[0].hp.current>1);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.turnBudget.action,true);assert.equal(result.combat.turnBudget.bonusAction,false);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(directiveResult(result).status,'resolved');assert.equal(result.rollLogs.length,1);
  const full=exactCast(fixture('cleric'),'spell_healing_word','hero','bonus'),denied=run(full);assert.equal(directiveResult(denied).status,'refused');assert.equal(denied.rollLogs.length,0);assert.deepEqual(denied.combat.turnBudget,full.combat.turnBudget);assert.equal(denied.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(denied.combat.participants[1].hp.current,100);
});

test('spent slots, preparation, absent/dead/moved/covered/charmed targets, wrong cost and combat epoch consume orders without substitute attacks',()=>{
  const changes=[s=>{s.party.members[1].spellcasting.slots['1'].current=0;s.combat.participants[0].resources.find(r=>r.id==='spell_slots_1').current=0;},s=>s.party.members[1].spellcasting.prepared=[],s=>s.combat.participants=s.combat.participants.filter(p=>p.id!=='foe'),s=>s.combat.participants[1].conditions=['dead'],s=>s.combat.cover={'npc-caster':{foe:'total'}},s=>s.combat.distances={'npc-caster':{foe:'out_of_range'}},s=>{s.combat.participants[0].conditions=['charmed'];s.combat.participants[0].conditionInstances=[{id:'charm',condition:'charmed',sourceId:'foe'}];},s=>s.combat.turnBudget.action=false,s=>s.combat.participants[0].conditions=['stunned'],s=>s.combat.id='another-fight',s=>exactCast(s,'spell_magic_missile','foe','bonus'),s=>exactCast(s,'spell_unknown','foe')];
  for(const change of changes){const state=exactCast(fixture(),'spell_magic_missile');change(state);const before=structuredClone(state),result=run(state);assert.deepEqual(state,before);assert.equal(directiveResult(result).status,'refused');assert.equal(result.turn.handled,true);assert.equal(result.rollLogs.length,0);assert.deepEqual(result.state.party.members[1].inventory,before.party.members[1].inventory);assert.deepEqual(result.combat.turnBudget,before.combat.turnBudget);assert.equal(result.combat.participants.find(p=>p.id==='foe')?.hp.current,before.combat.participants.find(p=>p.id==='foe')?.hp.current);}
  const touch=exactCast(learn(fixture('cleric'),'spell_inflict_wounds'),'spell_inflict_wounds');touch.combat.distances={'npc-caster':{foe:'near'}};const result=run(touch);assert.equal(directiveResult(result).status,'refused');assert.equal(result.rollLogs.length,0);assert.equal(core.combatDistanceBand(result.combat,'npc-caster','foe'),'near');
});

test('consumed directive survives JSON reopen and a replay cannot cast again or launch replacement offense',()=>{
  const state=exactCast(fixture(),'spell_magic_missile');state.flags.other_flag='preserved';const result=run(state),reopened=JSON.parse(JSON.stringify(result.state));reopened.combat.turnBudget=undefined;reopened.combat=core.ensureTurnBudget(reopened.combat);reopened.flags.ui_companion_orders=state.flags.ui_companion_orders;
  const before=structuredClone(reopened),replay=run(reopened);assert.equal(replay.rollLogs.length,0);assert.equal(replay.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(replay.combat.participants[1].hp.current,before.combat.participants[1].hp.current);assert.deepEqual(directiveResult(replay),directiveResult(result));assert.equal(replay.state.flags.other_flag,'preserved');assert.equal(Object.keys(JSON.parse(replay.state.flags.ui_companion_order_results)).length,1);
});

test('catalog reaction actions and corrupted one-shot directive metadata refuse rather than reverting to destructive auto behavior',()=>{
  for(const patch of [{spellActionId:'combat.reaction.cast_spell.spell_hellish_rebuke.foe'},{spellActionId:'x'.repeat(401)},{directiveId:42},{extraDamage:10000}]){const state=exactCast(fixture(),'spell_magic_missile'),order=JSON.parse(state.flags.ui_companion_orders);Object.assign(order['npc-caster'],patch);state.flags.ui_companion_orders=JSON.stringify(order);const result=run(state);assert.equal(directiveResult(result).status,'refused');assert.equal(result.rollLogs.length,0);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);}
  const human=exactCast(fixture(),'spell_magic_missile');human.party.members[1].kind='player';human.combat.participants[0].kind='player';const result=run(human);assert.equal(result.turn,undefined);assert.equal(result.state.flags.ui_companion_order_results,undefined);assert.equal(result.rollLogs.length,0);
});

test('exact directive resolves Counterspell once and consumes it as interrupted without damage or replacement magic',()=>{
  const state=exactCast(fixture(),'spell_magic_missile'),foe=state.combat.participants[1];foe.resources=[{id:'spell_slots_3',current:1,max:1,refresh:'long_rest'}];foe.tactics={readiedAction:'spell_counterspell',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  const result=run(state);assert.equal(directiveResult(result).status,'refused');assert.match(directiveResult(result).message,/Counterspell/);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.participants[1].resources[0].current,0);assert.equal(result.combat.participants[1].tactics.reactionSpent,true);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.log.filter(l=>l.actorId==='foe'&&l.body.includes('Counterspell')).length,1);
});

test('turn-start interruption preserves slots; interruption after spellcasting starts consumes its real slot once',()=>{
  for(const trigger of ['hostile_turn_start','target_casts_spell']){const state=exactCast(fixture(),'spell_magic_missile'),foe=state.combat.participants[1];foe.attacks=[{id:'directive-interrupt',name:'Interrupted',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];foe.tactics={readiedAction:'directive-interrupt',readiedTriggerType:trigger,readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};let result;
    for(let n=0;n<25&&!result;n++){const candidate=run(state,`directive-interrupt-${n}`);if(candidate.state.party.members[1].hp.current===0)result=candidate;}
    assert.ok(result);assert.equal(directiveResult(result).status,'refused');assert.equal(result.rollLogs.filter(l=>l.label.startsWith('Ready directive-interrupt')).length,1);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,trigger==='hostile_turn_start'?2:1);assert.deepEqual(result.state.party.members[1].inventory,state.party.members[1].inventory);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.turnBudget.action,trigger==='hostile_turn_start');
  }
});

test('nonreviving real death-save turn cancels exact order, while natural20 can execute the selected spell on that same turn',()=>{
  for(const natural of [5,20]){const state=exactCast(dyingCompanion(fixture()),'spell_magic_missile');state.combat.participants=[state.combat.participants[0],state.combat.participants[2],state.combat.participants[1]];const before=structuredClone(state),result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>((natural-1)+0.1)/20});assert.deepEqual(state,before);assert.equal(result.rollLogs.filter(l=>l.label==='Death Saving Throw').length,1);assert.equal(directiveResult(result).status,natural===20?'resolved':'refused');assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,natural===20?1:2);assert.equal(result.state.party.members[1].inventory.find(i=>i.itemId==='healing_potion').quantity,1);assert.equal(result.combat.participants[result.combat.turnIndex].kind,'player');if(natural===20)assert.ok(result.combat.participants.find(p=>p.id==='foe').hp.current<100);else assert.equal(result.combat.participants.find(p=>p.id==='foe').hp.current,100);}
});
test('defend resolves real Dodge and its main-action cost for a noncaster without creating AC or damage',()=>{
  const state=preference(fixture('fighter'),'defend'),before=structuredClone(state),result=run(state);assert.deepEqual(state,before);assert.equal(result.turn.handled,true);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,true);assert.equal(result.combat.participants[0].tactics.dodging,true);assert.equal(result.combat.participants[0].ac,before.combat.participants[0].ac);assert.equal(result.combat.participants[1].hp.current,100);assert.ok(result.combat.log.some(l=>l.title==='Caster: dodge'));
});
test('conserve spends no ordinary leveled slot but emergency zero-HP healing spends a real slot',()=>{
  const wizard=run(preference(fixture('wizard'),'conserve'));assert.equal(wizard.state.party.members[1].spellcasting.slots['1'].current,2);assert.ok(wizard.combat.log.some(l=>l.title.includes('spell_arc_spark')));
  const state=preference(fixture('cleric'),'conserve');state.party.members[0].hp.current=0;state.party.members[0].conditions=['dying','unconscious'];state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);const emergency=run(state);assert.ok(emergency.state.party.members[0].hp.current>0);assert.equal(emergency.state.party.members[1].spellcasting.slots['1'].current,1);
});
test('support heals an ordinarily wounded chosen ally, then Dodges; full-health or blocked support never attacks',()=>{
  const state=preference(fixture('cleric'),'support','hero');state.party.members[0].hp.current-=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);const result=run(state);assert.equal(result.state.party.members[0].hp.current,state.party.members[0].hp.max);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.turnBudget.bonusAction,false);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.participants[0].tactics.dodging,true);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.log.some(l=>l.title.includes('spell_sacred_flame')),false);
  for(const blocked of [false,true]){const noHeal=preference(fixture('cleric'),'support','hero');if(blocked){noHeal.combat.participants[2].hp.current=1;noHeal.combat.participants[2].activeEffects=[{id:'blocked',healingPrevented:true}];}const defended=run(noHeal);assert.equal(defended.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(defended.combat.participants[0].tactics.dodging,true);assert.equal(defended.combat.participants[1].hp.current,100);}
});
test('focus attacks exact enemy before a weaker different foe using real spells or weapons and stale epochs revert to auto',()=>{
  for(const classId of ['wizard','fighter']){const state=preference(fixture(classId),'focus','foe');const other={...structuredClone(state.combat.participants[1]),id:'weaker',name:'Weaker',hp:{current:1,max:1,temp:0}};state.combat.participants.push(other);const result=run(state);assert.ok(result.combat.participants.find(p=>p.id==='foe').hp.current<100);assert.equal(result.combat.participants.find(p=>p.id==='weaker').hp.current,1);assert.equal(result.combat.turnBudget.action,false);}
  const stale=preference(fixture('wizard'),'focus','foe','old-fight');assert.ok(run(stale).combat.log.some(l=>l.title.includes('spell_magic_missile')));
});
test('defend/support orders retain turn-start readied interruption exactly once and cannot act after disabling damage',()=>{
  for(const mode of ['defend','support']){const state=preference(fixture('cleric'),mode,mode==='support'?'hero':undefined),foe=state.combat.participants[1];foe.attacks=[{id:'fatal-order',name:'Order interrupt',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];foe.tactics={readiedAction:'fatal-order',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};let interrupted;for(let i=0;i<20&&!interrupted;i++){const candidate=run(state,`order-interrupt-${i}`);if(candidate.state.party.members[1].hp.current===0)interrupted=candidate;}assert.ok(interrupted);assert.equal(interrupted.combat.turnBudget.action,true);assert.equal(interrupted.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(interrupted.rollLogs.filter(l=>l.label.startsWith('Ready fatal-order')).length,1);assert.equal(interrupted.combat.participants[0].tactics?.dodging,undefined);}
});
test('malformed order bridges cannot inject custom actions, slots or targets into registered companion execution',()=>{
  for(const raw of ['bad-json','[]','{"npc-caster":{"mode":"execute_script"}}','{"npc-caster":{"mode":"defend","slots":99}}']){const state=fixture();state.flags.ui_companion_orders=raw;const result=run(state);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.participants[0].tactics?.dodging,undefined);}
});
function slots(state,count){const ally=state.party.members[1];ally.spellcasting.slots['1'].current=count;ally.resources.find(r=>r.id==='spell_slots_1').current=count;state.combat.participants[0]=core.characterToCombatant(ally);}
function dyingCompanion(state,successes=0,failures=0){
  const ally=state.party.members[1];ally.hp.current=0;ally.conditions=['dying','unconscious'];ally.deathSaves={successes,failures,stable:false,dead:false};
  state.combat.participants=[core.characterToCombatant(ally),core.characterToCombatant(state.party.members[0]),state.combat.participants.find(p=>p.kind==='enemy')];state.combat.turnIndex=0;
  return state;
}
test('cleric heals a dying ally with real bonus/slot cost, then only a cantrip main action',()=>{
  const state=fixture('cleric');state.party.members[0].hp.current=0;state.party.members[0].conditions=['dying','unconscious'];state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  state.party.members[1].spellcasting.prepared=['spell_healing_word','spell_cure_wounds'];
  const before=structuredClone(state),result=run(state);
  assert.deepEqual(state,before);assert.ok(result.state.party.members[0].hp.current>0);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);
  assert.equal(result.combat.turnBudget.bonusAction,false);assert.equal(result.combat.turnBudget.action,false);assert.ok(result.rollLogs.length>=2);
  assert.ok(result.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.ok(result.combat.log.some(l=>l.title.includes('spell_sacred_flame')));
  assert.ok(!result.combat.log.some(l=>l.title.includes('spell_guiding_bolt')));
});
test('Cure Wounds uses the main action and leaves no offensive extra cast',()=>{
  const state=fixture('cleric');state.party.members[1].spellcasting.prepared=['spell_cure_wounds'];state.party.members[1].spellcasting.known=['spell_cure_wounds'];
  state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  const result=run(state);assert.ok(result.state.party.members[0].hp.current>1);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,true);
  assert.equal(result.combat.log.filter(l=>l.title.includes('Caster: spell_')).length,1);
});
test('wizard consumes a real leveled slot; depleted wizard and warlock use actual catalog cantrips',()=>{
  const wizard=fixture(),first=run(wizard);assert.equal(first.state.party.members[1].spellcasting.slots['1'].current,1);assert.ok(first.combat.log.some(l=>l.title.includes('spell_magic_missile')));assert.ok(first.combat.participants[1].hp.current<100);
  const depleted=fixture();slots(depleted,0);const cast=run(depleted);assert.equal(cast.state.party.members[1].spellcasting.slots['1'].current,0);assert.ok(cast.combat.log.some(l=>l.title.includes('spell_arc_spark')));
  const warlock=run(fixture('warlock'));assert.ok(warlock.combat.log.some(l=>l.title.includes('spell_eldritch_blast')));assert.equal(warlock.state.party.members[1].spellcasting.slots['1'].current,1);
});
test('unregistered/malformed IDs, player actors, incapacitated actors and spent budgets do not cast',()=>{
  for(const modify of [s=>s.flags.ui_companion_ai_ids='["other"]',s=>s.flags.ui_companion_ai_ids='bad-json',s=>s.combat.participants[0].kind='player',s=>s.combat.participants[0].conditions=['incapacitated'],s=>s.combat.participants[0].tactics={surprised:true},s=>s.combat.turnBudget.action=false]){
    const state=fixture();modify(state);const result=run(state);assert.equal(result.turn,undefined);assert.equal(result.rollLogs.length,0);assert.equal(result.combat.log.length,0);
  }
});
test('charm, cover, out-of-range targets and unknown area-only spell lists cannot cast; valid fallback uses real weapon or Dodge',()=>{
  for(const modify of [s=>{s.combat.participants[0].conditions=['charmed'];s.combat.participants[0].conditionInstances=[{id:'charm',condition:'charmed',sourceId:'foe'}];},s=>s.combat.cover={'npc-caster':{foe:'total'}},s=>s.combat.distances={'npc-caster':{foe:'out_of_range'}},s=>{s.party.members[1].spellcasting.known=['spell_burning_hands'];s.party.members[1].spellcasting.prepared=['spell_burning_hands'];}]){
    const state=fixture();modify(state);const result=run(state);assert.equal(result.turn.handled,true);assert.equal(result.combat.log.some(l=>l.title.startsWith('Caster: spell_')),false);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);if(state.combat.participants[0].conditions.includes('charmed')||state.combat.cover||state.combat.distances){assert.equal(result.rollLogs.length,0);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.participants[0].tactics.dodging,true);}
  }
});
test('readied Counterspell is resolved normally, spends the reaction/slot and prevents companion damage',()=>{
  const state=fixture(),foe=state.combat.participants[1];foe.resources=[{id:'spell_slots_3',current:1,max:1,refresh:'long_rest'}];
  foe.tactics={readiedAction:'spell_counterspell',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  const result=run(state);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.participants[1].resources[0].current,0);assert.equal(result.combat.turnBudget.action,false);
  assert.ok(result.combat.log.some(l=>l.body.includes('Counterspell')));assert.equal(result.turn.handled,true);
});
test('a readied attack that disables the caster stops the attempted spell and does not retry another spell',()=>{
  const state=fixture(),foe=state.combat.participants[1];
  foe.attacks=[{id:'fatal',name:'Readied strike',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];
  foe.tactics={readiedAction:'fatal',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  let interrupted;for(let index=0;index<20&&!interrupted;index++){const result=run(state,`ready-${index}`);if(result.state.party.members[1].hp.current===0)interrupted=result;}
  assert.ok(interrupted);assert.equal(interrupted.turn.handled,true);assert.equal(interrupted.combat.turnBudget.action,false);assert.equal(interrupted.combat.participants[1].hp.current,100);
  assert.equal(interrupted.combat.log.filter(l=>l.title.startsWith('Caster: spell_')).length,1);assert.equal(interrupted.state.party.members[1].spellcasting.slots['1'].current,1);
});
test('a registered ally cannot spend another participant\'s current turn',()=>{
  const state=fixture(),actor=state.combat.participants[0];state.combat.turnIndex=2;
  const rng=new core.SeededRng('wrong-turn'),hook=core.createCompanionAutomaticHook(state,rng);
  assert.equal(hook.beforeAutomaticActor({combat:state.combat,actor,rng,rules:state.campaign.rules}),undefined);
  assert.equal(hook.result(state.combat).rollLogs.length,0);
});
test('hostile-turn-start readied damage disables a caster before any main action or spell slot is spent',()=>{
  const state=fixture(),foe=state.combat.participants[1];
  foe.attacks=[{id:'turn-start',name:'Waiting strike',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];
  foe.tactics={readiedAction:'turn-start',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  let stopped;for(let index=0;index<20&&!stopped;index++){const result=run(state,`turn-start-${index}`);if(result.state.party.members[1].hp.current===0)stopped=result;}
  assert.ok(stopped);assert.equal(stopped.turn.handled,true);assert.equal(stopped.combat.turnBudget.action,true);assert.equal(stopped.state.party.members[1].spellcasting.slots['1'].current,2);
  assert.equal(stopped.combat.participants[1].tactics.reactionSpent,true);assert.equal(stopped.combat.log.filter(l=>l.title==='Foe: Ready').length,1);assert.equal(stopped.combat.log.filter(l=>l.title.startsWith('Caster: spell_')).length,0);
  assert.equal(stopped.rollLogs.filter(log=>log.label.startsWith('Ready turn-start')).length,1);
});
test('a bonus-only healing turn falls back to weapon AI without duplicating its processed readied reaction',()=>{
  const state=fixture('cleric'),foe=state.combat.participants[1];
  state.party.members[1].spellcasting.known=['spell_healing_word'];state.party.members[1].spellcasting.prepared=['spell_healing_word'];
  state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);state.combat.participants=[state.combat.participants[0],state.combat.participants[2],foe];
  foe.abilities.str=10;foe.attacks=[{id:'poke',name:'Waiting poke',ability:'str',damageDice:'1',damageType:'bludgeoning',range:'melee',proficient:false}];
  foe.tactics={readiedAction:'poke',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  let hit;for(let index=0;index<40&&!hit;index++){const result=core.runCompanionAutomaticTurns(state,state.combat,new core.SeededRng(`fallback-${index}`));if(result.state.party.members[1].hp.current<state.party.members[1].hp.current)hit=result;}
  assert.ok(hit);assert.equal(hit.state.party.members[1].hp.current,9);assert.equal(hit.combat.log.filter(l=>l.title==='Foe: Ready').length,1);assert.equal(hit.rollLogs.filter(log=>log.label.startsWith('Ready poke')).length,1);
  assert.ok(hit.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.equal(hit.combat.participants[hit.combat.turnIndex].kind,'player');
});
test('exported automatic runner applies companion casting before stopping on the next human turn',()=>{
  const state=fixture('cleric');state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  state.combat.participants=[state.combat.participants[0],state.combat.participants[2],state.combat.participants[1]];
  const result=core.runCompanionAutomaticTurns(state,state.combat,new core.SeededRng('initial'));
  assert.ok(result.state.party.members[0].hp.current>1);assert.ok(result.combat.log.some(l=>l.title.includes('spell_healing_word')));
  assert.equal(result.combat.participants[result.combat.turnIndex].kind,'player');assert.ok(result.state.rollLog.length>0);
});
test('registered NPC death saves use the real rules, advance once and never wait for a human NPC click',()=>{
  for(const [natural,successes,failures] of [[5,0,1],[12,1,0],[1,0,2]]){
    const state=dyingCompanion(fixture('fighter')),original=structuredClone(state),result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>((natural-1)+0.1)/20});
    assert.deepEqual(state,original);const saved=result.state.party.members[1];assert.equal(saved.hp.current,0);assert.equal(saved.deathSaves.successes,successes);assert.equal(saved.deathSaves.failures,failures);
    assert.equal(result.combat.participants[result.combat.turnIndex].kind,'player');assert.equal(result.rollLogs.filter(l=>l.label==='Death Saving Throw').length,1);assert.equal(result.rollLogs[0].result.natural,natural);
    assert.equal(result.combat.log.filter(l=>l.title.includes('Death Saving Throw')).length,1);assert.deepEqual(saved.inventory,original.party.members[1].inventory);assert.deepEqual(saved.resources,original.party.members[1].resources);
  }
});
test('third success stabilizes and third failure kills; saved terminal bodies cannot roll or recharge next time',()=>{
  for(const [successes,failures,natural,field] of [[2,0,12,'stable'],[0,2,5,'dead']]){
    const state=dyingCompanion(fixture(),successes,failures),result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>((natural-1)+0.1)/20});
    const saved=result.state.party.members[1];assert.equal(saved.deathSaves[field],true);assert.equal(saved.hp.current,0);assert.ok(saved.conditions.includes(field==='dead'?'dead':'unconscious'));assert.equal(result.rollLogs.length,1);
    const restored=structuredClone(result.state);restored.combat.turnIndex=restored.combat.participants.findIndex(p=>p.id===saved.id);restored.combat.turnBudget=undefined;restored.combat=core.ensureTurnBudget(restored.combat);
    const later=core.runCompanionAutomaticTurns(restored,restored.combat,{next:()=>0.99});assert.equal(later.rollLogs.length,0);assert.equal(later.state.party.members[1].hp.current,0);assert.equal(later.state.party.members[1].deathSaves[field],true);
    assert.deepEqual(later.state.party.members[1].resources,saved.resources);assert.deepEqual(later.state.party.members[1].inventory,saved.inventory);
  }
});
test('natural20 revives the same NPC at1HP and its remaining real action can consume its own finite healing potion',()=>{
  const state=dyingCompanion(fixture()),rng={next:()=>0.999},hook=core.createCompanionAutomaticHook(state,rng);
  const saved=hook.beforeAutomaticDeathSave({combat:state.combat,actor:state.combat.participants[0],rng,rules:state.campaign.rules});assert.ok(saved);assert.equal(saved.combat.participants[0].hp.current,1);assert.equal(saved.combat.turnIndex,0);assert.equal(saved.combat.turnBudget.action,true);
  const cast=hook.beforeAutomaticActor({combat:saved.combat,actor:saved.combat.participants[0],rng,rules:state.campaign.rules});assert.ok(cast);assert.equal(cast.combat.turnBudget.action,false);
  const result=hook.result(cast.combat);assert.ok(result.state.party.members[1].hp.current>1);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,2);assert.equal(result.state.party.members[1].inventory.some(i=>i.itemId==='healing_potion'),false);assert.ok(!result.state.party.members[1].conditions.includes('dying'));assert.ok(result.combat.log.some(l=>l.title==='Caster: Use Healing Potion'));
  assert.equal(result.rollLogs.filter(l=>l.label==='Death Saving Throw').length,1);assert.equal(hook.beforeAutomaticDeathSave({combat:cast.combat,actor:cast.combat.participants[0],rng,rules:state.campaign.rules}),undefined);
});
test('warrior auto and conserve use only their own finite modeled healing potion with real main action and no offensive follow-up',()=>{
  for(const mode of ['auto','conserve']){const state=preference(fixture('fighter'),mode);state.party.members[1].hp.current=1;state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);const before=structuredClone(state),result=run(state);assert.deepEqual(state,before);assert.ok(result.state.party.members[1].hp.current>1);assert.equal(result.state.party.members[1].inventory.some(i=>i.itemId==='healing_potion'),false);assert.equal(result.state.party.members[0].inventory.find(i=>i.itemId==='healing_potion').quantity,before.party.members[0].inventory.find(i=>i.itemId==='healing_potion').quantity);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,true);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.rollLogs.length,1);assert.equal(result.rollLogs[0].actorId,'npc-caster');assert.equal(result.rollLogs[0].result.expression,'2d4+2');assert.ok(result.combat.log.some(l=>l.body.includes('npc-caster')));}
});
test('unavailable, depleted, unattuned, infinite, unknown or healing-blocked consumables never consume an item or healing roll',()=>{
  const modifies=[s=>s.party.members[1].inventory=s.party.members[1].inventory.filter(i=>i.itemId!=='healing_potion'),s=>s.party.members[1].inventory.find(i=>i.itemId==='healing_potion').quantity=0,s=>s.party.members[1].inventory.find(i=>i.itemId==='healing_potion').charges={current:0,max:1},s=>{const item=s.party.members[1].inventory.find(i=>i.itemId==='healing_potion');item.requiresAttunement=true;item.attuned=false;},s=>s.combat.participants[0].activeEffects=[{id:'block',healingPrevented:true}],s=>s.combat.participants[0].conditions=['stunned'],s=>s.combat.participants[0].hp.current=0,s=>s.combat.turnBudget.action=false,s=>s.combat.turnIndex=2,s=>{s.party.members[1].inventory=[{itemId:'unknown',name:'Unknown',quantity:1,tags:[],weight:1,description:''}];},s=>{s.party.members[1].inventory=[{itemId:'infinite',name:'Infinite',quantity:1,tags:[],weight:1,description:'',mechanics:{use:{type:'healing',dice:'2d4+2',consume:false}}}];}];
  for(const modify of modifies){const state=fixture('fighter');state.party.members[1].hp.current=1;state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);modify(state);const before=structuredClone(state),result=run(state);assert.deepEqual(result.state.party.members[1].inventory,before.party.members[1].inventory);assert.equal(result.combat.log.some(l=>l.title.includes('Use ')),false);assert.equal(result.rollLogs.some(l=>l.result.expression==='2d4+2'),false);}
  const full=fixture('fighter'),result=run(full);assert.equal(result.combat.log.some(l=>l.title.includes('Use Healing Potion')),false);assert.equal(result.state.party.members[1].inventory.find(i=>i.itemId==='healing_potion').quantity,1);
});
test('finite charged healing effects spend real charges without duplicating or borrowing the item',()=>{
  const state=fixture('fighter');state.party.members[1].hp.current=1;state.party.members[1].inventory=[{itemId:'charged-healer',name:'Finite healer',quantity:1,tags:[],weight:1,description:'',charges:{current:2,max:2,costPerUse:1},mechanics:{use:{type:'healing',dice:'1d4+2',consume:false}}}];state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);const result=run(state);assert.equal(result.state.party.members[1].inventory[0].quantity,1);assert.equal(result.state.party.members[1].inventory[0].charges.current,1);assert.equal(result.combat.turnBudget.action,false);
});
test('prioritized bonus Healing Word can be followed by own potion main action without a second offensive spell',()=>{
  const state=fixture('cleric');state.party.members[1].hp.current=1;state.party.members[0].hp.current=0;state.party.members[0].conditions=['dying','unconscious'];state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);const result=run(state);assert.ok(result.state.party.members[0].hp.current>0);assert.ok(result.state.party.members[1].hp.current>1);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.equal(result.combat.turnBudget.bonusAction,false);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.state.party.members[1].inventory.some(i=>i.itemId==='healing_potion'),false);assert.ok(result.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.ok(result.combat.log.some(l=>l.title.includes('Use Healing Potion')));assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.log.some(l=>l.title.includes('spell_sacred_flame')),false);
});
test('item fallback resolves a disabling turn-start readied attack once before consuming potion or main action',()=>{
  const state=fixture('fighter');state.party.members[1].hp.current=1;state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);const foe=state.combat.participants[1];foe.attacks=[{id:'item-interrupt',name:'Item interrupt',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];foe.tactics={readiedAction:'item-interrupt',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};let disabled;
  for(let n=0;n<20&&!disabled;n++){const candidate=run(state,`item-interrupt-${n}`);if(candidate.state.party.members[1].hp.current===0)disabled=candidate;}assert.ok(disabled);assert.equal(disabled.combat.turnBudget.action,true);assert.equal(disabled.state.party.members[1].inventory.find(i=>i.itemId==='healing_potion').quantity,1);assert.equal(disabled.rollLogs.filter(l=>l.label.startsWith('Ready item-interrupt')).length,1);assert.equal(disabled.combat.log.some(l=>l.title.includes('Use Healing Potion')),false);
});
test('explicit support, defend and focus preserve their contracts instead of self-consuming healing gear',()=>{
  for(const mode of ['support','defend','focus']){const state=preference(fixture('cleric'),mode,mode==='support'?'hero':mode==='focus'?'foe':undefined);state.party.members[1].hp.current=1;state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);const result=run(state);assert.equal(result.state.party.members[1].inventory.find(i=>i.itemId==='healing_potion').quantity,1);assert.equal(result.combat.log.some(l=>l.title.includes('Use Healing Potion')),false);}
});
test('default registered bow AI spends one real arrow per actual main attack and depleted arrows cause Dodge or legal melee movement',()=>{
  const bow=fixture('fighter');bow.party.members[1].equipment.offHand=undefined;bow.party.members[1].inventory.find(i=>i.itemId==='arrow').quantity=2;bow.party.members[1].attacks=bow.party.members[1].attacks.filter(a=>a.id==='shortbow');bow.combat.participants[0]=core.characterToCombatant(bow.party.members[1]);bow.combat.distances={'npc-caster':{foe:'near'}};const original=structuredClone(bow),first=run(bow);assert.deepEqual(bow,original);assert.equal(first.state.party.members[1].inventory.find(i=>i.itemId==='arrow').quantity,1);assert.equal(first.combat.turnBudget.action,false);assert.ok(first.combat.log.some(l=>l.body.includes('Ammunition spent: arrow')));
  const next=structuredClone(first.state);next.combat.turnBudget=undefined;next.combat=core.ensureTurnBudget(next.combat);const last=run(next);assert.equal(last.state.party.members[1].inventory.some(i=>i.itemId==='arrow'),false);
  const depleted=structuredClone(last.state);depleted.combat.turnBudget=undefined;depleted.combat=core.ensureTurnBudget(depleted.combat);const defended=run(depleted);assert.equal(defended.combat.participants[0].tactics.dodging,true);assert.equal(defended.rollLogs.length,0);assert.equal(defended.combat.participants[1].hp.current,depleted.combat.participants[1].hp.current);
  const melee=fixture('fighter');melee.party.members[1].inventory=melee.party.members[1].inventory.filter(i=>i.itemId!=='arrow');melee.combat.distances={'npc-caster':{foe:'near'}};const closed=run(melee);assert.equal(core.combatDistanceBand(closed.combat,'npc-caster','foe'),'engaged');assert.ok(closed.combat.turnBudget.movementFeet<30);assert.ok(closed.combat.log.some(l=>l.title==='Caster: attack'));assert.equal(closed.state.party.members[1].inventory.some(i=>i.itemId==='arrow'),false);
});
test('unequipped or missing catalog weapons never become ghost attacks even if stale attack definitions remain',()=>{
  const state=fixture('fighter');state.party.members[1].equipment={armor:state.party.members[1].equipment.armor};state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);const result=run(state);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.participants[0].tactics.dodging,true);assert.equal(result.rollLogs.length,0);
  const missing=fixture('fighter');missing.party.members[1].inventory=missing.party.members[1].inventory.filter(i=>!['longsword','shortbow'].includes(i.itemId));missing.combat.participants[0]=core.characterToCombatant(missing.party.members[1]);const defended=run(missing);assert.equal(defended.combat.participants[1].hp.current,100);assert.equal(defended.combat.participants[0].tactics.dodging,true);
});
test('a consumed own potion remains absent after actual companion cache synchronization and JSON reopen',async()=>{
  const state=fixture('fighter');state.party.members[1].hp.current=1;state.combat.participants[0]=core.characterToCombatant(state.party.members[1]);const result=run(state),adventure={currentLocationId:'town',npcs:[{id:'npc-caster',name:'Caster',locationId:'town',disposition:'neutral'}],companions:{records:[{npcId:'npc-caster',state:'joined',joined:true,initialized:true,character:structuredClone(state.party.members[1]),receivedItemIds:[],lastReceivedCoins:0}]}};
  const synchronized=await require('../src/adventure-companions').sync({state:result.state,adventure});assert.equal(synchronized.adventure.companions.records[0].character.inventory.some(i=>i.itemId==='healing_potion'),false);const reopened=JSON.parse(JSON.stringify(synchronized)),again=await require('../src/adventure-companions').sync(reopened);assert.equal(again.state.party.members[1].inventory.some(i=>i.itemId==='healing_potion'),false);
});
test('human/player and unregistered dying actors still await their own death save with no automatic dice',()=>{
  for(const modify of [state=>state.flags.ui_companion_ai_ids='["other"]',state=>{state.party.members[1].kind='player';state.combat.participants[0].kind='player';}]){
    const state=dyingCompanion(fixture());modify(state);const result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>{throw new Error('No NPC dice are authorized');}});
    assert.equal(result.combat.turnIndex,0);assert.equal(result.rollLogs.length,0);assert.equal(result.state.party.members[1].hp.current,0);assert.equal(result.state.party.members[1].deathSaves.failures,0);
  }
});
test('real generated battle startup and subsequent end turns execute registered ally spellcasting',async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-companion-ai-'));service=await core.RpgGameService.create(directory);
  let state=await service.startCampaign({heroName:'Hero',heroClass:'fighter'});const hero=state.party.members.find(p=>p.id===state.party.heroId);
  hero.abilities.dex=1;hero.hp.current=1;
  const ally=core.createSrdLevelOneCharacter({id:'npc-healer',name:'Healer',classId:'cleric',raceId:'human'});ally.kind='ally';ally.abilities.dex=50;
  state.party.members.push(ally);state.flags.ui_companion_ai_ids=JSON.stringify([ally.id]);state.flags.ui_player_turn_control=true;
  await service.store.saveGameState(state,{snapshot:false});
  const started=await service.startGeneratedEncounter(state.campaign.id,[{name:'Sentinel',role:'brute',tier:3}], 'initial-companion');
  state=started.state;assert.ok(state.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.ok(state.party.members.find(p=>p.id===hero.id).hp.current>1);
  const caster=state.combat.participants.find(p=>p.id===ally.id),member=state.party.members.find(p=>p.id===ally.id);
  member.spellcasting.slots['1'].current=0;member.resources.find(r=>r.id==='spell_slots_1').current=0;caster.resources.find(r=>r.id==='spell_slots_1').current=0;
  state.combat.turnIndex=state.combat.participants.findIndex(p=>p.kind==='player');state.combat.turnBudget=undefined;state.combat=core.ensureTurnBudget(state.combat);
  await service.store.saveGameState(state,{snapshot:false});const before=state.combat.log.length;
  const acted=await service.chooseAction(state.campaign.id,'combat.end_turn','next-companion');
  assert.ok(acted.state.combat);assert.ok(acted.state.combat.log.slice(before).some(l=>l.actorId===ally.id&&l.title.includes('spell_sacred_flame')));
  assert.equal(acted.state.party.members.find(p=>p.id===ally.id).spellcasting.slots['1'].current,0);
  const injured=acted.state,npc=injured.party.members.find(p=>p.id===ally.id);npc.hp.current=0;npc.conditions=['dying','unconscious'];npc.deathSaves={successes:0,failures:0,stable:false,dead:false};
  const player=injured.combat.participants.find(p=>p.kind==='player'),enemy=injured.combat.participants.find(p=>p.kind==='enemy');injured.combat.participants=[player,core.characterToCombatant(npc),enemy];injured.combat.turnIndex=0;injured.combat.turnBudget=undefined;injured.combat=core.ensureTurnBudget(injured.combat);
  await service.store.saveGameState(injured,{snapshot:false});const rolls=injured.rollLog.length;
  const saving=await service.chooseAction(injured.campaign.id,'combat.end_turn','npc-deathsave');
  assert.equal(saving.state.rollLog.slice(rolls).filter(log=>log.actorId===ally.id&&log.label==='Death Saving Throw').length,1);
  const reopened=service.loadCampaign(injured.campaign.id).party.members.find(p=>p.id===ally.id);assert.deepEqual(reopened.deathSaves,saving.state.party.members.find(p=>p.id===ally.id).deathSaves);assert.equal(reopened.spellcasting.slots['1'].current,0);
});
test('a dying registered NPC at actual generated-battle startup rolls once and saves its real body before the human turn',async()=>{
  let state=await service.startCampaign({heroName:'Second hero',heroClass:'fighter'});state.party.members[0].abilities.dex=1;
  const ally=core.createSrdLevelOneCharacter({id:'npc-dying',name:'Dying caster',classId:'wizard',raceId:'human'});ally.kind='ally';ally.abilities.dex=50;ally.hp.current=0;ally.conditions=['dying','unconscious'];ally.deathSaves={successes:0,failures:0,stable:false,dead:false};
  ally.spellcasting.slots['1'].current=0;ally.resources.find(r=>r.id==='spell_slots_1').current=0;
  state.party.members.push(ally);state.flags.ui_companion_ai_ids=JSON.stringify([ally.id]);state.flags.ui_player_turn_control=true;await service.store.saveGameState(state,{snapshot:false});
  const started=await service.startGeneratedEncounter(state.campaign.id,[{name:'Another sentinel',role:'brute',tier:3}],'initial-npc-save');
  assert.equal(started.state.rollLog.filter(l=>l.actorId===ally.id&&l.label==='Death Saving Throw').length,1);
  const saved=started.state.party.members.find(p=>p.id===ally.id),reopened=service.loadCampaign(state.campaign.id).party.members.find(p=>p.id===ally.id);
  assert.deepEqual(reopened.hp,saved.hp);assert.deepEqual(reopened.deathSaves,saved.deathSaves);assert.equal(reopened.spellcasting.slots['1'].current,0);
});

test('actual service end-turn persists exact order consumption and replay protection without overwriting unrelated campaign flags',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-exact-order-service-')),local=await core.RpgGameService.create(dataDir);
  try{
    let state=await local.startCampaign({heroName:'Order hero',heroClass:'fighter'});const hero=state.party.members[0];hero.abilities.dex=50;hero.hp={current:100,max:100,temp:0};
    const ally=core.createSrdLevelOneCharacter({id:'npc-caster',name:'Ordered caster',classId:'wizard',raceId:'human'});ally.kind='ally';ally.abilities.dex=1;ally.hp={current:100,max:100,temp:0};state.party.members.push(ally);
    Object.assign(state.flags,{ui_companion_ai_ids:JSON.stringify([ally.id]),ui_player_turn_control:true,ui_adventure:'campaign-metadata-preserved',custom_script_flag:'script-preserved',ui_bound_npc_combat_snapshot:'previous-terminal-snapshot'});
    await local.store.saveGameState(state,{snapshot:false});state=(await local.startGeneratedEncounter(state.campaign.id,[{name:'Order sentinel',role:'brute',tier:3}],'order-service-start')).state;
    assert.equal(state.combat.participants[state.combat.turnIndex].id,hero.id);const enemy=state.combat.participants.find(p=>p.kind==='enemy');exactCast(state,'spell_magic_missile',enemy.id,'action','persisted-directive');const queued=state.flags.ui_companion_orders;
    await local.store.saveGameState(state,{snapshot:false});const acted=await local.chooseAction(state.campaign.id,'combat.end_turn','ordered-service-turn');state=acted.state;let result=JSON.parse(state.flags.ui_companion_order_results)[ally.id];
    assert.equal(result.directiveId,'persisted-directive');assert.equal(result.status,'resolved');assert.equal(state.party.members.find(m=>m.id===ally.id).spellcasting.slots['1'].current,1);assert.deepEqual(JSON.parse(state.flags.ui_companion_orders)[ally.id],{mode:'auto'});
    for(const [key,value] of Object.entries({ui_adventure:'campaign-metadata-preserved',custom_script_flag:'script-preserved',ui_bound_npc_combat_snapshot:'previous-terminal-snapshot'}))assert.equal(state.flags[key],value);
    const reopened=local.loadCampaign(state.campaign.id);assert.deepEqual(JSON.parse(reopened.flags.ui_companion_order_results)[ally.id],result);assert.deepEqual(JSON.parse(reopened.flags.ui_companion_orders)[ally.id],{mode:'auto'});
    reopened.flags.ui_companion_orders=queued;const oldEnemyHp=reopened.combat.participants.find(p=>p.id===enemy.id).hp.current;await local.store.saveGameState(reopened,{snapshot:false});const replay=await local.chooseAction(state.campaign.id,'combat.end_turn','replayed-service-turn');assert.equal(replay.state.party.members.find(m=>m.id===ally.id).spellcasting.slots['1'].current,1);assert.equal(replay.state.combat.participants.find(p=>p.id===enemy.id).hp.current,oldEnemyHp);assert.deepEqual(JSON.parse(replay.state.flags.ui_companion_orders)[ally.id],{mode:'auto'});assert.deepEqual(JSON.parse(replay.state.flags.ui_companion_order_results)[ally.id],result);
  }finally{local.store.close();await fs.rm(dataDir,{recursive:true,force:true});}
});

test('actual generated encounter opening persists a stale exact directive refusal and preserves adventure/day/custom flags',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-opening-order-service-')),local=await core.RpgGameService.create(dataDir);
  try{
    const state=await local.startCampaign({heroName:'Opening hero',heroClass:'fighter'});state.party.members[0].abilities.dex=1;state.party.members[0].hp={current:100,max:100,temp:0};const ally=core.createSrdLevelOneCharacter({id:'npc-caster',name:'Opening caster',classId:'wizard',raceId:'human'});ally.kind='ally';ally.abilities.dex=50;ally.hp={current:100,max:100,temp:0};state.party.members.push(ally);
    Object.assign(state.flags,{ui_companion_ai_ids:JSON.stringify([ally.id]),ui_companion_orders:JSON.stringify({[ally.id]:{mode:'cast',spellActionId:'combat.action.cast_spell.spell_magic_missile.enemy_generated_1',directiveId:'stale-opening',combatId:'previous-combat'} }),ui_adventure:'opening-metadata',custom_script_flag:'opening-script',ui_player_turn_control:true});await local.store.saveGameState(state,{snapshot:false});const started=await local.startGeneratedEncounter(state.campaign.id,[{name:'Opening sentinel',role:'brute',tier:3}],'opening-order');
    const result=JSON.parse(started.state.flags.ui_companion_order_results)[ally.id];assert.equal(result.status,'refused');assert.equal(result.directiveId,'stale-opening');assert.equal(started.state.party.members.find(m=>m.id===ally.id).spellcasting.slots['1'].current,2);assert.deepEqual(JSON.parse(started.state.flags.ui_companion_orders)[ally.id],{mode:'auto'});assert.equal(started.state.flags.ui_adventure,'opening-metadata');assert.equal(started.state.flags.custom_script_flag,'opening-script');assert.equal(started.state.flags.ui_companion_ai_ids,state.flags.ui_companion_ai_ids);assert.deepEqual(JSON.parse(local.loadCampaign(state.campaign.id).flags.ui_companion_order_results)[ally.id],result);
  }finally{local.store.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
test('actual service end-turn persists authored NPC cost, target, result and original runtime flags across reload',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-authored-order-service-')),local=await core.RpgGameService.create(dataDir);
  try{
    let state=await local.startCampaign({heroName:'Authored hero',heroClass:'fighter'});state.party.members[0].abilities.dex=50;state.party.members[0].hp={current:100,max:100,temp:0};const ally=core.createSrdLevelOneCharacter({id:'npc-caster',name:'Author caster',classId:'wizard',raceId:'human'});ally.kind='ally';ally.abilities.dex=1;ally.hp={current:100,max:100,temp:0};state.party.members.push(ally);Object.assign(state.flags,{ui_companion_ai_ids:JSON.stringify([ally.id]),ui_player_turn_control:true,ui_adventure:'authored-meta',custom_script_flag:'authored-script'});await local.store.saveGameState(state,{snapshot:false});state=(await local.startGeneratedEncounter(state.campaign.id,[{name:'Author sentinel',role:'brute',tier:3}],'authored-service-start')).state;
    const enemy=state.combat.participants.find(p=>p.kind==='enemy'),oldHp=enemy.hp.current;authoredOrder(state,authoredDamage,enemy.id);const pendingRegistry=state.flags.ui_companion_original_spells;await local.store.saveGameState(state,{snapshot:false});const acted=await local.chooseAction(state.campaign.id,'combat.end_turn','authored-service-end');state=acted.state;const result=directiveResult({state});assert.equal(result.status,'resolved');assert.match(result.spellActionId,/\.cast_created_spell\./);assert.equal(state.party.members.find(p=>p.id===ally.id).spellcasting.slots['1'].current,1);assert.equal(state.flags.generated_leveled_spell_turn,undefined);assert.equal(state.flags.ui_companion_original_spells,pendingRegistry);assert.equal(state.flags.ui_adventure,'authored-meta');assert.equal(state.flags.custom_script_flag,'authored-script');assert.ok(state.combat.participants.find(p=>p.id===enemy.id).hp.current<=oldHp);assert.ok(state.rollLog.some(log=>log.label.startsWith('Own Pulse')));
    const saved=local.loadCampaign(state.campaign.id);assert.equal(saved.flags.generated_leveled_spell_turn,state.flags.generated_leveled_spell_turn);assert.deepEqual(JSON.parse(saved.flags.ui_companion_order_results)[ally.id],result);assert.equal(saved.party.members.find(p=>p.id===ally.id).spellcasting.slots['1'].current,1);
  }finally{local.store.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
test('real service automatic turns choose owned originals without an order and persist the finite book/body/resources',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-autonomous-original-service-')),local=await core.RpgGameService.create(dataDir);
  try{
    let state=await local.startCampaign({heroName:'Autonomy hero',heroClass:'fighter'});state.party.members[0].abilities.dex=50;state.party.members[0].hp={current:100,max:100,temp:0};const ally=core.createSrdLevelOneCharacter({id:'npc-caster',name:'Autonomous author',classId:'wizard',raceId:'human'});ally.kind='ally';ally.abilities.dex=1;ally.hp={current:100,max:100,temp:0};state.party.members.push(ally);autonomousBook(state,strongOriginal);Object.assign(state.flags,{ui_companion_ai_ids:JSON.stringify([ally.id]),ui_player_turn_control:true,ui_adventure:'autonomous-meta'});const registry=state.flags.ui_companion_original_books;await local.store.saveGameState(state,{snapshot:false});state=(await local.startGeneratedEncounter(state.campaign.id,[{name:'Autonomous sentinel',role:'brute',tier:3}],'autonomous-service-start')).state;assert.equal(state.combat.participants[state.combat.turnIndex].id,state.party.heroId);
    const acted=await local.chooseAction(state.campaign.id,'combat.end_turn','autonomous-service-end');state=acted.state;assert.ok(state.combat.log.some(log=>log.actorId===ally.id&&log.title.includes('Own Storm')));assert.equal(state.party.members.find(member=>member.id===ally.id).spellcasting.slots['1'].current,1);assert.equal(state.flags.ui_companion_original_books,registry);assert.equal(state.flags.ui_companion_order_results,undefined);assert.equal(state.flags.ui_adventure,'autonomous-meta');assert.ok(state.rollLog.some(log=>log.label.startsWith('Own Storm')));const reopened=local.loadCampaign(state.campaign.id);assert.equal(reopened.flags.ui_companion_original_books,registry);assert.equal(reopened.party.members.find(member=>member.id===ally.id).spellcasting.slots['1'].current,1);
  }finally{local.store.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
