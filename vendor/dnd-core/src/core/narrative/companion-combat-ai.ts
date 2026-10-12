import type { Character, CombatState, Combatant, GameState, RollLogEntry, RulesConfig } from '../types.js';
import { rollExpression, type Rng } from '../dice.js';
import { availableAutomatedSrdSpells, automatedSrdAreaTargetBands, automatedSrdSpellLevel, type AutomatedSrdAreaLikeSpellId, type AutomatedSrdSpellId } from '../rulesets/srd5e2014/spell-engine.js';
import { automatedSrdAreaTargets, getAutomatedSrdSpellAction, resolveAutomatedSrdCombatSpellTurnAction } from '../actions/automated-spell-actions.js';
import { resolveDeathSaveTurnAction } from '../actions/death-save-actions.js';
import { applyAiMovementToAttackRange, applyAiStandUp, applyHealing, combatCover, combatDistanceBand, combatantStatusFlags, ensureTurnBudget, isAttackInDistanceBand, needsDeathSave, resolveReadiedReactionsWithRollLogs, runAutomaticTurns, syncCombatantToCharacter } from '../rules/combat.js';
import { effectiveHitPointMaximum, isCharmedBySource } from '../rules/conditions.js';
import { syncPartyFromCombat } from './consequence-engine.js';
import { hasAvailableAction, spendAction, spendBonusAction } from '../rulesets/srd5e2014/action-economy.js';
import { buildTurnView } from './option-builder.js';
import { resolveRegisteredStandardCombatAction } from '../actions/standard-combat-actions.js';
import { canUseSrdAttackWithEquipment } from '../rulesets/srd5e2014/character-builder.js';
import { canSpendInventoryItemUse, hasAmmunitionForAttack, inventoryItemForAttack, itemCatalog, modeledInventoryUseEffect, spendInventoryItemUse } from '../content/items.js';

const healing: AutomatedSrdSpellId[] = ['spell_healing_word', 'spell_cure_wounds'];
const damage = new Set(['spell_magic_missile', 'spell_sacred_flame', 'spell_toll_the_dead', 'spell_poison_spray', 'spell_vicious_mockery', 'spell_dissonant_whispers']);
const melee = new Set(['spell_shocking_grasp', 'spell_inflict_wounds', 'spell_vampiric_touch']);
type CompanionOrder={mode:'auto'|'conserve'|'defend'|'support'|'focus'|'cast';targetId?:string;combatId?:string;spellActionId?:string;directiveId?:string;allowFriendlyFire?:boolean};
type CastOrderResult={directiveId:string;combatId:string;spellActionId:string;status:'resolved'|'refused';message:string};
const ordinarySpellAction=/^combat\.(action|bonus)\.cast_spell\.([^.]+)\.([^.]+)$/;
function orders(state:GameState):Record<string,CompanionOrder>{
  const raw=state.flags.ui_companion_orders;if(typeof raw!=='string'||raw.length>3000)return {};
  try{const value=JSON.parse(raw);if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length>3)return {};
    for(const [id,order] of Object.entries(value) as [string,CompanionOrder][]){
      if(!id||id.length>160||!order||typeof order!=='object'||!['auto','conserve','defend','support','focus','cast'].includes(order.mode))return {};
      const invalid=Object.keys(order).some(k=>!['mode','targetId','combatId','spellActionId','directiveId','allowFriendlyFire'].includes(k))||order.targetId!==undefined&&(typeof order.targetId!=='string'||!order.targetId||order.targetId.length>160)||order.combatId!==undefined&&(typeof order.combatId!=='string'||!order.combatId||order.combatId.length>160)||order.spellActionId!==undefined&&(typeof order.spellActionId!=='string'||order.spellActionId.length>400)||order.directiveId!==undefined&&(typeof order.directiveId!=='string'||order.directiveId.length>100)||order.allowFriendlyFire!==undefined&&(order.mode!=='cast'||typeof order.allowFriendlyFire!=='boolean');
      if(invalid){
        // A corrupted one-shot directive must not silently become an automatic attack.
        if(order.mode!=='cast')return {};
        value[id]={mode:'cast',spellActionId:'',directiveId:typeof order.directiveId==='string'?order.directiveId.slice(0,100):'',combatId:typeof order.combatId==='string'?order.combatId.slice(0,160):''};
      }
    }
    return value;
  }catch{return {};}
}

