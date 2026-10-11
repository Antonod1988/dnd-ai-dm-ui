const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let directory,generate,view;
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-class-proof-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;ai.generateStructured=async(t,p,f)=>f();});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(classId,level3=true){view=await engine.create({heroName:classId,worldIdea:'Острова и дорога испытаний',classId});if(level3){const {service}=await engine.loaded(view.campaign.id);await service.levelUp(view.campaign.id,view.hero.id,900);view=await engine.getView(view.campaign.id);}return view;}
async function act(command,seed='adventure-loop'){const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};view=await engine.perform(body,{seed});return body;}
async function combat(){return act({type:'combat',difficulty:'easy',theme:'Проверка защитника дороги'});}
test('all twelve class foundations advance to level three, enter real combat, retreat and reopen intact',async()=>{
  for(const classId of ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard']){
    await create(classId);assert.equal(view.hero.level,3,classId);const id=view.campaign.id,xp=view.hero.xp;
    await combat();assert.ok(view.combat,classId);assert.ok(view.actions.some(a=>a.id==='core:combat.end_turn'),classId);
    assert.ok(view.actions.some(a=>/combat\.attack\./.test(a.id)),classId);
    await act({type:'action',actionId:'combat.flee'});assert.equal(view.combat,null);assert.equal(view.hero.xp,xp);
    const snapshot=structuredClone(view.hero);await srd.closeSessions();view=await engine.getView(id);assert.deepEqual(view.hero,snapshot,classId);
  }
});
test('real monk ki, barbarian rage and fighter extra action spend their distinct costs and recover with rest',async()=>{
  for(const row of [{classId:'monk',action:'combat.bonus.ki.patient_defense',resource:'ki',cost:'bonusAction'},{classId:'barbarian',action:'combat.bonus.class_feature.feature_rage',resource:'rage',cost:'bonusAction'},{classId:'fighter',action:'combat.free.class_feature.feature_action_surge',resource:'action_surge'}]){
    await create(row.classId);await combat();const before=view.hero.resources.find(r=>r.id===row.resource).current;
    await act({type:'action',actionId:row.action});assert.equal(view.hero.resources.find(r=>r.id===row.resource).current,before-1);
    if(row.cost){assert.equal(view.turnBudget[row.cost],false);assert.equal(view.turnBudget.action,true);}else assert.equal(view.turnBudget.extraActions,1);
    await act({type:'action',actionId:'combat.flee'});await act({type:'rest',kind:'long'});assert.equal(view.hero.resources.find(r=>r.id===row.resource).current,before);
  }
});
test('spell-panel casting spends its real action and a second cast cannot bypass it or change saved resources',async()=>{
  await create('wizard');await act({type:'combat',difficulty:'hard'});const target=view.combat.participants.find(p=>p.kind==='enemy').id;
  const slots=view.hero.spellcasting.slots['1'].current;await act({type:'cast_spell',spellId:'spell_magic_missile',targetId:target});
  assert.equal(view.hero.spellcasting.slots['1'].current,slots-1);
  assert.ok(view.combat);assert.equal(view.turnBudget.action,false);assert.equal(view.turnBudget.bonusAction,true);const before=JSON.stringify(view.hero),revision=view.campaign.revision;await assert.rejects(act({type:'cast_spell',spellId:'spell_magic_missile',targetId:view.combat.participants.find(p=>p.kind==='enemy'&&p.hp.current>0).id}),/недоступно|already spent/);const saved=await engine.getView(view.campaign.id);assert.equal(JSON.stringify(saved.hero),before);assert.equal(saved.campaign.revision,revision);
});
test('a cleric bonus spell preserves its main action and cannot be cast twice in the same turn',async()=>{
  await create('cleric');await combat();const slots=view.hero.spellcasting.slots['1'].current;
  await act({type:'cast_spell',spellId:'spell_healing_word',targetId:view.hero.id});assert.equal(view.hero.spellcasting.slots['1'].current,slots-1);assert.equal(view.turnBudget.bonusAction,false);assert.equal(view.turnBudget.action,true);
  await assert.rejects(act({type:'cast_spell',spellId:'spell_healing_word',targetId:view.hero.id}),/недоступно/);
});
test('spell-panel victory completes a quest, awards earned XP and drops loot exactly once',async()=>{
  await create('wizard');await combat();const loaded=await engine.loaded(view.campaign.id);const target=loaded.state.combat.participants.find(p=>p.kind==='enemy');target.hp.current=1;
  loaded.adventure.quests.push({id:'panel-victory',title:'Победа заклинанием',summary:'Защитить дорогу',status:'active',rewardTheme:'Знак защитника',rewardClaimed:false,sequential:true,objectives:[{id:'victory',text:'Победить',kind:'victory',targetId:loaded.adventure.currentLocationId,completed:false}]});await engine.save(loaded.service,loaded.state,loaded.adventure,'panel_victory_fixture');view=await engine.getView(view.campaign.id);const xp=view.hero.xp;
  const body=await act({type:'cast_spell',spellId:'spell_magic_missile',targetId:target.id});assert.equal(view.combat,null);assert.equal(view.quests.find(q=>q.id==='panel-victory').status,'completed');assert.ok(view.hero.xp>xp);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,1);
  const replay=await engine.perform(body);assert.equal(replay.hero.xp,view.hero.xp);assert.equal(replay.items.filter(i=>i.origin?.kind==='combat').length,1);
});
test('level-three pact magic can power a lower-level original spell and recover its actual higher slot on short rest',async()=>{
  await create('warlock');assert.equal(view.hero.spellcasting.slots['1'],undefined);assert.equal(view.hero.spellcasting.slots['2'].current,2);
  view=await engine.learnSpell(view.campaign.id,{name:'Тёплая тень',description:'Тень возвращает немного сил.',level:1,rangeFeet:0,target:'self',effects:[{type:'healing',dice:'1d6'}]});
  await act({type:'cast_created_spell',spellId:view.createdSpells[0].id,targetId:view.hero.id});assert.equal(view.hero.spellcasting.slots['2'].current,1);assert.equal(view.hero.resources.find(r=>r.id==='spell_slots_2').current,1);
  await act({type:'rest',kind:'short'});assert.equal(view.hero.spellcasting.slots['2'].current,2);assert.equal(view.hero.resources.find(r=>r.id==='spell_slots_2').current,2);
});
test('a spell unavailable to the current combat actor or an invented target cannot spend a slot',async()=>{
  await create('wizard');await combat();let before=structuredClone(view.hero);await assert.rejects(act({type:'cast_spell',spellId:'spell_magic_missile',targetId:'invented'}),/недоступно/);assert.deepEqual((await engine.getView(view.campaign.id)).hero,before);
  const loaded=await engine.loaded(view.campaign.id);loaded.state.combat.turnIndex=loaded.state.combat.participants.findIndex(p=>p.kind==='enemy');loaded.state.combat.turnBudget=undefined;await engine.save(loaded.service,loaded.state,loaded.adventure,'wrong_actor_fixture');view=await engine.getView(view.campaign.id);before=structuredClone(view.hero);
  await assert.rejects(act({type:'cast_spell',spellId:'spell_magic_missile',targetId:view.combat.participants.find(p=>p.kind==='enemy').id}),/недоступно/);assert.deepEqual((await engine.getView(view.campaign.id)).hero,before);
});
test('an original leveled spell can be cast in two different round-one encounters without carrying the old turn lock',async()=>{
  await create('warlock');view=await engine.learnSpell(view.campaign.id,{name:'Нити сумерек',description:'Тень защищает героя.',level:1,rangeFeet:0,target:'self',durationTurns:2,concentration:true,effects:[{type:'armor',amount:1}]});assert.equal(view.ready,true);const spellId=view.createdSpells[0].id;
  await combat();const firstCombat=view.combat.id;await act({type:'cast_created_spell',spellId,targetId:view.hero.id});assert.equal(view.hero.spellcasting.slots['2'].current,1);
  await act({type:'action',actionId:'combat.end_turn'});await act({type:'action',actionId:'combat.flee'});await combat();assert.notEqual(view.combat.id,firstCombat);await act({type:'cast_created_spell',spellId,targetId:view.hero.id});assert.equal(view.hero.spellcasting.slots['2'].current,0);
});
