import type { Character, CombatState, Combatant, GameState, RollLogEntry, RulesConfig } from '../types.js';
import type { Rng } from '../dice.js';
import { availableAutomatedSrdSpells, automatedSrdSpellLevel, type AutomatedSrdSpellId } from '../rulesets/srd5e2014/spell-engine.js';
import { getAutomatedSrdSpellAction, resolveAutomatedSrdCombatSpellTurnAction } from '../actions/automated-spell-actions.js';
import { resolveDeathSaveTurnAction } from '../actions/death-save-actions.js';
import { combatCover, combatDistanceBand, combatantStatusFlags, needsDeathSave, resolveReadiedReactionsWithRollLogs, runAutomaticTurns, syncCombatantToCharacter } from '../rules/combat.js';
import { isCharmedBySource } from '../rules/conditions.js';
import { syncPartyFromCombat } from './consequence-engine.js';

const healing: AutomatedSrdSpellId[] = ['spell_healing_word', 'spell_cure_wounds'];
const damage = new Set(['spell_magic_missile', 'spell_sacred_flame', 'spell_toll_the_dead', 'spell_poison_spray', 'spell_vicious_mockery', 'spell_dissonant_whispers']);
const melee = new Set(['spell_shocking_grasp', 'spell_inflict_wounds', 'spell_vampiric_touch']);
function enabledIds(state: GameState): Set<string> {
  const raw=state.flags.ui_companion_ai_ids;
  if(typeof raw!=='string'||raw.length>2000)return new Set();
  try{const ids=JSON.parse(raw);return Array.isArray(ids)&&ids.length<=12&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=160)?new Set(ids):new Set();}catch{return new Set();}
}
function slotAvailable(caster: Character, spellId: AutomatedSrdSpellId): boolean {
  const level=Number(automatedSrdSpellLevel(spellId));
  return level===0||Object.entries(caster.spellcasting?.slots||{}).some(([slot,value])=>Number(slot)>=level&&value.current>0);
}
function reaches(combat: CombatState, actorId: string, targetId: string, spellId: AutomatedSrdSpellId): boolean {
  if(combatCover(combat,actorId,targetId)==='total')return false;
  const band=combatDistanceBand(combat,actorId,targetId);
  return spellId==='spell_cure_wounds'||melee.has(spellId)?band==='engaged':spellId==='spell_poison_spray'?['engaged','near'].includes(band):band!=='out_of_range';
}

