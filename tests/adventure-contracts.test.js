const {test}=require('node:test');
const assert=require('node:assert/strict');
const contracts=require('../src/adventure-contracts');

const baselineLengths={COMPANION_RULES:1129,SOCIAL_RULES:1383,ENVIRONMENT_RULES:2488,ECONOMY_RULES:1003,ACCESS_RULES:775,QUEST_RULES:1196,LOOT_RULES:773};
const requireWords=(name,words)=>{for(const word of words)assert.ok(contracts[name].includes(word),`${name} retains ${word}`);};

test('all seven reusable contracts reduce their recorded source text by at least 25% in aggregate',()=>{
  assert.deepEqual(Object.keys(contracts),Object.keys(baselineLengths));
  const oldChars=Object.values(baselineLengths).reduce((a,b)=>a+b,0);
  const newChars=Object.values(contracts).reduce((sum,text)=>{assert.equal(typeof text,'string');assert.ok(text.length<2000);return sum+text.length;},0);
  assert.equal(oldChars,8747);
  assert.ok(newChars<=oldChars*.75,`${newChars} / ${oldChars}`);
});

test('companion and social contracts retain identity, foundations, consent and explicit restitution boundaries',()=>{
  requireWords('COMPANION_RULES',['companionOffer','classId','barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|warlock|wizard|sorcerer','human|elf|dwarf|halfling|gnome|half_elf|half_orc|tiefling|dragonborn','acolyte|soldier|sage|criminal','reason','level1','developments.companionOffers','exact existing IDs','dead/incapacitated/hostile','recruit/dismiss','context.party','no healing/restocking']);
  requireWords('SOCIAL_RULES',['npcId','deescalate|rapport','persuasion|deception|intimidation|restitution','statement?','explicitly offered coin amounts','context.npcs.relationship.dueCoins','unknown ownership','propIds','relationship.claimableDamage','not past ownership','unrelated/intact/remote/paid','recorded harm once','no guaranteed forgiveness','claims, not facts','check/successFact','cannot reroll/farm trust','supported existing quest/check/action','never forced rapport']);
});

test('environment contract retains finite physical sources, exact schemas, additive provenance and refusal limits',()=>{
  requireWords('ENVIRONMENT_RULES',['environment_interaction','plan:{props?:[],steps:','take|drop','throw|strike','targetId','athletics|acrobatics|sleight_of_hand','easy|medium|hard','3 dependent steps','IDs/aliases, including broken props','never recreate under new IDs','id,name,locationId,anchorId','ceramic|glass|wood|metal|stone|cloth','tiny|small|medium|large','weightLb,portable,ownerNpcId?','current scene.affordances','nearby NPC/combat participant IDs','objectInteraction+action','no HP/dice/DC','clarify/refuse','reason<=500 chars','<=3 concrete alternatives','No silent intent change','lacks a matching cue','developments.sceneAffordances','locationId,sourceText,cues','id,description,materials,maxWeightLb,portable,quantity?','same request','literal substring','<=3 cues/request, <=6/scene','no anchor overwrites','1-8 (default 1)','one unit forever, even broken/carried','explicit finite count','no catalogue, extra request, contrary source, valuables, exotic objects or contents']);
});

test('economy, access, quest and loot contracts keep server numbers and all guarded progress/reward fields',()=>{
  requireWords('ECONOMY_RULES',['id,locationId,name,livelihood,shortage','none|supplies|medicine|equipment','sparse|steady|wealthy','merchantId?','goods|supplies|lodging|healing|rumor|transport','focus?,rarity?,targetId?,discovery?','encounter?','donate|check','skill?,dc?','merchantId is an existing local NPC ID','prices/stock/cash fields are server-only','Pay before rumor discovery','reachable places','route length','two coins','persuasion/investigation/survival/medicine/history/insight','DC 5-25','Successful help','once, no other numeric rewards','Never overwrite markets']);
  requireWords('ACCESS_RULES',['mode:any|all','check|item|victory','targetId','label?,description,concealed?','declared scene-check ID','reusable carried world-item key','victory a location ID','four conditions','any needs one, all each','Closed caches/locked doors/guards','distinct routes','concealed hides real name/description','Failed/unattempted checks or unrelated rolls never unlock','Unguarded items stay free','opening/narration until context.objects says available']);
  requireWords('QUEST_RULES',['visit/talk/check/victory/acquire/deliver','Delivery removes one real carried world-item targetId','explicit handover','nearby existing NPC recipientId','talk is not delivery','alternativeTargetIds: <=3 existing check IDs','distinct routes to one goal','trigger manual','never roll all alternatives','one attempt per method','any declared success completes its objective','Failure grants no discovery','player-proposed approach','alternativeFor','fair skill/DC','coherent discovery','Never replace spell/resource actions','reroll identical methods','without rewriting','replaced objectives or unsupported rewards']);
  requireWords('LOOT_RULES',['healing/temporary_hp/remove_condition/attack_bonus/ability_check_bonus/saving_throw_bonus/armor_class_bonus/weapon/quest_item/story_clue/utility','common/uncommon/rare/very_rare/legendary','rewardName','not rewardTheme','rewardFocus','server sets dice/charges/rarity/strength','hero level budget','No unsupported numbers','lootName/lootFocus','one fitting recoverable find','confirmed victory','No defeat/retreat loot or duplicated drops via developments']);
});