/** A UI preview changes only a disposable view's actor and budget. It never casts or rolls. */
export function companionSpellOrderOptions(state:GameState,npcId:string,{preview=false}:{preview?:boolean}={}) {
  const combat=state.combat,actor=combat?.participants.find(p=>p.id===npcId);
  const member=state.party.members.find(m=>m.id===npcId&&m.kind==='ally');
  if(!combat||!actor||actor.kind!=='ally'||!enabledIds(state).has(npcId)||!member||(actor.sourceCharacterId||actor.id)!==member.id||actor.hp.current<=0||combatantStatusFlags(actor).cannotAct||!combat.participants.some(p=>p.kind==='enemy'&&combatantStatusFlags(p).validAttackTarget)||!preview&&combat.participants[combat.turnIndex]?.id!==npcId)return [];
  const caster=syncCombatantToCharacter(member,actor),known=availableAutomatedSrdSpells(caster);
  const actorIndex=combat.participants.findIndex(p=>p.id===npcId);
  const viewCombat=ensureTurnBudget({...combat,round:combat.round+(preview&&actorIndex<=combat.turnIndex?1:0),turnIndex:actorIndex,turnBudget:preview?undefined:combat.turnBudget,participants:combat.participants.map(p=>p.id===npcId?{...p,kind:'player' as const}:p)});
  const viewState={...state,party:{...state.party,members:state.party.members.map(m=>m.id===npcId?caster:m)},combat:viewCombat};
  return buildTurnView(viewState).options.filter(option=>{
    const parsed=option.id.match(ordinarySpellAction);
    if(!parsed||option.id.length>400||!known.includes(parsed[2] as AutomatedSrdSpellId))return false;
    const spellId=parsed[2] as AutomatedSrdSpellId,target=combat.participants.find(p=>p.id===parsed[3]);
    if(!target||target.conditions.some(c=>['dead','fled','captured'].includes(c))||target.deathSaves?.dead||target.kind==='enemy'&&(!combatantStatusFlags(target).validAttackTarget||isCharmedBySource(actor,target.id))||!slotAvailable(caster,spellId)||!reaches(combat,npcId,target.id,spellId))return false;
    if(healing.includes(spellId)&&applyHealing(target,1).hp.current<=target.hp.current)return false;
    return parsed[1]==='bonus'?spendBonusAction(viewCombat.turnBudget!,spellId).ok:spendAction(viewCombat.turnBudget!,'cast_spell').ok;
  }).map(option=>{
    const spellId=option.id.match(ordinarySpellAction)![2] as AutomatedSrdSpellId;
    const kind=getAutomatedSrdSpellAction(spellId).kind;
    if(!['sleep','color_spray','area_damage','area_control'].includes(kind))return option;
    const areaSpellId=spellId as AutomatedSrdAreaLikeSpellId,candidates=automatedSrdAreaTargets(combat,npcId,areaSpellId);
    return {...option,area:{targeting:'caster_distance_bands' as const,bands:[...automatedSrdAreaTargetBands(areaSpellId)],selection:kind==='sleep'||kind==='color_spray'?'creatures_except_caster':'base_enemy_candidates',candidateTargets:true},affectedIds:candidates.map(p=>p.id),mayAffectAllies:candidates.some(p=>p.kind!=='enemy')};
  });
}

