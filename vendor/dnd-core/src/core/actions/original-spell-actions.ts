import spec from '../homebrew/original-spell-spec.cjs';
import type { Character, Combatant, CombatState, GameState, RollLogEntry } from '../types.js';
import { rollExpression, type Rng } from '../dice.js';
import { abilityModifier, consumeSavingThrowActiveEffects, rollSavingThrow } from '../rules/checks.js';
import { applyDamage, applyHealing, combatCover, combatDistanceBand, combatantStatusFlags, currentCombatant, ensureTurnBudget, resolveReadiedReactionsWithRollLogs, syncCombatantToCharacter } from '../rules/combat.js';
import { isActionIncapacitated, isCharmedBySource, removeCondition } from '../rules/conditions.js';
import { applyConditionEffectToTargets, applyEffectToTargets, cleanRemovedEffectConditions, consumeSpellCastEffects, removeConcentrationEffectsForSource, resolveConcentrationAfterDamage } from '../rules/effects.js';
import { spendAction, spendBonusAction } from '../rulesets/srd5e2014/action-economy.js';
import { syncPartyFromCombat } from '../narrative/consequence-engine.js';

type CastOptions={casterId?:string;targetId?:string;rng?:Rng};
function checkedDefinition(input:any){
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.id!=='string'||!/^spell-created-[A-Za-z0-9_-]{1,145}$/.test(input.id)||input.sourceEventId!==undefined&&(typeof input.sourceEventId!=='string'||input.sourceEventId.length>160))return {ok:false as const,message:'An original spell needs a valid stable created-spell ID.'};
  const checked=spec.validateSpell(Object.fromEntries(Object.entries(input).filter(([key])=>!['id','sourceEventId'].includes(key))));
  return checked.ok?{ok:true as const,spell:{...checked.spell,id:input.id,...(input.sourceEventId!==undefined?{sourceEventId:input.sourceEventId}:{})}}:{ok:false as const,message:checked.errors.join(' ')};
}
const dead=(target:any)=>target.conditions?.includes('dead')||target.deathSaves?.dead;
const absent=(target:any)=>target.conditions?.some((c:string)=>['fled','captured'].includes(c));

/** Validation and eligibility only: no dice, costs, input mutations or new definitions. */
export function preflightOriginalSpell(state:GameState,input:any,{casterId=state.party.heroId,targetId}:CastOptions={}){
  const checked=checkedDefinition(input);if(!checked.ok)return checked;
  const spell=checked.spell,member=state.party.members.find(m=>m.id===casterId);
  if(!member?.spellcasting)return {ok:false as const,message:'This character has no spellcasting resource.'};
  const combat=state.combat?ensureTurnBudget(state.combat):undefined;
  const actor=combat?combat.participants.find(p=>(p.sourceCharacterId||p.id)===member.id):member;
  if(!actor||actor.hp.current<=0||dead(actor)||absent(actor)||isActionIncapacitated(actor)||combat&&combatantStatusFlags(actor).cannotAct)return {ok:false as const,message:'Caster cannot act.'};
  if(combat&&currentCombatant(combat).id!==actor.id)return {ok:false as const,message:'Not this caster’s turn.'};
  if(combat){
    const spent=spell.cost==='bonus_action'?spendBonusAction(combat.turnBudget!,'cast_spell'):spendAction(combat.turnBudget!,'cast_spell');
    if(!spent.ok)return {ok:false as const,message:spent.message};
    if(spell.level>0&&[`${combat.id}:${combat.round}:${actor.id}`,`${combat.round}:${actor.id}`].includes(state.flags.generated_leveled_spell_turn as string))return {ok:false as const,message:'A leveled generated spell was already cast this turn.'};
  }
  const caster=combat?syncCombatantToCharacter(member,actor):member;
  const slots=caster.spellcasting.slots;
  if(Object.values(slots).some((s:any)=>!Number.isInteger(s.current)||s.current<0||!Number.isInteger(s.max)||s.max<0||s.current>s.max))return {ok:false as const,message:'Spell slot resources are invalid.'};
  const slotLevel=spell.level===0?0:Object.keys(slots).map(Number).filter(level=>Number.isInteger(level)&&level>=spell.level&&level<=9&&slots[String(level)].current>0).sort((a,b)=>a-b)[0];
  if(slotLevel===undefined)return {ok:false as const,message:'No spell slot at this spell level or higher.'};
  const targetKey=spell.target==='self'?actor.id:targetId;
  const collection=combat?combat.participants:state.party.members;
  const target=collection.find(p=>p.id===targetKey||(p as Combatant).sourceCharacterId===targetKey);
  if(!target)return {ok:false as const,message:'Choose an existing target.'};
  if(dead(target)||absent(target))return {ok:false as const,message:'The target is dead, captured or absent; this spell cannot affect it.'};
  const harmful=spell.effects.some((e:any)=>['damage','condition'].includes(e.type));
  if(harmful&&isCharmedBySource(actor,target.id))return {ok:false as const,message:'The caster cannot harm the source of their charm.'};
  if(target.id!==actor.id&&combat){
    const minimumFeet={engaged:5,near:15,far:60,out_of_range:Infinity}[combatDistanceBand(combat,actor.id,target.id)]??Infinity;
    if(minimumFeet>spell.rangeFeet)return {ok:false as const,message:'Target is beyond the spell range.'};
    if(combatCover(combat,actor.id,target.id)==='total')return {ok:false as const,message:'The target is behind total cover.'};
  }
  const dc=8+caster.proficiencyBonus+abilityModifier(caster.abilities[caster.spellcasting.ability]);
  if(!Number.isFinite(dc))return {ok:false as const,message:'Caster spellcasting ability is invalid.'};
  return {ok:true as const,spell,casterId:member.id,actorId:actor.id,targetId:target.id,slotLevel,dc};
}

