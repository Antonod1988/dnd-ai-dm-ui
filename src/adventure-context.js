const {recall,relevance}=require('./context-memory');
const social=require('./adventure-social');
const medicine=require('./adventure-medicine');
const rest=require('./adventure-rest');
const partyOrders=require('./adventure-party-orders');
const {journalMemory}=require('./adventure-recollections');
function life(state,adventure,id){const value=medicine.publicStatus(state,adventure,id);return value&&value.phase!=='awake'?{phase:value.phase,deathSaves:value.deathSaves,remainingSeconds:value.remainingSeconds,recoveryAt:value.dueAt}:undefined;}
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
  const scene={id:location.id,title:clip(location.name,140),location:clip(location.name,140),summary:clip(location.description,650),affordances:(location.affordances||[]).map((a,index)=>({a,index,score:relevance({...a,text:a.description},query,{id:location.id,title:location.name})})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4).map(({a})=>({...a,remaining:Math.max(0,(a.quantity||1)-(adventure.environment?.props||[]).filter(p=>p.anchorId===a.id&&(p.originLocationId||p.locationId)===location.id).length)}))};
  const hero=state.party.members.find(m=>m.id===state.party.heroId);
  const partyOrder=id=>{const order=partyOrders.publicStatus(state,adventure,id);return order?.mode==='cast'?{mode:'cast',spellActionId:order.spellActionId,instructionOnly:true,allowFriendlyFire:order.allowFriendlyFire||undefined}:order?.mode;};
  const queryScore=record=>query.trim()?relevance({...record,pinned:false,tags:[],sourceSceneId:undefined},query,{}):0;
  const questSearch=q=>({...q,text:[q.summary,...q.objectives.map(o=>[o.text,o.id,o.targetId,o.recipientId,...(o.alternativeTargetIds||[]),adventure.npcs.find(n=>n.id===o.recipientId||n.id===o.targetId)?.name,adventure.items.find(i=>i.id===o.targetId)?.name,adventure.locations.find(l=>l.id===o.targetId)?.name].filter(Boolean).join(' '))].join(' ')});
  const pending=adventure.quests.filter(q=>['active','accepted','offered'].includes(q.status));
  const ranked=pending.map((q,index)=>({q,index,score:queryScore(questSearch(q))*20+relevance(questSearch(q),query,scene)*8+(q.status==='active'?12:0)}))
    .sort((a,b)=>b.score-a.score||b.index-a.index).map(({q})=>q);
  const pinnedIds=new Set(adventure.pinnedFactIds||[]);
  const bookmarks=[...(adventure.notes||[]).filter(n=>n.pinned).map(n=>({...n,kind:'player_note'})),
    ...state.facts.filter(f=>f.pinned||pinnedIds.has(f.id)).map(f=>({...f,pinned:true,kind:f.tags?.includes('rumor')?'reported_information':'confirmed_fact'}))];
  const packet={version:2,language:adventure.language||'ru',
    world:{premise:clip(adventure.worldIdea,1200),tone:clip(adventure.tone,100),heroConcept:clip(adventure.heroConcept,800)},
    hero:{id:hero.id,name:clip(hero.name,80),className:clip(hero.className,100),ancestry:clip(hero.ancestry,80),level:hero.level,hp:hero.hp,ac:hero.ac+(hero.activeEffects||[]).reduce((sum,e)=>sum+(e.armorClassBonus||0),0),
      life:life(state,adventure,hero.id),rest:rest.status(hero,adventure),conditions:hero.conditions,abilities:hero.abilities,skills:hero.skillProficiencies,resources:hero.resources.slice(0,12),slots:hero.spellcasting?.slots,
      effects:(hero.activeEffects||[]).slice(0,6).map(e=>({name:clip(e.label,80),remainingRounds:e.remainingSourceTurnEnds??e.remainingSourceTurnStarts})),coins:hero.inventory.filter(i=>i.itemId==='gold_piece').reduce((n,i)=>n+i.quantity,0)},
    time:{day:adventure.day,hours:adventure.hours},scene,
    survival:adventure.survival.enabled?{foodDays:adventure.survival.foodDays,waterDays:adventure.survival.waterDays,hungerDays:adventure.survival.hungerDays}:undefined,
    combat:state.combat?{round:state.combat.round,actorId:state.combat.participants[state.combat.turnIndex]?.id,turnBudget:state.combat.turnBudget,
      participants:state.combat.participants.slice(0,10).map(p=>({id:p.id,name:clip(p.name,80),kind:p.kind,hp:p.hp,conditions:p.conditions}))}:undefined,
    party:[],partyInventory:[],bookmarks:[],quests:[],checks:[],objects:[],sceneProps:[],questIndex:[],questHistory:[],activeFacts:[],recollections:[],pastEvents:[],npcs:[],inventory:[],createdSpells:[],nearbyPlaces:[],recentDialogue:[],recentEvents:[],markets:[],transactions:[],
    omitted:{quests:pending.length,facts:state.facts.length,notes:(adventure.notes||[]).length,archive:(adventure.archive||[]).length}};
  const budgets={party:2800,partyInventory:1600,bookmarks:2800,quests:3200,checks:1600,objects:1100,sceneProps:1600,questIndex:1400,questHistory:1000,activeFacts:2000,recollections:2000,pastEvents:2200,npcs:1500,inventory:900,createdSpells:1400,nearbyPlaces:1000,recentDialogue:1200,recentEvents:1000,markets:1600,transactions:600};
  const append=(key,value)=>{
    packet[key].push(value);
    if(JSON.stringify(packet[key]).length>budgets[key]||JSON.stringify(packet).length>MAX_CHARS){packet[key].pop();return false;}
    return true;
  };
  const questEntry=q=>({id:q.id,title:clip(q.title,100),status:q.status,summary:clip(q.summary,220),objectives:q.objectives.map(o=>({id:o.id,kind:o.kind,targetId:o.targetId,recipientId:o.recipientId,alternativeTargetIds:o.alternativeTargetIds,text:clip(o.text,120),completed:o.completed,evidenceEventId:o.evidenceEventId}))});
  const appendQuest=q=>{
    if(packet.quests.some(selected=>selected.id===q.id))return;
    const full=questEntry(q);if(append('quests',full))return;
    const ready=q.objectives.find(o=>!o.completed),matched=[...q.objectives].sort((a,b)=>queryScore({text:[b.text,b.id,b.targetId,b.recipientId].join(' ')})-queryScore({text:[a.text,a.id,a.targetId,a.recipientId].join(' ')}))[0];
    append('quests',{...full,summary:undefined,compact:true,objectives:full.objectives.filter(o=>o.id===ready?.id||query.trim()&&o.id===matched?.id)});
  };
  const appendBookmark=note=>{if(!packet.bookmarks.some(n=>n.id===note.id))append('bookmarks',{id:note.id,kind:note.kind,text:excerpt(note,query,scene,650),sourceSceneId:note.sourceSceneId});};
  const appendFact=f=>{if(!packet.bookmarks.some(b=>b.id===f.id)&&!packet.activeFacts.some(b=>b.id===f.id))append('activeFacts',{id:f.id,text:excerpt(f,query,scene,650),sourceSceneId:f.sourceSceneId,confidence:f.tags?.includes('rumor')?'reported':f.confidence||'confirmed'});};
  const archived=recall(adventure.archive||[],query,scene,4).filter(m=>query.trim()&&queryScore(m)>0);
  const appendRecollection=m=>{if(!packet.recollections.some(r=>r.id===m.id))append('recollections',{id:m.id,turn:m.turn,speaker:clip(m.author,80),role:m.role||'unknown',confidence:m.role==='player'?'player_claim':m.role==='dm'||m.role==='system'?'narrated':'speaker_claim',text:excerpt(m,query,scene)});};
  const settled=recall(adventure.quests.filter(q=>['completed','failed'].includes(q.status)).map(questSearch),query,scene,2).filter(q=>queryScore(q)>0);
  const appendQuestHistory=q=>{if(!packet.questHistory.some(s=>s.id===q.id))append('questHistory',{id:q.id,title:clip(q.title,100),status:q.status,rewardClaimed:q.rewardClaimed,summary:clip(q.summary,220),objectives:q.objectives.filter(o=>queryScore({text:[o.text,o.targetId,o.recipientId].join(' ')})>0).slice(0,2).map(o=>({id:o.id,kind:o.kind,targetId:o.targetId,recipientId:o.recipientId,completed:o.completed,evidenceEventId:o.evidenceEventId}))});};
  // Reserve exact queried goals/evidence before unrelated pins and optional scene prose.
  const reserveQuery=()=>{
  for(const q of ranked.filter(q=>queryScore(questSearch(q))>0).slice(0,2))appendQuest(q);
  for(const q of settled)appendQuestHistory(q);
  for(const note of bookmarks.filter(n=>queryScore(n)>0).sort((a,b)=>queryScore(b)-queryScore(a)).slice(0,2))appendBookmark(note);
  for(const event of journalMemory(state,adventure,query,scene))append('pastEvents',event);
  for(const m of archived)appendRecollection(m);
  for(const f of [...state.facts].filter(f=>f.id!=='hero_identity'&&queryScore(f)>0).sort((a,b)=>queryScore(b)-queryScore(a)).slice(0,2))appendFact(f);
  };
  for(const member of state.party.members.filter(m=>m.id!==hero.id).slice(0,3)){const npc=adventure.npcs.find(n=>n.id===member.id);append('party',{id:member.id,name:clip(member.name,80),kind:member.kind,order:partyOrder(member.id),className:clip(member.className,80),level:member.level,hp:member.hp,ac:member.ac+(member.activeEffects||[]).reduce((n,e)=>n+(e.armorClassBonus||0),0),life:life(state,adventure,member.id),conditions:member.conditions,abilities:member.abilities,skills:member.skillProficiencies.slice(0,6),proficiencyBonus:member.proficiencyBonus,resources:member.resources.filter(r=>!r.id.startsWith('spell_slots_')).slice(0,6).map(r=>({id:r.id,current:r.current,max:r.max})),slots:member.spellcasting?.slots,prepared:member.spellcasting?.prepared?.slice(0,4),role:clip(npc?.role,80)});}
  for(const member of [...state.party.members].sort((a,b)=>Number(b.id===hero.id)-Number(a.id===hero.id)).slice(0,4))append('partyInventory',{ownerId:member.id,name:clip(member.name,80),items:recall(member.inventory.map(item=>({...item,text:item.description})),query,scene,3).map(item=>({id:item.itemId,name:clip(item.name,60),quantity:item.quantity,equipped:Object.values(member.equipment||{}).includes(item.itemId)||undefined,attuned:item.attuned||undefined,charges:item.charges?{current:item.charges.current,max:item.charges.max}:undefined}))});
  reserveQuery();
  const props=(adventure.environment?.props||[]).filter(p=>(p.locationId===location.id||p.holderId===hero.id)&&p.visibility==='visible').map((p,index)=>({p,index,score:relevance({...p,text:[p.name,...(p.aliases||[])].join(' ')},query,scene)*8+(p.holderId===hero.id?3:0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
  for(const {p} of props.slice(0,8))append('sceneProps',{id:p.id,name:clip(p.name,100),aliases:p.aliases,locationId:p.locationId,anchorId:p.anchorId,material:p.material,size:p.size,weightLb:p.weightLb,portable:p.portable,condition:p.condition,holderId:p.holderId,ownerNpcId:p.ownerNpcId,accessible:p.accessible,source:'established'});
  // Bookmarks and relevant active objectives get space before optional prose.
  for(const note of recall(bookmarks,query,scene,4))appendBookmark(note);
  for(const q of ranked.slice(0,6))appendQuest(q);
  const questTargets=new Set(packet.quests.flatMap(q=>q.objectives.flatMap(o=>[o.targetId,o.recipientId,...(o.alternativeTargetIds||[])])));
  const attempts=require('./scene-checks').publicChecks(state);
  for(const d of adventure.loreDefinitions.filter(d=>require('./adventure-access').targets(adventure,d.id).some(id=>questTargets.has(id))||(d.trigger==='manual'&&d.locationId===location.id)).map((d,index)=>({d,index,score:relevance({...d,text:d.prompt},query,scene)*4+(d.locationId===location.id?3:0)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,8).map(x=>x.d)){const c=attempts.find(c=>c.id===adventure.loreCheckIds[d.id]);append('checks',{id:d.id,alternativeFor:d.alternativeFor,title:clip(d.title,100),locationId:d.locationId,npcId:d.npcId,skill:d.skill,dc:d.dc,trigger:d.trigger,attempted:Boolean(c?.attempted),success:c?.result?.success});}
  const access=require('./adventure-access');
  for(const raw of adventure.items.filter(i=>!i.collected&&i.locationId===location.id).slice(0,6)){const i=access.publicItem(state,adventure,raw);append('objects',{id:i.id,name:clip(i.name,100),description:clip(i.description,180),available:i.accessState.available,access:i.accessState});}
  const people=adventure.npcs.map((n,index)=>({n,index,score:relevance({...n,text:`${n.role} ${n.personality}`},query,scene)*5+(n.locationId===location.id?5:0)+(questTargets.has(n.id)?3:0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
  for(const {n} of people.slice(0,4)){const record=adventure.environment?.npcStates?.find(r=>r.npcId===n.id),relation=social.publicStatus(adventure,n.id);append('npcs',{id:n.id,name:clip(n.name,80),role:clip(n.role,140),combatProfile:n.combatProfile||'civilian',companionOffer:n.companionOffer?{classId:n.companionOffer.classId,reason:clip(n.companionOffer.reason,140)}:undefined,joined:state.party.members.some(m=>m.id===n.id&&m.kind==='ally'),locationId:n.locationId,location:clip(adventure.locations.find(l=>l.id===n.locationId)?.name,140),trust:n.trust,familiarity:n.familiarity,disposition:n.disposition||record?.disposition,relationship:{dueCoins:relation.dueCoins,serious:relation.serious,availableApproaches:relation.availableApproaches,claimableDamage:relation.claimableDamage,lastOutcome:relation.lastOutcome?{goal:relation.lastOutcome.goal,approach:relation.lastOutcome.approach,success:relation.lastOutcome.success,coinsPaid:relation.lastOutcome.coinsPaid,text:clip(relation.lastOutcome.text,180)}:undefined},body:record?{hp:record.body.hp,life:life(state,adventure,n.id),conditions:record.body.conditions,ac:record.body.ac,profile:record.profile}:undefined});}
  for(const m of archived)appendRecollection(m);
  for(const q of settled)appendQuestHistory(q);
  for(const f of recall([...state.facts].reverse().filter(f=>f.id!=='hero_identity'&&!packet.bookmarks.some(b=>b.id===f.id)&&!packet.activeFacts.some(b=>b.id===f.id)),query,scene,8))appendFact(f);
  for(const note of recall((adventure.notes||[]).filter(n=>!n.pinned),query,scene,3))append('recollections',{id:note.id,kind:'player_note',confidence:'player_note',text:clip(note.text,650)});
  const economy=require('./adventure-economy'),commerce=economy.publicEconomy(state,adventure);
  for(const market of commerce.markets.slice(0,3)){
    const offers=market.offers.map((o,index)=>({o,index,score:relevance({...o,text:o.description},query,scene)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4).map(({o})=>({id:o.id,name:clip(o.name,80),kind:o.kind,price:o.price,stock:o.stock,targetId:o.targetId}));
    append('markets',{id:market.id,name:clip(market.name,100),livelihood:clip(market.livelihood,180),shortage:clip(market.shortage,160),discount:market.discount,standing:Number.isFinite(adventure.reputation[market.locationId])?adventure.reputation[market.locationId]:0,offers,choices:market.encounter&&!market.encounter.resolved?market.encounter.choices.map(c=>({id:c.id,label:clip(c.label,80)})):[]});
  }
  for(const row of commerce.ledger.slice(0,3))append('transactions',{turn:row.turn,marketId:row.marketId,kind:row.kind,amount:row.amount,balance:row.balance,text:clip(row.text,160)});
  for(const q of ranked.filter(q=>!packet.quests.some(s=>s.id===q.id)).slice(0,20)){const next=q.objectives.find(o=>!o.completed);append('questIndex',{id:q.id,title:clip(q.title,80),status:q.status,next:clip(next?.text,100),objectiveId:next?.id,kind:next?.kind,targetId:next?.targetId,recipientId:next?.recipientId});}
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
    activeQuests:pending.filter(q=>q.status==='active').length,recalledMessages:packet.recollections.length,recalledEvents:packet.pastEvents.length}};
}
module.exports={contextFor,excerpt,MAX_CHARS};
