const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const model=require('../src/adventure-model'),{contextFor,MAX_CHARS}=require('../src/adventure-context');
const engine=require('../src/adventure-engine'),memory=require('../src/adventure-memory'),ai=require('../src/ai-bridge'),srd=require('../src/srd-engine');
let directory,generate;
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-memory-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});

function contextFixture(){const input={heroName:'Mira',worldIdea:'Islands of stories'},adventure=model.makeAdventure(model.fallbackSeed(input),input),hero={id:'hero',name:'Mira',level:1,hp:{current:8,max:8},ac:12,conditions:[],abilities:{},skillProficiencies:[],resources:[],inventory:[]};return {adventure,state:{party:{heroId:'hero',members:[hero]},facts:[]}};}
test('queried pinned engine facts survive unrelated note pins and unused bookmark candidates stay recallable',()=>{
  const {state,adventure}=contextFixture();adventure.notes=Array.from({length:12},(_,i)=>({id:`pin-${i}`,text:'Unrelated weather note '.repeat(25),pinned:true}));
  state.facts=[{id:'actual-key',text:'The Astral Lyre belongs to Captain Lumen.',confidence:'confirmed'},{id:'unselected-pin',text:'The seventh tower contains a brass archive.',confidence:'confirmed'}];adventure.pinnedFactIds=state.facts.map(f=>f.id);
  const before=JSON.stringify({state,adventure}),context=contextFor(state,adventure,'Who owns the Astral Lyre?');assert.ok(context.packet.bookmarks.some(b=>b.id==='actual-key'));assert.ok(context.metrics.chars<=MAX_CHARS);assert.equal(JSON.stringify({state,adventure}),before);
  const ordinary=contextFor(state,adventure,'A quiet day');assert.ok(ordinary.packet.activeFacts.some(f=>f.id==='unselected-pin')||ordinary.packet.bookmarks.some(f=>f.id==='unselected-pin'));
});
test('an objective-only query reserves exact quest/goal/item/recipient identities among eighty active quests',()=>{
  const {state,adventure}=contextFixture();adventure.quests=[];
  for(let i=0;i<80;i++)adventure.quests.push({id:`task-${i}`,title:`Task ${i}`,summary:'Help a local resident.',status:'active',objectives:[{id:`goal-${i}`,text:i===0?'Deliver the Astral Lyre to Captain Lumen.':'Walk along a road.',kind:i===0?'deliver':'visit',targetId:i===0?'astral-lyre':'threshold',recipientId:i===0?'guide':undefined,completed:false,evidenceEventId:null}]});
  adventure.notes=Array.from({length:20},(_,i)=>({id:`p-${i}`,text:'Unrelated note '.repeat(45),pinned:true}));const before=JSON.stringify(adventure),context=contextFor(state,adventure,'What remains to deliver the Astral Lyre?');
  const q=context.packet.quests.find(q=>q.id==='task-0');assert.ok(q);assert.equal(q.objectives[0].id,'goal-0');assert.equal(q.objectives[0].targetId,'astral-lyre');assert.equal(q.objectives[0].recipientId,'guide');assert.equal(q.objectives[0].completed,false);assert.ok(context.metrics.chars<=MAX_CHARS);assert.equal(JSON.stringify(adventure),before);
  adventure.quests[0].status='completed';adventure.quests[0].rewardClaimed=true;assert.ok(contextFor(state,adventure,'Was the Astral Lyre task completed?').packet.questHistory.some(q=>q.id==='task-0'&&q.status==='completed'&&q.rewardClaimed));
});
test('old journal-only accepted decisions and delivery evidence enter bounded context after six hundred later events',()=>{
  const {state,adventure}=contextFixture();const delivery=model.addEvent(adventure,'deliver','amber-locket','The Amber Locket was given to Captain Lumen.',{recipientId:'guide',questId:'q-amber',objectiveId:'goal-amber',inventoryItemId:'world_amber'});
  const decision=model.addEvent(adventure,'dialogue_decision','proposal-amber','Mira accepted Rae\'s proposal about the Amber Locket.',{dialogueId:'dialogue-amber',proposalId:'proposal-amber',actionId:'talk:guide',speakerId:'rae',decision:'accepted'});
  for(let turn=2;turn<=602;turn++){adventure.turn=turn;model.addEvent(adventure,'story','start',`Unrelated road ${turn}`);}adventure.notes=Array.from({length:20},(_,i)=>({id:`pin-${i}`,text:'Unrelated weather '.repeat(30),pinned:true}));
  const before=JSON.stringify({state,adventure}),context=contextFor(state,adventure,'Did we accept the proposal and deliver the Amber Locket to Captain Lumen?');
  const handed=context.packet.pastEvents.find(e=>e.id===delivery.id),accepted=context.packet.pastEvents.find(e=>e.id===decision.id);assert.ok(handed);assert.equal(handed.recipientId,'guide');assert.equal(handed.questId,'q-amber');assert.ok(accepted);assert.equal(accepted.actionId,'talk:guide');assert.equal(accepted.decision,'accepted');assert.ok(context.metrics.chars<=MAX_CHARS);assert.equal(JSON.stringify({state,adventure}),before);
});