/** The same synchronous interpreter serves human and NPC casters. Caller owns persistence/turn advancement. */
export function castOriginalSpell(original:GameState,input:any,options:CastOptions&{rng:Rng}){
  const checked=preflightOriginalSpell(original,input,options);
  if(!checked.ok)throw Object.assign(new Error(checked.message),{status:400});
  if(!options.rng||typeof options.rng.next!=='function')throw Object.assign(new Error('An original spell cast needs an engine RNG.'),{status:400});
  const {spell,actorId,targetId,slotLevel,dc}=checked,rng=options.rng;
  let state=structuredClone(original),combat=state.combat?ensureTurnBudget(state.combat):undefined;
  let arena=(combat||{participants:state.party.members}) as CombatState;
  const events:any[]=[],rollLogs:RollLogEntry[]=[],ts=new Date().toISOString();
  const log=(ownerId:string,label:string,roll:any)=>{if(roll)rollLogs.push({id:`original-${spell.id}-${actorId}-${combat?.round||0}-${(state.rollLog||[]).length+rollLogs.length}`,ts,actorId:ownerId,label,result:roll});};
  const replace=(updated:any)=>{arena={...arena,participants:arena.participants.map(p=>p.id===updated.id?updated:p)};};
  if(combat){const spent=spell.cost==='bonus_action'?spendBonusAction(combat.turnBudget!,'cast_spell'):spendAction(combat.turnBudget!,'cast_spell');arena={...arena,turnBudget:spent.budget};}
  let actor=arena.participants.find(p=>p.id===actorId)!;
  let member=state.party.members.find(m=>m.id===checked.casterId)!;
  if(combat)member=syncCombatantToCharacter(member,actor);
  if(slotLevel>0){
    member={...member,spellcasting:{...member.spellcasting!,slots:{...member.spellcasting!.slots,[String(slotLevel)]:{...member.spellcasting!.slots[String(slotLevel)],current:member.spellcasting!.slots[String(slotLevel)].current-1}}}};
    const current=member.spellcasting!.slots[String(slotLevel)].current;
    member={...member,resources:member.resources.map(r=>r.id===`spell_slots_${slotLevel}`?{...r,current}:r)};
    actor={...actor,resources:actor.resources.map(r=>r.id===`spell_slots_${slotLevel}`?{...r,current}:r)};
    replace(actor);
    if(combat)state.flags.generated_leveled_spell_turn=`${combat.id}:${combat.round}:${actorId}`;
  }
  state.party.members=state.party.members.map(m=>m.id===member.id?member:m);
  const finish=(message:string,save:any=null,interrupted=false)=>{
    if(combat){state={...state,combat:arena,rollLog:[...(state.rollLog||[]),...rollLogs]};state=syncPartyFromCombat(state);}
    else state={...state,party:{...state.party,members:arena.participants as unknown as Character[]},rollLog:[...(state.rollLog||[]),...rollLogs]};
    return {state,spell,events,save,slotLevel,rollLogs,message,...(interrupted?{interrupted:true}:{})};
  };
  // In exploration the arena contains the actual Character, including its newly spent slot.
  if(!combat){replace(member);actor=arena.participants.find(p=>p.id===actorId)!;}
  if(combat){
    const ready=resolveReadiedReactionsWithRollLogs(arena,actorId,rng,state.campaign.rules,'target_casts_spell',spell.id,{originalSpell:spell});
    arena=ready.combat;rollLogs.push(...ready.rollLogs);actor=arena.participants.find(p=>p.id===actorId)!;
    if(ready.interruptedAction||!actor||actor.hp.current<=0||dead(actor)||isActionIncapacitated(actor))return finish(`${spell.name} is interrupted by a readied reaction.`,null,true);
  }
  const consumed=consumeSpellCastEffects(actor);replace(consumed.actor);
  if(spell.concentration)arena=removeConcentrationEffectsForSource(arena,actorId).combat;
  const target=arena.participants.find(p=>p.id===targetId)!;
  const save=spell.saveAbility?rollSavingThrow(target as unknown as Character,{ability:spell.saveAbility,dc,magical:true,rng,rules:state.campaign.rules}):null;
  if(save){replace(consumeSavingThrowActiveEffects(target,save));log(target.id,`${spell.name}: ${spell.saveAbility} saving throw`,save.roll);for(const bonus of save.bonusRolls||[])log(target.id,`${spell.name}: ${bonus.label}`,bonus.roll);}
  const effectBase={id:`${spell.id}:${actorId}`,label:spell.name,sourceId:actorId,spellId:spell.id,remainingSourceTurnEnds:Math.max(1,spell.durationTurns),expiresAtRestEnd:true};
  for(let index=0;index<spell.effects.length;index++){
    const effect=spell.effects[index];let current=arena.participants.find(p=>p.id===targetId)!,updated=current;
    const roll=effect.dice&&['damage','healing','temporary_hp'].includes(effect.type)?rollExpression(effect.dice,{rng}):null;
    if(roll)log(actorId,`${spell.name}: ${effect.type}`,roll);
    if(effect.type==='damage'){
      const amount=save?.success?(effect.halfOnSave?Math.floor(roll!.total/2):0):roll!.total;
      updated=applyDamage(current,amount,effect.damageType,{rng});const actualDamage=current.hp.current+current.hp.temp-updated.hp.current-updated.hp.temp;
      events.push({type:'damage',targetId,amount:actualDamage,rolledAmount:amount,roll,save});replace(updated);
      const concentration=resolveConcentrationAfterDamage(arena,targetId,actualDamage,rng);arena=concentration.combat;
      if(concentration.check){events.push({type:'concentration',targetId,check:concentration.check});log(targetId,`${spell.name}: concentration`,concentration.check.roll);for(const bonus of concentration.check.bonusRolls||[])log(targetId,`${spell.name}: concentration ${bonus.label}`,bonus.roll);}
      continue;
    }
    if(effect.type==='healing'){updated=applyHealing(current,roll!.total);events.push({type:'healing',targetId,amount:updated.hp.current-current.hp.current,roll});replace(updated);continue;}
    if(effect.type==='temporary_hp'){updated={...current,hp:{...current.hp,temp:Math.max(current.hp.temp,roll!.total)}};events.push({type:effect.type,amount:updated.hp.temp-current.hp.temp,targetId,roll});replace(updated);continue;}
    if(effect.type==='remove_condition'){replace(removeCondition(current,effect.condition));events.push({type:effect.type,condition:effect.condition,targetId});continue;}
    if(effect.type==='condition'&&save?.success){events.push({type:'save',targetId,save});continue;}
    const active:any={...effectBase,id:`${effectBase.id}:${index}`,...(spell.concentration?{concentrationSourceId:actorId}:{})};
    if(effect.type==='armor')active.armorClassBonus=effect.amount;
    if(effect.type==='speed')active.movementFeetBonus=effect.feet;
    if(effect.type==='skill_bonus')active.abilityCheckSkillBonuses={[effect.skill]:effect.dice};
    if(effect.type==='resistance')active.damageResistances=[effect.damageType];
    if(effect.type==='condition'){active.appliedCondition=effect.condition;if(effect.repeatSave)active.repeatSavingThrow={ability:spell.saveAbility,dc,timing:'target_turn_end',removeOnSuccess:true};}
    if(effect.type==='utility')Object.assign(active,{light:{brightLightRadiusFeet:20,dimLightRadiusFeet:20},water_breathing:{canBreatheUnderwater:true},water_walk:{canWalkOnLiquid:true},see_invisible:{canSeeInvisible:true},spider_climb:{canSpiderClimb:true}}[effect.feature]);
    const removed=(current.activeEffects||[]).filter(e=>e.id===active.id);replace(cleanRemovedEffectConditions({...current,activeEffects:(current.activeEffects||[]).filter(e=>e.id!==active.id)},removed));
    arena=effect.type==='condition'?applyConditionEffectToTargets(arena,[targetId],effect.condition,()=>active):applyEffectToTargets(arena,[targetId],()=>active);
    const applied=arena.participants.find(p=>p.id===targetId)!.activeEffects?.some(e=>e.id===active.id);
    events.push(applied?{type:effect.type,targetId,durationTurns:spell.durationTurns}:{type:'immune',targetId,condition:effect.condition});
  }
  return finish(`${member.name} casts ${spell.name} on ${target.name}.`,save);
}
