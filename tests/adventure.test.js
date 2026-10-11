const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const model = require('../src/adventure-model');
const ai = require('../src/ai-bridge');
const adventure = require('../src/adventure-engine');
const srd = require('../src/srd-engine');
let directory, originalGenerate, latest;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(),'dnd-adventure-tests-'));
  process.env.DND_DATA_DIR = directory; process.env.AI_PROVIDER = 'fallback';
  originalGenerate = ai.generateStructured;
  ai.generateStructured = async (type, payload, fallback) => fallback();
});
after(async () => { ai.generateStructured=originalGenerate; await srd.closeSessions(); await fs.rm(directory,{recursive:true,force:true}); });
const input = { heroName:'Мира', heroConcept:'Картограф забытых мостов', worldIdea:'Дома на летающих китах, где память можно обменять на свет', location:'Левый плавник', classId:'wizard', raceId:'human', backgroundId:'sage' };
async function act(command, extra={}) {
  const body={ campaignId:latest.campaign.id, expectedRevision:latest.campaign.revision, operationId:crypto.randomUUID(), command, ...extra };
  latest=await adventure.perform(body,{seed:'proof'}); return {body,view:latest};
}
test('world records reject unreachable maps and dangling quest references before saving', () => {
  const seed=model.fallbackSeed(input);seed.locations.push({id:'lost',name:'Затерянное место',description:'До него нет пути.',kind:'ruins',connectsTo:[]});
  assert.throws(()=>model.validateSeed(seed),/unreachable/);
  const broken=model.fallbackSeed(input);broken.quests[0].objectives[0].targetId='nowhere';assert.throws(()=>model.validateSeed(broken),/Unknown/);
});
test('one shared campaign view contains arbitrary world, live SRD character, map and offered quests', async () => {
  latest=await adventure.create(input);
  assert.equal(latest.hero.name,'Мира');assert.equal(latest.hero.level,1);assert.equal(latest.hero.spellcasting.slots['1'].current,2);
  assert.match(latest.campaign.worldIdea,/летающих китах/);assert.equal(latest.scene.name,'Левый плавник');
  assert.equal(latest.quests[0].status,'offered');assert.equal(latest.locations.length,2);
  assert.doesNotMatch(JSON.stringify(latest),/Этот путь прежде соединял поселения/);
});
test('visit + successful lore check completes a quest with one durable reward', async () => {
  await act({type:'accept_quest',questId:'first-route'});
  await act({type:'travel',locationId:'threshold'});
  assert.equal(latest.quests[0].objectives[0].completed,true);
  const service=await srd.session(),state=service.loadCampaign(latest.campaign.id);
  state.party.members[0].abilities.int=30;await service.store.saveGameState(state,{snapshot:false});
  const beforeXp=latest.hero.xp;
  const {body}=await act({type:'inspect'});
  assert.equal(latest.quests[0].status,'completed');assert.equal(latest.quests[0].rewardClaimed,true);
  assert.ok(latest.hero.xp>beforeXp);assert.ok(latest.facts.some(f=>f.text.includes('соединял поселения')));
  const xp=latest.hero.xp,inventory=latest.hero.inventory.length,rolls=latest.rolls.length;
  const replay=await adventure.perform(body);
  assert.equal(replay.replayed,true);assert.equal(replay.hero.xp,xp);assert.equal(replay.hero.inventory.length,inventory);assert.equal(replay.rolls.length,rolls);
});
test('lore checks do not reroll on repeat inspection and map travel requires an actual route', async () => {
  const rolls=latest.rolls.length;await act({type:'inspect'});assert.equal(latest.rolls.length,rolls);
  await assert.rejects(adventure.perform({campaignId:latest.campaign.id,operationId:crypto.randomUUID(),expectedRevision:latest.campaign.revision,command:{type:'travel',locationId:'invented'}}),/маршрута/);
});
test('scene changes reject stale clicks before a roll or reward is issued', async () => {
  await assert.rejects(adventure.perform({campaignId:latest.campaign.id,operationId:crypto.randomUUID(),expectedRevision:1,command:{type:'inspect'}}),/изменилась/);
});
test('failed narration preserves a resolved move and can retry without spending another turn', async () => {
  ai.generateStructured=async(type,payload,fallback)=>{if(type==='adventure_narration')throw new Error('simulated outage');return fallback();};
  await act({type:'travel',locationId:'start'});assert.equal(latest.pendingNarration,true);assert.equal(latest.scene.id,'start');
  const turn=latest.campaign.turn,rolls=latest.rolls.length;
  ai.generateStructured=async(type,payload,fallback)=>fallback();
  latest=await adventure.retryNarration(latest.campaign.id);
  assert.equal(latest.pendingNarration,false);assert.equal(latest.campaign.turn,turn);assert.equal(latest.rolls.length,rolls);
});
test('original generated spell is learned and applied through the same campaign state', async () => {
  const draft=await adventure.spellDraft(latest.campaign.id,'Серебряная искра');assert.equal(draft.ok,true);
  latest=await adventure.learnSpell(latest.campaign.id,draft.spell);assert.equal(latest.createdSpells.length,1);
  await act({type:'cast_created_spell',spellId:latest.createdSpells[0].id,targetId:latest.hero.id});
  assert.ok(latest.hero.hp.current<=latest.hero.hp.max);
});
test('campaign selection survives store reopening and does not destroy other campaigns', async () => {
  const previousId=latest.campaign.id;
  const second=await adventure.create({...input,heroName:'Тарен',worldIdea:'Заброшенная космическая станция, где двери разговаривают'});
  assert.notEqual(second.campaign.id,previousId);assert.ok(second.campaigns.length>=2);
  await adventure.select(previousId);await srd.closeSessions();
  const restored=await adventure.getView();assert.equal(restored.campaign.id,previousId);assert.equal(restored.hero.name,'Мира');
});
test('a delivery objective cannot be completed by talking before acquiring its object', () => {
  const seed=model.fallbackSeed(input);seed.items=[{id:'letter',name:'Письмо',description:'Запечатанное послание',locationId:'threshold',kind:'quest'}];
  seed.quests=[{id:'delivery',title:'Вернуть письмо',summary:'Найди письмо и принеси проводнику.',giverId:'guide',rewardTheme:'Благодарность',sequential:true,objectives:[{text:'Найти письмо',kind:'acquire',targetId:'letter'},{text:'Отдать проводнику',kind:'talk',targetId:'guide'}]}];
  const state=model.makeAdventure(model.validateSeed(seed),input);state.quests[0].status='active';
  model.processQuestEvent(state,model.addEvent(state,'talk','guide','Поговорил с проводником.'));assert.equal(state.quests[0].objectives[1].completed,false);
  model.processQuestEvent(state,model.addEvent(state,'acquire','letter','Взял письмо.'));assert.equal(state.quests[0].status,'active');
  model.processQuestEvent(state,model.addEvent(state,'talk','guide','Вернул письмо.'));assert.equal(state.quests[0].status,'completed');
});

test('an English campaign keeps its language and world after reopening the store', async () => {
  const prompts=[];
  ai.generateStructured=async(type,payload,fallback)=>{prompts.push({type,instruction:payload.instruction});return fallback();};
  const created=await adventure.create({...input,heroName:'Mira',worldIdea:'Cities on the backs of flying whales',location:'Azureback Harbor',language:'en'});
  assert.equal(created.campaign.language,'en');assert.match(created.messages[0].text,/Mira arrives at Azureback Harbor/);
  const {state}=await adventure.loaded(created.campaign.id);assert.equal(state.campaign.language,'en');
  await srd.closeSessions();const restored=await adventure.getView();assert.equal(restored.campaign.language,'en');assert.equal(restored.scene.name,'Azureback Harbor');
  assert.match(prompts.find(p=>p.type==='adventure_world').instruction,/original English adventure/);
  ai.generateStructured=async(type,payload,fallback)=>fallback();
});
