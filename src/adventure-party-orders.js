const {z}=require('zod');
const commandSchema=z.object({type:z.literal('party_order'),npcId:z.string().trim().min(1).max(160),mode:z.enum(['auto','conserve','defend','support','focus','cast']),targetId:z.string().trim().min(1).max(160).optional(),spellActionId:z.string().min(1).max(400).optional(),allowFriendlyFire:z.boolean().optional()}).strict().superRefine((value,ctx)=>{if(value.mode==='cast'?!value.spellActionId||value.targetId!==undefined:value.spellActionId!==undefined||value.allowFriendlyFire!==undefined)ctx.addIssue({code:'custom',message:'Exact cast orders require spellActionId only.'});});
let corePromise;const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
const modes=['auto','conserve','defend','support','focus','cast'];
function refuse(state,adventure,code,message){return {ok:false,state,adventure,refusal:{code,message,alternatives:['Выберите доступного спутника, цель или другой режим.']}};}
function record(adventure,id){return adventure.companions?.records?.find(r=>r.npcId===id);}
function active(state,adventure,id){const member=state.party.members.find(p=>p.id===id&&p.kind==='ally');const cached=record(adventure,id);return member&&cached&&(cached.joined||cached.state==='joined')?member:null;}
function canAct(actor,rules){return actor&&actor.hp.current>0&&!rules.isActionIncapacitated(actor)&&!actor.conditions.some(c=>['dead','fled','captured'].includes(c));}
function orderValue(value){if(value?.mode==='cast')return typeof value.spellActionId==='string'&&value.spellActionId.length<=400&&typeof value.directiveId==='string'&&value.directiveId.length<=100&&typeof value.combatId==='string'?{mode:'cast',spellActionId:value.spellActionId,directiveId:value.directiveId,combatId:value.combatId,...(value.allowFriendlyFire===true?{allowFriendlyFire:true}:{})}:{mode:'auto'};return value&&modes.includes(value.mode)?{mode:value.mode,...(value.targetId?{targetId:value.targetId}:{}),...(value.combatId?{combatId:value.combatId}:{})}:{mode:'auto'};}
function castActors(state,adventure,id,rules){
  const hero=state.party.members.find(p=>p.id===state.party.heroId),member=active(state,adventure,id),npc=adventure.npcs.find(n=>n.id===id),body=adventure.environment?.npcStates?.find(n=>n.npcId===id);
  const aware=p=>canAct(p,rules)&&!p.deathSaves?.dead&&!p.tactics?.surprised&&!p.conditions.some(c=>['possessed','charmed'].includes(c));
  if(!state.combat||!npc||npc.hidden||npc.locationId!==adventure.currentLocationId||npc.disposition==='hostile'||body?.disposition==='hostile'||!aware(hero)||!aware(member)||body?.body&&!aware(body.body))return null;
  const current=rules.currentCombatant(state.combat),actor=state.combat.participants.find(p=>(p.sourceCharacterId||p.id)===id);
  return current&&(current.sourceCharacterId||current.id)===hero.id&&aware(current)&&actor?.kind==='ally'&&aware(actor)?{hero,member,actor}:null;
}
function terminalResults(state){
  const raw=state.flags?.ui_companion_order_results;if(typeof raw!=='string'||raw.length>6000)return {};
  try{const parsed=JSON.parse(raw);if(!parsed||Array.isArray(parsed)||typeof parsed!=='object'||Object.keys(parsed).length>3)return {};const valid={};for(const [id,result] of Object.entries(parsed)){if(id.length<=160&&result&&['resolved','refused'].includes(result.status)&&typeof result.directiveId==='string'&&result.directiveId.length<=100&&typeof result.combatId==='string'&&typeof result.spellActionId==='string'&&result.spellActionId.length<=400&&typeof result.message==='string')valid[id]={directiveId:result.directiveId,combatId:result.combatId,spellActionId:result.spellActionId,status:result.status,message:result.message.slice(0,650)};}return valid;}catch{return {};}
}
function cancelled(order,adventure){return {directiveId:order.directiveId,combatId:order.combatId,spellActionId:order.spellActionId,status:'cancelled',message:adventure.language==='en'?'Queued spell order cancelled: the companion or encounter is no longer available.':'Поручение на заклинание отменено: спутник или прежний бой больше не доступны.'};}
function matchesResult(result,order){return result&&result.directiveId===order.directiveId&&result.combatId===order.combatId&&result.spellActionId===order.spellActionId;}
async function spellOptions(state,adventure,npcId){
  const rules=await core(),eligible=castActors(state,adventure,npcId,rules);if(!eligible)return [];
  // Even a pure core preview receives a disposable state; no speculative turn
  // can alter real round/budget/resources or run the actual spell resolver.
  return rules.companionSpellOrderOptions(structuredClone(state),npcId,{preview:true}).map(option=>{
    const match=option.id?.length<=400&&option.id.match(/^combat\.(action|bonus)\.cast_spell\.([^.]+)\.([^.]+)$/);
    if(!match)return null;
    return {id:option.id,label:option.label,spellId:match[2],targetId:match[3],cost:match[1]==='bonus'?'bonus_action':'action',...(option.area!==undefined?{area:structuredClone(option.area)}:{}),...(Array.isArray(option.affectedIds)?{affectedIds:option.affectedIds.slice(0,40)}:{}),...(typeof option.mayAffectAllies==='boolean'?{mayAffectAllies:option.mayAffectAllies}:{})};
  }).filter(Boolean);
}
function focusValid(state,id,order,rules){
  if(!state.combat||order.combatId!==state.combat.id)return false;
  const actor=state.combat.participants.find(p=>p.id===id||p.sourceCharacterId===id),target=state.combat.participants.find(p=>p.id===order.targetId);
  return Boolean(actor&&target&&target.kind==='enemy'&&rules.combatantStatusFlags(target).validAttackTarget&&!target.conditions.some(c=>['fled','captured'].includes(c))&&!rules.isCharmedBySource(actor,target.id)&&rules.combatDistanceBand(state.combat,actor.id,target.id)!=='out_of_range'&&state.combat.cover?.[actor.id]?.[target.id]!=='total'&&state.combat.cover?.[target.id]?.[actor.id]!=='total');
}
async function sync({state,adventure}){
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),rules=await core(),bridge={},results=terminalResults(nextState),consumed=[];
  for(const cached of nextAdventure.companions?.records||[]){
    let order=orderValue(cached.order);
    if(order.mode==='cast'){
      const result=results[cached.npcId];
      if(matchesResult(result,order)){cached.lastOrderResult=result;consumed.push({...result,npcId:cached.npcId});delete results[cached.npcId];order={mode:'auto'};}
      else {const npc=nextAdventure.npcs.find(n=>n.id===cached.npcId),actor=nextState.combat?.participants.find(p=>(p.sourceCharacterId||p.id)===cached.npcId);if(!active(nextState,nextAdventure,cached.npcId)||nextState.combat?.id!==order.combatId||!npc||npc.hidden||npc.locationId!==nextAdventure.currentLocationId||!actor||actor.kind!=='ally'){cached.lastOrderResult=cancelled(order,nextAdventure);consumed.push({...cached.lastOrderResult,npcId:cached.npcId});order={mode:'auto'};}}
    }
    if(order.mode==='focus'&&!focusValid(nextState,cached.npcId,order,rules))order={mode:'auto'};
    if(order.mode==='support'&&order.targetId&&!nextState.party.members.some(p=>p.id===order.targetId&&p.id!==cached.npcId&&!p.conditions.includes('dead')&&!p.deathSaves?.dead))order={mode:'support'};
    cached.order=order;
    if(active(nextState,nextAdventure,cached.npcId)&&Object.keys(bridge).length<3)bridge[cached.npcId]=order;
  }
  nextState.flags||={};nextState.flags.ui_companion_orders=JSON.stringify(bridge);
  if(typeof nextState.flags.ui_companion_order_results==='string')nextState.flags.ui_companion_order_results=JSON.stringify(results);
  return {ok:true,state:nextState,adventure:nextAdventure,outcome:{type:'party_orders_sync',orders:bridge,results:consumed}};
}
function publicStatus(state,adventure,npcId){
  const member=active(state,adventure,npcId);if(!member)return null;
  const order=orderValue(record(adventure,npcId).order),focusTarget=state.combat?.participants.find(p=>p.id===order.targetId),mode=order.mode==='focus'&&(!state.combat||order.combatId!==state.combat.id||!focusTarget||focusTarget.kind!=='enemy'||focusTarget.hp.current<=0||focusTarget.conditions.some(c=>['dead','fled','captured'].includes(c)))?'auto':order.mode;
  const hero=state.party.members.find(p=>p.id===state.party.heroId),current=state.combat?.participants[state.combat.turnIndex];
  const aware=p=>p&&p.hp.current>0&&!p.conditions.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','possessed','captured','fled'].includes(c))&&!p.tactics?.surprised;
  const hostile=adventure.npcs.find(n=>n.id===npcId)?.disposition==='hostile'||adventure.environment?.npcStates?.find(n=>n.npcId===npcId)?.disposition==='hostile';
  const canOrder=Boolean(aware(hero)&&aware(member)&&!hostile&&(!state.combat||(current.sourceCharacterId||current.id)===hero.id&&aware(current)));
  const accessible=member.spellcasting?.preparationMode==='prepared'?member.spellcasting.prepared:member.spellcasting?.known||[];
  const npc=adventure.npcs.find(n=>n.id===npcId),body=adventure.environment?.npcStates?.find(n=>n.npcId===npcId)?.body,actor=state.combat?.participants.find(p=>(p.sourceCharacterId||p.id)===npcId),canCast=Boolean(canOrder&&state.combat&&npc&&!npc.hidden&&npc.locationId===adventure.currentLocationId&&actor?.kind==='ally'&&aware(actor)&&(!body||aware(body))&&[hero,member,current,actor,body].filter(Boolean).every(p=>!p.deathSaves?.dead&&!p.conditions.includes('charmed')));
  return {npcId,mode,...(mode===order.mode?{targetId:order.targetId,combatId:order.combatId,spellActionId:order.spellActionId,directiveId:order.directiveId,...(order.allowFriendlyFire===true?{allowFriendlyFire:true}:{})}:{}),lastOrderResult:record(adventure,npcId).lastOrderResult?structuredClone(record(adventure,npcId).lastOrderResult):null,instructionOnly:true,canOrder,canCast,canFocus:canOrder&&Boolean(state.combat),canSupport:canOrder&&accessible.some(id=>['spell_healing_word','spell_cure_wounds'].includes(id)),limitations:mode==='cast'?(adventure.language==='en'?'The exact spell is checked again on the companion’s own turn; this preview does not guarantee execution.':'Точное заклинание будет повторно проверено на собственном ходе спутника; текущая доступность не гарантирует выполнение.'):mode==='support'?'Лечение нуждающегося союзника; иначе защита без атаки.':mode==='conserve'?'Заговоры и оружие; ячейка только для экстренной помощи союзнику при 0 HP.':mode==='focus'?'Выбранный противник в этом бою; после потери цели возврат к автоматическому режиму.':null};
}
async function resolve({state,adventure,command:input,sourceId}){
  const parsed=commandSchema.safeParse(input);if(!parsed.success||typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refuse(state,adventure,'invalid_party_order','Уточните спутника, допустимый режим и точную цель.');
  const command=parsed.data,previous=adventure.partyOrders?.history?.find(r=>r.sourceId===sourceId);if(previous){if(['npcId','mode','targetId','spellActionId'].some(key=>previous[key]!==command[key])||Boolean(previous.allowFriendlyFire)!==Boolean(command.allowFriendlyFire))return refuse(state,adventure,'order_replay_mismatch','Этот идентификатор уже принадлежит другому поручению.');return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(previous),replayed:true}};}
  const rules=await core(),hero=state.party.members.find(p=>p.id===state.party.heroId),member=active(state,adventure,command.npcId);if(!canAct(hero,rules)||!canAct(member,rules))return refuse(state,adventure,'order_actor_unavailable','Герой и указанный действующий спутник должны быть в сознании и способны действовать.');
  if(adventure.npcs.find(n=>n.id===member.id)?.disposition==='hostile'||adventure.environment?.npcStates?.find(n=>n.npcId===member.id)?.disposition==='hostile')return refuse(state,adventure,'order_actor_hostile','Этот персонаж сейчас враждует с героем и не принимает его поручения.');
  const actor=state.combat?.participants.find(p=>(p.sourceCharacterId||p.id)===member.id),current=state.combat&&rules.currentCombatant(state.combat);
  if(state.combat&&((current.sourceCharacterId||current.id)!==hero.id||!canAct(current,rules)||!actor||!canAct(actor,rules)))return refuse(state,adventure,'order_wrong_turn','Боевые поручения доступны только в собственный ход героя.');
  if(command.targetId&&!['support','focus'].includes(command.mode))return refuse(state,adventure,'order_unexpected_target','Этот режим не задаёт отдельную цель.');
  if(command.mode==='support'){
    const caster=actor?rules.syncCombatantToCharacter(member,actor):member;
    if(!rules.availableAutomatedSrdSpells(caster).some(id=>['spell_healing_word','spell_cure_wounds'].includes(id)))return refuse(state,adventure,'unsupported_support','Этот спутник не знает поддерживаемого лечебного заклинания.');
    if(command.targetId){const target=state.party.members.find(p=>p.id===command.targetId&&(p.kind==='ally'||p.id===hero.id));const combatTarget=state.combat?.participants.find(p=>(p.sourceCharacterId||p.id)===command.targetId);if(!target||target.id===member.id||target.conditions.includes('dead')||target.deathSaves?.dead||combatTarget?.conditions.includes('dead')||combatTarget?.deathSaves?.dead||(combatTarget||target).activeEffects?.some(e=>e.healingPrevented))return refuse(state,adventure,'support_target_unavailable','Для поддержки нужен живой союзник из действующего отряда без запрета лечения.');}
  }
  const chosen=command.mode==='cast'?(await spellOptions(state,adventure,member.id)).find(option=>option.id===command.spellActionId):null;
  if(command.mode==='cast'&&!chosen)return refuse(state,adventure,'cast_order_unavailable','Нужно выбрать точное доступное заклинание и цель действующего спутника в этом бою.');
  if(chosen?.mayAffectAllies&&command.allowFriendlyFire!==true)return refuse(state,adventure,'cast_friendly_fire','Это заклинание может затронуть союзников. Нужен явный выбор с разрешением риска для отряда.');
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),preference={mode:command.mode,...(command.targetId?{targetId:command.targetId}:{}),...(['focus','cast'].includes(command.mode)?{combatId:state.combat?.id}:{}),...(chosen?{spellActionId:chosen.id,directiveId:sourceId,...(command.allowFriendlyFire===true?{allowFriendlyFire:true}:{})}:{})};
  if(command.mode==='focus'&&!focusValid(state,member.id,preference,rules))return refuse(state,adventure,'focus_target_unavailable','Нужен существующий доступный противник именно этого боя; союзник, мёртвая или полностью закрытая цель не подходят.');
  const cached=record(nextAdventure,member.id);if(cached.order?.mode==='cast'){const results=terminalResults(nextState),pending=results[member.id];cached.lastOrderResult=matchesResult(pending,cached.order)?pending:cancelled(cached.order,nextAdventure);if(matchesResult(pending,cached.order)){delete results[member.id];nextState.flags.ui_companion_order_results=JSON.stringify(results);}}cached.order=preference;
  const synchronized=await sync({state:nextState,adventure:nextAdventure});
  const labels={auto:'действовать самостоятельно',conserve:'беречь ячейки',defend:'защищаться',support:'поддерживать союзников',focus:'сосредоточиться на указанном противнике',cast:chosen?.label};
  const english={auto:'act independently',conserve:'conserve spell slots',defend:'defend',support:'support allies',focus:'focus on the chosen enemy',cast:chosen?.label};
  const outcome={type:'party_order',sourceId,npcId:member.id,mode:command.mode,targetId:command.targetId,combatId:preference.combatId,...(chosen?{spellActionId:chosen.id,directiveId:sourceId,spellId:chosen.spellId,spellTargetId:chosen.targetId,cost:chosen.cost,...(command.allowFriendlyFire===true?{allowFriendlyFire:true}:{})}:{}),instructionOnly:true,quiet:true,elapsedSeconds:0,text:adventure.language==='en'?`${member.name}: ${english[command.mode]}. This preference applies on their next actual automatic turn.`:`${member.name} получает поручение: ${labels[command.mode]}. Оно действует на следующем собственном автоматическом ходу.`};
  synchronized.adventure.partyOrders||={history:[]};synchronized.adventure.partyOrders.history.push(outcome);synchronized.adventure.partyOrders.history=synchronized.adventure.partyOrders.history.slice(-200);
  return {ok:true,state:synchronized.state,adventure:synchronized.adventure,outcome};
}
module.exports={resolve,sync,publicStatus,spellOptions,commandSchema};
