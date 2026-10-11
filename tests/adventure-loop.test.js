const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const adventure=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');
let directory,generate,view,narrated=[];
const world={title:'The Beacon Route',opening:'A guide asks you to bring a prism back from the old beacon.',startLocationId:'camp',
  locations:[{id:'camp',name:'Camp',description:'A sheltered stopping place.',kind:'settlement',connectsTo:['beacon']},{id:'beacon',name:'Beacon',description:'A deserted tower with an old inscription.',kind:'ruins',connectsTo:['camp']}],
  npcs:[{id:'guide',name:'Iris',role:'Route keeper',locationId:'camp'}],
  items:[{id:'prism',name:'Route prism',description:'An etched glass prism belonging to the route keeper.',locationId:'beacon',kind:'quest'}],
  checks:[{id:'inscription',locationId:'beacon',trigger:'inspect',skill:'history',dc:5,title:'The old route',prompt:'A route is etched into the wall.',discoveredFact:'The beacon once guided travelers back to the camp.'}],
  quests:[{id:'prism-route',title:'Recover the route',summary:'Return with the prism after securing the tower.',giverId:'guide',rewardTheme:'Route keeper’s token',objectives:[{text:'Reach the beacon',kind:'visit',targetId:'beacon'},{text:'Collect the prism',kind:'acquire',targetId:'prism'},{text:'Secure the beacon',kind:'victory',targetId:'beacon'},{text:'Return to camp',kind:'visit',targetId:'camp'},{text:'Report to Iris',kind:'talk',targetId:'guide'}]},
    {id:'old-map',title:'Read the forgotten route',summary:'Discover the route and report what the prism means.',giverId:'guide',rewardTheme:'A chart of the old road',objectives:[{text:'Reach the beacon',kind:'visit',targetId:'beacon'},{text:'Read the inscription',kind:'check',targetId:'inscription'},{text:'Find its prism',kind:'acquire',targetId:'prism'},{text:'Return to camp',kind:'visit',targetId:'camp'},{text:'Report the discovery',kind:'talk',targetId:'guide'}]}]};
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-full-loop-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';
  generate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{if(type==='adventure_narration')narrated.push(payload.outcome);return type==='adventure_world'?structuredClone(world):fallback();};
});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function act(command,seed='full-loop'){
  const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};
  view=await adventure.perform(body,{seed});return body;
}
test('an unmodified hero completes exploration, normal combat, rewards, level growth, rest and a reopened campaign',async()=>{
  view=await adventure.create({heroName:'Rook',worldIdea:'A world of forgotten lighthouse roads',classId:'fighter',language:'en'});
  const startMax=view.hero.hp.max,startXp=view.hero.xp;
  await act({type:'action',actionId:'progression.fighting_style.dueling'});
  await act({type:'accept_quest',questId:'prism-route'});await act({type:'accept_quest',questId:'old-map'});
  await act({type:'travel',locationId:'beacon'});
  const core=await import('../vendor/dnd-core/dist/engine.mjs'),loaded=await adventure.loaded(view.campaign.id);
  const checkId=loaded.adventure.loreCheckIds.inscription;
  let historySeed;
  // Select the successful test branch before the first persisted attempt; never reroll a saved check.
  for(let i=0;i<100;i++)if(core.rollAbilityCheck(view.hero,{ability:'int',skill:'history',dc:5,rng:new core.SeededRng(`${i}:${checkId}`)}).success){historySeed=String(i);break;}
  assert.notEqual(historySeed,undefined);await act({type:'inspect'},historySeed);
  assert.ok(view.facts.some(f=>f.text.includes(world.checks[0].discoveredFact)));
  await act({type:'pickup',itemId:'prism'});
  assert.ok(view.hero.inventory.some(i=>i.tags.includes('prism')));
  await act({type:'combat',difficulty:'easy',theme:'An abandoned tower sentinel',enemyName:'Beacon sentinel',lootName:'Sentinel’s glass ward',lootFocus:'armor_class_bonus'},'adventure-loop');
  let turns=0;
  while(view.combat&&turns++<30){
    const attack=view.actions.find(a=>a.id.startsWith('core:combat.attack.longsword.'));
    const end=view.actions.find(a=>a.id==='core:combat.end_turn');
    assert.ok(attack||end,`Combat stalled: ${JSON.stringify(view.actions)}`);
    await act({type:'action',actionId:(attack||end).id},`loop-roll-${turns}`);
  }
  assert.equal(view.combat,null,'the real encounter must end');
  assert.ok(view.journal.some(e=>e.kind==='victory'),'retreat must not count as victory');
  assert.ok(view.hero.xp>startXp,'the encounter must award earned XP');
  assert.ok(view.economy.ledger.some(row=>row.kind==='rules'&&row.amount>0),'earned combat coins appear in the money history');
  const victory=narrated.find(o=>o.lootOnGround);assert.ok(victory.inventoryChanges.some(i=>i.id==='gold_piece'&&i.after>i.before));assert.equal(victory.lootOnGround.mechanics.type,'armor_class_bonus');
  const dropped=view.items.filter(i=>i.origin?.kind==='combat');assert.equal(dropped.length,1);assert.equal(dropped[0].collected,false);
  await srd.closeSessions();view=await adventure.getView(view.campaign.id);
  const pickupBody=await act({type:'pickup',itemId:dropped[0].id});
  const ward=view.hero.inventory.find(i=>i.origin?.worldItemId===dropped[0].id);assert.ok(ward);assert.equal(ward.rarity,'common');assert.equal(ward.origin.kind,'combat');assert.ok(ward.origin.sourceEventId);
  const replayedPickup=await adventure.perform(pickupBody);assert.equal(replayedPickup.hero.inventory.find(i=>i.itemId===ward.itemId).quantity,1);
  await assert.rejects(act({type:'pickup',itemId:dropped[0].id}),/уже взят/);
  const armor=view.hero.ac;await act({type:'use_item',itemId:ward.itemId});assert.equal(view.hero.ac,armor+1);assert.ok(!view.hero.inventory.some(i=>i.itemId===ward.itemId));
  await assert.rejects(act({type:'use_item',itemId:ward.itemId}),/missing|inventory|инвентар/i);
  await act({type:'travel',locationId:'camp'});
  const finalBody=await act({type:'talk',npcId:'guide'});
  assert.ok(view.quests.every(q=>q.status==='completed'&&q.rewardClaimed));
  assert.equal(view.hero.level,2);assert.ok(view.hero.hp.max>startMax);
  assert.ok(view.journal.some(e=>e.kind==='level_up'&&e.text.includes('1 → 2')));assert.equal(view.progression.nextLevelXp,900);
  assert.ok(view.hero.resources.some(r=>r.id==='action_surge'&&r.max===1));
  const earned=view.hero.xp,inventory=structuredClone(view.hero.inventory);
  const replay=await adventure.perform(finalBody);assert.equal(replay.hero.xp,earned);assert.deepEqual(replay.hero.inventory,inventory);
  const beforeRest=view.campaign.hours;await act({type:'rest',kind:'long'});
  assert.equal(view.hero.hp.current,view.hero.hp.max);assert.ok(Math.abs(view.campaign.hours-beforeRest-8)<1e-8);
  const id=view.campaign.id,completed=structuredClone(view.quests),journalCount=view.journalTotal;
  await srd.closeSessions();view=await adventure.getView(id);
  assert.equal(view.hero.xp,earned);assert.equal(view.hero.level,2);assert.equal(view.scene.id,'camp');assert.deepEqual(view.quests,completed);assert.equal(view.journalTotal,journalCount);
  await act({type:'talk',npcId:'guide'});assert.equal(view.hero.xp,earned);assert.deepEqual(view.hero.inventory,inventory);
});
test('AI-named exploration weapons have bounded rarity, provenance and a real equipped attack',async()=>{
  ai.generateStructured=async(type,payload,fallback)=>{
    if(type!=='adventure_world')return fallback();
    const draft=structuredClone(world);draft.items=[{id:'glass_blade',name:'Singing glass blade',description:'A blade recovered beside the keeper’s desk.',locationId:'camp',kind:'weapon',focus:'weapon',rarity:'legendary'}];draft.quests=[];draft.checks=[];return draft;
  };
  view=await adventure.create({heroName:'Rook',worldIdea:'Forgotten lighthouse roads',classId:'fighter'});
  await act({type:'pickup',itemId:'glass_blade'});
  const blade=view.hero.inventory.find(i=>i.origin?.worldItemId==='glass_blade');assert.equal(blade.rarity,'common');assert.equal(blade.origin.kind,'exploration');assert.ok(blade.mechanics.equip.attack.damageDice);
  await act({type:'equip_item',itemId:blade.itemId});assert.equal(view.hero.equipment.mainHand,blade.itemId);
  await act({type:'combat',difficulty:'easy'},'adventure-loop');assert.ok(view.actions.some(a=>a.id.startsWith(`core:combat.attack.${blade.itemId}.`)));
  await act({type:'action',actionId:'combat.flee'});
  assert.equal(view.combat,null);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,0);assert.equal(view.hero.xp,0);
  const before=(await adventure.loaded(view.campaign.id)).adventure;
  await assert.rejects(act({type:'combat',lootFocus:'arbitrary-script'}));
  const after=await adventure.getView(view.campaign.id);assert.equal(after.combat,null);assert.equal(after.campaign.revision,before.revision);
});
test('inventory use in combat spends the real action and cannot consume a second item for free',async()=>{
  ai.generateStructured=async(type,payload,fallback)=>{
    if(type!=='adventure_world')return fallback();
    const draft=structuredClone(world);draft.items=[{id:'ward',name:'A ward in glass',description:'Light caught in a small glass vial.',locationId:'camp',kind:'consumable',focus:'armor_class_bonus'}];draft.quests=[];draft.checks=[];return draft;
  };
  view=await adventure.create({heroName:'Rook',worldIdea:'Forgotten lighthouse roads',classId:'fighter'});
  await act({type:'pickup',itemId:'ward'});const ward=view.hero.inventory.find(i=>i.origin?.worldItemId==='ward');
  await act({type:'combat',difficulty:'easy'},'adventure-loop');
  // A real enemy hit leaves Second Wind available, so spending the action does not auto-end the turn.
  for(let i=0;i<10&&view.hero.hp.current===view.hero.hp.max;i++)await act({type:'action',actionId:'combat.end_turn'},`enemy-hit-${i}`);
  assert.ok(view.hero.hp.current>0&&view.hero.hp.current<view.hero.hp.max);const armor=view.hero.ac;
  await act({type:'use_item',itemId:ward.itemId});assert.equal(view.hero.ac,armor+1);assert.equal(view.turnBudget.action,false);
  const potion=view.hero.inventory.find(i=>i.itemId==='healing_potion'),quantity=potion.quantity,revision=view.campaign.revision;
  await assert.rejects(act({type:'use_item',itemId:potion.itemId}),/сейчас нельзя/);
  const after=await adventure.getView(view.campaign.id);assert.equal(after.campaign.revision,revision);assert.equal(after.hero.inventory.find(i=>i.itemId===potion.itemId).quantity,quantity);
  const secondWind=view.actions.find(a=>a.id.includes('feature_second_wind'));assert.ok(secondWind,'the bonus action remains available after using the item');
  await act({type:'action',actionId:secondWind.id});assert.equal(view.hero.resources.find(r=>r.id==='second_wind').current,0);assert.equal(view.turnBudget.action,false);assert.equal(view.turnBudget.bonusAction,false);
  await act({type:'action',actionId:'combat.end_turn'});assert.equal(view.turnBudget.action,true);
});
