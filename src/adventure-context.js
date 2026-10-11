const {recall,relevance}=require('./context-memory');
const MAX_CHARS=12000;
const clip=(text,size=400)=>String(text??'').replace(/\s+/g,' ').trim().slice(0,size);

function excerpt(record,query,scene,size=500) {
  const text=String(record.text||record.body||record.summary||'');
  if(text.length<=size)return clip(text,size);
  let best=text.slice(0,size),score=-1;
  for(let offset=0;offset<text.length;offset+=size-100) {
    const candidate=text.slice(offset,offset+size),next=relevance({text:candidate},query,scene);
    if(next>score){best=candidate;score=next;}
  }
  return clip(best,size);
}

function contextFor(state,adventure,query='') {
  const location=adventure.locations.find(l=>l.id===adventure.currentLocationId);
  const scene={id:location.id,title:clip(location.name,140),location:clip(location.name,140),summary:clip(location.description,650)};
  const hero=state.party.members.find(m=>m.id===state.party.heroId);
  const pending=adventure.quests.filter(q=>['active','accepted','offered'].includes(q.status));
  const ranked=pending.map((q,index)=>({q,index,score:relevance(q,query,scene)*8+(q.status==='active'?12:0)}))
    .sort((a,b)=>b.score-a.score||b.index-a.index).map(({q})=>q);
  const pinnedIds=new Set(adventure.pinnedFactIds||[]);
  const bookmarks=[...(adventure.notes||[]).filter(n=>n.pinned).map(n=>({...n,kind:'player_note'})),
    ...state.facts.filter(f=>f.pinned||pinnedIds.has(f.id)).map(f=>({...f,kind:f.tags?.includes('rumor')?'reported_information':'confirmed_fact'}))];
  const packet={version:2,language:adventure.language||'ru',
    world:{premise:clip(adventure.worldIdea,1200),tone:clip(adventure.tone,100),heroConcept:clip(adventure.heroConcept,800)},
    hero:{id:hero.id,name:clip(hero.name,80),className:clip(hero.className,100),ancestry:clip(hero.ancestry,80),level:hero.level,hp:hero.hp,ac:hero.ac+(hero.activeEffects||[]).reduce((sum,e)=>sum+(e.armorClassBonus||0),0),
      conditions:hero.conditions,abilities:hero.abilities,skills:hero.skillProficiencies,resources:hero.resources.slice(0,12),slots:hero.spellcasting?.slots,
      effects:(hero.activeEffects||[]).slice(0,6).map(e=>({name:clip(e.label,80),remainingRounds:e.remainingSourceTurnEnds??e.remainingSourceTurnStarts})),coins:hero.inventory.filter(i=>i.itemId==='gold_piece').reduce((n,i)=>n+i.quantity,0)},
    time:{day:adventure.day,hours:adventure.hours},scene,
    survival:adventure.survival.enabled?{foodDays:adventure.survival.foodDays,waterDays:adventure.survival.waterDays,hungerDays:adventure.survival.hungerDays}:undefined,
    combat:state.combat?{round:state.combat.round,actorId:state.combat.participants[state.combat.turnIndex]?.id,turnBudget:state.combat.turnBudget,
      participants:state.combat.participants.slice(0,10).map(p=>({id:p.id,name:clip(p.name,80),kind:p.kind,hp:p.hp,conditions:p.conditions}))}:undefined,
    bookmarks:[],quests:[],checks:[],questIndex:[],questHistory:[],activeFacts:[],recollections:[],npcs:[],inventory:[],createdSpells:[],nearbyPlaces:[],recentDialogue:[],recentEvents:[],markets:[],transactions:[],
    omitted:{quests:pending.length,facts:state.facts.length,notes:(adventure.notes||[]).length,archive:(adventure.archive||[]).length}};
  const budgets={bookmarks:2800,quests:3200,checks:1600,questIndex:1400,questHistory:1000,activeFacts:2000,recollections:2000,npcs:1200,inventory:900,createdSpells:1400,nearbyPlaces:1000,recentDialogue:1200,recentEvents:1000,markets:1600,transactions:600};
  const append=(key,value)=>{
    packet[key].push(value);
    if(JSON.stringify(packet[key]).length>budgets[key]||JSON.stringify(packet).length>MAX_CHARS){packet[key].pop();return false;}
    return true;
  };
  // Bookmarks and relevant active objectives get space before optional prose.
  for(const note of recall(bookmarks,query,scene,4))append('bookmarks',{id:note.id,kind:note.kind,text:excerpt(note,query,scene,650),sourceSceneId:note.sourceSceneId});
  for(const q of ranked.slice(0,6))append('quests',{id:q.id,title:clip(q.title,100),status:q.status,summary:clip(q.summary,220),
    objectives:q.objectives.map(o=>({id:o.id,kind:o.kind,targetId:o.targetId,recipientId:o.recipientId,alternativeTargetIds:o.alternativeTargetIds,text:clip(o.text,120),completed:o.completed,evidenceEventId:o.evidenceEventId}))});
  const questTargets=new Set(packet.quests.flatMap(q=>q.objectives.flatMap(o=>[o.targetId,o.recipientId,...(o.alternativeTargetIds||[])])));
  const attempts=require('./scene-checks').publicChecks(state);
  for(const d of adventure.loreDefinitions.filter(d=>questTargets.has(d.id)||(d.trigger==='manual'&&d.locationId===location.id)).slice(0,8)){const c=attempts.find(c=>c.id===adventure.loreCheckIds[d.id]);append('checks',{id:d.id,title:clip(d.title,100),locationId:d.locationId,npcId:d.npcId,skill:d.skill,dc:d.dc,trigger:d.trigger,attempted:Boolean(c?.attempted),success:c?.result?.success});}
  const people=adventure.npcs.map((n,index)=>({n,index,score:relevance({...n,text:`${n.role} ${n.personality}`},query,scene)*5+(n.locationId===location.id?5:0)+(questTargets.has(n.id)?3:0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
  for(const {n} of people.slice(0,4))append('npcs',{id:n.id,name:clip(n.name,80),role:clip(n.role,140),locationId:n.locationId,location:clip(adventure.locations.find(l=>l.id===n.locationId)?.name,140),trust:n.trust,familiarity:n.familiarity});
  const recalled=recall(adventure.archive||[],query,scene,4).filter(m=>query.trim()&&relevance(m,query,scene)>0);
  for(const m of recalled)append('recollections',{id:m.id,turn:m.turn,speaker:clip(m.author,80),text:excerpt(m,query,scene)});
  for(const q of recall(adventure.quests.filter(q=>['completed','failed'].includes(q.status)),query,scene,2).filter(q=>relevance(q,query,scene)>0))append('questHistory',{id:q.id,title:clip(q.title,100),status:q.status,rewardClaimed:q.rewardClaimed,summary:clip(q.summary,220)});
  for(const f of recall([...state.facts].reverse().filter(f=>f.id!=='hero_identity'),query,scene,8).filter(f=>!bookmarks.some(b=>b.id===f.id)))append('activeFacts',{id:f.id,text:excerpt(f,query,scene,650),sourceSceneId:f.sourceSceneId,confidence:f.tags?.includes('rumor')?'reported':f.confidence||'confirmed'});
  for(const note of recall((adventure.notes||[]).filter(n=>!n.pinned),query,scene,3))append('recollections',{id:note.id,kind:'player_note',text:clip(note.text,650)});
  const economy=require('./adventure-economy'),commerce=economy.publicEconomy(state,adventure);
  for(const market of commerce.markets.slice(0,3)){
    const offers=market.offers.map((o,index)=>({o,index,score:relevance({...o,text:o.description},query,scene)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4).map(({o})=>({id:o.id,name:clip(o.name,80),kind:o.kind,price:o.price,stock:o.stock,targetId:o.targetId}));
    append('markets',{id:market.id,name:clip(market.name,100),livelihood:clip(market.livelihood,180),shortage:clip(market.shortage,160),discount:market.discount,standing:adventure.reputation[market.locationId]||0,offers,choices:market.encounter&&!market.encounter.resolved?market.encounter.choices.map(c=>({id:c.id,label:clip(c.label,80)})):[]});
  }
  for(const row of commerce.ledger.slice(0,3))append('transactions',{turn:row.turn,marketId:row.marketId,kind:row.kind,amount:row.amount,balance:row.balance,text:clip(row.text,160)});
  for(const q of ranked.filter(q=>!packet.quests.some(s=>s.id===q.id)).slice(0,20))append('questIndex',{id:q.id,title:clip(q.title,80),status:q.status,next:clip(q.objectives.find(o=>!o.completed)?.text,100)});
  for(const spell of recall(adventure.createdSpells||[],query,scene,6))append('createdSpells',{id:spell.id,name:clip(spell.name,100),level:spell.level,cost:spell.cost,target:spell.target,effects:spell.effects});
  for(const item of recall(hero.inventory.map(i=>({...i,text:i.description})),query,scene,8))append('inventory',{id:item.itemId,name:clip(item.name,100),quantity:item.quantity,rarity:item.rarity,mechanics:item.mechanics,charges:item.charges,requiresAttunement:item.requiresAttunement,attuned:item.attuned});
  for(const place of adventure.locations.filter(l=>location.connectsTo.includes(l.id)))append('nearbyPlaces',{id:place.id,name:clip(place.name,140)});
  for(const message of adventure.messages.slice(-4))append('recentDialogue',{role:message.role,speaker:clip(message.author,80),text:clip(message.text,400)});
  for(const event of adventure.events.slice(-4).reverse())append('recentEvents',{turn:event.turn,kind:event.kind,text:clip(event.text,280)});
  packet.omitted.quests=pending.length-packet.quests.length-packet.questIndex.length;
  packet.omitted.facts=Math.max(0,state.facts.length-packet.activeFacts.length-packet.bookmarks.filter(b=>['confirmed_fact','reported_information'].includes(b.kind)).length);
  packet.omitted.notes=Math.max(0,(adventure.notes||[]).length-packet.bookmarks.filter(b=>b.kind==='player_note').length-packet.recollections.filter(b=>b.kind==='player_note').length);
  const chars=JSON.stringify(packet).length;
  return {packet,metrics:{chars,maxChars:MAX_CHARS,approximateTokens:Math.ceil(chars/3),estimate:true,
    archivedMessages:(adventure.archive||[]).length,journalEntries:adventure.journal.length,selectedQuests:packet.quests.length+packet.questIndex.length,
    activeQuests:pending.filter(q=>q.status==='active').length,recalledMessages:packet.recollections.length}};
}
module.exports={contextFor,excerpt,MAX_CHARS};
