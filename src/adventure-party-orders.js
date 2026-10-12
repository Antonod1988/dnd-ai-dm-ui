const {z}=require('zod');
const commandSchema=z.object({type:z.literal('party_order'),npcId:z.string().trim().min(1).max(160),mode:z.enum(['auto','conserve','defend','support','focus']),targetId:z.string().trim().min(1).max(160).optional()}).strict();
let corePromise;const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
const modes=['auto','conserve','defend','support','focus'];
function refuse(state,adventure,code,message){return {ok:false,state,adventure,refusal:{code,message,alternatives:['Выберите доступного спутника, цель или другой режим.']}};}
function record(adventure,id){return adventure.companions?.records?.find(r=>r.npcId===id);}
function active(state,adventure,id){const member=state.party.members.find(p=>p.id===id&&p.kind==='ally');const cached=record(adventure,id);return member&&cached&&(cached.joined||cached.state==='joined')?member:null;}
function canAct(actor,rules){return actor&&actor.hp.current>0&&!rules.isActionIncapacitated(actor)&&!actor.conditions.some(c=>['dead','fled','captured'].includes(c));}
function orderValue(value){return value&&modes.includes(value.mode)?{mode:value.mode,...(value.targetId?{targetId:value.targetId}:{}),...(value.combatId?{combatId:value.combatId}:{})}:{mode:'auto'};}
function focusValid(state,id,order,rules){
  if(!state.combat||order.combatId!==state.combat.id)return false;
  const actor=state.combat.participants.find(p=>p.id===id||p.sourceCharacterId===id),target=state.combat.participants.find(p=>p.id===order.targetId);
  return Boolean(actor&&target&&target.kind==='enemy'&&rules.combatantStatusFlags(target).validAttackTarget&&!target.conditions.some(c=>['fled','captured'].includes(c))&&!rules.isCharmedBySource(actor,target.id)&&rules.combatDistanceBand(state.combat,actor.id,target.id)!=='out_of_range'&&state.combat.cover?.[actor.id]?.[target.id]!=='total'&&state.combat.cover?.[target.id]?.[actor.id]!=='total');
}
async function sync({state,adventure}){
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),rules=await core(),bridge={};
  for(const cached of nextAdventure.companions?.records||[]){
    let order=orderValue(cached.order);
    if(order.mode==='focus'&&!focusValid(nextState,cached.npcId,order,rules))order={mode:'auto'};
    if(order.mode==='support'&&order.targetId&&!nextState.party.members.some(p=>p.id===order.targetId&&p.id!==cached.npcId&&!p.conditions.includes('dead')&&!p.deathSaves?.dead))order={mode:'support'};
    cached.order=order;
    if(active(nextState,nextAdventure,cached.npcId)&&Object.keys(bridge).length<3)bridge[cached.npcId]=order;
  }
  nextState.flags||={};nextState.flags.ui_companion_orders=JSON.stringify(bridge);
  return {ok:true,state:nextState,adventure:nextAdventure,outcome:{type:'party_orders_sync',orders:bridge}};
}
function publicStatus(state,adventure,npcId){
  const member=active(state,adventure,npcId);if(!member)return null;
  const order=orderValue(record(adventure,npcId).order),focusTarget=state.combat?.participants.find(p=>p.id===order.targetId),mode=order.mode==='focus'&&(!state.combat||order.combatId!==state.combat.id||!focusTarget||focusTarget.kind!=='enemy'||focusTarget.hp.current<=0||focusTarget.conditions.some(c=>['dead','fled','captured'].includes(c)))?'auto':order.mode;
  const hero=state.party.members.find(p=>p.id===state.party.heroId),current=state.combat?.participants[state.combat.turnIndex];
  const aware=p=>p&&p.hp.current>0&&!p.conditions.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','possessed','captured','fled'].includes(c))&&!p.tactics?.surprised;
  const hostile=adventure.npcs.find(n=>n.id===npcId)?.disposition==='hostile'||adventure.environment?.npcStates?.find(n=>n.npcId===npcId)?.disposition==='hostile';
  const canOrder=Boolean(aware(hero)&&aware(member)&&!hostile&&(!state.combat||(current.sourceCharacterId||current.id)===hero.id&&aware(current)));
  const accessible=member.spellcasting?.preparationMode==='prepared'?member.spellcasting.prepared:member.spellcasting?.known||[];
  return {npcId,mode,...(mode===order.mode?{targetId:order.targetId,combatId:order.combatId}:{}),instructionOnly:true,canOrder,canFocus:canOrder&&Boolean(state.combat),canSupport:canOrder&&accessible.some(id=>['spell_healing_word','spell_cure_wounds'].includes(id)),limitations:mode==='support'?'Лечение нуждающегося союзника; иначе защита без атаки.':mode==='conserve'?'Заговоры и оружие; ячейка только для экстренной помощи союзнику при 0 HP.':mode==='focus'?'Выбранный противник в этом бою; после потери цели возврат к автоматическому режиму.':null};
}
async function resolve({state,adventure,command:input,sourceId}){
  const parsed=commandSchema.safeParse(input);if(!parsed.success||typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refuse(state,adventure,'invalid_party_order','Уточните спутника, допустимый режим и точную цель.');
  const command=parsed.data,previous=adventure.partyOrders?.history?.find(r=>r.sourceId===sourceId);if(previous)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(previous),replayed:true}};
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
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),preference={mode:command.mode,...(command.targetId?{targetId:command.targetId}:{}),...(command.mode==='focus'?{combatId:state.combat?.id}:{})};
  if(command.mode==='focus'&&!focusValid(state,member.id,preference,rules))return refuse(state,adventure,'focus_target_unavailable','Нужен существующий доступный противник именно этого боя; союзник, мёртвая или полностью закрытая цель не подходят.');
  record(nextAdventure,member.id).order=preference;
  const synchronized=await sync({state:nextState,adventure:nextAdventure});
  const labels={auto:'действовать самостоятельно',conserve:'беречь ячейки',defend:'защищаться',support:'поддерживать союзников',focus:'сосредоточиться на указанном противнике'};
  const english={auto:'act independently',conserve:'conserve spell slots',defend:'defend',support:'support allies',focus:'focus on the chosen enemy'};
  const outcome={type:'party_order',sourceId,npcId:member.id,mode:command.mode,targetId:command.targetId,combatId:preference.combatId,instructionOnly:true,quiet:true,elapsedSeconds:0,text:adventure.language==='en'?`${member.name}: ${english[command.mode]}. This preference applies on their next actual automatic turn.`:`${member.name} получает поручение: ${labels[command.mode]}. Оно действует на следующем собственном автоматическом ходу.`};
  synchronized.adventure.partyOrders||={history:[]};synchronized.adventure.partyOrders.history.push(outcome);synchronized.adventure.partyOrders.history=synchronized.adventure.partyOrders.history.slice(-200);
  return {ok:true,state:synchronized.state,adventure:synchronized.adventure,outcome};
}
module.exports={resolve,sync,publicStatus,commandSchema};