test('600 turns preserve complete history and recall an old promise from the real adventure archive',()=>{
  const input={heroName:'Мира',worldIdea:'Острова над светлым океаном'},adventure=model.makeAdventure(model.fallbackSeed(input),input);
  const hero={id:'hero',name:'Мира',level:1,hp:{current:8,max:8,temp:0},ac:12,conditions:[],abilities:{int:16},skillProficiencies:['history'],resources:[],inventory:[]};
  const state={party:{heroId:'hero',members:[hero]},facts:[]};
  model.addMessage(adventure,'player','Мира','Я обещала капитану Тарену вернуть янтарный ключ маяка. Пароль: АМБЕР-73.');
  adventure.notes=[{id:'identity',text:'Я картограф и ищу пропавшую наставницу.',pinned:true}];
  for(let turn=1;turn<=600;turn++){
    adventure.turn=turn;model.addEvent(adventure,'story','start',`Путешествие ${turn}: обычная дорожная запись.`);
    model.addMessage(adventure,'dm','Мастер','Облака медленно проходят над улицами. '.repeat(20));
    const context=contextFor(state,adventure,'Осмотреть улицу');assert.ok(context.metrics.chars<=MAX_CHARS);
  }
  const before=JSON.stringify({state,adventure}),recalled=contextFor(state,adventure,'Что я обещала капитану Тарену и какой пароль от маяка?');
  assert.ok(recalled.packet.recollections.some(m=>m.text.includes('АМБЕР-73')));
  assert.ok(recalled.packet.bookmarks.some(m=>m.id==='identity'));assert.equal(adventure.journal.length,600);
  assert.equal(adventure.messages.length+adventure.archive.length,601);assert.equal(JSON.stringify({state,adventure}),before);
  assert.ok(!JSON.stringify(recalled.packet).includes('Этот путь прежде соединял поселения'));
});
test('a late active quest is selected by relevance and completed quests retain their actual outcome',()=>{
  const input={heroName:'Мира',worldIdea:'Море света'},adventure=model.makeAdventure(model.fallbackSeed(input),input);
  const hero={id:'hero',name:'Мира',level:1,hp:{current:8,max:8},ac:12,conditions:[],abilities:{},skillProficiencies:[],resources:[],inventory:[]};
  const state={party:{heroId:'hero',members:[hero]},facts:[]};
  for(let i=0;i<80;i++)adventure.quests.push({...structuredClone(adventure.quests[0]),id:`quest-${i}`,title:`Дорожная задача ${i}`,status:'active'});
  const target=adventure.quests.at(-1);target.title='Лунный компас';target.summary='Найти компас капитана Тарена.';
  let context=contextFor(state,adventure,'Что осталось сделать по задаче Лунный компас?');assert.equal(context.packet.quests[0].id,target.id);assert.ok(context.metrics.chars<=MAX_CHARS);
  target.status='completed';target.rewardClaimed=true;context=contextFor(state,adventure,'Мы уже получили награду за Лунный компас?');
  assert.ok(context.packet.questHistory.some(q=>q.id===target.id&&q.status==='completed'&&q.rewardClaimed));
});
test('recollection finds a distant NPC and a late inventory item instead of only the first nearby records',()=>{
  const input={heroName:'Мира',worldIdea:'Море света'},adventure=model.makeAdventure(model.fallbackSeed(input),input);
  for(let i=0;i<6;i++)adventure.npcs.push({id:`local-${i}`,name:`Житель ${i}`,role:'Сосед',personality:'',locationId:'start',trust:0,familiarity:0});
  adventure.npcs.push({id:'archivist',name:'Архивариус',role:'Хранитель записей',personality:'',locationId:'threshold',trust:0,familiarity:0});
  const inventory=Array.from({length:40},(_,i)=>({itemId:`ordinary-${i}`,name:`Вещь ${i}`,quantity:1}));inventory.push({itemId:'amber-key',name:'Янтарный ключ',quantity:1});
  const hero={id:'hero',name:'Мира',level:1,hp:{current:8,max:8},ac:12,conditions:[],abilities:{},skillProficiencies:[],resources:[],inventory};
  const packet=contextFor({party:{heroId:'hero',members:[hero]},facts:[]},adventure,'Где Архивариус и у меня есть Янтарный ключ?').packet;
  assert.ok(packet.npcs.some(n=>n.id==='archivist'&&n.locationId==='threshold'));assert.ok(packet.inventory.some(i=>i.id==='amber-key'&&i.quantity===1));
});
test('short names and English key queries can recall a speaker without matching the word monkey',()=>{
  const input={heroName:'Mira',worldIdea:'Floating islands'},adventure=model.makeAdventure(model.fallbackSeed(input),input);
  adventure.archive=[{id:'bob',author:'Bob',role:'companion',turn:1,text:'The key is under an oak. The phrase is ELM-8.'},...Array.from({length:20},(_,i)=>({id:`monkeys-${i}`,role:'dm',turn:i+2,text:'The monkeys cross the forest.'}))];
  const hero={id:'hero',name:'Mira',level:1,hp:{current:8,max:8},ac:12,conditions:[],abilities:{},skillProficiencies:[],resources:[],inventory:[]};
  const packet=contextFor({party:{heroId:'hero',members:[hero]},facts:[]},adventure,'What did Bob say about the key?').packet;
  assert.ok(packet.recollections.some(m=>m.speaker==='Bob'&&m.text.includes('ELM-8')));assert.ok(!packet.recollections.some(m=>m.text.includes('monkeys')));
});
test('manual notes and pins persist without spending a turn, rolling, or calling the AI',async()=>{
  let view=await engine.create({heroName:'Мира',worldIdea:'Город на спине кита'}),calls=0;
  ai.generateStructured=async()=>{calls++;throw new Error('Notes must not call AI');};
  const turn=view.campaign.turn,rolls=view.rolls.length,body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),text:'Я обещала вернуть карту Селе.',pinned:true};
  view=await memory.addNote(body);assert.equal(view.campaign.turn,turn);assert.equal(view.rolls.length,rolls);assert.equal(calls,0);assert.equal(view.notes.length,1);
  const replay=await memory.addNote(body);assert.equal(replay.replayed,true);assert.equal(replay.notes.length,1);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.notes[0].pinned,true);
  const loaded=await engine.loaded(view.campaign.id);assert.ok(contextFor(loaded.state,loaded.adventure).packet.bookmarks.some(n=>n.text.includes('Селе')));
  view=await memory.pin({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),kind:'note',recordId:view.notes[0].id,pinned:false});assert.equal(view.notes[0].pinned,false);
  assert.equal(calls,0);ai.generateStructured=async(type,payload,fallback)=>fallback();
});
test('asking the master uses one request and cannot advance the game or apply suggested world developments',async()=>{
  let view=await engine.create({heroName:'Мира',worldIdea:'Острова над морем света'}),calls=0;
  const before={turn:view.campaign.turn,day:view.campaign.day,hours:view.campaign.hours,hero:JSON.stringify(view.hero),quests:JSON.stringify(view.quests),locations:JSON.stringify(view.locations),journal:JSON.stringify(view.journal)};
  ai.generateStructured=async(type,payload)=>{calls++;assert.equal(type,'master_question');assert.equal(payload.questionOnly,true);return {narration:'Ты находишься на первом привале.',developments:{locations:[{id:'should-not-appear',name:'Новое событие',description:'Вопрос не меняет карту.',kind:'road',connectsTo:['start']}]}};};
  const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'Где я нахожусь?'};
  view=await engine.ask(body);assert.equal(calls,1);assert.equal(view.campaign.turn,before.turn);assert.equal(view.campaign.day,before.day);assert.equal(view.campaign.hours,before.hours);
  assert.equal(JSON.stringify(view.hero),before.hero);assert.equal(JSON.stringify(view.quests),before.quests);assert.equal(JSON.stringify(view.locations),before.locations);assert.equal(JSON.stringify(view.journal),before.journal);
  const replay=await engine.ask(body);assert.equal(replay.replayed,true);assert.equal(calls,1);
  ai.generateStructured=async(type,payload,fallback)=>fallback();
});
test('the journal searches all archived entries and paginates without duplicating or truncating stored history',async()=>{
  const view=await engine.create({heroName:'Мира',worldIdea:'Море света'}),loaded=await engine.loaded(view.campaign.id);
  model.addEvent(loaded.adventure,'story','start','Старинный пароль маяка: серебро.');
  for(let i=0;i<350;i++)model.addEvent(loaded.adventure,'story','start',`Обычная запись ${i}`);
  await engine.save(loaded.service,loaded.state,loaded.adventure,'history_fixture');
  const publicView=await engine.getView(view.campaign.id);assert.equal(publicView.journal.length,100);assert.ok(publicView.journalTotal>350);
  const search=await memory.history(view.campaign.id,{query:'пароль маяка'});assert.equal(search.total,1);assert.match(search.entries[0].text,/серебро/);
  const ids=[];let offset=0;do{const page=await memory.history(view.campaign.id,{offset,limit:50});ids.push(...page.entries.map(e=>e.id));offset=page.nextOffset;}while(offset!==null);
  assert.equal(new Set(ids).size,loaded.adventure.journal.length);assert.equal(ids.length,loaded.adventure.journal.length);
});
test('journal categories search the entire saved history, paginate exact results and never rewrite source or spend actions',async()=>{
  const view=await engine.create({heroName:'Мира',worldIdea:'Море света'}),loaded=await engine.loaded(view.campaign.id);
  const accepted=model.addEvent(loaded.adventure,'dialogue_decision','proposal-old','Рэй: приняли разговор про янтарный ключ.',{decision:'accepted',actionId:'talk:guide'});
  for(let i=0;i<180;i++)model.addEvent(loaded.adventure,'story','start',`Дорожная запись ${i}`);
  const second=model.addEvent(loaded.adventure,'dialogue_interjection','guide','Мира спрашивает про янтарный ключ.');
  model.addEvent(loaded.adventure,'party_item','guide','Мира передала янтарный ключ.');
  model.addEvent(loaded.adventure,'quest_accept','q','Приняли задачу о янтарном ключе.');
  await engine.save(loaded.service,loaded.state,loaded.adventure,'categories_fixture');
  const original=structuredClone(loaded.adventure),before=await engine.getView(view.campaign.id);
  const page=await memory.history(view.campaign.id,{query:'ЯНТАРНЫЙ',category:'dialogue',limit:1});assert.equal(page.total,2);assert.equal(page.entries[0].id,second.id);assert.equal(page.entries[0].category,'dialogue');assert.equal(page.nextOffset,1);
  const next=await memory.history(view.campaign.id,{query:'янтарный',category:'dialogue',offset:page.nextOffset,limit:1});assert.equal(next.entries[0].id,accepted.id);assert.equal(next.nextOffset,null);
  assert.equal((await memory.history(view.campaign.id,{category:'loot',query:'ключ'})).total,1);assert.equal((await memory.history(view.campaign.id,{category:'quests',query:'ключ'})).total,1);
  await assert.rejects(memory.history(view.campaign.id,{category:'invented'}),e=>e.status===400);
  const after=await engine.getView(view.campaign.id);assert.equal(after.campaign.revision,before.campaign.revision);assert.equal(after.campaign.turn,before.campaign.turn);assert.deepEqual(after.hero,before.hero);assert.deepEqual((await engine.loaded(view.campaign.id)).adventure,original);
  assert.ok(!Object.hasOwn(original.journal[0],'category'));await srd.closeSessions();assert.equal((await memory.history(view.campaign.id,{category:'dialogue',query:'янтарный'})).total,2);
});
test('200 executed adventure turns survive reopening SQLite with complete dialogue and bounded context',async()=>{
  let view=await engine.create({heroName:'Мира',worldIdea:'Острова над океаном света'});
  const beforeHp=view.hero.hp.current,beforeXp=view.hero.xp;
  for(let i=0;i<200;i++) {
    view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:i===0?'Я обещала капитану Тарену вернуть янтарный ключ. Пароль: ПАРУС-17.':`Продолжаю путь ${i}.`,command:{type:'narrative',description:`Герой изучает мир, запись ${i}.`}});
    assert.ok(view.memory.chars<=MAX_CHARS);
    if(i===99){await srd.closeSessions();view=await engine.getView(view.campaign.id);}
  }
  await srd.closeSessions();const loaded=await engine.loaded(view.campaign.id);
  assert.equal(loaded.adventure.messages.length+loaded.adventure.archive.length,401);
  assert.equal(loaded.adventure.journal.filter(e=>e.kind==='story').length,200);
  assert.equal(loaded.adventure.journal.filter(e=>e.kind==='visit').length,1);
  assert.equal(loaded.adventure.journal.filter(e=>e.kind==='market_restock').length,1);
  assert.equal(loaded.adventure.journal.length,202);assert.equal(loaded.adventure.turn,201);
  assert.equal(loaded.state.party.members[0].hp.current,beforeHp);assert.equal(loaded.state.party.members[0].xp,beforeXp);
  assert.ok(contextFor(loaded.state,loaded.adventure,'Что обещала капитану Тарену и какой пароль?').packet.recollections.some(m=>m.text.includes('ПАРУС-17')));
});
