const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { z } = require('zod');
const srd = require('./srd-engine');
const ai = require('./ai-bridge');
const model = require('./adventure-model');
const lore = require('./scene-checks');
const { contextFor } = require('./adventure-context');
const { validateSpell } = require('./generated-effects');
const { elapsedSeconds, expireExplorationEffects, expireNpcEffects } = require('./adventure-clock');
const measuredAi=require('./adventure-usage');
const loot=require('./adventure-loot');
const economy=require('./adventure-economy');
const quests=require('./adventure-quests');
const access=require('./adventure-access');
const narration=require('./adventure-narration');
const dialogue=require('./dialogue');
const environment=require('./environment-interactions');
const npcEncounters=require('./npc-encounters');
const social=require('./adventure-social');
const companions=require('./adventure-companions');
const firstAid=require('./adventure-first-aid');
const medicine=require('./adventure-medicine');
const rest=require('./adventure-rest');
const partyInventory=require('./adventure-party-inventory');
const partyOrders=require('./adventure-party-orders');
function medicalText(event,language){const en=language==='en';return event.type==='death_save'?(en?`${event.name}: death save ${event.result.roll.total}; ${event.transition}.`:`${event.name}: спасбросок от смерти ${event.result.roll.total}; ${event.transition}.`):event.type==='stable_recovery'?(en?`${event.name}: conscious again with1 HP.`:`${event.name}: возвращается в сознание с1 HP.`):(en?`${event.name}: recovery after stabilization in${event.hours} hours.`:`${event.name}: восстановление после стабилизации через${event.hours} ч.`);}
const COMPANION_RULES='A willing established NPC may have optional companionOffer:{classId:barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard,raceId:human|elf|dwarf|halfling|gnome|half_elf|half_orc|tiefling|dragonborn,backgroundId:acolyte|soldier|sage|criminal,reason}. NPC class foundations start at level1 and must fit the stated person; do not invent levels, equipment, HP or slots. An offer is willingness to discuss joining, not membership. For a known NPC you may propose developments.companionOffers:[{npcId,...offer}] with exact established id; never overwrite an existing foundation or advertise dead/incapacitated/hostile NPCs. Player invitation uses type recruit with exact npcId; departure uses type dismiss. Server resolves consent/check, party limit, body persistence and resources. Only actual members of context.party are companions; never narrate following, recruiting, dismissing or a companion action merely by prose. Recruitment does not heal or restock. Old wounds, spent slots, gear and historical NPC identity remain. Companions follow real travel and act in combat through validated mechanics.';
const SOCIAL_RULES='For apologies, building trust, calming a hostile NPC or explicit restitution use type social with exact local npcId, goal deescalate|rapport, approach persuasion|deception|intimidation|restitution, and optional statement. For restitution include coins only when the player explicitly offers that amount; use context.npcs.relationship.dueCoins for the actual liability. If the player explicitly compensates a specific broken object with unknown ownership, include propIds with its exact context.sceneProps/relationship.claimableDamage id. This is an acknowledgment to the chosen recipient, not proof of historical ownership; never claim unrelated, intact, remote or already-paid objects. Server determines DC, rolls, trust, attitude and costs. Restitution pays real recorded harm once and does not itself guarantee forgiveness. Dead/absent/unaware NPCs and combat are ineligible. Speech cannot heal, mint money, reveal hidden truth, complete a quest or transfer an item. Player statements (especially deception) are claims, never confirmed world facts. No generic check/successFact may substitute a change in NPC attitude. Same unchanged approach cannot reroll or farm trust; choose a genuinely different approach or changed real circumstances. Other requests require a supported existing quest/check/action, or clarification; do not silently replace the requested favor with rapport.';
const ENVIRONMENT_RULES='Ordinary freeform physical intents in and out of combat may use type environment_interaction with plan:{props?:[],steps:[{type:take|drop,propId}|{type:throw|strike,propId,targetId}|{type:check,propId,skill:athletics|acrobatics|sleight_of_hand,difficulty:easy|medium|hard}]}, at most three dependent steps. Existing sceneProps IDs and aliases include broken props: always reuse their stable ID, never recreate one with a fresh ID. New props require {id,name,locationId,anchorId,material:ceramic|glass|wood|metal|stone|cloth,size:tiny|small|medium|large,weightLb,portable,ownerNpcId?}. anchorId must be an exact current scene.affordances id; its physical limits justify only ordinary plausible objects, not exotic valuables, magical devices, keys, healing items or arbitrary weapons. Current established object identities always take precedence over general cues. Use exact nearby NPC or combat participant IDs. Do not substitute an unrelated standard weapon attack for the requested environmental action. Taking and throwing costs objectInteraction plus action in combat; engine checks eligibility, ranges and real attack damage. No arbitrary HP/dice/DC, rewards, teleportation or success claims. If a requested source/target/physical action is absent, ambiguous or unsupported, return type clarify or refuse with reason (<=500 chars) and at most three concrete alternatives. Never change player intent silently or pretend a numerical action is narrative success. If a legacy scene has no matching cue but its actual description/name or nearby NPC role establishes a plausible ordinary source, add developments.sceneAffordances:[{locationId,sourceText,cues:[{id,description,materials,maxWeightLb,portable,quantity?}]}] in this SAME request, then reference the new cue id. sourceText must be a literal substring of the current location name/description or local NPC role. At most three additive cues and six per scene; never overwrite existing anchors. Sources have finite quantity 1-8 (default one), and materialized/broken/carried objects consume that count permanently; plural ordinary tableware can establish an explicit finite quantity. Do not invent a source contrary to scene, valuables, exotic objects or contents. Unknown or ambiguous sources require clarify/refuse. This lets an ordinary bar establish drinking-vessel affordances lazily without a preloaded catalogue or extra request. No extra scene catalogue: materialize only the specific ordinary prop the player actually uses.';
function npcAvailable(adventure,id){const npc=adventure.npcs.find(n=>n.id===id);const body=adventure.environment?.npcStates?.find(n=>n.npcId===id)?.body;return Boolean(npc&&!npc.hidden&&(!body||(body.hp.current>0&&!body.conditions?.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','fled'].includes(c)))));}
function blockedNpcCommand(adventure,command){
  if(command.type==='talk'&&!npcAvailable(adventure,command.npcId))return 'Этот персонаж сейчас не может разговаривать.';
  if(command.type==='deliver'){const recipient=adventure.quests.find(q=>q.id===command.questId)?.objectives.find(o=>o.id===command.objectiveId)?.recipientId;if(recipient&&!npcAvailable(adventure,recipient))return 'Адресат сейчас не может принять предмет.';}
  if(['trade','service','market_choice'].includes(command.type)){const market=adventure.economy?.markets.find(m=>m.id===command.marketId);if(market&&!economy.merchantAvailable(adventure,market))return 'Этот торговец сейчас не может обслуживать покупателя.';}
  if(command.type==='scene_check'){const npcId=adventure.loreDefinitions.find(c=>c.id===command.checkId)?.npcId;if(npcId&&!npcAvailable(adventure,npcId))return 'Для этого подхода нужен персонаж, который может действовать.';}
  return null;
}
function boundNpcCommand(adventure,command){
  if(command.type!=='combat')return command;
  const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const name=normalize(command.enemyName);
  const npc=adventure.npcs.find(n=>n.id===command.npcId)||(name?adventure.npcs.find(n=>normalize(n.name)===name):null);
  return npc||command.npcId?{type:'npc_combat',npcId:npc?.id||command.npcId,description:command.description}:command;
}
const ECONOMY_RULES='Optional markets:[{id,locationId,name,livelihood,shortage,scarcity:none|supplies|medicine|equipment,prosperity:sparse|steady|wealthy,merchantId?,offers:[{id,name,description,kind:goods|supplies|lodging|healing|rumor|transport,focus?,rarity?,targetId?,discovery?}],encounter?:{title,description,choices:[{id,label,kind:donate|check,skill?,dc?}]}}]. Give settlements distinctive livelihoods, a shortage and an interesting local encounter. A market or traveling trader uses an existing place; merchantId is a local NPC. Goods use typed loot focus, no prices/stock/cash fields; the engine sets those. Rumor discovery is revealed only after payment. Transport targets an existing reachable place; price and time follow route length. Donation costs two coins; check choices use persuasion/investigation/survival/medicine/history/insight with DC 5-25. Successful help improves trust/trade once; do not promise other numeric rewards. Markets can be introduced as new records, never overwrite an existing market.';
const ACCESS_RULES='Optional item access:{mode:any|all,conditions:[{kind:check|item|victory,targetId}],label?,description,concealed?}. Check targets a defined scene-check id, item targets a world-item id used as a reusable carried key, victory targets a location id. At most four conditions; any accepts one, all requires each. Describe closed caches/locked doors/guards with actual access conditions, not only flavor. Prefer several genuinely distinct ways around an obstacle. concealed hides the real item name/description until access succeeds; label names the visible container. Failed/unattempted checks and unrelated ordinary rolls never open it. Existing unguarded items stay freely available. Do not reveal concealed contents in opening or narration until context.objects says available.';
const QUEST_RULES='Quest objectives use visit/talk/check/victory/acquire/deliver. Delivery targetId is a world item id and recipientId is an existing NPC id: it removes one real carried item only when explicitly handed over to that nearby recipient. Talking is not delivery. Check objectives may list alternativeTargetIds (at most 3 existing check ids), representing genuinely different ways to achieve the same goal. Prefer trigger manual for player-chosen approaches; the player chooses one, never roll every alternative automatically. Each method persists its one attempt. A success through any declared approach completes that objective; failure does not grant discovery. Use these general mechanics for original quests rather than treating flavor text as proof. New checks can set alternativeFor to an existing check id to solve the same obstacle by a genuinely different player-proposed approach. Use a manual check, a fair skill/DC and coherent discovery; do not substitute a check for a spell or resource action; never reroll the identical method. This extends the declared goal without rewriting it or granting success. No arbitrary quest closure, replacement of existing objectives or unsupported rewards.';
const LOOT_RULES='Optional item fields: focus healing/temporary_hp/remove_condition/attack_bonus/ability_check_bonus/saving_throw_bonus/armor_class_bonus/weapon/quest_item/story_clue/utility and rarity common/uncommon/rare/very_rare/legendary. Quest rewardName is a short concrete original item name, distinct from rewardTheme; optional rewardFocus uses the same focus values. Choose fitting original names and fictional descriptions; the engine decides actual dice, charges, rarity and strength within the hero level budget. Never claim unsupported numerical properties. For type combat supply lootName and lootFocus for one find after a confirmed victory when a fitting item is recoverable. Defeat and retreat grant no battle loot. Do not duplicate that recorded drop through developments.';
const classNames = { barbarian: 'Варвар', bard: 'Бард', cleric: 'Жрец', druid: 'Друид', fighter: 'Воин', monk: 'Монах', paladin: 'Паладин', ranger: 'Следопыт', rogue: 'Плут', sorcerer: 'Чародей', warlock: 'Колдун', wizard: 'Маг' };
const raceNames = { dragonborn: 'Драконорождённый', dwarf: 'Дварф', elf: 'Эльф', gnome: 'Гном', half_elf: 'Полуэльф', half_orc: 'Полуорк', halfling: 'Полурослик', human: 'Человек', tiefling: 'Тифлинг' };
function bad(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function meta(state) { const value = JSON.parse(state.flags.ui_adventure || '{}'); if (value.version !== 2) bad('Эта кампания ещё не перенесена в новый интерфейс. Создайте новое приключение; старая сохранена.', 409); return value; }
function root() { return path.resolve(process.env.DND_DATA_DIR || path.join(__dirname, '..', 'data')); }
async function activeId() { try { return JSON.parse(await fs.readFile(path.join(root(), 'active-adventure.json'), 'utf8')).id; } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function activate(id) { await fs.mkdir(root(), { recursive: true }); const file = path.join(root(), 'active-adventure.json'); await fs.writeFile(`${file}.tmp`, JSON.stringify({ id })); await fs.rename(`${file}.tmp`, file); }
async function loaded(id) {
  const service=await srd.session(),selected=id||await activeId();
  if(!selected)return {service,state:null,adventure:null};
  const state=service.loadCampaign(selected),adventure=meta(state);
  if(!state.flags.ui_racial_ac_fixed&&!state.combat){
    const core=await import('../vendor/dnd-core/dist/engine.mjs');
    for(const member of state.party.members)if(!member.activeEffects?.length)member.ac=core.calculateSrdArmorClass(member);
    state.flags.ui_racial_ac_fixed=true;await service.store.saveGameState(state,{snapshot:false,reason:'racial_ac_fix'});
  }
  if(state.flags.ui_player_turn_control!==true){state.flags.ui_player_turn_control=true;await service.store.saveGameState(state,{snapshot:false,reason:'player_turn_control'});}
  if(await economy.initialize(service,state,adventure))await save(service,state,adventure,'economy_initialized');
  return {service,state,adventure};
}
async function save(service, state, adventure, reason) { state.flags.ui_adventure = JSON.stringify(adventure); await service.store.saveGameState(state, { reason, snapshot: false }); }
function choices(service, state, adventure) {
  const location = adventure.locations.find(n => n.id === adventure.currentLocationId);
  const available = [];
  const hero=state.party.members.find(m=>m.id===state.party.heroId);
  if(!state.combat&&hero.hp.current<=0) {
    if(hero.conditions.includes('dead')||hero.deathSaves?.dead)return available;
    return hero.deathSaves?.stable
      ? [{id:'recover:stable',label:'Дождаться возвращения в сознание',kind:'recovery',command:{type:'recover_stable'}}]
      : [{id:'death:save',label:'Спасбросок от смерти',kind:'recovery',command:{type:'death_save'}}];
  }
  if (!state.combat) {
    available.push({ id: 'inspect', label: 'Осмотреть место', kind: 'exploration', command: { type: 'inspect' } });
    for (const npc of adventure.npcs.filter(n => n.locationId === location.id && npcAvailable(adventure,n.id))) available.push({ id: `talk:${npc.id}`, label: `Поговорить: ${npc.name}`, kind: 'social', command: { type: 'talk', npcId: npc.id } });
    for (const npc of adventure.npcs.filter(n=>n.locationId===location.id&&npcAvailable(adventure,n.id))){const relation=social.publicStatus(adventure,npc.id),goal=relation.disposition==='hostile'?'deescalate':'rapport';if(relation.availableApproaches?.[goal].includes('persuasion'))available.push({id:`social:${goal}:${npc.id}`,label:`${goal==='deescalate'?'Примирение':'Наладить контакт'}: ${npc.name}`,kind:'relationship',command:{type:'social',npcId:npc.id,goal,approach:'persuasion'}});}
    for (const npc of adventure.npcs.filter(n=>n.locationId===location.id&&npcAvailable(adventure,n.id)&&!state.party.members.some(m=>m.id===n.id))) available.push({id:`fight:${npc.id}`,label:`Начать бой: ${npc.name}`,kind:'conflict',command:{type:'npc_combat',npcId:npc.id}});
    for(const npc of adventure.npcs.filter(n=>n.locationId===location.id)){const status=companions.publicStatus(adventure,npc.id,state);if(status?.canRecruit)available.push({id:`recruit:${npc.id}`,label:`Пригласить в отряд: ${npc.name}`,kind:'party',command:{type:'recruit',npcId:npc.id}});if(status?.canDismiss)available.push({id:`dismiss:${npc.id}`,label:`Отпустить спутника: ${npc.name}`,kind:'party',command:{type:'dismiss',npcId:npc.id}});}
    const targetIds=[...new Set([...state.party.members.map(m=>m.id),...adventure.npcs.filter(n=>n.locationId===location.id&&!n.hidden).map(n=>n.id)])];
    for(const id of targetIds){const help=firstAid.publicStatus(state,adventure,id),target=firstAid.targetFor(state,adventure,id);if(help.canStabilize)available.push({id:`aid:stabilize:${id}`,label:`Первая помощь: ${target.name}`,kind:'support',command:{type:'first_aid',method:'stabilize',targetId:id}});if(help.canHeal)for(const item of firstAid.healingItems(hero).slice(0,4))available.push({id:`aid:item:${item.id}:${id}`,label:`Лечение: ${item.name} → ${target.name}`,kind:'support',command:{type:'first_aid',method:'item',targetId:id,itemId:item.id}});}
    for (const id of location.connectsTo) { const target = adventure.locations.find(n => n.id === id); if (target) available.push({ id: `travel:${id}`, label: `Пойти: ${target.name}`, kind: 'travel', command: { type: 'travel', locationId: id } }); }
    for (const item of adventure.items.filter(i => !i.collected && i.locationId === location.id&&access.describe(state,adventure,i).available)) available.push({ id: `pickup:${item.id}`, label: `Взять: ${item.name}`, kind: 'inventory', command: { type: 'pickup', itemId: item.id } });
    available.push({ id: 'rest:short', label: 'Короткий отдых', kind: 'rest', command: { type: 'rest', kind: 'short', hitDiceToSpend: 1 } }, { id: 'rest:long', label: 'Долгий отдых', kind: 'rest', command: { type: 'rest', kind: 'long' } });
    const supplier=adventure.economy?.markets.find(m=>m.locationId===location.id&&m.offers.some(o=>o.kind==='supplies'&&o.stock>0)&&(!m.merchantId||npcAvailable(adventure,m.merchantId)));
    if(adventure.survival.enabled&&supplier){const offer=supplier.offers.find(o=>o.kind==='supplies'&&o.stock>0);available.push({id:'supplies',label:`Пополнить припасы · ${economy.price(supplier,offer)} монеты`,kind:'survival',command:{type:'supplies'}});}
  }
  for(const member of state.party.members.filter(m=>m.kind==='ally')){const order=partyOrders.publicStatus(state,adventure,member.id);if(order?.canOrder)for(const [mode,label]of [['auto','Действовать самостоятельно'],['conserve','Беречь ячейки'],['defend','Обороняться'],...(order.canSupport?[['support','Поддерживать союзников']]:[])])available.push({id:`order:${member.id}:${mode}`,label:`${member.name}: ${label}`,kind:'party',command:{type:'party_order',npcId:member.id,mode}});}
  for (const action of service.getAvailableActions(state.campaign.id).actions.filter(a => !a.id.startsWith('open_world.') && !a.id.startsWith('system.'))) available.push({ id: `core:${action.id}`, label: action.label, kind: state.combat ? 'combat' : 'progression', command: { type: 'action', actionId: action.id } });
  return [...available,...quests.available(service,state,adventure)].filter(a=>!blockedNpcCommand(adventure,a.command));
}
function questChecks(state,adventure){
  const ids=new Set(adventure.quests.filter(q=>['offered','active'].includes(q.status)).flatMap(q=>q.objectives.flatMap(o=>o.kind==='check'?[o.targetId,...(o.alternativeTargetIds||[])]:[])));
  const checks=lore.publicChecks(state);return adventure.loreDefinitions.filter(d=>access.targets(adventure,d.id).some(id=>ids.has(id))).map(d=>{const c=checks.find(c=>c.id===adventure.loreCheckIds[d.id]);return {id:d.id,alternativeFor:d.alternativeFor,title:d.title,locationId:d.locationId,npcId:d.npcId,skill:d.skill,dc:d.dc,trigger:d.trigger,attempted:Boolean(c?.attempted),success:c?.result?.success,total:c?.result?.roll?.total};});
}
async function publicView(service, state, adventure) {
  const raw = await srd.getState(state.campaign.id), hero = raw.hero;
  const core=await import('../vendor/dnd-core/dist/engine.mjs');
  const origins=new Map((adventure.lootLedger||[]).map(record=>[record.itemId,record]));
  const cleanCharacter=character=>({...character,classLabel:classNames[character.classLevels?.[0]?.classId?.replace(/^class_/,'')]||character.className,baseAc:character.ac,ac:core.effectiveArmorClass(character),inventory:character.inventory.map(({hiddenDescription,...item})=>({...item,description:loot.displayDescription(item,adventure.language),canUse:Boolean(core.modeledInventoryUseEffect(item,character.inventory)),origin:origins.get(item.itemId)}))});
  const configuration = ai.getAiConfig();
  const castOptions=await srd.spellCastingOptions(state,service,{heroOnly:false}),castIds=new Set(castOptions.map(a=>`core:${a.id}`));
  const costs=new Map(raw.actions.actions.map(a=>[a.id,a]));
  const affordable=a=>{
    if(!state.combat||!state.combat.turnBudget||!a.id.startsWith('core:'))return true;
    const definition=costs.get(a.id.slice(5));if(!definition)return true;
    let budget=state.combat.turnBudget;
    for(const cost of definition.costs||[definition.cost]){
      let spent;
      if(cost==='action')spent=core.spendAction(budget,definition.actionKind||(/\.attack\./.test(a.id)?'attack':/\.cast_spell\./.test(a.id)?'cast_spell':'special'));
      else if(cost==='bonus_action')spent=core.spendBonusAction(budget);
      else if(cost==='reaction')spent=core.spendReaction(budget);
      else if(cost==='movement'&&budget.movementFeet<=0)return false;
      else if(cost==='object_interaction'&&!budget.objectInteraction)return false;
      if(spent){if(!spent.ok)return false;budget=spent.budget;}
    }
    return true;
  };
  const commerce=economy.publicEconomy(state,adventure);commerce.markets=commerce.markets.filter(m=>!blockedNpcCommand(adventure,{type:'trade',marketId:m.id}));commerce.sellable=commerce.sellable.map(i=>String(i.itemId).startsWith('scene_prop_')?{...i,blocked:'Этот торговец не покупает эту вещь.'}:i);
  return { ready: true, campaign: { id: state.campaign.id, title: adventure.title, revision: adventure.revision, turn: adventure.turn, day: adventure.day, hours: adventure.hours, worldIdea: adventure.worldIdea, tone: adventure.tone, language: adventure.language || 'ru' },
    hero: { ...cleanCharacter(hero), medical:medicine.publicStatus(state,adventure,hero.id),rest:rest.status(hero,adventure),concept:adventure.heroConcept,classLabel: classNames[hero.classLevels?.[0]?.classId?.replace(/^class_/, '')] || hero.className.replace(' SRD', ''), raceLabel: raceNames[hero.raceId?.replace(/^race_/,'')] || raceNames[hero.ancestry.replace(/-/g,'_')] || hero.ancestry },
    party: state.party.members.map(p=>({...cleanCharacter(p),medical:{...medicine.publicStatus(state,adventure,p.id),...firstAid.publicStatus(state,adventure,p.id)},order:partyOrders.publicStatus(state,adventure,p.id),rest:rest.status(p,adventure),...(p.kind==='ally'?{spells:service.getSpellbook(state.campaign.id,p.id).spells.filter(s=>s.accessible).map(s=>({id:s.id,name:s.name,level:s.level,prepared:s.prepared}))}:{})})), scene: adventure.locations.find(n => n.id === adventure.currentLocationId),
    locations: adventure.locations, npcs: adventure.npcs.map(({receivedItems,...n})=>{const record=adventure.environment?.npcStates?.find(r=>r.npcId===n.id);return {...n,receivedCount:receivedItems?.length||0,body:record?{hp:record.body.hp,ac:record.body.ac,conditions:record.body.conditions,profile:record.profile}:undefined,canInteract:npcAvailable(adventure,n.id),relationship:social.publicStatus(adventure,n.id),companion:companions.publicStatus(adventure,n.id,state),medical:{...medicine.publicStatus(state,adventure,n.id),...firstAid.publicStatus(state,adventure,n.id)}};}), items: adventure.items.map(i=>access.publicItem(state,adventure,i)), quests: adventure.quests,questChecks:questChecks(state,adventure), journal: adventure.journal.slice(0,100).map(require('./journal-categories').publicEntry), journalTotal:adventure.journal.length,
    notes:adventure.notes||[], facts: state.facts.filter(f=>f.id!=='hero_identity').map(f=>({...f,pinned:Boolean(f.pinned||(adventure.pinnedFactIds||[]).includes(f.id))})), messages: adventure.messages,partyInventory:await partyInventory.publicOptions({state,adventure}),
    actions: choices(service, state, adventure).filter(a=>affordable(a)&&(!/^core:combat\.(action|bonus|reaction)\.cast_spell\./.test(a.id)||castIds.has(a.id))).map(({ command, ...entry }) => entry), combat: raw.combat, turnBudget: raw.actions.turn,
    spellbook: {...raw.spellbook,spells:(raw.spellbook.spells||[]).filter(s=>s.accessible)}, createdSpells: adventure.createdSpells, rolls: raw.rolls, survival: adventure.survival, reputation: adventure.reputation,
    progression:{nextLevelXp:core.srdXpThresholds[hero.level]??null,levelStartXp:core.srdXpThresholds[hero.level-1]??0},
    environment:environment.currentSceneSummary(adventure),economy:commerce,images:require('./adventure-images').publicImages(state,adventure),
    loreChecks: lore.publicChecks(state).filter(c => c.sceneId === adventure.currentLocationId).map(c=>({...c,definitionId:Object.keys(adventure.loreCheckIds).find(id=>adventure.loreCheckIds[id]===c.id)})), memory: contextFor(state, adventure).metrics,
    provider: { id: configuration.provider, model: configuration.modelLabel, configured: ai.isConfigured(configuration), usage: configuration.usage },
    dialogueSummary:dialogue.summary(adventure.dialogue,adventure.turn,adventure.currentLocationId),
    inferenceUsage:adventure.usage||null,pendingNarration: Boolean(adventure.pendingNarration), campaigns: service.listCampaigns().map(c => ({ id: c.id, title: c.title })) };
}
async function getView(id) { const { service, state, adventure } = await loaded(id); const configuration=ai.getAiConfig();return state ? publicView(service, state, adventure) : { ready: false, provider:{id:configuration.provider,model:configuration.modelLabel,configured:ai.isConfigured(configuration)},campaigns: service.listCampaigns().map(c => ({ id: c.id, title: c.title })) }; }
async function setup() { const options = await srd.setupOptions(); return { ...options, classes: options.classes.map(c => ({ ...c, label: classNames[c.id] })), races: options.races.map(r => ({ ...r, label: raceNames[r.id] })), backgrounds: options.backgrounds.map(b => ({ ...b, label: { acolyte: 'Послушник', soldier: 'Солдат', sage: 'Учёный', criminal: 'Бродяга' }[b.id] })) }; }
async function registerChecks(service, state, adventure) {
  for (const definition of adventure.loreDefinitions) if (!Object.hasOwn(adventure.loreCheckIds,definition.id)) {
    const created = await lore.registerSceneCheck(service, state.campaign.id, { sceneId: definition.locationId, trigger: definition.trigger, subjectId: definition.npcId, skill: definition.skill, dc: definition.dc, title: definition.title, prompt: definition.prompt, discoveredFact: definition.discoveredFact });
    adventure.loreCheckIds[definition.id] = created.id;
  }
}
const createSchema = z.object({ heroName: z.string().trim().min(1).max(80), heroConcept: z.string().max(800).default(''), language: z.enum(['ru', 'en']).default('ru'), worldIdea: z.string().trim().min(5).max(1200), classId: z.string().default('wizard'), raceId: z.string().default('human'), backgroundId: z.string().default('sage'), location: z.string().max(100).default('Начало пути'), tone: z.string().max(100).default('Приключение'), survival: z.boolean().default(false) }).strict();
async function create(input) {
  const parsed = createSchema.parse(input);
  const meter={};
  const payload = { lootRules:LOOT_RULES, questRules:QUEST_RULES, accessRules:ACCESS_RULES, economyRules:ECONOMY_RULES, environmentRules:ENVIRONMENT_RULES,companionRules:COMPANION_RULES, instruction: `Each location may include optional affordances:[{id,description,materials:[ceramic|glass|wood|metal|stone|cloth],maxWeightLb,portable,quantity?}]. At most four compact physical source cues justify ordinary environmental props only when a player uses one; do not enumerate a room inventory. A cue describes an actual source (drinking vessels at the counter, loose stones along a road, wooden tools by a workbench), not a magical effect or guaranteed reward. Create an original ${parsed.language === 'en' ? 'English' : 'Russian'} adventure in the player world. Respect their premise and hero. Return JSON {title,opening,startLocationId,locations:[{id,name,description,kind,connectsTo}],npcs:[{id,name,role,personality,locationId,combatProfile?,companionOffer?}],items:[{id,name,description,locationId,kind}],quests:[{id,title,summary,giverId,objectives:[{text,kind,targetId}],rewardTheme}],checks:[{id,locationId,trigger,skill,dc,title,prompt,discoveredFact}],markets:[]}. For each settlement include a distinctive market from economyRules. NPC optional combatProfile is civilian/guard/scout/brute/arcanist; choose only what the actual role justifies, ordinary locals civilian. It selects a fixed server profile and never party-level scaling. Use simple stable ASCII ids, a connected map of 3-5 places, 2-4 distinct NPCs, 1-2 offered quests with specific objectives from questRules; include actual delivery for a promised item return and distinct optional manual approaches for uncertain obstacles. Checks have DC 5-25, trigger enter/inspect/dialogue/manual, skills history/arcana/religion/nature/perception/investigation/insight/survival. Do not reveal discoveredFact in the opening. Objective kind is visit/talk/check/victory/acquire/deliver; deliver has item targetId and NPC recipientId; check may have alternativeTargetIds; visit/victory target a location id, talk targets an npc id, check targets a check id, acquire targets an item id. Reference only existing ids. Item kind quest/tool/consumable/weapon, with flavor description and no numerical claims. For each consumable supply focus matching its fiction: protection uses armor_class_bonus, recovery uses healing; for weapons use focus weapon. Optional rarity and quest rewardFocus follow lootRules. Locations kind settlement/wilderness/ruins/interior/road. Keep prose compact. No predefined licensed setting unless player supplied it. No numeric hero rewards or state changes.`, world: parsed.worldIdea, hero: { name: parsed.heroName, concept: parsed.heroConcept }, tone: parsed.tone, startingPlace: parsed.location };
  const seed=await narration.generate(meter,payload,()=>model.fallbackSeed(parsed),model.validateSeed,{task:'adventure_world',resolved:false});
  const raw = await srd.createCampaign({ heroName: parsed.heroName, heroConcept: parsed.heroConcept, language: parsed.language, classId: parsed.classId, raceId: parsed.raceId, backgroundId: parsed.backgroundId, worldIdea: parsed.worldIdea, location: seed.locations.find(n => n.id === seed.startLocationId).name, tone: parsed.tone });
  const service = await srd.session(); let state = service.loadCampaign(raw.campaign.id); const adventure = model.makeAdventure(seed, parsed);adventure.usage=meter.usage;
  state.flags.ui_player_turn_control=true;
  await economy.initialize(service,state,adventure);
  if (adventure.survival.enabled) state.party.members.find(m=>m.id===state.party.heroId).inventory.push({itemId:'travel_food',name:'Дорожные припасы',quantity:3,weight:2,tags:['supplies','food'],description:'Запас еды на день пути для отряда.',identified:true,source:'generated'}, {itemId:'travel_water',name:'Запас воды',quantity:3,weight:2,tags:['supplies','water'],description:'Запас воды на день пути для отряда.',identified:true,source:'generated'});
  model.addMessage(adventure, 'dm', 'Мастер', seed.opening);
  model.addEvent(adventure, 'visit', seed.startLocationId, `Начало приключения: ${seed.locations.find(n => n.id === seed.startLocationId).name}`);
  await save(service, state, adventure, 'adventure_created'); await registerChecks(service, state, adventure);
  state = service.loadCampaign(state.campaign.id); await save(service, state, adventure, 'adventure_checks_ready');
  await activate(state.campaign.id);
  await runChecks(service, state.campaign.id, adventure, 'enter');
  state = service.loadCampaign(state.campaign.id); await save(service, state, adventure, 'adventure_started');
  return publicView(service, state, adventure);
}
async function select(id) { const { service, state, adventure } = await loaded(id); await activate(id); return publicView(service, state, adventure); }
async function runChecks(service, id, adventure, trigger, npcId, seed, definitionId) {
  const results = await lore.triggerSceneChecks(service, id, { sceneId: adventure.currentLocationId, trigger, subjectId: npcId,checkId:definitionId?adventure.loreCheckIds[definitionId]:undefined }, { seed });
  for (const result of results) if (!result.replayed) {
    const definitionId = Object.keys(adventure.loreCheckIds).find(key => adventure.loreCheckIds[key] === result.checkId);
    const rollText = `${result.title}: ${result.roll?.total ?? '—'} против ${adventure.loreDefinitions.find(c => c.id === definitionId)?.dc ?? '—'} — ${result.success ? 'успех' : 'неудача'}. ${result.text}`;
    model.addMessage(adventure, 'roll', 'Проверка', rollText);
    const event = model.addEvent(adventure, 'check', definitionId, rollText, { success: result.success,source:'scene_check' }); model.processQuestEvent(adventure, event);
  }
  return results;
}
async function rewardQuests(service, state, adventure) {
  const core = await import('../vendor/dnd-core/dist/engine.mjs');
  for (const quest of adventure.quests.filter(q => q.status === 'completed' && !q.rewardClaimed)) {
    const heroAt = state.party.members.findIndex(m => m.id === state.party.heroId), hero = state.party.members[heroAt];
    const xp = Math.min(300, 50 * hero.level + quest.objectives.length * 25);
    state.party.members[heroAt] = core.addXp(hero, xp);
    if(hero.hp.current<=0||hero.conditions.includes('dead')||hero.deathSaves?.dead){const grown=state.party.members[heroAt];grown.hp.current=0;grown.conditions=structuredClone(hero.conditions);grown.deathSaves=hero.deathSaves?structuredClone(hero.deathSaves):undefined;if(hero.conditions.includes('dead')||hero.deathSaves?.dead){const currents=new Map(hero.resources.map(r=>[r.id,r.current]));grown.resources=grown.resources.map(r=>({...r,current:Math.min(r.max,currents.get(r.id)||0)}));if(grown.spellcasting)for(const [level,slot]of Object.entries(grown.spellcasting.slots))slot.current=Math.min(slot.max,hero.spellcasting?.slots[level]?.current||0);}}
    const rewardName=quest.rewardName||(quest.rewardTheme.length<=60&&!/[.!?]$/.test(quest.rewardTheme)?quest.rewardTheme:`${adventure.language==='en'?'Travel charm':'Путевой оберег'}: ${quest.title.slice(0,45)}`);
    const event=model.addEvent(adventure,'quest_reward',quest.id,`Завершено «${quest.title}»: +${xp} XP, ${rewardName}.`);
    const item = await loot.grantLoot(service,state,adventure,loot.planLoot(service,state,{name:rewardName,theme:quest.rewardTheme,focus:quest.rewardFocus||'ability_check_bonus',rarity:'common'}),{kind:'quest',questId:quest.id,eventId:event.id,locationId:adventure.currentLocationId});
    quest.rewardClaimed = true;
    model.addMessage(adventure, 'system', 'Награда', `«${quest.title}» завершено. Получено ${xp} XP и ${item.name}.`);
  }
  return state;
}
async function survivalDay(state, adventure, elapsedDays) {
  if(!adventure.survival.enabled||!elapsedDays)return state;
  const core=await import('../vendor/dnd-core/dist/engine.mjs'),index=state.party.members.findIndex(m=>m.id===state.party.heroId);
  for(let day=0;day<elapsedDays;day++){
    const hero=state.party.members[index],supplies=adventure.survival,ate=supplies.foodDays>0,drank=supplies.waterDays>0;
    supplies.foodDays=Math.max(0,supplies.foodDays-1);supplies.waterDays=Math.max(0,supplies.waterDays-1);
    supplies.hungerDays=ate?0:supplies.hungerDays+1;supplies.thirstDays=drank?0:supplies.thirstDays+1;
    for(const id of ['travel_food','travel_water']){const held=hero.inventory.find(i=>i.itemId===id);if(held)held.quantity=Math.max(0,held.quantity-1);}
    hero.inventory=hero.inventory.filter(i=>i.quantity>0);
    if(!drank||supplies.hungerDays>=3){state.party.members[index]=core.setExhaustionLevel(hero,(hero.exhaustionLevel||0)+1);model.addMessage(adventure,'system','Путешествие','Нехватка припасов усиливает истощение. Нужны вода, еда и отдых.');}
    model.addEvent(adventure,'survival',adventure.currentLocationId,`День пути: еда ${ate?'потрачена':'закончилась'}, вода ${drank?'потрачена':'закончилась'}.`);
  }
  return state;
}
async function narrate(service, state, adventure, outcome, input = '', {questionOnly=false,correction}={}) {
  const context = contextFor(state, adventure, input);
  const sceneDialogue=!questionOnly&&!state.combat?narration.scenePacket(state,adventure,(await publicView(service,state,adventure)).actions,outcome.npcId):null;
  const localAnswer=()=>questionOnly
    ? {narration:`${context.packet.hero.name}: HP ${context.packet.hero.hp.current}/${context.packet.hero.hp.max}, ${adventure.language==='en'?'armor':'защита'} ${context.packet.hero.ac}.\n\n${[...context.packet.bookmarks,...context.packet.activeFacts,...context.packet.recollections].slice(0,3).map(r=>r.text).join('\n\n')}`}
    : {narration:outcome.text||'Сцена ждёт твоего следующего решения.',...(outcome.type==='talk'&&sceneDialogue?.actors.some(a=>a.id===outcome.npcId)?{lines:[{speakerId:outcome.npcId,text:adventure.language==='en'?'I am listening. What would you like to know?':'Я слушаю. Что ты хочешь узнать?'}]}:{})};
  const payload = { lootRules:questionOnly?undefined:LOOT_RULES, questRules:questionOnly?undefined:QUEST_RULES, accessRules:questionOnly?undefined:ACCESS_RULES, economyRules:questionOnly?undefined:ECONOMY_RULES,companionRules:questionOnly?undefined:COMPANION_RULES, instruction: questionOnly ? `Answer the player's question in ${adventure.language === 'en' ? 'English' : 'Russian'}. Return JSON {narration}. Use current state and relevant recollections. Preserve exact numbers and distinguish suggestions from events. Do not execute actions, roll, advance time, invent rewards or propose world developments.` : `Speak ${adventure.language === 'en' ? 'English' : 'Russian'} as a creative Dungeon Master in the player-defined world. Return JSON {narration,developments?:{locations:[],npcs:[],quests:[],checks:[],items:[],markets:[]}}. Write 1-3 vivid short paragraphs that respond to the actual intent and engine outcome. Preserve exact numbers, conditions and failure. A social outcome is authoritative for actual trust, disposition, payment and check; a player statement is an unverified claim, never an established world fact. Failed checks and restitution alone do not imply forgiveness. outcome.inventoryChanges are already applied to the inventory; do not describe that money as still on the ground. Only outcome.lootOnGround or an existing context.objects entry is an established pickup. For outcome.permanentNpcCombat, preserve its participant HP/conditions and rewardsGranted:false: no automatic trophy, coins or new possession appears after defeating a local person. Their unregistered possessions are unknown; leave a search for a later player action rather than asserting an available item. Honor outcome.time and context.time: resting does not imply sunrise or a new day unless the recorded clock supports it. Do not invent numerical inventory, spell slots, XP, rewards, damage or victories. Do not move the player or make choices for them. You may introduce coherent new places, NPCs and OFFERED quests as optional developments with the same schemas as world creation. Current ids are stable; never overwrite current entities, close quests or alter old facts. Optional developments.sceneAffordances can add at most three ordinary physical source cues to the existing current location: {locationId,sourceText,cues:[{id,description,materials,maxWeightLb,portable,quantity?}]}; sourceText is a literal substring of actual current location name/description or local NPC role. Maximum six cues per scene, no rewrite, no magical contents or action success. Each anchor has finite quantity 1-8 (default one); use a fitting explicit quantity for plural tableware. Broken or carried objects permanently consume that source count. Keep developments small; empty arrays are valid. Leave a concrete opening for the player.`, input, outcome, questionOnly, correction, context: context.packet };
  payload.instruction+=' Current context.hero, context.party, context.npcs.body and combat participants are authoritative over older recentDialogue and recollections. Empty current conditions mean no current unconscious/dead condition; older prose must not reintroduce it. Exact target IDs in action logs and outcome.combatChanges determine who was hit or healed; never infer a different target from the actor name.';
  if(outcome.partyChanges?.length)payload.instruction+=' outcome.partyChanges lists authoritative changes to specific characters. A caster is not necessarily the recipient: apply HP, conditions and slots to the exact listed id/name. conditionsAfter supersedes any earlier injury description; a healed conscious companion is no longer unconscious. Unchanged hero HP does not mean that the hero received another character\'s healing.';
  if(sceneDialogue){payload.dialogue=sceneDialogue;payload.instruction+=` ${narration.SCENE_DIALOGUE_RULES}`;}
  const validate=report=>{
    if(typeof report?.narration!=='string'||!report.narration.trim()||report.narration.length>6000)throw new Error('AI не вернул корректное повествование.');
    return {...report,developments:!questionOnly&&report.developments?model.validateDevelopments(report.developments,adventure):undefined,sceneDialogue:!questionOnly?narration.validateSceneDialogue(report.lines,sceneDialogue,adventure.turn):null};
  };
  const report=questionOnly?validate(await measuredAi.generate(adventure,'master_question',payload,localAnswer)):await narration.generate(adventure,payload,localAnswer,validate);
  if (typeof report.narration !== 'string' || !report.narration.trim() || report.narration.length > 6000) throw new Error('AI не вернул корректное повествование.');
  if (!questionOnly&&report.developments) { model.applyDevelopments(adventure, report.developments);await economy.initialize(service,state,adventure); await registerChecks(service, state, adventure); }
  model.addMessage(adventure, 'dm', 'Мастер', report.narration); adventure.pendingNarration = null;
  narration.installSceneDialogue(adventure,report.sceneDialogue,report.narration);
}
const basePlanSchema = z.object({ type: z.enum(['narrative', 'travel', 'talk', 'check', 'combat', 'action', 'cast_created_spell', 'cast_spell','trade','service','market_choice','deliver','scene_check','pickup']), questId:z.string().max(60).optional(),objectiveId:z.string().max(100).optional(),checkId:z.string().max(60).optional(),marketId:z.string().max(60).optional(),offerId:z.string().max(100).optional(),itemId:z.string().max(180).optional(),choiceId:z.string().max(60).optional(),quantity:z.number().int().min(1).max(20).optional(),direction:z.enum(['buy','sell']).optional(), actionId: z.string().max(160).optional(), spellId:z.string().max(160).optional(), targetId:z.string().max(160).optional(), locationId: z.string().max(80).optional(), npcId: z.string().max(80).optional(), ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']).optional(), skill: z.string().max(40).optional(), dc: z.number().int().min(5).max(25).optional(), successFact: z.string().max(650).optional(), theme: z.string().max(200).optional(), enemyName: z.string().max(100).optional(), difficulty: z.enum(['easy', 'medium', 'hard']).optional(),lootName:z.string().min(1).max(140).optional(),lootFocus:loot.focusSchema.optional(),description: z.string().max(500).default('Свободное действие героя.'), developments: model.developmentSchema.optional() }).strict();
const planSchema=basePlanSchema.extend({type:z.enum([...basePlanSchema.shape.type.options,'environment_interaction','npc_combat','social','recruit','dismiss','first_aid','party_item','party_gear','party_order','clarify','refuse']),plan:environment.planSchema.omit({actorId:true,sourceId:true}).optional(),method:z.enum(['stabilize','item']).optional(),mode:z.enum(['auto','conserve','defend','support','focus','equip','unequip']).optional(),fromId:z.string().max(160).optional(),toId:z.string().max(160).optional(),characterId:z.string().max(160).optional(),quantity:z.number().int().min(1).max(1000).optional(),goal:z.enum(['deescalate','rapport']).optional(),approach:z.enum(['persuasion','deception','intimidation','restitution']).optional(),statement:z.string().max(600).optional(),coins:z.number().int().min(1).max(20).optional(),propIds:z.array(z.string().min(1).max(160)).min(1).max(3).optional(),reason:z.string().trim().min(1).max(500).optional(),alternatives:z.array(z.string().trim().min(1).max(160)).max(3).optional()});
async function resolveInput(service, state, adventure, input) {
  const available = choices(service, state, adventure);
  const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const candidates = available.map(a => ({ ...a, score: words.filter(w => a.label.toLowerCase().includes(w)).length })).sort((a, b) => b.score - a.score).slice(0, 18);
  const knownSpells=(service.getSpellbook(state.campaign.id).spells||[]).filter(s=>s.accessible).map(s=>({id:s.id||s.spellId,name:s.name})).slice(0,32);
  const payload = { lootRules:LOOT_RULES, questRules:QUEST_RULES, accessRules:ACCESS_RULES, economyRules:ECONOMY_RULES, environmentRules:ENVIRONMENT_RULES,socialRules:SOCIAL_RULES,companionRules:COMPANION_RULES, instruction: `Map player intent to a game operation. Apply the supplied environmentRules, socialRules and companionRules. Return JSON {type,plan?,goal?,approach?,statement?,coins?,propIds?,reason?,alternatives?,actionId?,locationId?,npcId?,questId?,objectiveId?,checkId?,spellId?,targetId?,ability?,skill?,dc?,successFact?,theme?,enemyName?,difficulty?,description,developments?}. For an existing listed combat action use type action with an EXACT supplied actionId; for other physical intentions use the bounded environment_interaction plan above, or cast_created_spell with an exact learned context.createdSpells id and an exact current party/combat target id. Use cast_spell only with an exact supplied knownSpells id. Never invent a spell id. For an explicit fight/duel with an established nearby NPC use type npc_combat with exact npcId. It starts real initiative using that permanent body and its saved injuries; do not use anonymous generated combat. Generated type combat is only for distinct new threats. A bounded environment_interaction is a specific supported physical action, not a full duel. Never revive an NPC or change numerical profile through prose. Respect saved NPC HP, conditions and disposition. A self-target spell can use the hero id. Outside combat type may be narrative (no numerical changes), travel to a known connected location, talk to an existing nearby npc, check (ability, skill, dc 5-25 and optional successFact), or combat (theme, enemyName, difficulty easy/medium/hard). Use pickup with an exact context.objects itemId only when available; a closed object requires a fitting manual scene_check or another declared access route first. Use deliver with exact context.quests questId and objectiveId for a requested item handover. For a genuinely new player-proposed approach, you may add a new manual check through developments.checks with alternativeFor equal to an existing goal check id, then choose its new checkId. Use scene_check with an exact context.checks id for a player-chosen manual approach. Generic type check never substitutes a quest check id or a recorded discovery. Use trade with direction buy/sell, exact context.markets marketId/offerId or context.inventory itemId, and quantity 1-20; service with exact marketId/offerId; market_choice with exact marketId/choiceId. Never invent prices, balances or offers when resolving a transaction. Infer fair uncertainty rather than rolling for every sentence. Do not choose an action contrary to the player. New world records can be proposed via developments using the world schemas; reference valid ids. No HP, money, XP or resource changes. ASCII stable ids. ${adventure.language === 'en' ? 'English' : 'Russian'} description. Do not narrate a successful outcome before rules resolution.`, input, knownSpells, availableActions: candidates.map(({ id, label }) => ({ id, label })), context: contextFor(state, adventure, input).packet };
  payload.instruction+=' For an ordinary attempt to stop a nearby dying character from dying outside combat use first_aid with method stabilize and exact targetId: the server makes a real Medicine DC10 check, not a generic story roll. For administering the hero\'s actual healing item use first_aid with method item, exact targetId and itemId from inventory. Ordinary aid never revives a corpse. Use existing available aid actions when appropriate. In combat use the exact available stabilize/cast/item action with its real cost. Current0HP/death saves and stable deadlines are authoritative; resting cannot heal a0HP character, and long-rest benefit timing is enforced by the game.';
  payload.instruction+=' For actual sharing within the joined party use party_item with exact fromId,toId,itemId,quantity from current ownership. Ordinary objects default to one; for coins require the player\'s stated amount or clarify. This is internal custody, not delivery/reward/earned money. Equipped/attuned/quest items require the correct separate action first. party_gear has characterId,itemId,mode equip|unequip and uses existing things outside combat. In combat transfers require the hero\'s own turn, physical reach and actual object/action budget. party_order has npcId,mode auto|conserve|defend|support|focus,targetId?; it only sets a preference for the next actual NPC turn. conserve saves slots except emergency0HP healing; defend is that NPC\'s own Dodge, not an invented shield for someone else. support uses supported actual healing, otherwise Dodge; focus names an exact enemy of this battle. Never replace a requested exact spell/unsupported special move with another attack or pretend it occurred; clarify the available approaches. No gear, resources or immediate NPC action appear through speech.';
  const validate=draft=>{const command=planSchema.parse(draft);if(command.developments)model.validateDevelopments(command.developments,adventure);return command;};
  return narration.generate(adventure,payload,()=>({type:'clarify',reason:'Мастеру нужно уточнить физический подход; действие ещё не выполнено.',alternatives:['Укажите доступный предмет и цель.']}),validate,{task:'adventure_intent',resolved:false});
}
async function lastingRefusal(service,state,adventure,body,input,refusal){
  const proposed=structuredClone(adventure);
  const reason=String(refusal.message||refusal.reason||'Нужно уточнить намерение.').slice(0,500),alternatives=(refusal.alternatives||[]).slice(0,3).map(s=>String(s).slice(0,160));
  const text=[reason,...alternatives].join('\n');
  if(input)model.addMessage(proposed,'player',state.party.members.find(p=>p.id===state.party.heroId).name,input);
  model.addMessage(proposed,'dm','Мастер',text);
  model.addEvent(proposed,'action_refused',proposed.currentLocationId,text,{code:refusal.code||'clarification',sourceId:body.operationId});
  proposed.revision+=1;
  proposed.appliedOperations.push({id:body.operationId,revision:proposed.revision});proposed.appliedOperations=proposed.appliedOperations.slice(-500);
  await save(service,state,proposed,'adventure_action_refused');
  return {...await publicView(service,state,proposed),refusal:{code:refusal.code||'clarification',reason,alternatives}};
}
function validatePhysicalAnchors(adventure,plan){
  const location=adventure.locations.find(l=>l.id===adventure.currentLocationId);
  for(const prop of plan?.props||[]){
    const anchor=location?.affordances?.find(a=>a.id===prop.anchorId);
    if(!anchor||!anchor.materials.includes(prop.material)||prop.weightLb>anchor.maxWeightLb||prop.portable!==anchor.portable)return {code:'unsupported_source',message:'Для этого нового предмета нет установленного физического источника в текущей сцене.',alternatives:['Используйте уже установленный предмет.','Уточните, откуда взять этот предмет.']};
  }
  return null;
}
async function perform(body, { seed } = {}) {
  const { service, state: initial, adventure } = await loaded(body.campaignId); if (!initial) bad('Сначала создайте приключение.');
  if (typeof body.operationId !== 'string' || body.operationId.length > 100) bad('Нужен идентификатор действия.');
  if (adventure.appliedOperations.some(op => op.id === body.operationId)) return { ...await publicView(service, initial, adventure), replayed: true };
  if (body.expectedRevision !== adventure.revision) bad('Кампания уже изменилась. Обновите сцену и повторите намерение.', 409);
  const input = typeof body.input === 'string' ? body.input.trim().slice(0, 2000) : '';
  const beforeCombat=initial.combat ? structuredClone(initial.combat) : null;
  const beforeHero=structuredClone(initial.party.members.find(m=>m.id===initial.party.heroId));
  const beforeParty=structuredClone(initial.party.members);
  const ledgerStart=adventure.economy?.ledger.length||0;
  const previousEffects=new Set([...initial.party.members,...(adventure.environment?.npcStates||[]).map(n=>n.body)].flatMap(m=>(m.activeEffects||[]).map(e=>e.id)));
  let command = body.command;
  if (body.actionId) command = choices(service, initial, adventure).find(a => a.id === body.actionId)?.command;
  if (!command && input) command = await resolveInput(service, initial, adventure, input);
  if (!command || typeof command.type !== 'string') bad('Выберите действие или опишите намерение.');
  // Resolve an AI-selected public action before special-operation preflight.
  // Otherwise fight:<npc> would become npc_combat only after its starter was skipped.
  if(command.type==='action'&&command.actionId&&!command.actionId.startsWith('core:')&&!initial.combat){
    const selected=choices(service,initial,adventure).find(a=>a.id===command.actionId);
    if(selected)command={...selected.command,...(command.developments?{developments:command.developments}:{})};
  }
  if(['clarify','refuse'].includes(command.type))return lastingRefusal(service,initial,adventure,body,input,{code:command.type,message:command.reason||command.description,alternatives:command.alternatives});
  if(command.type==='check'&&['persuasion','deception','intimidation'].includes(command.skill))return lastingRefusal(service,initial,adventure,body,input,{code:'social_target_required',message:'Для изменения отношения нужен конкретный персонаж и социальный подход.',alternatives:['Укажите персонажа и что хотите сказать.','Выберите существующую проверку сцены, если она относится к другому препятствию.']});
  let socialResult;
  if(command.type==='social'){
    if(command.developments){
      let patch;try{patch=model.validateDevelopments(command.developments,adventure);}catch(error){return lastingRefusal(service,initial,adventure,body,input,{code:'invalid_development',message:error.message});}
      if(Object.values(patch).some(value=>Array.isArray(value)&&value.length))return lastingRefusal(service,initial,adventure,body,input,{code:'unrelated_development',message:'Изменение отношений использует текущее состояние; новые факты и предметы требуют отдельного действия.'});
    }
    socialResult=await social.resolve({state:initial,adventure,sourceId:body.operationId,seed,command:{npcId:command.npcId,goal:command.goal,approach:command.approach,statement:input?input.slice(0,600):command.statement,coins:command.coins,propIds:command.propIds}});
    if(!socialResult.ok)return lastingRefusal(service,initial,adventure,body,input,socialResult.refusal);
  }
  let companionResult;
  if(['recruit','dismiss'].includes(command.type)){
    const joining=structuredClone(adventure);
    if(command.developments){
      let patch;try{patch=model.validateDevelopments(command.developments,joining);}catch(error){return lastingRefusal(service,initial,adventure,body,input,{code:'invalid_companion_offer',message:error.message});}
      if(Object.entries(patch).some(([key,value])=>key!=='companionOffers'&&Array.isArray(value)&&value.length)||patch.companionOffers.some(o=>o.npcId!==command.npcId))return lastingRefusal(service,initial,adventure,body,input,{code:'unrelated_development',message:'Приглашение может только установить предложение выбранного персонажа; остальные изменения требуют другого действия.'});
      model.applyDevelopments(joining,patch);
    }
    companionResult=await companions.resolve({state:initial,adventure:joining,sourceId:body.operationId,seed,command:{type:command.type,npcId:command.npcId,statement:input?input.slice(0,600):command.statement}});
    if(!companionResult.ok)return lastingRefusal(service,initial,adventure,body,input,companionResult.refusal);
  }
  let aidResult;
  if(command.type==='first_aid'){
    if(command.developments&&Object.values(command.developments).some(value=>Array.isArray(value)&&value.length))return lastingRefusal(service,initial,adventure,body,input,{code:'unrelated_development',message:'Первая помощь использует установленные тела и вещи, не создаёт дополнительные награды или условия.'});
    aidResult=await firstAid.resolve({state:initial,adventure,sourceId:body.operationId,seed,command:{type:'first_aid',method:command.method,targetId:command.targetId,itemId:command.itemId}});
    if(!aidResult.ok)return lastingRefusal(service,initial,adventure,body,input,aidResult.refusal);
  }
  let inventoryResult;
  if(['party_item','party_gear','party_order'].includes(command.type)){
    if(command.developments&&Object.values(command.developments).some(value=>Array.isArray(value)&&value.length))return lastingRefusal(service,initial,adventure,body,input,{code:'unrelated_development',message:'Поручение и обмен используют существующий отряд и его вещи; дополнительные события требуют другого действия.'});
    if(command.type==='party_order'){
      const ordered=await partyOrders.resolve({state:initial,adventure,command:{type:'party_order',npcId:command.npcId,mode:command.mode,...(command.targetId?{targetId:command.targetId}:{})},sourceId:body.operationId});
      if(!ordered.ok)return lastingRefusal(service,initial,adventure,body,input,ordered.refusal);
      const next=ordered.adventure;next.revision+=1;
      model.addEvent(next,'party_order',command.npcId,ordered.outcome.text,{sourceId:body.operationId,mode:command.mode,targetId:command.targetId,combatId:ordered.outcome.combatId,instructionOnly:true});
      if(input)model.addMessage(next,'player',beforeHero.name,input);
      model.addMessage(next,'system',next.language==='en'?'Party order':'Поручение',ordered.outcome.text);
      next.appliedOperations.push({id:body.operationId,revision:next.revision});next.appliedOperations=next.appliedOperations.slice(-500);
      await save(service,ordered.state,next,'party_order');return publicView(service,ordered.state,next);
    }
    const itemCommand=command.type==='party_item'?{type:'party_item',fromId:command.fromId,toId:command.toId,itemId:command.itemId,quantity:command.quantity}:{type:'party_gear',characterId:command.characterId,itemId:command.itemId,mode:command.mode};
    inventoryResult=await partyInventory.resolve({state:initial,adventure,command:itemCommand,sourceId:body.operationId});
    if(!inventoryResult.ok)return lastingRefusal(service,initial,adventure,body,input,inventoryResult.refusal);
  }
  command=boundNpcCommand(adventure,command);
  let npcStart;
  if(command.type==='npc_combat'){
    if(command.developments){
      let patch;
      try{patch=model.validateDevelopments(command.developments,adventure);}catch(error){return lastingRefusal(service,initial,adventure,body,input,{code:'invalid_development',message:error.message});}
      if(Object.values(patch).some(value=>Array.isArray(value)&&value.length))return lastingRefusal(service,initial,adventure,body,input,{code:'unrelated_development',message:'Начало боя использует установленного персонажа; изменения мира требуют отдельного действия.'});
    }
    npcStart=await npcEncounters.start({state:initial,adventure,npcIds:[command.npcId],sourceId:body.operationId,seed});
    if(!npcStart.ok)return lastingRefusal(service,initial,adventure,body,input,npcStart.refusal);
  }
  const npcBlock=blockedNpcCommand(adventure,command);
  if(npcBlock)return lastingRefusal(service,initial,adventure,body,input,{code:'npc_unavailable',message:npcBlock,alternatives:['Выберите другого доступного персонажа.']});
  if(command.type==='trade'&&command.direction==='sell'&&String(command.itemId||'').startsWith('scene_prop_'))return lastingRefusal(service,initial,adventure,body,input,{code:'unsupported_prop_transfer',message:'Этот торговец не покупает эту вещь.',alternatives:['Оставьте предмет или используйте его в сцене.']});
  let interaction;
  if(command.type==='environment_interaction'){
    const checked=environment.validatePlan({...command.plan,actorId:initial.party.heroId,sourceId:body.operationId});
    if(!checked.ok)return lastingRefusal(service,initial,adventure,body,input,{code:'invalid_plan',message:checked.errors.join('; ')});
    const physicalScene=structuredClone(adventure);
    if(command.developments){
      try{const patch=model.validateDevelopments(command.developments,physicalScene);if(['locations','npcs','items','quests','checks','markets','companionOffers'].some(k=>patch[k].length))return lastingRefusal(service,initial,adventure,body,input,{code:'unrelated_development',message:'Физический план может только добавить нужные источники текущей сцены; прочие изменения требуют отдельного действия.'});model.applyDevelopments(physicalScene,patch);}
      catch(error){return lastingRefusal(service,initial,adventure,body,input,{code:'invalid_source',message:error.message,alternatives:['Укажите установленный источник или уточните подход.']});}
    }
    const anchorRefusal=validatePhysicalAnchors(physicalScene,checked.plan);
    if(anchorRefusal)return lastingRefusal(service,initial,adventure,body,input,anchorRefusal);
    interaction=await environment.resolveInteraction({state:initial,adventure:physicalScene,plan:checked.plan,seed});
    if(!interaction.ok)return lastingRefusal(service,initial,adventure,body,input,interaction.refusal);
  }
  if(command.type==='supplies'){
    const market=adventure.economy?.markets.find(m=>m.locationId===adventure.currentLocationId&&m.offers.some(o=>o.kind==='supplies'&&o.stock>0));
    if(!adventure.survival.enabled||!market)bad('Припасы можно пополнить в поселении.');
    command={type:'trade',direction:'buy',marketId:market.id,offerId:market.offers.find(o=>o.kind==='supplies'&&o.stock>0).id,quantity:1};
  }
  const transformedNpcBlock=blockedNpcCommand(adventure,command);
  if(transformedNpcBlock)return lastingRefusal(service,initial,adventure,body,input,{code:'npc_unavailable',message:transformedNpcBlock});
  let proposed = inventoryResult?inventoryResult.adventure:aidResult?aidResult.adventure:companionResult?companionResult.adventure:socialResult?socialResult.adventure:npcStart?npcStart.adventure:interaction?interaction.adventure:structuredClone(adventure);
  proposed.turn+=1;
  dialogue.invalidate(proposed.dialogue);
  if (command.developments&&!interaction&&!socialResult&&!companionResult&&!aidResult&&!inventoryResult) model.applyDevelopments(proposed, command.developments);
  if (command.type === 'action' && command.actionId?.startsWith('core:')) command = { type: 'action', actionId: command.actionId.slice(5) };
  if (command.type === 'action' && !initial.combat && command.actionId && choices(service, initial, proposed).some(a => a.id === command.actionId)) command = choices(service, initial, proposed).find(a => a.id === command.actionId).command;
  let openingCombat=null;
  let state = inventoryResult?inventoryResult.state:aidResult?aidResult.state:companionResult?companionResult.state:socialResult?socialResult.state:npcStart?npcStart.state:interaction?interaction.state:initial, outcome = inventoryResult?inventoryResult.outcome:aidResult?aidResult.outcome:companionResult?companionResult.outcome:socialResult?socialResult.outcome:npcStart?npcStart.outcome:interaction?interaction.outcome:{ type: command.type, text: command.description || 'Действие разрешено.' };
  if(initial.party.members.find(m=>m.id===initial.party.heroId).hp.current<=0&&!['death_save','recover_stable','action'].includes(command.type))bad('Герой не может действовать при 0 HP. Нужна помощь или спасбросок от смерти.');
  if (initial.combat && ['travel', 'talk', 'check', 'narrative', 'inspect', 'accept_quest', 'combat','npc_combat','deliver','scene_check','pickup'].includes(command.type)) bad('Сейчас идёт бой. Выберите действие текущего хода.');
  if(inventoryResult){
    model.addEvent(proposed,command.type,command.characterId||command.toId,outcome.text,{sourceId:body.operationId,fromId:command.fromId,toId:command.toId,itemId:command.itemId,quantity:command.quantity,mode:command.mode,retrieval:outcome.retrieval});
    if(outcome.walletDelta?.heroDelta){const amount=outcome.walletDelta.heroDelta;proposed.economy.ledger.push({id:crypto.randomUUID(),turn:proposed.turn,day:proposed.day,hours:proposed.hours,kind:'party_transfer',amount,balance:economy.money(state),fromId:command.fromId,toId:command.toId,internal:true,sourceId:body.operationId,marketName:proposed.language==='en'?'Party wallets':'Кошельки отряда',text:outcome.text});}
  }else if(command.type==='first_aid'){
    model.addEvent(proposed,'first_aid',command.targetId,outcome.text,{sourceId:body.operationId,method:command.method,success:outcome.success,check:outcome.check,itemId:command.itemId});
  }else if(['recruit','dismiss'].includes(command.type)){
    model.addEvent(proposed,'companion_'+command.type,command.npcId,outcome.text,{sourceId:body.operationId,success:outcome.success,check:outcome.check});
  }else if(command.type==='social'){
    const event=model.addEvent(proposed,'social',command.npcId,outcome.text,{sourceId:body.operationId,goal:command.goal,approach:command.approach,success:outcome.success,coinsPaid:outcome.coinsPaid,statement:input?input.slice(0,600):command.statement,statementConfidence:'player_claim'});
    Object.assign(proposed.journal.find(row=>row.id===event.id),{npcId:command.npcId,goal:command.goal,approach:command.approach,success:outcome.success,coinsPaid:outcome.coinsPaid});
  }else if(command.type==='npc_combat'){
    model.addEvent(proposed,'npc_combat',command.npcId,outcome.text,{encounterId:proposed.activeNpcEncounter?.combatId});
    if(outcome.openingTerminal)model.addEvent(proposed,'npc_combat_end',proposed.currentLocationId,'Бой с местными персонажами завершён на открывающей инициативе.',{outcome:outcome.openingTerminal});
  }else if(command.type==='environment_interaction'){
    model.addEvent(proposed,'environment_interaction',proposed.currentLocationId,outcome.text,{sourceId:body.operationId,events:outcome.events.map(e=>({type:e.type,propId:e.propId,targetId:e.targetId,hit:e.hit,damage:e.damage}))});
    const core=await import('../vendor/dnd-core/dist/engine.mjs');
    if(state.combat&&core.sideDefeated(state.combat,'enemies')){
      await save(service,state,proposed,'environment_combat_resolved');
      state=await service.endCombat(state.campaign.id,'victory',seed);
    }
  }else if(['trade','service','market_choice'].includes(command.type)){
    const result=await economy.apply(service,state,proposed,command,{seed});state=result.state;outcome=result.outcome;
  }else if(command.type==='deliver'){
    outcome=quests.deliver(state,proposed,command);
  }else if(command.type==='scene_check'){
    if(!quests.canAct(state.party.members.find(m=>m.id===state.party.heroId)))bad('Герой сейчас не может выбрать подход к проверке.');
    const check=proposed.loreDefinitions.find(c=>c.id===command.checkId&&c.trigger==='manual'&&c.locationId===proposed.currentLocationId);
    if(!check||(check.npcId&&!proposed.npcs.some(n=>n.id===check.npcId&&n.locationId===proposed.currentLocationId)))bad('Этот способ проверки сейчас недоступен.');
    if(!Object.hasOwn(proposed.loreCheckIds,check.id)){await registerChecks(service,state,proposed);state=service.loadCampaign(state.campaign.id);}
    const publicCheck=lore.publicChecks(state).find(c=>c.id===proposed.loreCheckIds[check.id]);
    if(!publicCheck||publicCheck.attempted)bad('Этот способ уже проверен. Выберите другой подход.');
    const results=await runChecks(service,state.campaign.id,proposed,'manual',check.npcId,seed,check.id);
    state=service.loadCampaign(state.campaign.id);outcome={type:'check',text:results[0].text,check:results[0]};
  }else if (command.type === 'travel') {
    const location = proposed.locations.find(l => l.id === proposed.currentLocationId), next = proposed.locations.find(l => l.id === command.locationId);
    if (!next || !location.connectsTo.includes(next.id)) bad('До этого места пока нет известного маршрута.');
    proposed.currentLocationId = next.id; next.visited = true;
    state.openWorld.location = next.name;
    outcome.text = `Герой дошёл до ${next.name}.`; model.processQuestEvent(proposed, model.addEvent(proposed, 'visit', next.id, outcome.text));
  } else if (command.type === 'talk') {
    const npc = proposed.npcs.find(n => n.id === command.npcId && n.locationId === proposed.currentLocationId); if (!npc) bad('Этот персонаж сейчас не рядом.');
    npc.familiarity = Math.min(100, npc.familiarity + 1); outcome.text = `Разговор с ${npc.name}.`; outcome.npcId=npc.id;
    model.processQuestEvent(proposed, model.addEvent(proposed, 'talk', npc.id, outcome.text));
  } else if (command.type === 'inspect') { outcome.text = 'Герой внимательно осматривает место.'; model.addEvent(proposed, 'inspect', proposed.currentLocationId, outcome.text); }
  else if (command.type === 'pickup') {
    const item = proposed.items.find(i => i.id === command.itemId && !i.collected && i.locationId === proposed.currentLocationId);
    if (!item) bad('Этого предмета здесь нет или он уже взят.');
    if(!quests.canAct(state.party.members.find(m=>m.id===state.party.heroId)))bad('Герой сейчас не может взять предмет.');
    if(!access.describe(state,proposed,item).available)bad('Предмет пока недоступен. Нужен другой подход, ключ или устранение препятствия.');
    outcome.text = `Получен предмет: ${item.name}.`;
    const event=model.addEvent(proposed,'acquire',item.id,outcome.text);
    const held=await loot.grantLoot(service,state,proposed,item.lootInput||loot.planLoot(service,state,item),{...item.origin,kind:item.origin?.kind||'exploration',eventId:event.id,sourceEventId:item.origin?.eventId,locationId:item.locationId,worldItemId:item.id});
    held.tags.push('world_item',item.id);
    const stored=state.party.members.find(m=>m.id===state.party.heroId).inventory.find(i=>i.itemId===held.itemId);stored.tags=[...new Set([...stored.tags,...held.tags])];
    item.collected=true;model.processQuestEvent(proposed,event);
  }
  else if (command.type === 'accept_quest') {
    const quest = proposed.quests.find(q => q.id === command.questId && q.status === 'offered'); if (!quest) bad('Эта задача уже принята или недоступна.');
    quest.status = 'active'; outcome.text = `Ты принимаешь задачу: ${quest.title}.`; model.addEvent(proposed, 'quest_accept', quest.id, outcome.text);quests.reconcileEvidence(state,proposed);
  } else if (command.type === 'check') {
    const resolved = await srd.command({ type: 'ability_check', campaignId: state.campaign.id, ability: command.ability, skill: command.skill, dc: command.dc }, { seed });
    state = service.loadCampaign(state.campaign.id); const check = resolved.resolution.check;
    outcome = { type: 'check', check, text: `${command.skill || command.ability}: ${check.roll.total} против ${check.dc} — ${check.success ? 'успех' : 'неудача'}.` };
    model.addMessage(proposed, 'roll', 'Проверка', outcome.text);
    if (check.success && command.successFact) { await service.addKnownFact(state.campaign.id, { id: crypto.randomUUID(), text: command.successFact, sourceSceneId: proposed.currentLocationId, tags: ['player_check'] }); state = service.loadCampaign(state.campaign.id); }
    model.processQuestEvent(proposed, model.addEvent(proposed, 'check', command.skill || command.ability, outcome.text, { success: check.success }));
  } else if (command.type === 'combat') {
    const lootFocus=command.lootFocus?loot.focusSchema.parse(command.lootFocus):'healing';
    const plan = service.planGeneratedEncounter(state.campaign.id, { theme: command.theme || 'неожиданная опасность', difficulty: command.difficulty || 'easy', includeReward: false });
    const monsters = plan.monsters.map((m, i) => ({ ...m, name: command.enemyName ? `${command.enemyName}${i ? ` ${i + 1}` : ''}` : m.name }));
    const started = await service.startGeneratedEncounter(state.campaign.id, monsters, seed); state = started.state;state.flags.ui_last_combat_outcome='ongoing';delete state.flags.generated_leveled_spell_turn;
    proposed.activeEncounterId = crypto.randomUUID(); outcome.text = 'Начался бой. Инициатива и действия определены правилами.';
    const event=model.addEvent(proposed,'combat',proposed.activeEncounterId,outcome.text);
    proposed.activeEncounter={id:proposed.activeEncounterId,eventId:event.id,locationId:proposed.currentLocationId,theme:command.theme||'Добыча после столкновения',difficulty:command.difficulty||'easy',lootName:typeof command.lootName==='string'?command.lootName.slice(0,140):undefined,lootFocus,lootDropped:false};
    const core=await import('../vendor/dnd-core/dist/engine.mjs');
    const terminal=state.combat&&core.sideDefeated(state.combat,'enemies')?'victory':state.combat&&core.sideDefeated(state.combat,'heroes')&&!core.hasPendingDeathSaves(state.combat)?'defeat':null;
    if(terminal){openingCombat=structuredClone(state.combat);await save(service,state,proposed,'opening_combat_resolved');state=await service.endCombat(state.campaign.id,terminal,seed);outcome.openingTerminal=terminal;outcome.text='Первые действия инициативы уже завершили бой: '+terminal+'.';}

  } else if (command.type === 'recover_stable') {
    const hero=state.party.members.find(m=>m.id===state.party.heroId);
    if(state.combat||hero.hp.current!==0||!hero.deathSaves?.stable||hero.deathSaves?.dead||hero.conditions.includes('dead'))bad('Восстановление доступно только стабильному герою вне боя.');
    const initialized=await medicine.advance({state,adventure:proposed,seconds:0,sourceId:`init-${crypto.createHash('sha256').update(body.operationId).digest('hex').slice(0,24)}`,seed});if(!initialized.ok)bad(initialized.refusal.message);state=initialized.state;proposed=initialized.adventure;
    for(const event of initialized.outcome.events)model.addEvent(proposed,'medical_'+event.type,event.actorId,medicalText(event,proposed.language),{...event,medicalEventId:event.id});
    outcome={type:'recovery',recoveryHours:(medicine.recoverySeconds(proposed,hero.id)||0)/3600,text:proposed.language==='en'?'The hero waits for the already established recovery deadline.':'Герой ждёт завершения уже установленного срока восстановления.'};
    if(outcome.recoveryHours===0&&medicine.publicStatus(state,proposed,hero.id)?.healingPrevented){const blockers=state.party.members.find(m=>m.id===hero.id).activeEffects.filter(effect=>effect.healingPrevented);const waits=blockers.map(effect=>Math.min(...[effect.remainingSourceTurnStarts,effect.remainingSourceTurnEnds].filter(Number.isFinite))*6);if(waits.some(wait=>!Number.isFinite(wait)))bad('Восстановление пока блокирует действующий эффект. Нужна помощь.');outcome.recoveryHours=Math.max(6,...waits)/3600;}
  } else if (command.type === 'narrative') { model.addEvent(proposed, 'story', proposed.currentLocationId, input || outcome.text); }
  else {
    const hadCombat = Boolean(state.combat);
    const allowed = ['action', 'rest', 'death_save', 'use_item', 'equip_item','attune_item','unattune_item', 'cast_spell', 'cast_created_spell', 'save'];
    if (!allowed.includes(command.type)) bad('Эта механика ещё не поддерживается.');
    const result = await srd.command({ ...command, campaignId: state.campaign.id }, { seed }); state = service.loadCampaign(state.campaign.id);
    if(command.type==='rest')proposed.restBenefits=result.adventure.restBenefits||proposed.restBenefits;
    if(command.type==='rest')state.party.members=state.party.members.map(m=>{const old=initial.party.members.find(p=>p.id===m.id&&p.kind==='ally'&&(p.conditions.includes('dead')||p.deathSaves?.dead));return old?structuredClone(old):m;});
    outcome = { type: command.type, text: result.resolution.message, mechanical: result.resolution,rest:result.resolution.rest };
    if (!result.resolution.ok && state.flags.ui_last_combat_outcome!=='defeat') bad(result.resolution.message);
    if(['action','death_save','use_item','equip_item','attune_item','unattune_item','cast_spell','cast_created_spell'].includes(command.type))model.addEvent(proposed,command.type,command.spellId||command.itemId||command.actionId||state.party.heroId,outcome.text);
    if (command.type === 'rest') { model.addEvent(proposed, 'rest', proposed.currentLocationId, command.kind === 'long' ? 'Долгий отдых завершён.' : 'Короткий отдых завершён.'); }
  }
  // A corpse receives neither rest recovery nor new spendable class resources.
  const priorDead=new Map(initial.party.members.filter(m=>m.kind==='ally'&&(m.conditions.includes('dead')||m.deathSaves?.dead)).map(m=>[m.id,m]));
  let fallen=[];
  try{const log=state.flags.ui_companion_combat_log?JSON.parse(state.flags.ui_companion_combat_log):null;if(log?.combatId===(beforeCombat?.id||openingCombat?.id||state.combat?.id))fallen=log.fallen||[];}catch{}
  state.party.members=state.party.members.map(member=>{
    if(member.kind!=='ally'||!(member.conditions.includes('dead')||member.deathSaves?.dead))return member;
    if(priorDead.has(member.id)){const old=priorDead.get(member.id);if(inventoryResult){for(const field of ['hp','conditions','conditionInstances','deathSaves','resources','spellcasting','hitDice','activeEffects'])if(old[field]===undefined)delete member[field];else member[field]=structuredClone(old[field]);return member;}return structuredClone(old);}
    const atDeath=fallen.find(m=>m.id===member.id);member.hp.current=0;
    if(atDeath){const resources=new Map(atDeath.resources.map(r=>[r.id,r.current]));member.resources=member.resources.map(r=>({...r,current:Math.min(r.max,resources.get(r.id)||0)}));if(member.spellcasting)for(const [level,slot]of Object.entries(member.spellcasting.slots))slot.current=Math.min(slot.max,atDeath.slots?.[level]?.current||0);}
    return member;
  });
  if(proposed.activeNpcEncounter?.status==='ongoing'){
    const synced=await npcEncounters.sync({state,adventure:proposed});
    if(!synced.ok)bad(synced.refusal.message);
    state=synced.state;proposed=synced.adventure;
  }
  const partySync=await companions.sync({state,adventure:proposed});if(!partySync.ok)bad(partySync.refusal.message);state=partySync.state;proposed=partySync.adventure;
  if(beforeCombat||openingCombat||['combat','npc_combat'].includes(command.type)){
    const combat=state.combat||openingCombat;
    let log;
    try{log=state.flags.ui_companion_combat_log?JSON.parse(state.flags.ui_companion_combat_log):null;}catch{}
    const combatId=combat?.id||beforeCombat?.id||npcStart?.outcome.combatId;
    // Initial automatic turns can finish without an intermediate character sync.
    // Their actual log is still authoritative while the combat remains active.
    if(!log&&combat)log={combatId:combat.id,entries:combat.log.slice(-12)};
    if(log?.combatId===combatId){
      const previousIds=new Set(beforeCombat?.id===log.combatId?beforeCombat.log.map(r=>r.id):[]);
      outcome.combatActions=log.entries.filter(row=>!previousIds.has(row.id)).slice(-10);
      const allyIds=new Set(state.party.members.filter(m=>m.kind==='ally').map(m=>m.id));
      for(const row of outcome.combatActions.filter(row=>allyIds.has(row.actorId))){if(!proposed.events.some(event=>event.combatId===log.combatId&&event.combatLogId===row.id))model.addEvent(proposed,'companion_action',row.actorId,row.body,{combatId:log.combatId,combatLogId:row.id,actorId:row.actorId,round:row.round});}
    }
    delete state.flags.ui_companion_combat_log;
  }
  if(beforeCombat&&state.combat?.id===beforeCombat.id)outcome.combatChanges=state.combat.participants.flatMap(member=>{
    const old=beforeCombat.participants.find(m=>m.id===member.id);
    if(!old||JSON.stringify([old.hp,old.conditions])===JSON.stringify([member.hp,member.conditions]))return [];
    return [{id:member.id,name:member.name,hpBefore:old.hp,hpAfter:member.hp,conditionsAfter:member.conditions}];
  }).slice(0,12);
  if(npcStart||beforeCombat?.environment?.id.startsWith('npc_encounter:')){
    outcome.permanentNpcCombat={ended:!state.combat,outcome:state.flags.ui_last_combat_outcome,rewardsGranted:false,
      unregisteredPossessions:'Unknown. Do not announce new battle loot or a pickup from this NPC.',
      participants:(proposed.activeNpcEncounter?.npcIds||[]).map(id=>{const record=proposed.environment.npcStates.find(n=>n.npcId===id);return {id,hp:record.body.hp,conditions:record.body.conditions};})};
  }
    if((beforeCombat||openingCombat)&&!state.combat){const result=state.flags.ui_last_combat_outcome;
    if((beforeCombat||openingCombat).environment.id.startsWith('npc_encounter:')){
      model.addEvent(proposed,'npc_combat_end',proposed.currentLocationId,result==='victory'?'Противники больше не могут сражаться.':result==='defeat'?'Герой проиграл бой с местными персонажами.':'Герой вышел из боя с местными персонажами.',{outcome:result});
    }else if(result==='victory'){
      model.processQuestEvent(proposed,model.addEvent(proposed,'victory',proposed.currentLocationId,'Победа в бою.'));
      const dropped=loot.dropEncounterLoot(service,state,proposed);
      if(dropped){model.addEvent(proposed,'loot_found',dropped.id,`Добыча доступна: ${dropped.name}.`);outcome.lootOnGround={id:dropped.id,name:dropped.name,rarity:dropped.rarity,mechanics:dropped.lootInput.useEffect||dropped.lootInput.weapon};outcome.text+=` Добыча остаётся в месте боя: ${dropped.name}; её можно забрать.`;}
    }else model.addEvent(proposed,result||'combat_end',proposed.currentLocationId,result==='defeat'?'Бой закончен поражением.':'Бой закончен без подтверждённой победы.');}
  const elapsed=command.type==='environment_interaction'&&!beforeCombat?6:elapsedSeconds(command,beforeCombat,state.combat,outcome);
  const medicalMeta=structuredClone(proposed);if(beforeCombat){medicalMeta.hours+=elapsed/3600;while(medicalMeta.hours>=24){medicalMeta.hours-=24;medicalMeta.day+=1;}}
  const stableAtSeconds=state.party.members.filter(member=>member.hp.current===0&&member.deathSaves?.stable&&!beforeParty.find(old=>old.id===member.id)?.deathSaves?.stable).map(member=>({actorId:member.id,atSeconds:rest.now(proposed)+elapsed}));
  if(aidResult?.outcome.method==='stabilize'&&aidResult.outcome.success&&!stableAtSeconds.some(row=>row.actorId===aidResult.outcome.targetId))stableAtSeconds.push({actorId:aidResult.outcome.targetId,atSeconds:rest.now(proposed)+elapsed});
  const medical=await medicine.advance({state,adventure:medicalMeta,seconds:beforeCombat?0:elapsed,sourceId:body.operationId,seed,previousEffects,stableAtSeconds});if(!medical.ok)bad(medical.refusal.message);state=medical.state;medical.adventure.day=proposed.day;medical.adventure.hours=proposed.hours;proposed=medical.adventure;
  if(medical.outcome.events.length){outcome.medicalEvents=medical.outcome.events.slice(-12).map(event=>({type:event.type,actorId:event.actorId,name:event.name,at:event.at,total:event.result?.roll.total,transition:event.transition,hours:event.hours,hp:event.hp,healingBlocked:event.healingBlocked||undefined}));for(const event of medical.outcome.events)model.addEvent(proposed,'medical_'+event.type,event.actorId,medicalText(event,proposed.language),{...event,medicalEventId:event.id});}
  if(!beforeCombat) {
    const expired=[...await expireExplorationEffects(state,previousEffects,elapsed),...await expireNpcEffects(proposed,previousEffects,elapsed)];
    if(expired.length)model.addEvent(proposed,'effects_expired',proposed.currentLocationId,`Завершились эффекты: ${expired.join(', ')}.`);
  }
  proposed.revision += 1; proposed.hours += elapsed / 3600;
  let elapsedDays=0;while (proposed.hours >= 24) { proposed.hours -= 24; proposed.day += 1; elapsedDays+=1; }
  state=await survivalDay(state,proposed,elapsedDays);
  const finalParty=await companions.sync({state,adventure:proposed});state=finalParty.state;proposed=finalParty.adventure;
  const syncedOrders=await partyOrders.sync({state,adventure:proposed});state=syncedOrders.state;proposed=syncedOrders.adventure;
  economy.advance(proposed);
  if (input) model.addMessage(proposed, 'player', state.party.members.find(p => p.id === state.party.heroId).name, input);
  proposed.appliedOperations.push({ id: body.operationId, revision: proposed.revision }); proposed.appliedOperations = proposed.appliedOperations.slice(-500);
  if(!outcome.quiet)proposed.pendingNarration = { outcome, input };
  quests.reconcileEvidence(state,proposed);state = await rewardQuests(service, state, proposed);
  await save(service, state, proposed, 'adventure_rules_resolved');
  await registerChecks(service, state, proposed);
  if (!state.combat && (['travel', 'talk', 'inspect'].includes(command.type)||(command.type==='service'&&proposed.currentLocationId!==adventure.currentLocationId))) await runChecks(service, state.campaign.id, proposed, command.type === 'talk' ? 'dialogue' : command.type==='inspect'?'inspect':'enter', command.npcId, seed);
  state = service.loadCampaign(state.campaign.id); state = await rewardQuests(service, state, proposed); await save(service, state, proposed, 'adventure_scene_resolved');
  const afterHero=state.party.members.find(m=>m.id===state.party.heroId);
  outcome.partyChanges=state.party.members.flatMap(member=>{const old=beforeParty.find(m=>m.id===member.id);if(!old||JSON.stringify([old.hp,old.conditions,old.spellcasting?.slots])===JSON.stringify([member.hp,member.conditions,member.spellcasting?.slots]))return [];return [{id:member.id,name:member.name,hpBefore:old.hp,hpAfter:member.hp,conditionsBefore:old.conditions,conditionsAfter:member.conditions,slotsBefore:old.spellcasting?.slots,slotsAfter:member.spellcasting?.slots}];}).slice(0,4);
  const beforeCoins=beforeHero.inventory.filter(i=>i.itemId==='gold_piece').reduce((n,i)=>n+i.quantity,0);
  const recorded=(proposed.economy?.ledger.slice(ledgerStart)||[]).reduce((n,row)=>n+row.amount,0),unrecorded=economy.money(state)-beforeCoins-recorded;
  if(unrecorded)economy.recordRulesMoney(state,proposed,unrecorded,proposed.activeEncounterId||command.actionId||proposed.currentLocationId);
  const itemIds=new Set([...beforeHero.inventory,...afterHero.inventory].map(i=>i.itemId));
  outcome.inventoryChanges=[...itemIds].map(id=>{const before=beforeHero.inventory.find(i=>i.itemId===id),after=afterHero.inventory.find(i=>i.itemId===id);return {id,name:after?.name||before.name,before:before?.quantity||0,after:after?.quantity||0};}).filter(i=>i.before!==i.after).slice(0,12);
  outcome.time={day:proposed.day,hours:proposed.hours};
  if(afterHero.xp>beforeHero.xp)model.addEvent(proposed,'xp_gain',afterHero.id,`Получено ${afterHero.xp-beforeHero.xp} XP. Всего ${afterHero.xp} XP.`);
  if(afterHero.level>beforeHero.level){
    const resources=afterHero.resources.filter(r=>!beforeHero.resources.some(old=>old.id===r.id)).map(r=>r.label);
    const text=`Новый уровень: ${beforeHero.level} → ${afterHero.level}. Максимум HP: ${beforeHero.hp.max} → ${afterHero.hp.max}.${resources.length?` Новые ресурсы: ${resources.join(', ')}.`:''}`;
    model.addEvent(proposed,'level_up',afterHero.id,text);model.addMessage(proposed,'system','Развитие героя',text);outcome.progression={previousLevel:beforeHero.level,level:afterHero.level,newResources:resources};
  }
  if(outcome.quiet)model.addMessage(proposed,'system',proposed.language==='en'?(inventoryResult?'Party':'Transaction'):(inventoryResult?'Отряд':'Сделка'),outcome.text);
  else try { await narrate(service, state, proposed, outcome, input); }
  catch(error) {
    const failure=error.name==='ZodError'||/Unknown|Invalid map|Duplicate world|unreachable/i.test(error.message)?'world_development':/некорректные данные|корректное повествование/.test(error.message)?'reply_format':'provider';
    proposed.pendingNarration.failure=failure;proposed.pendingNarration.correction=error.correction||narration.feedback(error);
    model.addEvent(proposed,'narration_failure',proposed.currentLocationId,proposed.language==='en'?'The description needs clarification; the resolved action remains saved.':'Описание требует уточнения; результат действия сохранён.',{failure,correction:proposed.pendingNarration.correction});
    model.addMessage(proposed,'system','Связь с мастером',`Игровое действие сохранено. ${failure==='world_development'?'Новые детали мира не прошли проверку.':failure==='reply_format'?'Описание пришло в неподдержанном формате.':'AI пока не смог закончить описание.'} Его можно повторить без нового броска.`);
  }
  state = service.loadCampaign(state.campaign.id); await save(service, state, proposed, 'adventure_turn_done');
  return publicView(service, state, proposed);
}
async function retryNarration(id){
  const {service,state,adventure}=await loaded(id);if(!adventure.pendingNarration)return publicView(service,state,adventure);
  const pending=adventure.pendingNarration;
  try{await narrate(service,state,adventure,pending.outcome,pending.input,{correction:pending.correction});}
  catch(error){adventure.pendingNarration.correction=error.correction||narration.feedback(error);model.addMessage(adventure,'system','Связь с мастером','Описание пока не удалось уточнить. Действие и его результат сохранены; можно повторить описание позже.');}
  adventure.revision+=1;const latest=service.loadCampaign(state.campaign.id);await save(service,latest,adventure,'narration_retry');return publicView(service,latest,adventure);
}
async function ask(body) {
  const {service,state,adventure}=await loaded(body.campaignId);if(!state)bad('Сначала создайте приключение.');
  if(typeof body.operationId!=='string'||!body.operationId||body.operationId.length>100)bad('Нужен идентификатор сообщения.');
  if(adventure.appliedOperations.some(op=>op.id===body.operationId))return {...await publicView(service,state,adventure),replayed:true};
  if(body.expectedRevision!==adventure.revision)bad('Кампания уже изменилась. Обновите сцену.',409);
  const input=typeof body.input==='string'?body.input.trim().slice(0,2000):'';if(!input)bad('Напишите вопрос мастеру.');
  const proposed=structuredClone(adventure),pending=proposed.pendingNarration;
  model.addMessage(proposed,'player',state.party.members.find(m=>m.id===state.party.heroId).name,input);
  try {
    await narrate(service,state,proposed,{type:'question',text:'The player asks the game master a question. No in-world action has occurred. Answer from the supplied state and recollections, or clearly frame a possibility as a suggestion. Do not roll dice, advance time, start events, move the player or add world developments.'},input,{questionOnly:true});
  }catch(error){if(proposed.usage){adventure.usage=proposed.usage;await save(service,state,adventure,'question_usage');}throw error;}
  proposed.pendingNarration=pending;proposed.revision+=1;
  proposed.appliedOperations.push({id:body.operationId,revision:proposed.revision});proposed.appliedOperations=proposed.appliedOperations.slice(-500);
  await save(service,state,proposed,'master_question');return publicView(service,state,proposed);
}
async function spellDraft(id, idea) { const { service, state, adventure } = await loaded(id); if (!state) bad('Создайте приключение.'); const hero = state.party.members.find(m => m.id === state.party.heroId); const draft = await measuredAi.generate(adventure,'created_spell', { instruction: `Invent an original spell matching the player idea. Return exactly {name,description,level,rangeFeet,cost,target,saveAbility?,durationTurns,concentration,effects}. No id. cost action/bonus_action; target self/creature. level 0-9 must fit the caster current slots. Effects: damage {dice,damageType,halfOnSave?}, healing {dice}, temporary_hp {dice}, condition {condition,repeatSave?}, remove_condition {condition}, armor {amount:1-3}, speed {feet:5-30}, skill_bonus {skill,dice:1d4|1d6}, resistance {damageType}, utility {feature:light|water_breathing|water_walk|see_invisible|spider_climb}. Finite duration 0-10 turns; concentration for sustained effects. Harm requires saveAbility str/dex/con/int/wis/cha. Dice modest for level; no healing cantrip, no arbitrary numeric state. ${adventure.language === 'en' ? 'English' : 'Russian'} flavor. Keep combination balanced.`, idea: String(idea).slice(0, 1000), hero: { level: hero.level, slots: hero.spellcasting?.slots }, world: adventure.worldIdea.slice(0, 500) }, () => ({ name: 'Искра намерения', description: String(idea || 'Маленькая искра света').slice(0, 1200), level: 0, rangeFeet: 60, saveAbility: 'dex', effects: [{ type: 'damage', dice: '1d6', damageType: 'force' }] })); await save(service,state,adventure,'spell_draft_usage'); return validateSpell(draft); }
async function learnSpell(id, draft) { const checked = validateSpell(Object.fromEntries(Object.entries(draft).filter(([key]) => !['id', 'sourceEventId'].includes(key)))); if (!checked.ok) return checked; const { service, state, adventure } = await loaded(id); if (!state) bad('Нет приключения.'); if (!state.party.members.find(m => m.id === state.party.heroId).spellcasting) bad('У этого архетипа пока нет ресурса для магии.'); adventure.createdSpells.push({ ...checked.spell, sourceEventId: `study-${crypto.randomUUID()}` }); adventure.revision += 1; model.addEvent(adventure, 'spell_learned', checked.spell.id, `Создано заклинание: ${checked.spell.name}.`); await save(service, state, adventure, 'spell_created'); return publicView(service, state, adventure); }
module.exports = { getView, setup, create, select, perform, ask, retryNarration, spellDraft, learnSpell, loaded, save, meta, publicView, choices };
