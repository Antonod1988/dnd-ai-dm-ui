const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const model=require('../src/adventure-model'),{contextFor,MAX_CHARS}=require('../src/adventure-context');
const engine=require('../src/adventure-engine'),memory=require('../src/adventure-memory'),ai=require('../src/ai-bridge'),srd=require('../src/srd-engine');
let directory,generate;
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-memory-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});

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