function castOrderResults(state:GameState):Map<string,CastOrderResult>{
  const raw=state.flags.ui_companion_order_results;
  if(typeof raw!=='string'||raw.length>4000)return new Map();
  try{const value=JSON.parse(raw);if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length>3)return new Map();
    return new Map(Object.entries(value).filter(([id,r]:[string,any])=>id.length>0&&id.length<=160&&r&&typeof r==='object'&&typeof r.directiveId==='string'&&r.directiveId.length<=100&&typeof r.combatId==='string'&&r.combatId.length<=160&&typeof r.spellActionId==='string'&&r.spellActionId.length<=400&&['resolved','refused'].includes(r.status)&&typeof r.message==='string'&&r.message.length<=400).map(([id,r]:[string,any])=>[id,{directiveId:r.directiveId,combatId:r.combatId,spellActionId:r.spellActionId,status:r.status,message:r.message}]));
  }catch{return new Map();}
}
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
  const preferences=orders(state);
  const directiveResults=castOrderResults(state);
  let ordersChanged=false;
  let members=state.party.members;
  const rollLogs: RollLogEntry[]=[];
  const consumeCast=(actorId:string,combat:CombatState,status:'resolved'|'refused',message:string)=>{
    const order=preferences[actorId];if(order?.mode!=='cast')return combat;
    preferences[actorId]={mode:'auto'};ordersChanged=true;
    const previous=directiveResults.get(actorId);
    if(previous?.directiveId===order.directiveId&&previous.combatId===order.combatId)return combat;
    directiveResults.set(actorId,{directiveId:order.directiveId||'',combatId:order.combatId||'',spellActionId:order.spellActionId||'',status,message:message.slice(0,400)});
    const actor=combat.participants.find(p=>p.id===actorId);
    return {...combat,log:[...combat.log,{id:`companion-directive-${actorId}-${combat.round}-${combat.log.length}`,ts:new Date().toISOString(),round:combat.round,actorId,title:`${actor?.name||actorId}: spell order ${status}`,body:message.slice(0,400)}]};
  };
  const beforeAutomaticDeathSave=({combat,actor}: {combat:CombatState;actor:Combatant;rules:RulesConfig;rng:Rng})=>{
    if(combat.participants[combat.turnIndex]?.id!==actor.id||actor.kind!=='ally'||!ids.has(actor.id)||!needsDeathSave(actor)||!members.some(m=>m.id===actor.id&&m.kind==='ally'&&(actor.sourceCharacterId||actor.id)===m.id))return undefined;
    const saved=resolveDeathSaveTurnAction({combat,actorId:actor.id,actionId:`combat.death_save.${actor.id}`,rng});
    if(!saved.handled||!saved.ok)return undefined;
    rollLogs.push(...saved.rollLogs);
    let next={...saved.combat,log:[...saved.combat.log,{id:`companion-death-${actor.id}-${combat.round}-${combat.log.length}`,ts:new Date().toISOString(),round:combat.round,actorId:actor.id,title:`${actor.name}: Death Saving Throw`,body:saved.message}]};
    if(next.participants.find(p=>p.id===actor.id)!.hp.current<=0)next=consumeCast(actor.id,next,'refused',`${actor.name} remains at 0 HP after the death save and cannot execute the spell order.`);
    return {combat:next};
  };
  const beforeAutomaticActor=({combat: original,actor: supplied}: {combat:CombatState;actor:Combatant;rules:RulesConfig;rng:Rng}) => {
    if(original.participants[original.turnIndex]?.id!==supplied.id||supplied.kind!=='ally'||!ids.has(supplied.id))return undefined;
    const character=members.find(m=>m.kind==='ally'&&m.id===supplied.id&&(supplied.sourceCharacterId||supplied.id)===m.id);
    if(!character)return undefined;
    let order=preferences[supplied.id]||{mode:'auto'};
    if(order.mode==='cast'){
      const previous=directiveResults.get(supplied.id);
      if(previous?.directiveId===order.directiveId&&previous.combatId===order.combatId)return {handled:true,combat:consumeCast(supplied.id,original,'refused','This spell directive has already been consumed.')};
      if(order.combatId!==original.id||!order.directiveId||!order.spellActionId||!ordinarySpellAction.test(order.spellActionId))return {handled:true,combat:consumeCast(supplied.id,original,'refused','The spell order is invalid or belongs to another combat.')};
      if(supplied.hp.current<=0||combatantStatusFlags(supplied).cannotAct)return {handled:true,combat:consumeCast(supplied.id,original,'refused',`${supplied.name} cannot act and cannot execute the spell order.`)};
      const ready=resolveReadiedReactionsWithRollLogs(original,supplied.id,rng,state.campaign.rules,'hostile_turn_start');
      rollLogs.push(...ready.rollLogs);
      const actor=ready.combat.participants.find(p=>p.id===supplied.id);
      if(!actor||actor.hp.current<=0||combatantStatusFlags(actor).cannotAct)return {handled:true,combat:consumeCast(supplied.id,ready.combat,'refused','A readied reaction prevents the companion from executing the spell order.')};
      const current=syncCombatantToCharacter(character,actor);members=members.map(m=>m.id===current.id?current:m);
      const selected=companionSpellOrderOptions({...state,party:{...state.party,members},combat:ready.combat},supplied.id).find(o=>o.id===order.spellActionId);
      if(!selected)return {handled:true,combat:consumeCast(supplied.id,ready.combat,'refused','The exact spell or target is no longer available: check preparation, slots, action budget, target state, range and cover.')};
      if('mayAffectAllies' in selected&&selected.mayAffectAllies&&order.allowFriendlyFire!==true)return {handled:true,combat:consumeCast(supplied.id,ready.combat,'refused','The spell area now includes allies; this directive does not allow friendly-fire risk.')};
      const cast=resolveAutomatedSrdCombatSpellTurnAction({combat:ready.combat,actorId:supplied.id,actionId:order.spellActionId,members,rng,rules:state.campaign.rules});
      if(!cast.handled)return {handled:true,combat:consumeCast(supplied.id,ready.combat,'refused','The exact spell action is not supported.')};
      if(!cast.ok)return {handled:true,combat:consumeCast(supplied.id,cast.combat,'refused',cast.message)};
      members=cast.partyMembers;rollLogs.push(...cast.rollLogs);
      return {handled:true,combat:consumeCast(supplied.id,cast.combat,cast.interrupted?'refused':'resolved',cast.message)};
    }
    if(supplied.hp.current<=0||combatantStatusFlags(supplied).cannotAct)return undefined;
    if(order.mode==='focus'){
      const target=original.participants.find(p=>p.id===order.targetId);
      if(order.combatId!==original.id||!target||target.kind!=='enemy'||!combatantStatusFlags(target).validAttackTarget||target.conditions.some(c=>['fled','captured'].includes(c))||isCharmedBySource(supplied,target.id)||combatCover(original,supplied.id,target.id)==='total'||combatDistanceBand(original,supplied.id,target.id)==='out_of_range')order={mode:'auto'};
    }
    let combat=original,changed=false,mainUsed=false,bonusUsed=false;
    const caster=()=>{
      const actor=combat.participants.find(p=>p.id===supplied.id)!;
      return syncCombatantToCharacter(members.find(m=>m.id===supplied.id)!,actor) as Character;
    };
    const woundedTargets=()=>combat.participants.filter(p=>p.kind!=='enemy'&&!p.conditions.includes('dead')&&!p.deathSaves?.dead&&!p.conditions.some(c=>['fled','captured'].includes(c))&&(order.mode==='support'?(p.hp.current<p.hp.max&&(!order.targetId||p.id===order.targetId)):order.mode==='conserve'?p.hp.current===0:order.mode==='focus'?false:(p.hp.current===0||p.hp.current<=p.hp.max/3))&&!(p.activeEffects||[]).some(e=>e.healingPrevented))
      .sort((a,b)=>a.hp.current/a.hp.max-b.hp.current/b.hp.max);
    const offensiveTargets=()=>{const actor=combat.participants.find(p=>p.id===supplied.id)!;return combat.participants.filter(p=>p.kind==='enemy'&&combatantStatusFlags(p).validAttackTarget&&!isCharmedBySource(actor,p.id)&&(order.mode!=='focus'||p.id===order.targetId)).sort((a,b)=>a.hp.current-b.hp.current);};
    const offensiveSpells=(cantripOnly=false)=>availableAutomatedSrdSpells(caster()).filter(id=>slotAvailable(caster(),id)&&(!(cantripOnly||order.mode==='conserve')||automatedSrdSpellLevel(id)==='0')&&(getAutomatedSrdSpellAction(id).kind==='spell_attack'||damage.has(id)))
      .sort((a,b)=>Number(automatedSrdSpellLevel(b))-Number(automatedSrdSpellLevel(a)));
    const ownHealingItem=()=>{
      if(!['auto','conserve'].includes(order.mode)||!combat.turnBudget?.action||!spendAction(combat.turnBudget,'use_object').ok)return undefined;
      const actor=combat.participants.find(p=>p.id===supplied.id)!;
      if(actor.hp.current<=0||actor.hp.current>effectiveHitPointMaximum(actor)/3||actor.conditions.includes('dead')||actor.deathSaves?.dead||combatantStatusFlags(actor).cannotAct||applyHealing(actor,1).hp.current<=actor.hp.current)return undefined;
      const current=caster();
      for(const item of current.inventory){
        if(item.quantity<=0||item.requiresAttunement&&!item.attuned||!canSpendInventoryItemUse(item).ok)continue;
        const effect=modeledInventoryUseEffect(item,current.inventory);
        if(effect?.type==='healing'&&(item.charges||effect.consume)&&typeof effect.dice==='string')return {item,effect};
      }
      return undefined;
    };
    const initialKnown=availableAutomatedSrdSpells(caster());
    const intendsHealing=healing.some(id=>initialKnown.includes(id)&&slotAvailable(caster(),id)&&(id==='spell_healing_word'?combat.turnBudget?.bonusAction:combat.turnBudget?.action)&&woundedTargets().some(target=>reaches(combat,supplied.id,target.id,id)));
    const intendsOffense=combat.turnBudget?.action&&offensiveSpells().some(id=>offensiveTargets().some(target=>reaches(combat,supplied.id,target.id,id)));
    // Declining the hook leaves the ordinary weapon AI's turn-start trigger untouched.
    const controlled=order.mode==='defend'||order.mode==='support'||order.mode==='focus';
    const intendsWeapon=['auto','conserve'].includes(order.mode)&&hasAvailableAction(combat.turnBudget);
    if(!controlled&&!intendsHealing&&!intendsOffense&&!ownHealingItem()&&!intendsWeapon)return undefined;
    // The core invokes this hook before its normal hostile-turn-start reactions. A handled
    // caster turn must resolve that same trigger before spell preparation, exactly once.
    const readied=resolveReadiedReactionsWithRollLogs(combat,supplied.id,rng,state.campaign.rules,'hostile_turn_start');
    combat=readied.combat;rollLogs.push(...readied.rollLogs);changed=readied.combat!==original;
    const afterReady=combat.participants.find(p=>p.id===supplied.id);
    if(!afterReady||afterReady.hp.current<=0||combatantStatusFlags(afterReady).cannotAct)return {handled:true,combat};
    const standard=(kind:'dodge'|'attack',targetId?:string,attackId?:string)=>{
      const actor=combat.participants.find(p=>p.id===supplied.id)!;
      const spent=spendAction(combat.turnBudget!,kind);if(!spent.ok)return false;
      const result=resolveRegisteredStandardCombatAction({state:{...state,party:{...state.party,members}},combat:{...combat,turnBudget:spent.budget},actor,actionKind:kind,primaryId:attackId,secondaryId:targetId,spentBudget:spent.budget,rng});
      if(!result.handled||!result.ok)return false;
      combat=result.combat;if(result.partyMembers)members=result.partyMembers;rollLogs.push(...result.rollLogs);changed=true;mainUsed=true;
      combat={...combat,log:[...combat.log,{id:`companion-order-${supplied.id}-${combat.round}-${combat.log.length}`,ts:new Date().toISOString(),round:combat.round,actorId:supplied.id,title:`${supplied.name}: ${kind}`,body:result.message}]};return true;
    };
    if(order.mode==='defend'){if(hasAvailableAction(combat.turnBudget))standard('dodge');return {handled:true,combat};}
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
    if(order.mode==='support'){if(hasAvailableAction(combat.turnBudget))standard('dodge');return {handled:true,combat};}
    const potion=ownHealingItem();
    if(potion){
      const spent=spendAction(combat.turnBudget!,'use_object');
      if(spent.ok){
        const roll=rollExpression(potion.effect.dice,{rng}),healed=applyHealing(actor,roll.total);
        if(healed.hp.current>actor.hp.current){
          const current=caster(),inventory=spendInventoryItemUse(current.inventory,potion.item.itemId,potion.effect.consume);
          const updated=syncCombatantToCharacter({...current,inventory},healed);
          members=members.map(m=>m.id===supplied.id?updated:m);
          const logId=`companion-item-${supplied.id}-${combat.round}-${combat.log.length}`;
          const message=`${actor.name} uses own ${potion.item.name} (${potion.item.itemId}) on ${actor.name} (${actor.id}) and restores ${healed.hp.current-actor.hp.current} HP.`;
          combat={...combat,turnBudget:spent.budget,participants:combat.participants.map(p=>p.id===actor.id?healed:p),log:[...combat.log,{id:logId,ts:new Date().toISOString(),round:combat.round,actorId:actor.id,title:`${actor.name}: Use ${potion.item.name}`,body:message}]};
          rollLogs.push({id:logId,ts:new Date().toISOString(),actorId:actor.id,label:`${potion.item.name} → ${actor.name}`,result:roll});
          changed=true;mainUsed=true;return {handled:true,combat};
        }
      }
    }
    if(combat.turnBudget?.action){
      const enemies=offensiveTargets(),spells=offensiveSpells(bonusUsed);
      for(const spellId of spells){const target=enemies.find(p=>reaches(combat,actor.id,p.id,spellId));if(target&&cast(spellId,target.id))break;}
    }
    if(['auto','conserve','focus'].includes(order.mode)&&!mainUsed&&hasAvailableAction(combat.turnBudget)){
      let focused=order.mode==='focus'?combat.participants.find(p=>p.id===order.targetId):offensiveTargets().filter(p=>combatCover(combat,actor.id,p.id)!=='total'&&combatDistanceBand(combat,actor.id,p.id)!=='out_of_range').sort((a,b)=>({engaged:0,near:1,far:2,out_of_range:3}[combatDistanceBand(combat,actor.id,a.id)]-({engaged:0,near:1,far:2,out_of_range:3}[combatDistanceBand(combat,actor.id,b.id)]))||a.hp.current-b.hp.current)[0];
      if(focused&&combatantStatusFlags(focused).validAttackTarget&&!isCharmedBySource(actor,focused.id)&&combatCover(combat,actor.id,focused.id)!=='total'){
        const current=caster();members=members.map(m=>m.id===current.id?current:m);
        const usable=(attack:Combatant['attacks'][number])=>{
          const itemId=inventoryItemForAttack(attack)||(itemCatalog[attack.id]||current.inventory.some(i=>i.itemId===attack.id)?attack.id:undefined);
          return (!itemId||(Object.values(current.equipment).includes(itemId)&&current.inventory.some(i=>i.itemId===itemId&&i.quantity>0)))&&canUseSrdAttackWithEquipment(current,attack).ok&&hasAmmunitionForAttack(current.inventory,attack);
        };
        combat=applyAiStandUp(combat,actor);const moving=combat.participants.find(p=>p.id===actor.id)!;
        combat=applyAiMovementToAttackRange(combat,{...moving,attacks:moving.attacks.filter(usable)},focused,rng,state.campaign.rules);
        const now=combat.participants.find(p=>p.id===actor.id)!;focused=combat.participants.find(p=>p.id===focused!.id);
        if(now.hp.current<=0||combatantStatusFlags(now).cannotAct)return {handled:true,combat};
        const attack=now.attacks.find(a=>focused&&usable(a)&&isAttackInDistanceBand(a,combatDistanceBand(combat,now.id,focused.id)));
        if(attack&&focused)standard('attack',focused.id,attack.id);else standard('dodge');
      }else standard('dodge');
      return {handled:true,combat};
    }
    // A bonus heal may leave the normal weapon AI a main action. No second main cast runs.
    return changed?{handled:mainUsed,combat}:undefined;
  };
  const result=(combat:CombatState)=>{
    const flags=ordersChanged?{...state.flags,ui_companion_orders:JSON.stringify(preferences),ui_companion_order_results:JSON.stringify(Object.fromEntries([...directiveResults].filter(([id])=>ids.has(id)).slice(-3)))}:state.flags;
    const updated=syncPartyFromCombat({...state,flags,party:{...state.party,members},combat,rollLog:[...state.rollLog,...rollLogs]});
    return {state:updated,combat,partyMembers:updated.party.members,rollLogs:[...rollLogs]};
  };
  return {beforeAutomaticActor,beforeAutomaticDeathSave,result};
}
export function runCompanionAutomaticTurns(state:GameState,combat:CombatState,rng:Rng){
  const hook=createCompanionAutomaticHook(state,rng);
  return hook.result(runAutomaticTurns(combat,rng,state.campaign.rules,{beforeAutomaticActor:hook.beforeAutomaticActor,beforeAutomaticDeathSave:hook.beforeAutomaticDeathSave}));
}
