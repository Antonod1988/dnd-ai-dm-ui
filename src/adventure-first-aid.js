const {z}=require('zod');
const crypto=require('node:crypto');
const npcEncounters=require('./npc-encounters');
const commandSchema=z.object({type:z.literal('first_aid'),method:z.enum(['stabilize','item']),targetId:z.string().trim().min(1).max(160),itemId:z.string().min(1).max(180).optional()}).strict();
const dead=target=>target.conditions.includes('dead')||target.deathSaves?.dead;
function healingItems(hero){return hero.inventory.filter(item=>item.quantity>0&&(item.itemId==='healing_potion'||item.mechanics?.use?.type==='healing')&&(!item.requiresAttunement||item.attuned)&&(!item.charges||item.charges.current>=Math.max(1,item.charges.costPerUse||1))&&!Object.values(hero.equipment||{}).includes(item.itemId)&&!item.tags?.some(tag=>['quest','quest_item','world_item'].includes(tag))).map(item=>({id:item.itemId,name:item.name}));}
const targetFor=(state,adventure,id)=>{
  const member=state.party.members.find(m=>m.id===id);if(member)return member;
  const npc=adventure.npcs.find(n=>n.id===id&&!n.hidden&&n.locationId===adventure.currentLocationId);
  return npc?adventure.environment?.npcStates?.find(record=>record.npcId===id)?.body:null;
};
function publicStatus(state,adventure,targetId){
  const hero=state.party.members.find(m=>m.id===state.party.heroId),target=targetFor(state,adventure,targetId);
  const usable=!state.combat&&hero?.hp.current>0&&!hero.conditions.some(c=>['unconscious','dead','incapacitated','stunned','paralyzed','petrified','possessed'].includes(c))&&!hero.deathSaves?.dead;
  return {targetId,available:Boolean(usable&&target&&!dead(target)),canStabilize:Boolean(usable&&target&&!dead(target)&&target.hp.current===0&&!target.deathSaves?.stable),canHeal:Boolean(usable&&target&&!dead(target)&&target.hp.current<target.hp.max&&!target.activeEffects?.some(e=>e.healingPrevented)),dying:Boolean(target&&!dead(target)&&target.hp.current===0&&!target.deathSaves?.stable),stable:Boolean(target&&!dead(target)&&target.hp.current===0&&target.deathSaves?.stable)};
}
async function resolve({state,adventure,command:input,sourceId,seed}){
  const parsed=commandSchema.safeParse(input),refuse=(code,message)=>({ok:false,state,adventure,refusal:{code,message,alternatives:['Выберите доступного персонажа и подходящий способ помощи.']}});
  if(!parsed.success||typeof sourceId!=='string'||!sourceId||sourceId.length>100)return refuse('invalid_aid','Уточните персонажа и способ помощи.');
  const command=parsed.data,previous=adventure.firstAidHistory?.find(record=>record.sourceId===sourceId);
  if(previous)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...previous,replayed:true}};
  const core=await import('../vendor/dnd-core/dist/engine.mjs'),hero=state.party.members.find(m=>m.id===state.party.heroId),target=targetFor(state,adventure,command.targetId);
  if(state.combat)return refuse('aid_in_combat','В бою используйте доступное действие текущего хода.');
  if(!hero||hero.hp.current<=0||dead(hero)||core.isActionIncapacitated(hero))return refuse('cannot_act','Герой сейчас не может оказывать помощь.');
  if(!target)return refuse('target_absent','Этот персонаж сейчас не находится рядом или его состояние неизвестно.');
  if(target.id!==command.targetId)return refuse('target_identity','Сохранённое состояние персонажа требует уточнения.');
  if(dead(target))return refuse('dead_target','Обычное лечение и первая помощь не возвращают мёртвого к жизни.');
  const next=structuredClone(state),meta=structuredClone(adventure),rng=new core.SeededRng(seed===undefined?sourceId:seed),en=meta.language==='en';
  let owner=next.party.members.find(m=>m.id===hero.id),updated=structuredClone(target),check,roll,success;
  if(command.method==='stabilize'){
    if(command.itemId)return refuse('unsupported_aid_item','Для проверки Медицины не требуется выбранный предмет.');
    if(target.hp.current!==0||target.deathSaves?.stable)return refuse('no_stabilization','Этому персонажу сейчас не нужна стабилизация.');
    const tested=core.rollStateAbilityCheck(next,owner,{ability:'wis',skill:'medicine',dc:10,rng,rules:next.campaign.rules});Object.assign(next,tested.state);check=tested.check;success=check.success;
    next.rollLog.push(...core.abilityCheckRollLogs(owner.id,`Medicine: ${target.name}`,check));owner=next.party.members.find(m=>m.id===hero.id);
    if(success)updated=core.stabilizeDyingTarget(updated);
  }else{
    const item=owner.inventory.find(i=>i.itemId===command.itemId&&i.quantity>0),effect=item&&core.modeledInventoryUseEffect(item,owner.inventory);
    if(!item||effect?.type!=='healing')return refuse('not_healing_item','У героя нет этой вещи с установленным лечебным действием.');
    if(item.requiresAttunement&&!item.attuned)return refuse('needs_attunement','Этот предмет требует настройки перед использованием.');
    if(Object.values(owner.equipment||{}).includes(item.itemId)||item.tags?.some(tag=>['quest','quest_item','world_item'].includes(tag)))return refuse('protected_aid_item','Этот предмет нельзя расходовать для такого лечения.');
    if(target.hp.current>=target.hp.max||target.activeEffects?.some(e=>e.healingPrevented))return refuse('healing_unavailable','Это лечение сейчас не может помочь выбранному персонажу.');
    const spend=core.canSpendInventoryItemUse(item);if(!spend.ok)return refuse('no_charges',spend.message);
    roll=core.rollExpression(effect.dice,{rng});updated=core.applyHealing(updated,roll.total);
    if(updated.hp.current<=target.hp.current)return refuse('no_healing','Лечение не изменило состояние; вещь не потрачена.');
    owner.inventory=core.spendInventoryItemUse(owner.inventory,item.itemId,effect.consume);success=true;
    next.rollLog.push({id:crypto.randomUUID(),ts:new Date().toISOString(),actorId:hero.id,label:`${item.name} → ${target.name}`,result:roll});
  }
  const index=next.party.members.findIndex(m=>m.id===target.id);
  if(index>=0){if(target.id===owner.id)updated.inventory=owner.inventory;next.party.members[index]=updated;}
  const record=meta.environment?.npcStates?.find(r=>r.npcId===target.id);
  if(record)npcEncounters.updateBody(record,index>=0?{...core.characterToCombatant(updated),equipment:updated.equipment}:updated);
  const cached=meta.companions?.records?.find(r=>r.npcId===target.id);if(cached){cached.character=index>=0?structuredClone(updated):core.syncCombatantToCharacter(cached.character,updated);}
  const text=command.method==='stabilize'?(en?`${target.name}: Medicine ${check.roll.total}/10 — ${success?'stable at0 HP':'failed; still needs help'}.`:`${target.name}: Медицина ${check.roll.total}/10 — ${success?'стабилен при0 HP':'неудача, всё ещё нужна помощь'}.`):(en?`${target.name}: HP ${target.hp.current} → ${updated.hp.current}. The hero used ${command.itemId}.`:`${target.name}: HP ${target.hp.current} → ${updated.hp.current}. Герой потратил ${command.itemId}.`);
  const outcome={type:'first_aid',method:command.method,sourceId,targetId:target.id,targetName:target.name,itemId:command.itemId,success,check,roll,hpBefore:target.hp.current,hpAfter:updated.hp.current,conditionsAfter:updated.conditions,elapsedSeconds:6,text};
  meta.firstAidHistory||=[];meta.firstAidHistory.push(structuredClone(outcome));meta.firstAidHistory=meta.firstAidHistory.slice(-200);
  return {ok:true,state:next,adventure:meta,outcome};
}
module.exports={resolve,publicStatus,commandSchema,targetFor,healingItems};
