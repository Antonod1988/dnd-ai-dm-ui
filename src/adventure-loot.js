const crypto=require('node:crypto');
const {z}=require('zod');
const focuses=['healing','temporary_hp','remove_condition','attack_bonus','ability_check_bonus','saving_throw_bonus','armor_class_bonus','weapon','quest_item','story_clue','utility'];
const rarities=['common','uncommon','rare','very_rare','legendary'];
const focusSchema=z.enum(focuses),raritySchema=z.enum(rarities);
function rarityForLevel(level){return level>=17?'legendary':level>=11?'very_rare':level>=5?'rare':level>=3?'uncommon':'common';}
function allowedRarity(requested,level){return rarities[Math.min(Math.max(0,rarities.indexOf(requested)),rarities.indexOf(rarityForLevel(level)))];}
function planLoot(service,state,spec){
  const hero=state.party.members.find(m=>m.id===state.party.heroId);
  const focus=spec.focus||({quest:'quest_item',weapon:'weapon',consumable:'healing',tool:'ability_check_bonus'}[spec.kind])||'healing';
  const input=service.planGeneratedReward(state.campaign.id,{theme:spec.description||spec.theme||spec.name,name:spec.name,focus,
    rarity:allowedRarity(spec.rarity||rarityForLevel(hero.level),hero.level),difficulty:spec.difficulty||'easy'}).itemInput;
  return {...input,description:spec.description||spec.theme||(state.campaign.language==='en'?'A useful find from your adventure.':'Полезная находка из приключения.')};
}
function displayDescription(item,language){
  let text=String(item.description||'');
  if(/^\w+(?:_\w+)? (?:generated|healing|temporary HP|story clue|quest item)/i.test(text)&&/Narrate it as|Mechanics are limited|until a typed mechanic/i.test(text)){
    text=text.split(/Narrate it as|It has narrative value/)[0].replace(/^(?:common|uncommon|rare|very_rare|legendary)\s+.*?\s+tied to\s+/i,'').replace(/\.+\s*$/,'');
    if(/generated (?:consumable|utility|quest|weapon)|Mechanics are limited/i.test(text))text=language==='en'?'A useful find from your adventure.':'Полезная находка из приключения.';
  }
  return text;
}
async function grantLoot(service,state,adventure,input,origin){
  const core=await import('../vendor/dnd-core/dist/engine.mjs');
  const item=core.createGeneratedInventoryItem(input);
  const hero=state.party.members.find(m=>m.id===state.party.heroId);
  hero.inventory=core.mergeInventoryItem(hero.inventory,item);
  adventure.lootLedger||=[];
  adventure.lootLedger.push({id:crypto.randomUUID(),itemId:item.itemId,name:item.name,quantity:item.quantity,rarity:item.rarity,turn:adventure.turn,...origin});
  return item;
}
function remainingQuantity(item){return item.collected?0:item.remainingQuantity??item.quantity??1;}
// A source's physical units have separate IDs, so identical charged items never
// share a charge pool through the core's itemId-based inventory merge.
async function grantWorldLoot(service,state,adventure,input,origin,quantity){
  const core=await import('../vendor/dnd-core/dist/engine.mjs'),hero=state.party.members.find(m=>m.id===state.party.heroId),items=[];
  for(let i=0;i<quantity;i++){
    const item=core.createGeneratedInventoryItem({...input,quantity:1});
    item.itemId=`${item.itemId}_${crypto.randomUUID().slice(0,8)}`;item.quantity=1;
    item.tags=[...new Set([...item.tags,'world_item',origin.worldItemId])];
    if(item.mechanics?.equip?.attack)item.mechanics.equip.attack.id=item.itemId;
    items.push(item);
  }
  hero.inventory.push(...items);adventure.lootLedger||=[];
  for(const item of items)adventure.lootLedger.push({id:crypto.randomUUID(),itemId:item.itemId,name:item.name,quantity:1,rarity:item.rarity,turn:adventure.turn,...origin});
  return items;
}
function dropEncounterLoot(service,state,adventure){
  const encounter=adventure.activeEncounter;
  if(!encounter||encounter.lootDropped)return null;
  const place=adventure.locations.find(l=>l.id===encounter.locationId);
  const item={id:`loot-${encounter.id}`,name:encounter.lootName||(adventure.language==='en'?`${place.name} — recovered supplies`:`${place.name} — найденные припасы`),
    description:encounter.theme,kind:encounter.lootFocus==='weapon'?'weapon':'consumable',focus:encounter.lootFocus||'healing',locationId:encounter.locationId,collected:false,
    origin:{kind:'combat',eventId:encounter.eventId,encounterId:encounter.id,locationId:encounter.locationId}};
  item.lootInput=planLoot(service,state,{...item,difficulty:encounter.difficulty});item.rarity=item.lootInput.rarity;
  adventure.items.push(item);encounter.lootDropped=true;
  return item;
}
module.exports={focusSchema,raritySchema,rarityForLevel,allowedRarity,planLoot,grantLoot,grantWorldLoot,remainingQuantity,dropEncounterLoot,displayDescription};
