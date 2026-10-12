const {z}=require('zod');
const crypto=require('node:crypto');
const MAX_QUANTITY=1000;
const id=z.string().trim().min(1).max(160);
const itemSchema=z.object({type:z.literal('party_item'),fromId:id,toId:id,itemId:id,quantity:z.number().int().min(1).max(MAX_QUANTITY)}).strict();
const gearSchema=z.object({type:z.literal('party_gear'),characterId:id,itemId:id,mode:z.enum(['equip','unequip'])}).strict();
const commandSchema=z.discriminatedUnion('type',[itemSchema,gearSchema]);
let corePromise;const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
const refuse=(state,adventure,code,message,alternatives=['Выберите доступного спутника или другую вещь.'])=>({ok:false,state,adventure,refusal:{code,message,alternatives}});
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])]));return value;}
function metadata(item){const {quantity,...properties}=item;return JSON.stringify(canonical(properties));}
function aware(member,rules){return member?.hp?.current>0&&!member.deathSaves?.dead&&!rules.isActionIncapacitated(member)&&!member.conditions?.some(c=>['dead','fled','captured'].includes(c));}
function combatControl(state,rules){
  if(!state.combat)return {combat:null,cost:null};
  const combat=rules.ensureTurnBudget(structuredClone(state.combat)),actor=rules.currentCombatant(combat);
  if(actor?.kind!=='player'||(actor.sourceCharacterId||actor.id)!==state.party.heroId)return {code:'not_hero_turn',message:'Передача в бою доступна только в текущий ход героя.'};
  if(!aware(actor,rules))return {code:'hero_unavailable',message:'Герой сейчас не может передать или подобрать вещь.'};
  const interaction=rules.spendObjectInteraction(combat.turnBudget),spent=interaction.ok?interaction:rules.spendAction(combat.turnBudget,'use_object');
  if(!spent.ok)return {code:'inventory_budget_spent',message:'В этом ходу уже потрачены взаимодействие с предметом и доступное действие.'};
  combat.turnBudget=spent.budget;return {combat,cost:interaction.ok?'object_interaction':'action',actorId:actor.id};
}
function inReach(state,id,rules){
  if(!state.combat||id===state.party.heroId)return true;
  const hero=state.combat.participants.find(p=>(p.sourceCharacterId||p.id)===state.party.heroId),other=state.combat.participants.find(p=>(p.sourceCharacterId||p.id)===id);
  return Boolean(hero&&other&&rules.combatDistanceBand(state.combat,hero.id,other.id)==='engaged');
}
function eligibility(state,adventure,memberId,rules,{allowRetrieval=false}={}){
  const member=state.party.members.find(m=>m.id===memberId);
  if(!member)return {code:'member_absent',message:'Передача доступна только между настоящими участниками отряда.'};
  if(memberId===state.party.heroId)return member.kind==='player'&&aware(member,rules)?{member}:{code:'hero_unavailable',message:'Герой сейчас не может распределять вещи.'};
  if(member.kind==='player')return {code:'human_inventory_private',message:'Инвентарь другого игрока нельзя менять этой командой.'};
  const record=adventure.companions?.records?.find(r=>r.npcId===memberId),npc=adventure.npcs.find(n=>n.id===memberId),body=adventure.environment?.npcStates?.find(r=>r.npcId===memberId);
  if(member.kind!=='ally'||record?.state!=='joined'||record.joined===false||record.character?.id!==memberId)return {code:'not_joined_companion',message:'Этот персонаж не является вступившим NPC-спутником.'};
  if(!npc||npc.hidden||npc.locationId!==adventure.currentLocationId)return {code:'companion_absent',message:'Выбранный спутник сейчас не находится рядом.'};
  const participant=state.combat?.participants.find(p=>(p.sourceCharacterId||p.id)===memberId);
  if(state.combat&&participant?.kind!=='ally')return {code:'companion_not_in_combat',message:'В этом бою нет выбранного NPC-спутника.'};
  if(!inReach(state,memberId,rules))return {code:'companion_out_of_reach',message:'Для физической передачи нужно находиться рядом со спутником.',alternatives:['Сначала подойдите к спутнику.']};
  if([member,body?.body,participant].filter(Boolean).some(p=>p.conditions?.some(c=>['captured','fled','possessed','possessing','petrified'].includes(c))))return {code:'companion_unavailable',message:'Положение спутника не позволяет безопасно распределять его вещи.'};
  const retrieval=[member,body?.body,participant].filter(Boolean).some(p=>p.hp.current===0||p.deathSaves?.dead||p.conditions?.some(c=>['dead','unconscious'].includes(c)));
  if(allowRetrieval&&retrieval)return {member,record,npc,retrieval:true};
  if(!aware(member,rules)||body&&!aware(body.body,rules)||participant&&!aware(participant,rules))return {code:'companion_unavailable',message:'Спутник должен быть живым и способным принять или передать вещь.'};
  if(npc.disposition==='hostile'||body?.disposition==='hostile')return {code:'companion_hostile',message:'Враждебный персонаж сейчас не согласен распределять вещи.'};
  return {member,record,npc};
}
function protectedItem(item,owner,adventure,quantity=1){
  if(String(item.itemId).startsWith('scene_prop_')||item.tags?.includes('scene_prop'))return {code:'physical_prop',message:'Предмет сцены требует отдельной физической передачи.',alternatives:['Оставьте предмет в сцене или выберите физическое действие.']};
  if(Object.values(owner.equipment||{}).includes(item.itemId)&&(item.charges||item.quantity-quantity<1))return {code:'equipped_item',message:'Нельзя передать последний используемый экземпляр, автоматически сняв его.',alternatives:['Передайте только запасные экземпляры или сначала явно снимите экипировку.']};
  if(item.attuned)return {code:'attuned_item',message:'Сначала прекратите настройку на предмет.',alternatives:['Явно прекратите настройку и повторите передачу.']};
  const tags=new Set(item.tags||[]),quest=(adventure.quests||[]).find(q=>['offered','active','accepted'].includes(q.status)&&q.objectives.some(o=>o.targetId&&(o.targetId===item.itemId||tags.has(o.targetId))));
  if(quest||tags.has('quest')||tags.has('quest_item')||item.protected||item.bound)return {code:'protected_quest_item',message:'Эта вещь защищена или связана с задачей; обычное распределение её не передаёт.',alternatives:['Используйте явную передачу адресату задания через действие deliver.']};
  if((adventure.items||[]).some(i=>i.access?.conditions?.some(c=>c.kind==='item'&&(c.targetId===item.itemId||tags.has(c.targetId)))))return {code:'required_key',message:'Эта вещь служит ключом к установленному препятствию.',alternatives:['Оставьте ключ у героя до завершения соответствующего действия.']};
  return null;
}
function sourceRows(owner,itemId){return owner.inventory.filter(item=>item.itemId===itemId);}
function attackIds(item){return item&&(item.tags?.some(tag=>['weapon','ranged'].includes(tag))||item.mechanics?.equip?.attack)?[item.itemId,`throw_${item.itemId}`,item.mechanics?.equip?.attack?.id].filter(Boolean):[];}
function ordinaryCoin(item){
  const fields=new Set(['itemId','name','quantity','defaultQuantity','weight','tags','description','identified','source','origin','provenance','rarity','attuned','requiresAttunement','bound','protected']);
  return Object.keys(item).every(key=>fields.has(key))&&!item.charges&&!item.mechanics&&!item.attuned&&!item.requiresAttunement&&!item.bound&&!item.protected&&item.identified!==false&&(!item.rarity||item.rarity==='common')&&(item.weight===undefined||Number.isFinite(item.weight)&&item.weight>=0&&item.weight<=0.02)&&(!item.tags||Array.isArray(item.tags)&&item.tags.every(tag=>['currency','treasure'].includes(tag)));
}
function checkedQuantity(rows,itemId){
  if(!rows.length)return {code:'item_absent',message:'У выбранного владельца нет такой вещи.'};
  if(rows.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1))return {code:'invalid_stack',message:'Количество в сохранённой стопке требует уточнения.'};
  const total=rows.reduce((sum,i)=>sum+i.quantity,0);if(!Number.isSafeInteger(total))return {code:'invalid_stack',message:'Количество слишком велико для безопасной передачи.'};
  if(itemId!=='gold_piece'&&rows.length!==1)return {code:'ambiguous_instance',message:'Несколько экземпляров имеют один ID; нужно сначала уточнить их отдельную принадлежность.'};
  if(rows.some(i=>i.charges)&&(rows.length!==1||total!==1))return {code:'ambiguous_charged_stack',message:'Заряженные вещи передаются только целым отдельным экземпляром.'};
  return {total};
}
function planTransfer(owner,recipient,adventure,itemId,quantity){
  const rows=sourceRows(owner,itemId),counts=checkedQuantity(rows,itemId);if(counts.code)return counts;
  for(const row of rows){const blocked=protectedItem(row,owner,adventure,quantity);if(blocked)return blocked;}
  if(quantity>counts.total)return {code:'not_enough_items',message:'У владельца нет запрошенного количества.'};
  if(rows.some(i=>i.charges)&&quantity!==1)return {code:'charged_instance_only',message:'Нельзя разделить заряды одного экземпляра между владельцами.'};
  let left=quantity;const fragments=[];
  for(const row of rows){if(!left)break;const amount=Math.min(left,row.quantity);fragments.push({...structuredClone(row),quantity:amount});left-=amount;}
  const existing=sourceRows(recipient,itemId);
  if(existing.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1))return {code:'invalid_recipient_stack',message:'Стопка получателя требует уточнения.'};
  if(itemId!=='gold_piece'&&existing.length){
    if(existing.length!==1||fragments[0].charges||existing[0].charges||metadata(existing[0])!==metadata(fragments[0]))return {code:'item_identity_collision',message:'У получателя уже есть вещь с этим ID и отдельными свойствами, зарядами или происхождением. Объединение запрещено.',alternatives:['Выберите другую вещь; отдельный экземпляр требует отдельного устойчивого ID.']};
    if(!Number.isSafeInteger(existing[0].quantity+quantity))return {code:'invalid_recipient_stack',message:'Итоговое количество слишком велико.'};
  }
  if(itemId==='gold_piece'&&[...rows,...existing].some(i=>!ordinaryCoin(i)))return {code:'nonstandard_currency',message:'Монеты с отдельными свойствами, зарядами или механикой требуют отдельного действия.'};
  const recipientTotal=existing.reduce((sum,i)=>sum+i.quantity,0);if(!Number.isSafeInteger(recipientTotal+quantity))return {code:'invalid_recipient_stack',message:'Итоговое количество слишком велико.'};
  return {fragments,total:counts.total};
}
async function resolve({state,adventure,command:input,sourceId}){
  if(input?.type==='party_gear')return resolveGear({state,adventure,command:input,sourceId});
  const parsed=itemSchema.safeParse(input);if(!parsed.success||typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refuse(state,adventure,'invalid_party_item','Укажите двух участников, точный ID вещи и целое количество от 1 до 1000.');
  const command=parsed.data,signature=crypto.createHash('sha256').update(JSON.stringify(canonical(command))).digest('hex');
  const previous=adventure.partyInventory?.history?.find(entry=>entry.sourceId===sourceId);
  if(previous)return previous.signature===signature?{ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(previous.outcome),replayed:true}}:refuse(state,adventure,'replay_mismatch','Этот идентификатор уже относится к другой передаче.');
  const rules=await core(),hero=eligibility(state,adventure,state.party.heroId,rules);if(hero.code)return refuse(state,adventure,hero.code,hero.message);
  const control=combatControl(state,rules);if(control.code)return refuse(state,adventure,control.code,control.message);
  if(command.fromId===command.toId)return refuse(state,adventure,'same_owner','Вещь уже у этого владельца.');
  const from=eligibility(state,adventure,command.fromId,rules,{allowRetrieval:command.toId===state.party.heroId}),to=eligibility(state,adventure,command.toId,rules);for(const participant of [from,to])if(participant.code)return refuse(state,adventure,participant.code,participant.message);
  const planned=planTransfer(from.member,to.member,adventure,command.itemId,command.quantity);if(planned.code)return refuse(state,adventure,planned.code,planned.message,planned.alternatives);
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),sender=nextState.party.members.find(m=>m.id===command.fromId),recipient=nextState.party.members.find(m=>m.id===command.toId);
  if(control.combat)nextState.combat=control.combat;
  let left=command.quantity;sender.inventory=sender.inventory.flatMap(item=>{if(item.itemId!==command.itemId||!left)return [item];const moved=Math.min(left,item.quantity);left-=moved;return item.quantity>moved?[{...item,quantity:item.quantity-moved}]:[];});
  if(!sender.inventory.some(item=>item.itemId===command.itemId&&item.quantity>0)){
    const removed=new Set(attackIds(planned.fragments[0]));sender.attacks=sender.attacks.filter(attack=>!removed.has(attack.id));
    if(nextState.combat)nextState.combat.participants=nextState.combat.participants.map(p=>(p.sourceCharacterId||p.id)===sender.id?{...p,attacks:p.attacks.filter(attack=>!removed.has(attack.id))}:p);
  }
  if(command.itemId==='gold_piece'){
    const coins=sourceRows(recipient,command.itemId),total=coins.reduce((sum,item)=>sum+item.quantity,0)+command.quantity;
    recipient.inventory=recipient.inventory.filter(item=>item.itemId!==command.itemId);recipient.inventory.push({...structuredClone(coins[0]||planned.fragments[0]),quantity:total});
  }else for(const fragment of planned.fragments){const same=recipient.inventory.find(item=>item.itemId===fragment.itemId&&metadata(item)===metadata(fragment)&&!item.charges);if(same)same.quantity+=fragment.quantity;else recipient.inventory.push(structuredClone(fragment));}
  // Do not write delivery receipts or earned-money ledgers. The joined party is authoritative;
  // update only cached Character copies, so dismissal/rejoin cannot restore the pre-share wallet.
  for(const member of [sender,recipient]){const record=nextAdventure.companions?.records?.find(r=>r.npcId===member.id&&r.state==='joined');if(record)record.character=structuredClone(member);}
  const currency=command.itemId==='gold_piece',walletDelta=currency?{fromId:sender.id,toId:recipient.id,amount:command.quantity,from:-command.quantity,to:command.quantity,heroDelta:sender.id===state.party.heroId?-command.quantity:recipient.id===state.party.heroId?command.quantity:0,internal:true}:null;
  const en=adventure.language==='en';
  const text=from.retrieval?(en?`${recipient.name} retrieved from fallen companion ${sender.name}: ${planned.fragments[0].name} ×${command.quantity}.`:`${recipient.name} забрал у упавшего спутника ${sender.name}: ${planned.fragments[0].name} ×${command.quantity}.`):(en?`${sender.name} gave ${recipient.name}: ${planned.fragments[0].name} ×${command.quantity}.`:`${sender.name} передал ${recipient.name}: ${planned.fragments[0].name} ×${command.quantity}.`);
  const outcome={type:'party_item',sourceId,actorId:state.party.heroId,fromId:sender.id,toId:recipient.id,itemId:command.itemId,quantity:command.quantity,itemName:planned.fragments[0].name,walletDelta,internal:true,quiet:true,retrieval:Boolean(from.retrieval),cost:control.cost,elapsedSeconds:state.combat?0:60,text};
  nextAdventure.partyInventory||={history:[]};nextAdventure.partyInventory.history.push({sourceId,signature,outcome:structuredClone(outcome),items:structuredClone(planned.fragments),...(currency?{recipientCoinsBefore:structuredClone(sourceRows(to.member,command.itemId))}:{})});
  return {ok:true,state:nextState,adventure:nextAdventure,outcome};
}
async function resolveGear({state,adventure,command:input,sourceId}){
  const parsed=gearSchema.safeParse(input);if(!parsed.success||typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refuse(state,adventure,'invalid_party_gear','Укажите участника, точный ID вещи и действие equip/unequip.');
  const command=parsed.data,signature=crypto.createHash('sha256').update(JSON.stringify(canonical(command))).digest('hex'),previous=adventure.partyInventory?.history?.find(e=>e.sourceId===sourceId);
  if(previous)return previous.signature===signature?{ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(previous.outcome),replayed:true}}:refuse(state,adventure,'replay_mismatch','Этот идентификатор уже относится к другому действию.');
  if(state.combat)return refuse(state,adventure,'party_gear_in_combat','В бою нужна отдельная экономика действий с предметами.');
  const rules=await core(),hero=eligibility(state,adventure,state.party.heroId,rules),chosen=eligibility(state,adventure,command.characterId,rules,{allowRetrieval:command.mode==='unequip'});
  for(const participant of [hero,chosen])if(participant.code)return refuse(state,adventure,participant.code,participant.message);
  const rows=sourceRows(chosen.member,command.itemId),quantity=checkedQuantity(rows,command.itemId);if(quantity.code)return refuse(state,adventure,quantity.code,quantity.message);
  const worn=Object.values(chosen.member.equipment||{}).includes(command.itemId);if(command.mode==='equip'&&worn||command.mode==='unequip'&&!worn)return refuse(state,adventure,'gear_already_in_state',command.mode==='equip'?'Эта вещь уже используется.':'Эта вещь уже снята.');
  if(String(command.itemId).startsWith('scene_prop_')||rows[0].tags?.includes('scene_prop'))return refuse(state,adventure,'physical_prop','Предмет сцены требует отдельного физического действия.');
  if(command.itemId==='gold_piece')return refuse(state,adventure,'gear_unavailable','Монеты не являются экипировкой.');
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),runner=new rules.RpgGameService(null,new Map()).runner;
  const gear=command.mode==='equip'?runner.equipItem(nextState,command.itemId,command.characterId):runner.dropItem(nextState,command.itemId,quantity.total,command.characterId);
  if(!gear.ok)return refuse(state,adventure,'gear_unavailable',gear.message);
  const changed=gear.state.party.members.find(member=>member.id===command.characterId);
  if(command.mode==='equip'){
    const wornIds=new Set(Object.values(changed.equipment||{})),removed=new Set();
    for(const oldId of new Set(Object.values(chosen.member.equipment||{})))if(!wornIds.has(oldId))for(const attackId of attackIds(chosen.member.inventory.find(item=>item.itemId===oldId)))removed.add(attackId);
    changed.attacks=changed.attacks.filter(attack=>!removed.has(attack.id));
  }
  if(command.mode==='unequip'){
    changed.inventory=structuredClone(chosen.member.inventory);
    const modeled=rows[0].mechanics?.equip?.attack?.id;if(modeled)changed.attacks=changed.attacks.filter(attack=>attack.id!==modeled);
  }
  // Equipping/removing gear may change AC/attacks/speed, but never revive or refill a patient.
  for(const field of ['hp','conditions','conditionInstances','deathSaves','resources','spellcasting','activeEffects'])if(chosen.member[field]!==undefined)changed[field]=structuredClone(chosen.member[field]);
  const cached=nextAdventure.companions?.records?.find(record=>record.npcId===changed.id&&record.state==='joined');if(cached)cached.character=structuredClone(changed);
  const en=adventure.language==='en',text=en?`${changed.name} ${command.mode==='equip'?'equips':'removes'} ${rows[0].name}.`:`${changed.name} ${command.mode==='equip'?'использует':'снимает'} ${rows[0].name}.`;
  const outcome={type:'party_gear',sourceId,actorId:state.party.heroId,characterId:changed.id,itemId:command.itemId,mode:command.mode,retrieval:Boolean(chosen.retrieval),internal:true,quiet:true,elapsedSeconds:6,text};
  nextAdventure.partyInventory||={history:[]};nextAdventure.partyInventory.history.push({sourceId,signature,outcome:structuredClone(outcome)});
  return {ok:true,state:gear.state,adventure:nextAdventure,outcome};
}
async function publicOptions({state,adventure}){
  const rules=await core(),hero=eligibility(state,adventure,state.party.heroId,rules);
  const control=combatControl(state,rules);
  if(control.code||hero.code)return {available:false,participants:[],maxQuantity:MAX_QUANTITY,inCombat:Boolean(state.combat),reason:control.message||hero.message};
  const runner=new rules.RpgGameService(null,new Map()).runner;
  const participants=state.party.members.filter(member=>!eligibility(state,adventure,member.id,rules,{allowRetrieval:true}).code).map(member=>({id:member.id,name:member.name,kind:member.id===state.party.heroId?'hero':'companion',canReceive:!eligibility(state,adventure,member.id,rules).code,retrieval:Boolean(eligibility(state,adventure,member.id,rules,{allowRetrieval:true}).retrieval),items:[...new Set(member.inventory.map(i=>i.itemId))].map(itemId=>{
    const rows=sourceRows(member,itemId),count=checkedQuantity(rows,itemId);let blocked=count.code?count:rows.map(item=>protectedItem(item,member,adventure)).find(Boolean);
    if(itemId==='gold_piece'&&rows.some(item=>!ordinaryCoin(item)))blocked={code:'nonstandard_currency',message:'Эти монеты имеют отдельные свойства и требуют отдельного действия.'};
    const equipped=Object.values(member.equipment||{}).includes(itemId),retrieval=Boolean(eligibility(state,adventure,member.id,rules,{allowRetrieval:true}).retrieval);
    let canEquip=false;if(!state.combat&&!count.code&&!equipped&&!retrieval&&itemId!=='gold_piece')try{canEquip=runner.equipItem(structuredClone(state),itemId,member.id).ok;}catch{}
    return {itemId,name:rows[0].name,quantity:count.total||0,maxQuantity:blocked?0:Math.min(count.total-(equipped?1:0),rows[0].charges?1:MAX_QUANTITY),blocked:blocked?.message||null,code:blocked?.code||null,alternatives:blocked?.alternatives||[],equipped,canEquip:Boolean(canEquip),canUnequip:!state.combat&&equipped&&!count.code};
  })}));
  return {available:participants.length>1,participants,maxQuantity:MAX_QUANTITY,inCombat:Boolean(state.combat),cost:control.cost};
}
module.exports={resolve,resolveGear,publicOptions,publicState:publicOptions,commandSchema,MAX_QUANTITY};
