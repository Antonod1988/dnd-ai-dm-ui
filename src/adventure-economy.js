const {z}=require('zod');
const crypto=require('node:crypto');
const loot=require('./adventure-loot');
const model=()=>require('./adventure-model');
const key=z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/);
const text=z.string().trim().min(1).max(160),prose=z.string().trim().min(1).max(600);
const offerSchema=z.object({id:key,name:text,description:prose,kind:z.enum(['goods','supplies','lodging','healing','rumor','transport']),focus:loot.focusSchema.optional(),rarity:loot.raritySchema.optional(),targetId:key.optional(),discovery:z.string().min(1).max(500).optional()}).strict();
const choiceSchema=z.object({id:key,label:text,kind:z.enum(['donate','check']),skill:z.enum(['persuasion','investigation','survival','medicine','history','insight']).optional(),dc:z.number().int().min(5).max(25).default(12)}).strict();
const marketSchema=z.object({id:key,locationId:key,name:text,livelihood:prose,shortage:z.string().max(240).default(''),scarcity:z.enum(['none','supplies','medicine','equipment']).default('none'),prosperity:z.enum(['sparse','steady','wealthy']).default('steady'),merchantId:key.optional(),offers:z.array(offerSchema).min(1).max(8),encounter:z.object({title:text,description:prose,choices:z.array(choiceSchema).min(1).max(3)}).strict().optional()}).strict();
const commandSchema=z.object({type:z.enum(['trade','service','market_choice']),marketId:key,direction:z.enum(['buy','sell']).optional(),offerId:z.string().min(1).max(100).optional(),itemId:z.string().min(1).max(180).optional(),choiceId:key.optional(),quantity:z.number().int().min(1).max(20).default(1),description:z.string().max(500).optional()}).strict();
function bad(message,status=400){throw Object.assign(new Error(message),{status});}
function heroOf(state){return state.party.members.find(m=>m.id===state.party.heroId);}
function rumorId(market,offer){return `rumor-${crypto.createHash('sha256').update(`${market.id}/${offer.id}`).digest('hex').slice(0,24)}`;}
function money(state){return heroOf(state).inventory.filter(i=>i.itemId==='gold_piece').reduce((n,i)=>n+i.quantity,0);}
function changeMoney(state,amount){
  const hero=heroOf(state),balance=money(state)+amount;if(!Number.isSafeInteger(balance)||balance<0)bad('Недостаточно монет.');
  const coin=hero.inventory.find(i=>i.itemId==='gold_piece');hero.inventory=hero.inventory.filter(i=>i.itemId!=='gold_piece');
  if(balance)hero.inventory.push(coin?{...coin,quantity:balance}:{itemId:'gold_piece',name:'Gold piece',quantity:balance,weight:0,tags:['currency'],description:'Монеты для торговли.',identified:true,source:'catalog'});
}
function baseValue(item){
  if(item.itemId==='gold_piece'||item.tags?.some(t=>['quest','quest_item','supplies','food','water'].includes(t)))return 0;
  const use=item.mechanics?.use;
  let value=item.itemId==='healing_potion'?8:item.tags?.includes('weapon')?12:use?.type==='healing'?8:use?5:3;
  const rank=['common','uncommon','rare','very_rare','legendary'].indexOf(item.rarity||'common');value*= [1,3,10,30,100][Math.max(0,rank)];
  if(item.charges)value*=Math.max(0,item.charges.current)/Math.max(1,item.charges.max);
  return Math.floor(value);
}
function saleValue(item){return Math.floor(baseValue(item)*0.4);}
function protectedItem(item,hero,adventure){
  if(!item||item.itemId==='gold_piece'||baseValue(item)<=0)return 'Этот предмет не предназначен для продажи.';
  if(Object.values(hero.equipment||{}).includes(item.itemId))return 'Сначала смените экипировку: используемый предмет нельзя продать.';
  if(item.attuned)return 'Сначала прекратите настройку на предмет.';
  if(adventure.quests.some(q=>['active','offered'].includes(q.status)&&q.objectives.some(o=>item.tags?.includes(o.targetId))))return 'Предмет связан с незавершённой задачей.';
  if(saleValue(item)<1)return 'У предмета нет доступной цены выкупа.';
  return null;
}
function category(offer){return offer.kind==='supplies'?'supplies':offer.kind==='goods'&&['healing','temporary_hp','remove_condition'].includes(offer.focus)?'medicine':offer.kind==='goods'?'equipment':'services';}
function price(market,offer){const base=Math.ceil(offer.basePrice*(market.scarcity===category(offer)?1.4:1));return Math.max(1,market.discount?Math.floor(base*(1-market.discount)):base);}
function routeDistance(locations,from,to){
  if(from===to||!locations.some(l=>l.id===to))return 0;
  const edges=new Map(locations.map(l=>[l.id,new Set(l.connectsTo)]));
  for(const l of locations)for(const id of l.connectsTo)edges.get(id)?.add(l.id);
  const queue=[[from,0]],seen=new Set([from]);
  for(let i=0;i<queue.length;i++){const [id,hops]=queue[i];for(const next of edges.get(id)||[]){if(next===to)return hops+1;if(!seen.has(next)){seen.add(next);queue.push([next,hops+1]);}}}
  return 0;
}
function fallbackMarket(place,adventure){
  const en=adventure.language==='en',nearby=adventure.npcs.find(n=>n.locationId===place.id);
  return {id:`market-${place.id.slice(0,32)}-${crypto.createHash('sha256').update(place.id).digest('hex').slice(0,8)}`,locationId:place.id,name:en?`${place.name} exchange`:`Торговый двор: ${place.name}`,merchantId:nearby?.id,
    livelihood:place.description.slice(0,600),shortage:en?'Travelers need reliable supplies and safe routes.':'Путникам нужны надёжные припасы и безопасные маршруты.',scarcity:'none',offers:[
      {id:'supplies',name:en?'Travel supplies':'Дорожные припасы',description:en?'Food and water for three days.':'Еда и вода на три дня.',kind:'supplies'},
      {id:'medicine',name:en?'Traveler’s remedy':'Средство путника',description:en?'A restorative prepared by local healers.':'Восстанавливающее средство местных лекарей.',kind:'goods',focus:'healing'},
      {id:'shelter',name:en?'A comfortable night':'Уютный ночлег',description:en?'Rest and prepare for the next challenge.':'Отдохнуть и подготовиться к следующему испытанию.',kind:'lodging'},
      {id:'care',name:en?'Local healer':'Помощь лекаря',description:en?'Restore some health without waiting through the night.':'Восстановить здоровье, не дожидаясь ночи.',kind:'healing'}],
    encounter:{title:en?'Help at the exchange':'Помощь торговому двору',description:en?'Local suppliers are struggling to organize a safe delivery. Help earn their trust.':'Местные поставщики пытаются наладить безопасную доставку. Можно помочь и заслужить доверие.',choices:[{id:'contribute',label:en?'Contribute two coins':'Вложить две монеты',kind:'donate'},{id:'route',label:en?'Help plan the route':'Помочь разобраться с маршрутом',kind:'check',skill:'survival',dc:12}]}};
}
async function initialize(service,state,adventure){
  adventure.economy||={version:1,markets:[],ledger:[]};
  let changed=false;
  const explicit=adventure.marketDefinitions||[];
  const definitions=[...explicit,...adventure.locations.filter(p=>p.kind==='settlement'&&!explicit.some(m=>m.locationId===p.id)).map(p=>fallbackMarket(p,adventure))];
  for(const draft of definitions){
    if(adventure.economy.markets.some(m=>m.id===draft.id))continue;
    if(explicit.some(m=>m.id===draft.id))adventure.economy.markets=adventure.economy.markets.filter(m=>!(m.fallback&&m.locationId===draft.locationId&&!adventure.economy.ledger.some(row=>row.marketId===m.id)));
    const definition=marketSchema.parse(draft),reserve={sparse:20,steady:40,wealthy:500}[definition.prosperity],market={...definition,fallback:!explicit.some(m=>m.id===draft.id),cash:reserve,maxCash:reserve,discount:0,lastRestockDay:adventure.day};
    market.offers=definition.offers.map(offer=>{
      const itemInput=offer.kind==='goods'?loot.planLoot(service,state,{...offer,rarity:offer.rarity||'common',theme:offer.description}):undefined;
      const hops=offer.kind==='transport'?routeDistance(adventure.locations,market.locationId,offer.targetId):0;
      return {...offer,name:itemInput?.name||offer.name,focus:offer.kind==='goods'?(offer.focus||'healing'):undefined,itemInput,basePrice:offer.kind==='goods'?0:offer.kind==='transport'?3*hops:({supplies:2,lodging:2,healing:5,rumor:3})[offer.kind],travelMinutes:hops?15*hops:undefined,stock:offer.kind==='rumor'?1:3,maxStock:offer.kind==='rumor'?1:3};
    });
    const core=await import('../vendor/dnd-core/dist/engine.mjs');
    for(const offer of market.offers)if(offer.itemInput)offer.basePrice=Math.max(2,baseValue(core.createGeneratedInventoryItem(offer.itemInput)));
    if(market.encounter)market.encounter={...market.encounter,resolved:false,attempts:[]};
    adventure.economy.markets.push(market);changed=true;
  }
  return changed;
}
function validateMarkets(patch,current){
  const definitions=patch.markets||[];
  const currentLocations=new Set((current.locations||[]).map(l=>l.id)),currentNpcs=new Set((current.npcs||[]).map(n=>n.id));
  const locations=[...(current.locations||[]),...(patch.locations||[]).filter(l=>!currentLocations.has(l.id))],npcs=[...(current.npcs||[]),...(patch.npcs||[]).filter(n=>!currentNpcs.has(n.id))];
  for(const market of definitions){
    const place=locations.find(p=>p.id===market.locationId);if(!place)bad('Unknown market location');
    if(market.merchantId&&!npcs.some(n=>n.id===market.merchantId&&n.locationId===market.locationId))bad('Unknown local merchant');
    if(new Set(market.offers.map(o=>o.id)).size!==market.offers.length)bad('Duplicate market offer');
    if(market.encounter&&new Set(market.encounter.choices.map(c=>c.id)).size!==market.encounter.choices.length)bad('Duplicate market choice');
    for(const offer of market.offers){
      if(offer.kind==='transport'&&(!offer.targetId||!routeDistance(locations,place.id,offer.targetId)))bad('Invalid transport route');
      if(offer.kind==='lodging'&&offer.targetId&&(!locations.some(l=>l.id===offer.targetId)||(offer.targetId!==place.id&&!routeDistance(locations,place.id,offer.targetId))))bad('Invalid lodging location');
      if(offer.kind==='rumor'&&!offer.discovery)bad('A rumor needs a stored discovery');
    }
    for(const choice of market.encounter?.choices||[])if(choice.kind==='check'&&!choice.skill)bad('A market check needs a skill');
  }
  if(new Set(definitions.map(m=>m.id)).size!==definitions.length)bad('Duplicate settlement market');
}
function merchantAvailable(adventure,market){
  if(!market.merchantId)return true;
  if(adventure.companions?.records?.some(r=>r.npcId===market.merchantId&&r.joined))return false;
  const npc=adventure.npcs.find(n=>n.id===market.merchantId&&n.locationId===market.locationId);
  const record=adventure.environment?.npcStates?.find(n=>n.npcId===market.merchantId);
  return Boolean(npc&&!npc.hidden&&(npc.disposition||record?.disposition)!=='hostile'&&(!record||(record.body.hp.current>0&&!record.body.conditions.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','fled','captured'].includes(c)))));
}
function publicEconomy(state,adventure){
  const hero=heroOf(state),markets=(adventure.economy?.markets||[]).filter(m=>m.locationId===adventure.currentLocationId&&merchantAvailable(adventure,m));
  return {coins:money(state),markets:markets.map(m=>({id:m.id,name:m.name,locationId:m.locationId,merchantId:m.merchantId,livelihood:m.livelihood,shortage:m.shortage,cash:m.cash,discount:m.discount,
    offers:m.offers.filter(o=>!o.resaleItem||o.stock>0).map(({discovery,itemInput,resaleItem,...o})=>({...o,price:price(m,o),arrivalMinutes:o.kind==='lodging'&&o.targetId?60*routeDistance(adventure.locations,m.locationId,o.targetId):0,mechanics:resaleItem?.mechanics?.use||resaleItem?.mechanics?.equip?.attack||itemInput?.useEffect||itemInput?.weapon,charges:resaleItem?.charges,requiresAttunement:resaleItem?.requiresAttunement||itemInput?.requiresAttunement,rarity:resaleItem?.rarity||itemInput?.rarity})),encounter:m.encounter})),
    sellable:hero.inventory.map(i=>({itemId:i.itemId,name:i.name,quantity:i.quantity,price:saleValue(i),blocked:protectedItem(i,hero,adventure)})),ledger:(adventure.economy?.ledger||[]).slice(-12).reverse(),ledgerTotal:adventure.economy?.ledger?.length||0};
}
function record(state,adventure,market,details){
  const row={id:crypto.randomUUID(),turn:adventure.turn,day:adventure.day,hours:adventure.hours,marketId:market.id,locationId:market.locationId,marketName:market.name,balance:money(state),...details};
  adventure.economy.ledger.push(row);model().addEvent(adventure,'economy',market.id,details.text,{transactionId:row.id});return row;
}
function recordRulesMoney(state,adventure,amount,sourceId){
  const place=adventure.locations.find(l=>l.id===adventure.currentLocationId),en=adventure.language==='en';
  const text=amount>0?(en?`Earned ${amount} coins from the resolved adventure event.`:`Получено ${amount} монет по результату события приключения.`):(en?`Spent ${-amount} coins on the resolved action.`:`Потрачено ${-amount} монет на игровое действие.`);
  const row={id:crypto.randomUUID(),turn:adventure.turn,day:adventure.day,hours:adventure.hours,locationId:place.id,marketName:place.name,kind:'rules',sourceId,amount,balance:money(state),text};
  adventure.economy.ledger.push(row);model().addEvent(adventure,'economy',sourceId,text,{transactionId:row.id});
}
async function apply(service,state,adventure,raw,{seed}={}){
  const command=commandSchema.parse(raw),market=adventure.economy?.markets.find(m=>m.id===command.marketId&&m.locationId===adventure.currentLocationId);
  if(!market)bad('Торговец сейчас не рядом.');if(state.combat)bad('Сделки и услуги недоступны во время боя.');
  let hero=heroOf(state);if(hero.hp.current<=0||hero.conditions.some(c=>['dead','unconscious','incapacitated','paralyzed','stunned'].includes(c)))bad('Герой сейчас не может заключить сделку.');
  const core=await import('../vendor/dnd-core/dist/engine.mjs'),en=adventure.language==='en';
  let outcome={type:command.type,quiet:command.type!=='market_choice',elapsedSeconds:60};
  if(command.type==='trade'&&command.direction==='sell'){
    const item=hero.inventory.find(i=>i.itemId===command.itemId),reason=protectedItem(item,hero,adventure);if(reason)bad(reason);
    if(item.quantity<command.quantity)bad('Нет такого количества вещей.');if(item.charges&&command.quantity!==1)bad('Заряженные предметы продаются по одному.');
    const total=saleValue(item)*command.quantity;if(market.cash<total)bad('У торговца недостаточно монет для выкупа.');
    const sold={...structuredClone(item),quantity:command.quantity,attuned:item.requiresAttunement?false:undefined};
    const offer={id:`resale-${crypto.randomUUID()}`,name:item.name,description:loot.displayDescription(item,adventure.language),kind:'goods',resaleItem:sold,basePrice:Math.max(saleValue(item)+1,baseValue(item)),stock:command.quantity,maxStock:0};
    hero.inventory=hero.inventory.flatMap(i=>i!==item?[i]:i.quantity===command.quantity?[]:[{...i,quantity:i.quantity-command.quantity}]);
    changeMoney(state,total);market.cash-=total;
    const resale=market.offers.find(o=>o.resaleItem?.itemId===sold.itemId&&!sold.charges&&o.basePrice===offer.basePrice);
    if(resale){resale.stock+=command.quantity;resale.resaleItem.quantity+=command.quantity;}else market.offers.push(offer);
    outcome.text=en?`Sold ${item.name} ×${command.quantity} for ${total} coins.`:`Продано: ${item.name} ×${command.quantity}. Получено ${total} монет.`;
    record(state,adventure,market,{kind:'sell',itemId:item.itemId,quantity:command.quantity,amount:total,text:outcome.text});
  }else if(command.type==='trade'&&command.direction==='buy'){
    const offer=market.offers.find(o=>o.id===command.offerId&&['goods','supplies'].includes(o.kind));if(!offer)bad('Такого товара нет.');
    if(offer.stock<command.quantity)bad('Товар закончился или нет нужного количества.');
    const total=price(market,offer)*command.quantity;if(money(state)<total)bad('Недостаточно монет.');
    let purchased;
    if(offer.kind==='goods'){
      purchased=offer.resaleItem?structuredClone(offer.resaleItem):core.createGeneratedInventoryItem(offer.itemInput);
      if(purchased.charges&&command.quantity!==1)bad('Заряженные предметы покупаются по одному.');
      purchased.quantity=command.quantity;
      if(purchased.charges&&hero.inventory.some(i=>i.itemId===purchased.itemId)){purchased.itemId+=`-${crypto.randomUUID()}`;if(purchased.mechanics?.equip?.attack)purchased.mechanics.equip.attack.id=purchased.itemId;}
    }
    changeMoney(state,-total);market.cash+=total;offer.stock-=command.quantity;
    if(purchased){hero=heroOf(state);hero.inventory=core.mergeInventoryItem(hero.inventory,purchased);adventure.lootLedger||=[];adventure.lootLedger.push({id:crypto.randomUUID(),itemId:purchased.itemId,name:purchased.name,quantity:command.quantity,rarity:purchased.rarity,turn:adventure.turn,kind:'purchase',marketId:market.id,marketName:market.name,locationId:market.locationId});}
    else{for(const [id,name,tag]of[['travel_food','Дорожные припасы','food'],['travel_water','Запас воды','water']]){const held=heroOf(state).inventory.find(i=>i.itemId===id);if(held)held.quantity+=3*command.quantity;else heroOf(state).inventory.push({itemId:id,name,quantity:3*command.quantity,weight:2,tags:['supplies',tag],description:'Запас для путешествия.',identified:true,source:'generated'});}adventure.survival.foodDays=heroOf(state).inventory.find(i=>i.itemId==='travel_food').quantity;adventure.survival.waterDays=heroOf(state).inventory.find(i=>i.itemId==='travel_water').quantity;}
    outcome.text=en?`Bought ${offer.name} ×${command.quantity} for ${total} coins.`:`Куплено: ${offer.name} ×${command.quantity}. Потрачено ${total} монет.`;
    record(state,adventure,market,{kind:'buy',itemId:purchased?.itemId,offerId:offer.id,quantity:command.quantity,amount:-total,text:outcome.text});
  }else if(command.type==='service'){
    if(command.quantity!==1)bad('Услуга выполняется по одному разу.');
    const offer=market.offers.find(o=>o.id===command.offerId&&!['goods','supplies'].includes(o.kind));if(!offer||offer.stock<=0)bad('Эта услуга сейчас недоступна.');
    const cost=price(market,offer);if(money(state)<cost)bad('Недостаточно монет.');
    if(offer.kind==='healing'&&hero.hp.current===hero.hp.max)bad('Герой уже здоров.');
    if(offer.kind==='transport'&&!routeDistance(adventure.locations,adventure.currentLocationId,offer.targetId))bad('Маршрут сейчас недоступен.');
    if(offer.kind==='lodging'&&offer.targetId&&offer.targetId!==adventure.currentLocationId&&!routeDistance(adventure.locations,adventure.currentLocationId,offer.targetId))bad('Место ночлега сейчас недоступно.');
    if(offer.kind==='rumor'&&state.facts.some(f=>f.id===rumorId(market,offer)))bad('Эти сведения уже получены.');
    changeMoney(state,-cost);market.cash+=cost;offer.stock-=1;hero=heroOf(state);
    let effect;
    if(offer.kind==='lodging'){
      const beforeRest=structuredClone(state),rest=require('./adventure-rest');
      outcome.elapsedSeconds=28800+(offer.targetId&&offer.targetId!==adventure.currentLocationId?3600*routeDistance(adventure.locations,adventure.currentLocationId,offer.targetId):0);
      state.party.members=state.party.members.map(core.longRest);outcome.rest=rest.apply(beforeRest,state,adventure,{kind:'long',seconds:outcome.elapsedSeconds});hero=heroOf(state);
      if(outcome.rest.beneficiaries.some(member=>member.id===hero.id))hero.activeEffects=[...(hero.activeEffects||[]).filter(e=>e.id!==`comfortable-rest-${hero.id}`),{id:`comfortable-rest-${hero.id}`,label:en?'Comfortable rest':'Уютный отдых',sourceId:hero.id,abilityCheckBonus:'1d4',expiresOnAbilityCheck:true,expiresAtRestEnd:true}];
      effect=rest.describe(outcome.rest,adventure.language)+(outcome.rest.beneficiaries.some(member=>member.id===hero.id)?(en?' +1d4 to the next ability check, until the next rest.':' +1d4 к следующей проверке до следующего отдыха.'):'');
      if(offer.targetId&&offer.targetId!==adventure.currentLocationId){const place=adventure.locations.find(l=>l.id===offer.targetId);adventure.currentLocationId=place.id;place.visited=true;state.openWorld.location=place.name;model().processQuestEvent(adventure,model().addEvent(adventure,'visit',place.id,`${en?'Arrived at':'Прибытие'}: ${place.name}.`));}
      model().addEvent(adventure,'rest',adventure.currentLocationId,effect);
    }else if(offer.kind==='healing'){
      const healed=core.applyHealing(hero,8);if(healed.hp.current===hero.hp.current)bad('Это лечение не может сейчас помочь.');
      state.party.members=state.party.members.map(m=>m.id===hero.id?healed:m);effect=`HP: ${hero.hp.current} → ${healed.hp.current}.`;outcome.elapsedSeconds=600;
    }else if(offer.kind==='rumor'){
      const fact={id:rumorId(market,offer),text:`${en?'Information from':'Сведения от'} ${market.name}: ${offer.discovery}`,sourceSceneId:market.locationId,revealedAt:new Date().toISOString(),tags:['rumor','purchased_information',market.id]};state.facts.push(fact);effect=offer.discovery;
      model().addEvent(adventure,'discovery',fact.id,effect);
    }else if(offer.kind==='transport'){
      const place=adventure.locations.find(l=>l.id===offer.targetId);adventure.currentLocationId=place.id;place.visited=true;state.openWorld.location=place.name;effect=`${en?'Arrived at':'Прибытие'}: ${place.name}.`;outcome.elapsedSeconds=offer.travelMinutes*60;
      model().processQuestEvent(adventure,model().addEvent(adventure,'visit',place.id,effect));
    }
    outcome.text=`${offer.name} · ${cost} ${en?'coins':'монет'}. ${effect}`;record(state,adventure,market,{kind:'service',offerId:offer.id,amount:-cost,text:outcome.text});
  }else if(command.type==='market_choice'){
    const encounter=market.encounter,choice=encounter?.choices.find(c=>c.id===command.choiceId);if(!choice||encounter.resolved)bad('Эта встреча уже разрешена или недоступна.');
    if(encounter.attempts.some(a=>a.choiceId===choice.id))bad('Этот подход уже проверен. Выберите другой способ.');
    let success=true,check;
    if(choice.kind==='donate'){if(money(state)<2)bad('Для помощи нужны две монеты.');changeMoney(state,-2);market.cash+=2;}
    else{const abilities={persuasion:'cha',investigation:'int',survival:'wis',medicine:'wis',history:'int',insight:'wis'};const result=core.rollStateAbilityCheck(state,hero,{ability:abilities[choice.skill],skill:choice.skill,dc:choice.dc,rng:seed===undefined?undefined:new core.SeededRng(seed),rules:state.campaign.rules});state=result.state;check=result.check;success=check.success;state.rollLog.push(...core.abilityCheckRollLogs(hero.id,encounter.title,check));model().addMessage(adventure,'roll',en?'Check':'Проверка',`${choice.skill}: ${check.roll.total} / ${choice.dc}. ${success?(en?'Success':'Успех'):(en?'Failure':'Неудача')}`);}
    encounter.attempts.push({choiceId:choice.id,turn:adventure.turn,success,total:check?.roll.total});
    if(success){encounter.resolved=true;market.discount=0.15;for(const offer of market.offers)if(offer.maxStock&&offer.kind!=='rumor')offer.stock=Math.min(offer.maxStock+1,offer.stock+1);
      adventure.reputation[market.locationId]=(Number.isFinite(adventure.reputation[market.locationId])?adventure.reputation[market.locationId]:0)+1;const npc=adventure.npcs.find(n=>n.id===market.merchantId);if(npc)npc.trust=Math.min(100,npc.trust+1);}
    outcome.text=success?(en?'Your help earned local trust: prices are lower and some supplies are available again.':'Помощь заслужила доверие: цены снижены, часть запасов снова доступна.'):(en?'This approach did not help. Another method is still possible.':'Этот подход не помог. Можно попробовать другой способ.');outcome.elapsedSeconds=600;outcome.check=check;
    record(state,adventure,market,{kind:'encounter',amount:choice.kind==='donate'?-2:0,choiceId:choice.id,success,text:outcome.text});
  }else bad('Выберите покупку, продажу или услугу.');
  return {state,outcome};
}
function advance(adventure){
  for(const market of adventure.economy?.markets||[])if(adventure.day>market.lastRestockDay){
    for(const offer of market.offers)if(offer.maxStock&&offer.kind!=='rumor')offer.stock=offer.maxStock;
    market.cash=Math.max(market.cash,market.maxCash);market.lastRestockDay=adventure.day;
    model().addEvent(adventure,'market_restock',market.id,adventure.language==='en'?`${market.name}: daily supplies arrived.`:`${market.name}: поступили дневные запасы.`);
  }
}
module.exports={marketSchema,commandSchema,validateMarkets,initialize,publicEconomy,apply,advance,money,price,saleValue,protectedItem,recordRulesMoney,merchantAvailable};
