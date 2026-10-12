const {z}=require('zod');
const model=require('./adventure-model');
const lore=require('./scene-checks');
const access=require('./adventure-access');
const key=z.string().min(1).max(100);
const deliverySchema=z.object({type:z.literal('deliver'),questId:key,objectiveId:key,quantity:z.number().int().min(1).max(20).default(1),description:z.string().max(500).optional()}).strict();
const lifecycleSchema=z.object({type:z.enum(['decline_quest','abandon_quest']),questId:key,npcId:key.optional(),reason:z.string().trim().max(400).default(''),description:z.string().max(500).optional()}).strict();
function readyObjectives(quest){return quest.status==='active'?quest.objectives.filter((o,i)=>!o.completed&&(!quest.sequential||quest.objectives.slice(0,i).every(p=>p.completed))):[];}
function carried(hero,worldId){return hero.inventory.find(i=>i.tags?.includes('world_item')&&i.tags.includes(worldId)&&i.quantity>0);}
function canAct(hero){return hero.hp.current>0&&!hero.deathSaves?.dead&&!hero.conditions.some(c=>['dead','unconscious','incapacitated','paralyzed','stunned','petrified'].includes(c));}
function objectiveProgress(o){const quantity=o.quantity??1,field=o.kind==='acquire'?'acquiredQuantity':'deliveredQuantity',progress=o[field]??(o.completed?quantity:0);return {quantity,[field]:progress,remainingQuantity:Math.max(0,quantity-progress),evidenceEventIds:[...new Set([...(o.evidenceEventIds||[]),...(o.evidenceEventId?[o.evidenceEventId]:[])])]};}
function owned(hero,id){return hero.inventory.filter(i=>i.tags?.includes('world_item')&&i.tags.includes(id)&&i.quantity>0);}
function eligible(hero,id){return owned(hero,id).filter(i=>!i.attuned&&!Object.values(hero.equipment||{}).includes(i.itemId));}
function allocations(hero,id,limit){
  let plans=new Map([[0,[]]]);
  for(const item of eligible(hero,id)){
    const amounts=item.charges&&item.quantity>1?(item.quantity<=limit?[item.quantity]:[]):Array.from({length:Math.min(limit,item.quantity)},(_,i)=>i+1),next=new Map(plans);
    for(const [total,parts]of plans)for(const quantity of amounts)if(total+quantity<=limit&&!next.has(total+quantity))next.set(total+quantity,[...parts,{item,quantity}]);
    plans=next;
  }
  return plans;
}
function npcAvailable(adventure,npc){const body=adventure.environment?.npcStates?.find(r=>r.npcId===npc.id)?.body;return !npc.hidden&&(!body||body.hp.current>0&&!body.deathSaves?.dead&&!body.conditions?.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','fled','captured'].includes(c)));}
function publicQuests(adventure,state){const hero=state?.party.members.find(m=>m.id===state.party.heroId),canDecide=Boolean(hero&&!state.combat&&canAct(hero));return adventure.quests.map(q=>({...q,canDecline:canDecide&&q.status==='offered',canAbandon:canDecide&&q.status==='active',objectives:q.objectives.map(o=>['acquire','deliver'].includes(o.kind)?{...o,...objectiveProgress(o)}:{...o})}));}
function validateDecision(state,adventure,input){
  const bad=text=>{throw Object.assign(new Error(text),{status:400});};
  const parsed=lifecycleSchema.safeParse(input);
  if(!parsed.success)bad(parsed.error.issues.some(i=>i.path[0]==='reason')?'Причина может содержать не более 400 символов.':'Укажите задание и понятное решение по нему.');
  const command=parsed.data,hero=state.party.members.find(m=>m.id===state.party.heroId),quest=adventure.quests.find(q=>q.id===command.questId),before=command.type==='decline_quest'?'offered':'active';
  if(state.combat)bad('Решения по заданиям недоступны во время боя.');
  if(!canAct(hero))bad('Герой сейчас не может принять решение по заданию.');
  if(!quest||quest.status!==before)bad('Это решение уже недоступно для задания.');
  const npc=command.npcId?adventure.npcs.find(n=>n.id===command.npcId&&n.id===quest.giverId&&n.locationId===adventure.currentLocationId):null;
  if(command.npcId&&(!npc||!npcAvailable(adventure,npc)))bad('Уведомить можно только доступного рядом персонажа, который предложил это задание.');
  return {command,quest,before,npc,hero};
}
function decide(state,adventure,input,sourceId){
  const {command,quest,before,npc,hero}=validateDecision(state,adventure,input);
  quest.status=command.type==='decline_quest'?'declined':'abandoned';quest.endedReason=command.reason;quest.endedAtTurn=adventure.turn;
  quest.decision={type:command.type,reason:command.reason,reasonConfidence:'player_statement',sourceId,turn:adventure.turn,npcNotified:Boolean(npc),commitmentBroken:before==='active'};
  const en=adventure.language==='en',text=(en?`${before==='offered'?'Declined':'Abandoned'}: ${quest.title}.`:`${before==='offered'?'Задание отклонено':'Обязательство прекращено'}: ${quest.title}.`)+(command.reason?` ${command.reason}`:'');
  const event=model.addEvent(adventure,before==='offered'?'quest_decline':'quest_abandon',quest.id,text,{...quest.decision,previousStatus:before,giverId:quest.giverId});
  quest.terminalEventId=event.id;quest.decision.eventId=event.id;
  Object.assign(adventure.journal.find(row=>row.id===event.id),{...quest.decision,previousStatus:before,giverId:quest.giverId});
  if(npc){npc.receivedQuestDecisions||=[];npc.receivedQuestDecisions.push({eventId:event.id,questId:quest.id,status:quest.status,fromId:hero.id,...quest.decision});}
  return {type:command.type,quiet:!npc,elapsedSeconds:npc?600:0,text,questId:quest.id,status:quest.status,reason:command.reason,reasonConfidence:'player_statement',npcNotified:Boolean(npc),...(npc?{npcId:npc.id}:{})};
}
function available(service,state,adventure){
  if(state.combat)return [];
  const hero=state.party.members.find(m=>m.id===state.party.heroId);if(!canAct(hero))return [];
  const en=adventure.language==='en',checks=lore.publicChecks(state),actions=[];
  for(const q of adventure.quests){const type=q.status==='offered'?'decline_quest':q.status==='active'?'abandon_quest':null;if(type)actions.push({id:`${type}:${q.id}`,kind:'quest',questId:q.id,label:en?`${type==='decline_quest'?'Decline':'Abandon'}: ${q.title}`:`${type==='decline_quest'?'Отклонить':'Прекратить'}: ${q.title}`,command:{type,questId:q.id}});}
  for(const q of adventure.quests)for(const o of readyObjectives(q)){
    if(o.kind==='deliver'){
      const npc=adventure.npcs.find(n=>n.id===o.recipientId&&n.locationId===adventure.currentLocationId),items=eligible(hero,o.targetId),ownedQuantity=items.reduce((n,i)=>n+i.quantity,0),remaining=objectiveProgress(o).remainingQuantity,plans=allocations(hero,o.targetId,Math.min(20,remaining)),allowedQuantities=[...plans.keys()].filter(q=>q>0).sort((a,b)=>a-b),quantity=allowedQuantities[0],item=plans.get(quantity)?.[0].item,maxQuantity=allowedQuantities.at(-1);
      if(npc&&npcAvailable(adventure,npc)&&item&&maxQuantity)actions.push({id:`deliver:${q.id}:${o.id}`,kind:'quest',questId:q.id,objectiveId:o.id,maxQuantity,remainingQuantity:remaining,ownedQuantity,quantity,allowedQuantities,label:en?`Give ${quantity} × ${item.name} to ${npc.name}`:`Передать ${quantity} × ${item.name}: ${npc.name}`,command:{type:'deliver',questId:q.id,objectiveId:o.id,quantity}});
    }
    if(o.kind==='check')for(const definition of access.methods(adventure,[o.targetId,...(o.alternativeTargetIds||[])])){
      const id=definition.id,check=checks.find(c=>c.id===adventure.loreCheckIds[id]);
      if(definition?.trigger==='manual'&&definition.locationId===adventure.currentLocationId&&!check?.attempted&&(!definition.npcId||adventure.npcs.some(n=>n.id===definition.npcId&&n.locationId===adventure.currentLocationId)))actions.push({id:`scene-check:${id}`,kind:'quest',questId:q.id,objectiveId:o.id,label:`${definition.title} · ${definition.dc}`,command:{type:'scene_check',checkId:id}});
    }
  }
  for(const item of adventure.items.filter(i=>!i.collected&&i.locationId===adventure.currentLocationId))for(const c of item.access?.conditions||[]){
    if(c.kind!=='check')continue;for(const d of access.methods(adventure,[c.targetId])){const attempt=checks.find(a=>a.id===adventure.loreCheckIds[d.id]);
    if(d?.trigger==='manual'&&d.locationId===adventure.currentLocationId&&!attempt?.attempted&&(!d.npcId||adventure.npcs.some(n=>n.id===d.npcId&&n.locationId===adventure.currentLocationId))&&!actions.some(a=>a.id===`scene-check:${d.id}`))actions.push({id:`scene-check:${d.id}`,kind:'exploration',label:`${d.title} · ${d.dc}`,command:{type:'scene_check',checkId:d.id}});}
  }
  return actions;
}
function deliver(state,adventure,input){
  const bad=text=>{throw Object.assign(new Error(text),{status:400});};
  const parsed=deliverySchema.safeParse(input);
  if(!parsed.success)bad(parsed.error.issues.some(i=>i.path[0]==='quantity')?'Укажите целое количество от 1 до 20.':'Укажите задание и доступный этап передачи.');
  const command=parsed.data,quest=adventure.quests.find(q=>q.id===command.questId),objective=quest&&readyObjectives(quest).find(o=>o.id===command.objectiveId&&o.kind==='deliver');
  if(state.combat)bad('Передача предметов недоступна во время боя.');
  if(!objective)bad('Этот этап передачи ещё не доступен или уже завершён.');
  const hero=state.party.members.find(m=>m.id===state.party.heroId),npc=adventure.npcs.find(n=>n.id===objective.recipientId&&n.locationId===adventure.currentLocationId);
  if(!canAct(hero))bad('Герой сейчас не может передать предмет.');
  if(!npc)bad('Адресат сейчас не рядом.');
  if(!npcAvailable(adventure,npc))bad('Адресат сейчас не может принять предмет.');
  const remaining=objectiveProgress(objective).remainingQuantity;
  if(command.quantity>remaining)bad('Количество превышает остаток обязательства.');
  const items=eligible(hero,objective.targetId);
  if(!owned(hero,objective.targetId).length)bad('Нужного предмета нет в инвентаре.');
  if(items.reduce((n,i)=>n+i.quantity,0)<command.quantity)bad('Не хватает свободных предметов. Сначала снимите предмет и прекратите настройку.');
  const portions=allocations(hero,objective.targetId,Math.min(20,remaining)).get(command.quantity);
  if(!portions)bad('Старый общий запас зарядов нельзя разделить. Передайте этот экземпляр целиком или выберите отдельные вещи.');
  const eventIds=[];
  for(const {item,quantity}of portions){
    const transferred=structuredClone({...item,quantity});item.quantity-=quantity;
    const text=adventure.language==='en'?`${quantity} × ${item.name} was given to ${npc.name}.`:`Передано ${quantity} × «${item.name}»: ${npc.name}.`;
    const event=model.addEvent(adventure,'deliver',objective.targetId,text,{recipientId:npc.id,questId:quest.id,objectiveId:objective.id,inventoryItemId:item.itemId,fromId:hero.id,quantity,success:true});
    Object.assign(adventure.journal.find(row=>row.id===event.id),{recipientId:npc.id,questId:quest.id,objectiveId:objective.id,inventoryItemId:item.itemId,fromId:hero.id,quantity,success:true});
    npc.receivedItems||=[];npc.receivedItems.push({item:transferred,eventId:event.id,turn:adventure.turn,fromId:hero.id});eventIds.push(event.id);model.processQuestEvent(adventure,event);
  }
  hero.inventory=hero.inventory.filter(i=>i.quantity>0);
  if(objective.completed&&!objective.deliveryRelationshipApplied){npc.trust=Math.min(100,(npc.trust||0)+1);adventure.reputation[npc.locationId]=(Number.isFinite(adventure.reputation[npc.locationId])?adventure.reputation[npc.locationId]:0)+1;objective.deliveryRelationshipApplied=true;}
  const progress=objectiveProgress(objective),text=adventure.language==='en'?`Given ${command.quantity} × ${portions[0].item.name} to ${npc.name} (${progress.deliveredQuantity}/${progress.quantity}).`:`Передано ${command.quantity} × «${portions[0].item.name}»: ${npc.name} (${progress.deliveredQuantity}/${progress.quantity}).`;
  return {type:'deliver',text,recipientId:npc.id,itemId:objective.targetId,quantity:command.quantity,requiredQuantity:progress.quantity,deliveredQuantity:progress.deliveredQuantity,remainingQuantity:progress.remainingQuantity,evidenceEventIds:eventIds};
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
          event=adventure.events.find(e=>e.kind==='check'&&e.success===true&&access.targets(adventure,e.targetId).some(id=>ids.includes(id))&&access.successfulCheck(state,adventure,e.targetId));
        }else if(objective.kind==='acquire'){
          const held=owned(hero,objective.targetId).reduce((n,i)=>n+i.quantity,0);
          if(held){
            for(const evidence of adventure.events.filter(e=>model.isAcquisitionEvidence(e)&&e.targetId===objective.targetId&&e.source!=='inventory_confirmation')){
              const progress=objectiveProgress(objective),credit=Math.min(progress.remainingQuantity,evidence.quantity??1);
              if(!progress.evidenceEventIds.includes(evidence.id)&&progress.acquiredQuantity+credit<=held)model.processQuestEvent(adventure,{...evidence,questId:quest.id,objectiveId:objective.id,reconcileForObjective:true});
              if(objective.completed)break;
            }
            const progress=objectiveProgress(objective);
            if(!objective.completed&&held>progress.acquiredQuantity){
              const text=adventure.language==='en'?`Inventory confirmed now: the hero already carries ${held} × ${adventure.items.find(i=>i.id===objective.targetId)?.name||objective.targetId}.`:`Инвентарь подтверждён сейчас: герой уже несёт ${held} × «${adventure.items.find(i=>i.id===objective.targetId)?.name||objective.targetId}».`;
              const confirmation=model.addEvent(adventure,'acquire',objective.targetId,text,{source:'inventory_confirmation',quantity:Math.min(progress.remainingQuantity,held-progress.acquiredQuantity),confirmedHeldQuantity:held,questId:quest.id,objectiveId:objective.id,fromId:hero.id,success:true});
              Object.assign(adventure.journal.find(row=>row.id===confirmation.id),{source:'inventory_confirmation',quantity:confirmation.quantity,confirmedHeldQuantity:held,questId:quest.id,objectiveId:objective.id,fromId:hero.id,success:true});
              model.processQuestEvent(adventure,confirmation);
            }
          }
        }
        if(event)model.processQuestEvent(adventure,objective.kind==='check'?{...event,source:'scene_check'}:event);
      }
      if(quest.objectives.filter(o=>o.completed).length===before)break;
    }
  }
}
module.exports={available,deliver,validateDecision,decide,publicQuests,objectiveProgress,readyObjectives,reconcileEvidence,canAct};
