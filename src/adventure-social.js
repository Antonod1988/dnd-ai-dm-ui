const {z}=require('zod');
const crypto=require('node:crypto');
const commandSchema=z.object({npcId:z.string().trim().min(1).max(160),goal:z.enum(['deescalate','rapport']),approach:z.enum(['persuasion','deception','intimidation','restitution']),statement:z.string().max(600).optional(),coins:z.number().int().min(1).max(20).optional(),propIds:z.array(z.string().trim().min(1).max(160)).min(1).max(3).optional()}).strict();
const MATERIAL_COST={ceramic:2,glass:2,wood:2,metal:5,stone:1,cloth:1};
const LIMIT=200;
let corePromise;const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);
function store(adventure){adventure.social||={attempts:[],history:[],settlements:[]};return adventure.social;}
function recordFor(adventure,npcId){return adventure.environment?.npcStates?.find(r=>r.npcId===npcId);}
function disposition(adventure,npc){return npc.disposition||recordFor(adventure,npc.id)?.disposition||'neutral';}
function liability(adventure,npcId,propIds=[]){
  const record=recordFor(adventure,npcId),body=record?.body;
  const props=(adventure.environment?.props||[]).filter(p=>(p.ownerNpcId===npcId||propIds.includes(p.id))&&p.condition==='broken'&&!p.restitutionPaid);
  const harms=(adventure.environment?.consequences||[]).filter(c=>c.targetId===npcId&&Number(c.hpDamage??c.damage)>0&&!c.socialSettled);
  const missing=Math.max(0,(body?.hp?.max||0)-(body?.hp?.current||0));
  const injuryHpTotal=record?.injuryHpTotal??missing;
  const unpaidMissing=Math.max(0,injuryHpTotal-(record?.socialPaidInjuryHp??record?.socialPaidWoundHp??0));
  const recordedHp=harms.reduce((sum,c)=>sum+Math.max(0,c.hpDamage??c.damage),0);
  // A healing spell does not erase established bodily aggression. Current
  // wounds can also be owed when damage came from ordinary catalog combat.
  const damageHp=Math.min(20,Math.max(unpaidMissing,recordedHp));
  const propertyCost=props.reduce((sum,p)=>sum+(MATERIAL_COST[p.material]||1),0);
  const dueCoins=Math.min(20,Math.ceil(damageHp*5+propertyCost));
  const serious=damageHp>=2;
  return {dueCoins,minimumPayable:dueCoins,serious,damageHp,props,harms,missing,injuryHpTotal};
}
function physicalSignature(adventure,npc){
  const body=recordFor(adventure,npc.id)?.body;
  return hash({npcId:npc.id,locationId:npc.locationId,body:body?{hp:body.hp,conditions:body.conditions,ac:body.ac}:null,
    receivedCoins:npc.receivedCoins||0,receivedItems:(npc.receivedItems||[]).map(r=>({eventId:r.eventId,itemId:r.item?.itemId,quantity:r.item?.quantity})),
    props:(adventure.environment?.props||[]).filter(p=>p.ownerNpcId===npc.id||p.restitutionClaim?.npcId===npc.id).map(p=>({id:p.id,condition:p.condition,paid:p.restitutionPaid?.sourceId,acknowledged:p.restitutionClaim?.sourceId})),
    aggression:(adventure.environment?.consequences||[]).filter(c=>c.targetId===npc.id).map(c=>({id:c.id||c.sourceId,damage:c.damage||0,paid:c.socialSettledSourceId})),
    injuryHpTotal:recordFor(adventure,npc.id)?.injuryHpTotal,paidInjuryHp:recordFor(adventure,npc.id)?.socialPaidInjuryHp??recordFor(adventure,npc.id)?.socialPaidWoundHp??0});
}
function refusal(state,adventure,code,message,alternatives=['Выберите другой доступный подход или отступите.']){return {ok:false,state,adventure,refusal:{code,message,alternatives}};}
function relation(adventure,npc){const record=recordFor(adventure,npc.id);return {trust:Number(npc.trust)||0,disposition:disposition(adventure,npc),hp:record?.body?.hp,conditions:record?.body?.conditions||[]};}
function publicStatus(adventure,npcId){
  const npc=adventure.npcs.find(n=>n.id===npcId);if(!npc)return null;
  if(npc.hidden)return {npcId,available:false,dueCoins:0,minimumPayable:0,serious:false,claimableDamage:[],supported:{deescalate:false,rapport:false,restitution:false},lastOutcome:null};
  const owed=liability(adventure,npcId),body=recordFor(adventure,npcId)?.body;
  const available=npc.locationId===adventure.currentLocationId&&(!body||(body.hp.current>0&&!body.conditions.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','captured','fled','possessed'].includes(c))));
  const last=adventure.social?.history?.findLast(r=>r.npcId===npcId);
  const signature=physicalSignature(adventure,npc),episode=npc.socialEpisode?.signature===signature?npc.socialEpisode:null;
  const used=(goal,approach)=>episode?.attemptedMethods?.includes(`${goal}:${approach}`)||adventure.social?.attempts?.some(a=>a.npcId===npcId&&a.goal===goal&&a.approach===approach&&a.physicalSignature===signature);
  const canDeescalate=available&&!owed.serious&&disposition(adventure,npc)==='hostile';
  const canRapport=available&&disposition(adventure,npc)!=='hostile'&&!episode?.rapportEstablished;
  const claimableDamage=available?(adventure.environment?.props||[]).filter(p=>p.locationId===adventure.currentLocationId&&p.visibility!=='hidden'&&p.condition==='broken'&&!p.ownerNpcId&&!p.restitutionPaid&&!p.restitutionClaim).slice(0,3).map(p=>({propId:p.id,name:String(p.name||p.id).slice(0,100),coins:MATERIAL_COST[p.material]||1})):[];
  return {npcId,available,trust:Number(npc.trust)||0,disposition:disposition(adventure,npc),dueCoins:owed.dueCoins,minimumPayable:owed.minimumPayable,serious:owed.serious,
    claimableDamage,
    availableApproaches:{deescalate:canDeescalate?['persuasion','deception','intimidation'].filter(a=>!used('deescalate',a)):[],rapport:canRapport?['persuasion','deception'].filter(a=>!used('rapport',a)):[]},
    liability:{serious:owed.serious,recordedInjuryHp:owed.damageHp,propertyDamageCount:owed.props.length},
    supported:available?{deescalate:disposition(adventure,npc)==='hostile'&&!owed.serious,rapport:disposition(adventure,npc)!=='hostile',restitution:owed.dueCoins>0||claimableDamage.length>0}: {deescalate:false,rapport:false,restitution:false},
    changes:last?.changes||null,lastOutcome:last?{sourceId:last.sourceId,goal:last.goal,approach:last.approach,success:last.success,check:last.check,coinsPaid:last.coinsPaid||0,text:last.text}:null};
}
function money(hero){return hero.inventory.filter(i=>i.itemId==='gold_piece').reduce((n,i)=>n+i.quantity,0);}
function transferCoins(hero,npc,adventure,coins){
  let remaining=coins;
  hero.inventory=hero.inventory.flatMap(item=>{if(item.itemId!=='gold_piece')return [item];const paid=Math.min(item.quantity,remaining);remaining-=paid;const quantity=item.quantity-paid;return quantity>0?[{...item,quantity}]:[];});
  npc.receivedCoins=(npc.receivedCoins||0)+coins;
  const market=adventure.economy?.markets?.find(m=>m.merchantId===npc.id&&m.locationId===npc.locationId);if(market)market.cash=(Number(market.cash)||0)+coins;
}

async function resolve({state,adventure,command:input,sourceId,seed}){
  const checked=commandSchema.safeParse(input);
  if(!checked.success||typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refusal(state,adventure,'invalid_social_command','Уточните персонажа, цель, подход и сумму от одной до двадцати монет.');
  const command=checked.data;
  if(command.propIds&&command.approach!=='restitution')return refusal(state,adventure,'unexpected_damage_claim','Признание возмещения за предметы относится только к явному возмещению.');
  if(command.propIds&&new Set(command.propIds).size!==command.propIds.length)return refusal(state,adventure,'duplicate_damage_claim','Один разбитый предмет нельзя оплатить дважды в одном предложении.');
  const replay=adventure.social?.history?.find(r=>r.sourceId===sourceId);
  if(replay)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(replay),replayed:true}};
  if(state.combat)return refusal(state,adventure,'social_in_combat','Сначала завершите бой; этот разговор требует спокойного времени.');
  const rules=await core(),hero=state.party.members.find(p=>p.id===state.party.heroId);
  if(!hero||hero.hp.current<=0||rules.isActionIncapacitated(hero)||hero.conditions.some(c=>['fled','captured'].includes(c)))return refusal(state,adventure,'hero_unavailable','Герой сейчас не может вести этот разговор.');
  const npc=adventure.npcs.find(n=>n.id===command.npcId&&n.locationId===adventure.currentLocationId&&!n.hidden);
  if(!npc)return refusal(state,adventure,'npc_absent','Этот персонаж сейчас не находится рядом.');
  const existing=recordFor(adventure,npc.id);
  if(existing&&(existing.body.hp.current<=0||rules.isActionIncapacitated(existing.body)||existing.body.conditions.some(c=>['fled','captured','dead'].includes(c))))return refusal(state,adventure,'npc_unavailable','Этот персонаж сейчас не может осознанно ответить.');
  for(const propId of command.propIds||[]){
    const prop=adventure.environment?.props?.find(p=>p.id===propId);
    if(!prop||prop.locationId!==adventure.currentLocationId||prop.visibility==='hidden'||prop.condition!=='broken')return refusal(state,adventure,'invalid_damage_claim','Для этого признания нужен существующий видимый разбитый предмет в текущей сцене.');
    if(prop.restitutionPaid||prop.restitutionClaim)return refusal(state,adventure,'damage_already_settled','Этот разбитый предмет уже возмещён; его нельзя оплатить ещё раз другому персонажу.');
    if(prop.ownerNpcId&&prop.ownerNpcId!==npc.id)return refusal(state,adventure,'damage_wrong_owner','У этого предмета уже установлен другой владелец.', ['Выберите установленного владельца или другой действительно разбитый предмет.']);
  }
  if(command.goal==='rapport'&&command.approach==='intimidation')return refusal(state,adventure,'intimidation_not_rapport','Запугивание не создаёт дружбу.', ['Выберите убеждение или другой доброжелательный подход.']);
  if(command.goal==='rapport'&&disposition(adventure,npc)==='hostile')return refusal(state,adventure,'hostile_rapport','Сначала нужно прекратить вражду; расположение нельзя получить вместо примирения.');
  if(command.goal==='deescalate'&&command.approach!=='restitution'&&disposition(adventure,npc)!=='hostile')return refusal(state,adventure,'no_conflict','Этот персонаж уже не враждует с героем. Повторное примирение не создаёт дополнительного доверия.', ['Попробуйте обычный разговор или установление расположения.']);
  const owed=liability(adventure,npc.id,command.propIds),signature=physicalSignature(adventure,npc),attemptKey=`${npc.id}:${command.goal}:${command.approach}:${signature}`;
  const methodKey=`${command.goal}:${command.approach}`;
  const episode=npc.socialEpisode?.signature===signature?npc.socialEpisode:null;
  if(episode?.attemptedMethods?.includes(methodKey)||npc.socialAttemptSignatures?.[methodKey]===signature||adventure.social?.attempts?.some(a=>a.key===attemptKey))return refusal(state,adventure,'social_attempt_locked','Этот подход уже проверен в тех же обстоятельствах. Новые слова не дают повторного броска.', ['Попробуйте действительно другой подход или измените реальные обстоятельства.']);
  if(command.approach!=='restitution'&&command.goal==='deescalate'&&owed.serious)return refusal(state,adventure,'restitution_required','После серьёзного причинённого вреда одних слов недостаточно.', [`Сначала возместите установленный вред: ${owed.dueCoins} монет.`,`После этого можно отдельно попытаться примириться.`]);
  if(command.approach!=='restitution'&&command.goal==='rapport'&&(episode?.rapportEstablished||npc.socialRapportSignature===signature||adventure.social?.history?.some(r=>r.npcId===npc.id&&r.goal==='rapport'&&r.approach!=='restitution'&&r.success&&r.physicalSignature===signature)))return refusal(state,adventure,'rapport_already_established','В этих обстоятельствах расположение уже получено. Менять способ разговора ради новых очков доверия не получится.');
  if(command.approach==='restitution'){
    if(!owed.dueCoins)return refusal(state,adventure,'nothing_to_restitute','Нет установленного вреда, который нужно оплатить.');
    if(command.coins!==owed.minimumPayable)return refusal(state,adventure,'incorrect_restitution',`Для возмещения установленного вреда нужна точная сумма: ${owed.minimumPayable} монет.`, [`Предложите ${owed.minimumPayable} монет или выберите другой подход.`]);
    if(money(hero)<command.coins)return refusal(state,adventure,'not_enough_coins','У героя недостаточно настоящих монет для этого возмещения.');
  }else if(command.coins!==undefined)return refusal(state,adventure,'unexpected_payment','Монеты передаются только явным подходом «возмещение».');
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),nextNpc=nextAdventure.npcs.find(n=>n.id===npc.id),ledger=store(nextAdventure),before=relation(adventure,npc);
  let check=null,success,coinsPaid=0,text;
  if(command.approach==='restitution'){
    coinsPaid=command.coins;transferCoins(nextState.party.members.find(p=>p.id===hero.id),nextNpc,nextAdventure,coinsPaid);
    for(const prop of owed.props){const nextProp=nextAdventure.environment.props.find(p=>p.id===prop.id);nextProp.restitutionPaid={npcId:npc.id,sourceId,coins:MATERIAL_COST[prop.material]||1};if(command.propIds?.includes(prop.id))nextProp.restitutionClaim={npcId:npc.id,sourceId,playerAcknowledged:true};}
    for(const harm of owed.harms){const row=nextAdventure.environment.consequences.find(c=>c===harm||((c.id||c.sourceId)===(harm.id||harm.sourceId)&&c.targetId===npc.id));row.socialSettled=true;row.socialSettledSourceId=sourceId;}
    const nextRecord=recordFor(nextAdventure,npc.id);if(nextRecord){nextRecord.socialPaidInjuryHp=Math.max(nextRecord.socialPaidInjuryHp||0,owed.injuryHpTotal);nextRecord.socialPaidWoundHp=Math.max(nextRecord.socialPaidWoundHp||0,owed.missing);}
    nextNpc.trust=Math.max(nextNpc.trust||0,Math.min(10,(nextNpc.trust||0)+Math.min(5,Math.max(1,Math.floor(coinsPaid/2)))));
    success=true;text=adventure.language==='en'?`${npc.name} receives ${coinsPaid} coins for acknowledged harm. This is restitution, not a promise of forgiveness.`:`${npc.name} получает ${coinsPaid} ${coinsPaid===1?'монету':coinsPaid>=2&&coinsPaid<=4?'монеты':'монет'} за установленный вред. Это возмещение, а не обещание прощения.`;
    ledger.settlements.push({sourceId,npcId:npc.id,coinsPaid,propertyIds:owed.props.map(p=>p.id),acknowledgedPropIds:command.propIds||[],harmIds:owed.harms.map(c=>c.id||c.sourceId),woundHp:owed.missing});ledger.settlements=ledger.settlements.slice(-LIMIT);
  }else{
    const attitude=disposition(adventure,npc),trust=Number(npc.trust)||0,profile=existing?.profile||npc.combatProfile||'civilian';
    const dc=Math.max(10,Math.min(22,10+(attitude==='hostile'?5:attitude==='neutral'?2:0)+Math.min(4,Math.floor(Math.max(0,-trust)/10))+Math.min(4,owed.damageHp)+(existing?.body.hp.current<existing?.body.hp.max?2:0)+(['guard','brute','arcanist'].includes(profile)?1:0)-Math.min(2,Math.floor(Math.max(0,trust)/5))));
    const result=rules.rollStateAbilityCheck(nextState,nextState.party.members.find(p=>p.id===hero.id),{ability:'cha',skill:command.approach,dc,rng:new rules.SeededRng(seed===undefined?sourceId:seed),rules:nextState.campaign.rules});
    Object.assign(nextState,result.state);check=result.check;success=check.success;
    nextState.rollLog=[...(nextState.rollLog||[]),...rules.abilityCheckRollLogs(hero.id,`Social: ${npc.name} / ${command.approach}`,check)];
    if(command.approach==='intimidation'){nextNpc.trust=Math.max(-100,(nextNpc.trust||0)-(success?2:3));if(success)nextNpc.socialCompliance={sourceId,kind:'keep_distance',statementClaimed:command.statement||''};}
    else if(success)nextNpc.trust=Math.max(nextNpc.trust||0,Math.min(10,(nextNpc.trust||0)+2));
    else nextNpc.trust=Math.max(-100,(nextNpc.trust||0)-1);
    if(success&&command.goal==='deescalate')nextNpc.disposition='neutral';
    text=adventure.language==='en'?(success?(command.approach==='intimidation'?`${npc.name} backs down and keeps their distance. This is not friendship.`:command.goal==='deescalate'?`${npc.name} ends the hostility. Wounds and earlier events remain.`:`The conversation slightly improves ${npc.name}'s trust.`):`${npc.name} does not accept this approach. The check did not establish friendship or forgiveness.`):success?(command.approach==='intimidation'?`${npc.name} уступает и держит дистанцию. Это не дружба.`:command.goal==='deescalate'?`${npc.name} прекращает вражду. Раны и прежние события остаются.`:`Разговор немного улучшает расположение ${npc.name}.`):`${npc.name} не принимает этот подход. Проверка не установила дружбу или прощение.`;
  }
  const nextRecord=recordFor(nextAdventure,npc.id);
  nextNpc.socialEpisode=episode?structuredClone(episode):{signature,attemptedMethods:[],rapportEstablished:false};
  nextNpc.socialEpisode.attemptedMethods=[...new Set([...nextNpc.socialEpisode.attemptedMethods,methodKey])].slice(0,8);
  if(command.goal==='rapport'&&command.approach!=='restitution'&&success)nextNpc.socialEpisode.rapportEstablished=true;
  delete nextNpc.socialAttemptSignatures;delete nextNpc.socialRapportSignature;
  nextNpc.disposition||=disposition(adventure,npc);if(nextRecord)nextRecord.disposition=nextNpc.disposition;
  const after=relation(nextAdventure,nextNpc),outcome={type:'social',sourceId,npcId:npc.id,goal:command.goal,approach:command.approach,success,check,coinsPaid,changes:{before,after,trustDelta:after.trust-before.trust},facts:[],elapsedSeconds:60,text,physicalSignature:signature,
    acknowledgedDamage:command.propIds?.map(propId=>({propId,recipientId:npc.id,playerAcknowledged:true,historicalOwnership:'unverified'})),
    statement:command.statement?{text:command.statement,provenance:'player_claim',verified:false}:undefined};
  ledger.attempts.push({key:attemptKey,sourceId,npcId:npc.id,goal:command.goal,approach:command.approach,physicalSignature:signature,success});ledger.attempts=ledger.attempts.slice(-LIMIT);
  ledger.history.push(structuredClone(outcome));ledger.history=ledger.history.slice(-LIMIT);
  return {ok:true,state:nextState,adventure:nextAdventure,outcome};
}
module.exports={resolve,publicStatus,commandSchema,LIMIT};
