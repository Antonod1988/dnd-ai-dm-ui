const groups={
  quests:['quest_accept','quest_reward','quest_failed','deliver'],
  dialogue:['talk','dialogue_decision','dialogue_interjection','social','companion_recruit','companion_dismiss','party_order'],
  combat:['combat','npc_combat','npc_combat_end','combat_end','victory','defeat','retreat','action','companion_action','party_order_result','death_save','cast_spell','cast_created_spell','first_aid'],
  loot:['acquire','loot_found','use_item','equip_item','attune_item','unattune_item','party_item','party_gear','spell_learned'],
  economy:['economy','market_restock','supplies'],
  exploration:['visit','check','inspect','environment_interaction','survival','rest','effects_expired'],
  notes:['player_note']
};
const categories=['all',...Object.keys(groups),'story'];
const byKind=new Map(Object.entries(groups).flatMap(([category,kinds])=>kinds.map(kind=>[kind,category])));
function categoryOf(kind){return String(kind).startsWith('medical_')?'combat':byKind.get(kind)||'story';}
const publicEntry=entry=>({...entry,category:categoryOf(entry.kind)});
module.exports={categories,categoryOf,publicEntry};
