const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const adventure=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
const {elapsedSeconds,expireExplorationEffects}=require('../src/adventure-clock');
let directory,generate,core,view;
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-mechanics-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';
  generate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();
  core=await import('../vendor/dnd-core/dist/engine.mjs');
});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){view=await adventure.create({heroName:'Мира',worldIdea:'Острова над морем света',classId:'wizard'});return view;}
async function act(command,seed='mechanics-proof'){
  const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};
  view=await adventure.perform(body,{seed});return {body,view};
}
test('round completion advances six seconds while rests and travel use their exact duration',async()=>{
  assert.equal(elapsedSeconds({type:'action'},{round:1},{round:1}),0);
  assert.equal(elapsedSeconds({type:'action'},{round:1},{round:2}),6);
  assert.equal(elapsedSeconds({type:'action'},{round:1},null),6);
  await create();await act({type:'rest',kind:'long'});assert.equal(view.campaign.hours,16);
  await act({type:'rest',kind:'short'});assert.equal(view.campaign.hours,17);
  await act({type:'travel',locationId:'threshold'});assert.equal(view.campaign.hours,18);
});
test('the playable spell panel excludes catalog spells beyond this hero’s current access',async()=>{
  await create();assert.ok(view.spellbook.spells.length);
  assert.ok(view.spellbook.spells.every(s=>s.accessible));assert.ok(!view.spellbook.spells.some(s=>s.id==='spell_meteor_swarm'));
});
test('generated armor is visible, persists on casting, then expires during exploration',async()=>{
  await create();const ac=view.hero.ac;
  view=await adventure.learnSpell(view.campaign.id,{name:'Нити света',description:'Свет защищает героя на одну минуту.',level:1,rangeFeet:0,target:'self',durationTurns:10,concentration:true,effects:[{type:'armor',amount:1}]});
  await act({type:'cast_created_spell',spellId:view.createdSpells[0].id,targetId:view.hero.id});
  assert.equal(view.hero.ac,ac+1);assert.equal(view.hero.baseAc,ac);assert.equal(view.hero.spellcasting.slots['1'].current,1);
  assert.equal(view.hero.activeEffects[0].remainingSourceTurnEnds,10);
  await act({type:'narrative',description:'Герой изучает свет на стене.'});assert.equal(view.hero.ac,ac);assert.equal(view.hero.activeEffects?.length||0,0);
  assert.ok(view.journal.some(e=>e.kind==='effects_expired'));
});
test('expiration removes only elapsed effects and does not shorten a second effect twice',async()=>{
  await create();const {state}=await adventure.loaded(view.campaign.id),hero=state.party.members[0];
  hero.activeEffects=[{id:'brief',label:'Brief',sourceId:hero.id,remainingSourceTurnEnds:1,appliedCondition:'restrained'},{id:'long',label:'Long',sourceId:hero.id,remainingSourceTurnEnds:10,armorClassBonus:1},{id:'new',label:'New',sourceId:hero.id,remainingSourceTurnEnds:10,armorClassBonus:1}];hero.conditions.push('restrained');
  await expireExplorationEffects(state,new Set(['brief','long']),18);
  assert.equal(state.party.members[0].activeEffects.find(e=>e.id==='long').remainingSourceTurnEnds,7);
  assert.equal(state.party.members[0].activeEffects.find(e=>e.id==='new').remainingSourceTurnEnds,10);
  assert.ok(!state.party.members[0].conditions.includes('restrained'));
});
test('free text can cast an exact learned spell and an invented spell id cannot mutate the campaign',async()=>{
  await create();view=await adventure.learnSpell(view.campaign.id,{name:'Призматический щит',description:'Свет защищает героя.',level:1,rangeFeet:0,target:'self',durationTurns:1,effects:[{type:'armor',amount:1}]});
  const spellId=view.createdSpells[0].id,heroId=view.hero.id;
  ai.generateStructured=async(type,payload,fallback)=>{
    if(type==='adventure_intent'){assert.ok(payload.context.createdSpells.some(s=>s.id===spellId));return {type:'cast_created_spell',spellId,targetId:heroId,description:'Герой применяет щит.'};}
    return fallback();
  };
  view=await adventure.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'Применяю Призматический щит к себе.'});
  assert.equal(view.hero.spellcasting.slots['1'].current,1);assert.equal(view.hero.ac,view.hero.baseAc+1);
  const before=JSON.stringify(view.hero);
  ai.generateStructured=async(type,payload,fallback)=>type==='adventure_intent'?{type:'cast_created_spell',spellId:'invented',targetId:heroId,description:'Неподдержанное имя.'}:fallback();
  await assert.rejects(adventure.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'Другой щит.'}),/не существует/);
  assert.equal(JSON.stringify((await adventure.getView(view.campaign.id)).hero),before);
  ai.generateStructured=async(type,payload,fallback)=>fallback();
});
test('dying heroes have a death-save action, stable heroes recover once, dead heroes cannot recover',async()=>{
  await create();let loaded=await adventure.loaded(view.campaign.id),hero=loaded.state.party.members[0];
  hero.hp.current=0;hero.conditions=['dying','unconscious'];hero.deathSaves={successes:0,failures:0,stable:false,dead:false};
  await adventure.save(loaded.service,loaded.state,loaded.adventure,'dying_fixture');view=await adventure.getView(view.campaign.id);
  assert.ok(view.actions.some(a=>a.id==='death:save'));assert.ok(!view.actions.some(a=>a.kind==='travel'));
  let seed;for(let i=0;i<100;i++){const roll=core.rollExpression('1d20',{rng:new core.SeededRng(String(i))});if(roll.total>=10&&roll.total<20){seed=String(i);break;}}
  for(let i=0;i<3;i++)await act({type:'death_save'},seed);
  assert.equal(view.hero.deathSaves.stable,true);assert.ok(!view.actions.some(a=>a.id==='death:save'));
  assert.ok(view.actions.some(a=>a.id==='recover:stable'));
  const before=view.campaign.hours,xp=view.hero.xp,slots=view.hero.spellcasting.slots['1'].current;
  const {body}=await act({type:'recover_stable'});
  assert.equal(view.hero.hp.current,1);assert.ok(view.campaign.hours-before>=1&&view.campaign.hours-before<=4);assert.equal(view.hero.xp,xp);assert.equal(view.hero.spellcasting.slots['1'].current,slots);
  const replay=await adventure.perform(body);assert.equal(replay.replayed,true);assert.equal(replay.hero.hp.current,1);
  loaded=await adventure.loaded(view.campaign.id);hero=loaded.state.party.members[0];hero.hp.current=0;hero.conditions=['dead'];hero.deathSaves={successes:0,failures:3,stable:false,dead:true};await adventure.save(loaded.service,loaded.state,loaded.adventure,'dead_fixture');view=await adventure.getView(view.campaign.id);
  assert.equal(view.actions.length,0);
  await assert.rejects(act({type:'recover_stable'}),/стабильному/);await assert.rejects(act({type:'death_save'}),/не нужен/);
});
test('a lethal created spell ends real combat and completes a victory objective exactly once',async()=>{
  await create();view=await adventure.learnSpell(view.campaign.id,{name:'Серебряная искра',description:'Разряд света.',level:0,rangeFeet:60,saveAbility:'dex',effects:[{type:'damage',dice:'1d6',damageType:'force'}]});
  await act({type:'combat',difficulty:'easy',theme:'Небольшая опасность'});
  const loaded=await adventure.loaded(view.campaign.id),battle=loaded.state.combat;
  const enemies=battle.participants.filter(p=>p.kind==='enemy');assert.ok(enemies.length);
  const target=enemies[0];target.hp.current=1;target.abilities.dex=1;
  for(const enemy of enemies.slice(1)){enemy.hp.current=0;enemy.conditions=['dead'];}
  battle.turnIndex=battle.participants.findIndex(p=>p.kind==='player');battle.turnBudget=undefined;
  loaded.adventure.quests.push({id:'victory-proof',title:'Защитить остров',summary:'Отразить нападение',status:'active',rewardTheme:'Светлый камень',rewardClaimed:false,sequential:true,objectives:[{id:'victory-stage',text:'Победить',kind:'victory',targetId:loaded.adventure.currentLocationId,completed:false}]});
  await adventure.save(loaded.service,loaded.state,loaded.adventure,'combat_fixture');view=await adventure.getView(view.campaign.id);
  let seed;for(let i=0;i<100;i++){const roll=core.rollSavingThrow(target,{ability:'dex',dc:13,rng:new core.SeededRng(String(i)),rules:loaded.state.campaign.rules});if(!roll.success){seed=String(i);break;}}
  const {body}=await act({type:'cast_created_spell',spellId:view.createdSpells[0].id,targetId:target.id},seed);
  assert.equal(view.combat,null);assert.equal(view.quests.find(q=>q.id==='victory-proof').status,'completed');
  const xp=view.hero.xp,inventory=view.hero.inventory.length;const replay=await adventure.perform(body);
  assert.equal(replay.hero.xp,xp);assert.equal(replay.hero.inventory.length,inventory);
});
