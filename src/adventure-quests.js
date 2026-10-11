const {z}=require('zod');
const model=require('./adventure-model');
const lore=require('./scene-checks');
const key=z.string().min(1).max(100);
const deliverySchema=z.object({type:z.literal('deliver'),questId:key,objectiveId:key,description:z.string().max(500).optional()}).strict();
function readyObjectives(quest){return quest.status==='active'?quest.objectives.filter((o,i)=>!o.completed&&(!quest.sequential||quest.objectives.slice(0,i).every(p=>p.completed))):[];}
function carried(hero,worldId){return hero.inventory.find(i=>i.tags?.includes('world_item')&&i.tags.includes(worldId)&&i.quantity>0);}
function canAct(hero){return hero.hp.current>0&&!hero.conditions.some(c=>['dead','unconscious','incapacitated','paralyzed','stunned'].includes(c));}
function available(service,state,adventure){
  if(state.combat)return [];
  const hero=state.party.members.find(m=>m.id===state.party.heroId);if(!canAct(hero))return [];
  const en=adventure.language==='en',checks=lore.publicChecks(state),actions=[];
  for(const q of adventure.quests)for(const o of readyObjectives(q)){
    if(o.kind==='deliver'){
      const npc=adventure.npcs.find(n=>n.id===o.recipientId&&n.locationId===adventure.currentLocationId),item=carried(hero,o.targetId);
      if(npc&&item&&!item.attuned&&!Object.values(hero.equipment||{}).includes(item.itemId))actions.push({id:`deliver:${q.id}:${o.id}`,kind:'quest',questId:q.id,objectiveId:o.id,label:en?`Give ${item.name} to ${npc.name}`:`Передать ${item.name}: ${npc.name}`,command:{type:'deliver',questId:q.id,objectiveId:o.id}});
    }
    if(o.kind==='check')for(const id of [o.targetId,...(o.alternativeTargetIds||[])]){
      const definition=adventure.loreDefinitions.find(c=>c.id===id),check=checks.find(c=>c.id===adventure.loreCheckIds[id]);
      if(definition?.trigger==='manual'&&definition.locationId===adventure.currentLocationId&&!check?.attempted&&(!definition.npcId||adventure.npcs.some(n=>n.id===definition.npcId&&n.locationId===adventure.currentLocationId)))actions.push({id:`scene-check:${id}`,kind:'quest',questId:q.id,objectiveId:o.id,label:`${definition.title} · ${definition.dc}`,command:{type:'scene_check',checkId:id}});
    }
  }
  return actions;
}
function deliver(state,adventure,input){
  const command=deliverySchema.parse(input),quest=adventure.quests.find(q=>q.id===command.questId),objective=quest&&readyObjectives(quest).find(o=>o.id===command.objectiveId&&o.kind==='deliver');
  const bad=text=>{throw Object.assign(new Error(text),{status:400});};
  if(state.combat)bad('Передача предметов недоступна во время боя.');
  if(!objective)bad('Этот этап передачи ещё не доступен или уже завершён.');
  const hero=state.party.members.find(m=>m.id===state.party.heroId),npc=adventure.npcs.find(n=>n.id===objective.recipientId&&n.locationId===adventure.currentLocationId),item=carried(hero,objective.targetId);
  if(!canAct(hero))bad('Герой сейчас не может передать предмет.');
  if(!npc)bad('Адресат сейчас не рядом.');
  if(!item)bad('Нужного предмета нет в инвентаре.');
  if(item.attuned||Object.values(hero.equipment||{}).includes(item.itemId))bad('Сначала снимите предмет и прекратите настройку.');
  const transferred=structuredClone({...item,quantity:1});item.quantity-=1;hero.inventory=hero.inventory.filter(i=>i.quantity>0);
  const text=adventure.language==='en'?`${item.name} was given to ${npc.name}.`:`Предмет «${item.name}» передан: ${npc.name}.`;
  const event=model.addEvent(adventure,'deliver',objective.targetId,text,{recipientId:npc.id,questId:quest.id,objectiveId:objective.id,inventoryItemId:item.itemId});
  npc.receivedItems||=[];npc.receivedItems.push({item:transferred,eventId:event.id,turn:adventure.turn,fromId:hero.id});
  npc.trust=Math.min(100,(npc.trust||0)+1);adventure.reputation[npc.locationId]=(adventure.reputation[npc.locationId]||0)+1;
  model.processQuestEvent(adventure,event);
  return {type:'deliver',text,recipientId:npc.id,itemId:objective.targetId};
}
// A discovery made before accepting the task remains valid evidence. Reuse the
// persisted event, never reroll a resolved scene check or rewrite its result.
function reconcileEvidence(state,adventure){
  const hero=state.party.members.find(m=>m.id===state.party.heroId);
  for(const quest of adventure.quests.filter(q=>q.status==='active')){
    for(let pass=0;pass<quest.objectives.length;pass++){
      const before=quest.objectives.filter(o=>o.completed).length;
      for(const objective of readyObjectives(quest)){
        let event;
        if(objective.kind==='check'){
          const ids=[objective.targetId,...(objective.alternativeTargetIds||[])];
          event=adventure.events.find(e=>e.kind==='check'&&e.success===true&&ids.includes(e.targetId));
        }else if(objective.kind==='acquire'&&carried(hero,objective.targetId))event=adventure.events.find(e=>e.kind==='acquire'&&e.targetId===objective.targetId);
        if(event)model.processQuestEvent(adventure,event);
      }
      if(quest.objectives.filter(o=>o.completed).length===before)break;
    }
  }
}
module.exports={available,deliver,readyObjectives,reconcileEvidence,canAct};