/** One finite automatic turn for explicitly registered NPC companions. Speech never calls this. */
export function createCompanionAutomaticHook(state: GameState, rng: Rng) {
  const ids=enabledIds(state);
  let members=state.party.members;
  const rollLogs: RollLogEntry[]=[];
  const beforeAutomaticDeathSave=({combat,actor}: {combat:CombatState;actor:Combatant;rules:RulesConfig;rng:Rng})=>{
    if(combat.participants[combat.turnIndex]?.id!==actor.id||actor.kind!=='ally'||!ids.has(actor.id)||!needsDeathSave(actor)||!members.some(m=>m.id===actor.id&&m.kind==='ally'&&(actor.sourceCharacterId||actor.id)===m.id))return undefined;
    const saved=resolveDeathSaveTurnAction({combat,actorId:actor.id,actionId:`combat.death_save.${actor.id}`,rng});
    if(!saved.handled||!saved.ok)return undefined;
    rollLogs.push(...saved.rollLogs);
    return {combat:{...saved.combat,log:[...saved.combat.log,{id:`companion-death-${actor.id}-${combat.round}-${combat.log.length}`,ts:new Date().toISOString(),round:combat.round,actorId:actor.id,title:`${actor.name}: Death Saving Throw`,body:saved.message}]}};
  };
  const beforeAutomaticActor=({combat: original,actor: supplied}: {combat:CombatState;actor:Combatant;rules:RulesConfig;rng:Rng}) => {
    if(original.participants[original.turnIndex]?.id!==supplied.id||supplied.kind!=='ally'||!ids.has(supplied.id)||supplied.hp.current<=0||combatantStatusFlags(supplied).cannotAct)return undefined;
    const character=members.find(m=>m.kind==='ally'&&m.id===supplied.id&&(supplied.sourceCharacterId||supplied.id)===m.id);
    if(!character?.spellcasting)return undefined;
    let combat=original,changed=false,mainUsed=false,bonusUsed=false;
    const caster=()=>{
      const actor=combat.participants.find(p=>p.id===supplied.id)!;
      return syncCombatantToCharacter(members.find(m=>m.id===supplied.id)!,actor) as Character;
    };
    const woundedTargets=()=>combat.participants.filter(p=>p.kind!=='enemy'&&!p.conditions.includes('dead')&&!p.deathSaves?.dead&&(p.hp.current===0||p.hp.current<=p.hp.max/3)&&!(p.activeEffects||[]).some(e=>e.healingPrevented))
      .sort((a,b)=>a.hp.current/a.hp.max-b.hp.current/b.hp.max);
    const offensiveTargets=()=>{const actor=combat.participants.find(p=>p.id===supplied.id)!;return combat.participants.filter(p=>p.kind==='enemy'&&combatantStatusFlags(p).validAttackTarget&&!isCharmedBySource(actor,p.id)).sort((a,b)=>a.hp.current-b.hp.current);};
    const offensiveSpells=(cantripOnly=false)=>availableAutomatedSrdSpells(caster()).filter(id=>slotAvailable(caster(),id)&&(!cantripOnly||automatedSrdSpellLevel(id)==='0')&&(getAutomatedSrdSpellAction(id).kind==='spell_attack'||damage.has(id)))
      .sort((a,b)=>Number(automatedSrdSpellLevel(b))-Number(automatedSrdSpellLevel(a)));
    const initialKnown=availableAutomatedSrdSpells(caster());
    const intendsHealing=healing.some(id=>initialKnown.includes(id)&&slotAvailable(caster(),id)&&(id==='spell_healing_word'?combat.turnBudget?.bonusAction:combat.turnBudget?.action)&&woundedTargets().some(target=>reaches(combat,supplied.id,target.id,id)));
    const intendsOffense=combat.turnBudget?.action&&offensiveSpells().some(id=>offensiveTargets().some(target=>reaches(combat,supplied.id,target.id,id)));
    // Declining the hook leaves the ordinary weapon AI's turn-start trigger untouched.
    if(!intendsHealing&&!intendsOffense)return undefined;
    // The core invokes this hook before its normal hostile-turn-start reactions. A handled
    // caster turn must resolve that same trigger before spell preparation, exactly once.
    const readied=resolveReadiedReactionsWithRollLogs(combat,supplied.id,rng,state.campaign.rules,'hostile_turn_start');
    combat=readied.combat;rollLogs.push(...readied.rollLogs);changed=readied.combat!==original;
    const afterReady=combat.participants.find(p=>p.id===supplied.id);
    if(!afterReady||afterReady.hp.current<=0||combatantStatusFlags(afterReady).cannotAct)return {handled:true,combat};
    const cast=(spellId:AutomatedSrdSpellId,targetId:string,bonus=false)=>{
      const current=caster();members=members.map(m=>m.id===current.id?current:m);
      const result=resolveAutomatedSrdCombatSpellTurnAction({combat,actorId:supplied.id,actionId:`combat.${bonus?'bonus':'action'}.cast_spell.${spellId}.${targetId}`,members,rng,rules:state.campaign.rules});
      if(!result.handled||!result.ok)return false;
      combat=result.combat;members=result.partyMembers;rollLogs.push(...result.rollLogs);changed=true;
      if(bonus)bonusUsed=true;else mainUsed=true;
      const target=combat.participants.find(p=>p.id===targetId);
      combat={...combat,log:[...combat.log,{id:`companion-${supplied.id}-${combat.round}-${combat.log.length}`,ts:new Date().toISOString(),round:combat.round,actorId:supplied.id,title:`${supplied.name}: ${spellId}`,body:`${result.message} Target: ${target?.name||targetId} (${targetId}).`}]};
      return true;
    };
    const known=availableAutomatedSrdSpells(caster());
    const wounded=woundedTargets();
    for(const spellId of healing){
      if(!known.includes(spellId)||!slotAvailable(caster(),spellId))continue;
      const bonus=spellId==='spell_healing_word';
      if(!(bonus?combat.turnBudget?.bonusAction:combat.turnBudget?.action))continue;
      const target=wounded.find(p=>reaches(combat,supplied.id,p.id,spellId));
      if(target&&cast(spellId,target.id,bonus))break;
    }
    const actor=combat.participants.find(p=>p.id===supplied.id)!;
    if(mainUsed||combatantStatusFlags(actor).cannotAct||actor.hp.current<=0)return changed?{handled:true,combat}:undefined;
    if(combat.turnBudget?.action){
      const enemies=offensiveTargets(),spells=offensiveSpells(bonusUsed);
      for(const spellId of spells){const target=enemies.find(p=>reaches(combat,actor.id,p.id,spellId));if(target&&cast(spellId,target.id))break;}
    }
    // A bonus heal may leave the normal weapon AI a main action. No second main cast runs.
    return changed?{handled:mainUsed,combat}:undefined;
  };
  const result=(combat:CombatState)=>{
    const updated=syncPartyFromCombat({...state,party:{...state.party,members},combat,rollLog:[...state.rollLog,...rollLogs]});
    return {state:updated,combat,partyMembers:updated.party.members,rollLogs:[...rollLogs]};
  };
  return {beforeAutomaticActor,beforeAutomaticDeathSave,result};
}
export function runCompanionAutomaticTurns(state:GameState,combat:CombatState,rng:Rng){
  const hook=createCompanionAutomaticHook(state,rng);
  return hook.result(runAutomaticTurns(combat,rng,state.campaign.rules,{beforeAutomaticActor:hook.beforeAutomaticActor,beforeAutomaticDeathSave:hook.beforeAutomaticDeathSave}));
}
