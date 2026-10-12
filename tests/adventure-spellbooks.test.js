const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const books=require('../src/adventure-spellbooks');
let core;before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Hero',classId:'wizard',raceId:'human'}),npc=core.createSrdLevelOneCharacter({id:'original-npc',name:'Luma',classId:'cleric',raceId:'human'});npc.kind='ally';
  return {state:{party:{heroId:'hero',members:[hero,npc]},flags:{},rollLog:[]},adventure:{language:'en',currentLocationId:'town',createdSpells:[],npcs:[{id:npc.id,name:npc.name,locationId:'town',disposition:'friendly'}],companions:{records:[{npcId:npc.id,joined:true,state:'joined',character:structuredClone(npc)}]}}};
}
const draft={name:'Glass Pulse',description:'An original pulse strikes one creature.',level:1,rangeFeet:60,cost:'action',target:'creature',saveAbility:'dex',effects:[{type:'damage',dice:'2d6',damageType:'force'}]};
function register(input,casterId='original-npc',sourceId='study-1',spell=draft){return books.register({...input,casterId,draft:spell,sourceId});}
test('books isolate current genuine owners and legacy hero spells without mutating reads',()=>{
  const input=fixture();input.adventure.createdSpells=[{...draft,id:'hero-legacy'},{...draft,id:'misowned',ownerId:'other-human'}];input.adventure.companions.records[0].createdSpells=[{...draft,id:'npc-only',ownerId:'original-npc'}];const before=structuredClone(input);
  assert.deepEqual(books.spellsFor(input.state,input.adventure).map(s=>[s.id,s.ownerId]),[['hero-legacy','hero']]);assert.deepEqual(books.spellsFor(input.state,input.adventure,'original-npc').map(s=>s.id),['npc-only']);assert.deepEqual(books.spellsFor(input.state,input.adventure,'other-human'),[]);assert.deepEqual(input,before);
  const returned=books.spellsFor(input.state,input.adventure);returned[0].effects[0].dice='99d12';assert.deepEqual(input,before);
});
test('NPC registration is a pure owned entry; no slot, HP, charge, inventory or gold grant',()=>{
  const input=fixture(),before=structuredClone(input),learned=register(input);assert.equal(learned.ok,true);assert.deepEqual(input,before);assert.deepEqual(learned.state,input.state);assert.deepEqual(learned.adventure.companions.records[0].character,input.adventure.companions.records[0].character);assert.equal(learned.spell.ownerId,'original-npc');assert.equal(learned.spell.sourceId,'study-1');assert.equal(learned.spell.sourceEventId,'study-1');assert.equal(learned.adventure.createdSpells.length,0);assert.equal(books.spellsFor(learned.state,learned.adventure,'original-npc').length,1);assert.equal(learned.outcome.elapsedSeconds,0);
  const hero=register(input,'hero','hero-study');assert.equal(hero.ok,true);assert.equal(hero.adventure.createdSpells.length,1);assert.ok(!hero.adventure.companions.records[0].createdSpells);
});
test('registration uses own maximum slot capacity even depleted, never current slots or hero borrowed level',()=>{
  const input=fixture();input.state.party.members[1].spellcasting.slots['1'].current=0;input.state.party.members[1].resources.find(r=>r.id==='spell_slots_1').current=0;input.state.party.members[0].spellcasting.slots['9']={current:1,max:1};
  const learned=register(input);assert.equal(learned.ok,true);assert.equal(learned.state.party.members[1].spellcasting.slots['1'].current,0);assert.equal(register(input,'original-npc','too-high',{...draft,level:2}).refusal.code,'spell_level_unavailable');
});
test('shared power validation rejects excessive, malformed and renewable healing drafts before any write',()=>{
  for(const spell of [{...draft,effects:[{type:'damage',dice:'99d12',damageType:'fire'}]},{...draft,level:0,effects:[{type:'healing',dice:'1d4'}]},{...draft,effects:[{type:'unknown'}]},{...draft,ownerId:'hero'},{...draft,slots:{current:99}}]){const input=fixture(),original=structuredClone(input),result=register(input,'original-npc','bad',spell);assert.equal(result.ok,false);assert.deepEqual(input,original);assert.deepEqual(result.state,input.state);}
});
test('dead/hidden/hostile/remote/dismissed/human and noncasters cannot acquire or expose NPC-owned books',()=>{
  for(const change of ['dead','sparse-dead','hidden','hostile','remote','dismissed','human','no-caster','body-dead','combat-incap']){
    const input=fixture();input.adventure.companions.records[0].createdSpells=[{...draft,id:'owned',ownerId:'original-npc'}];if(change==='dead')input.state.party.members[1].conditions=['dead'];if(change==='sparse-dead')input.state.party.members[1].deathSaves={dead:true};if(change==='hidden')input.adventure.npcs[0].hidden=true;if(change==='hostile')input.adventure.npcs[0].disposition='hostile';if(change==='remote')input.adventure.npcs[0].locationId='road';if(change==='dismissed'){input.adventure.companions.records[0].joined=false;input.adventure.companions.records[0].state='dismissed';}if(change==='human')input.state.party.members[1].kind='player';if(change==='no-caster')delete input.state.party.members[1].spellcasting;if(change==='body-dead')input.adventure.environment={npcStates:[{npcId:'original-npc',body:{hp:{current:0},conditions:['dead']}}]};if(change==='combat-incap')input.state.combat={participants:[{...core.characterToCombatant(input.state.party.members[1]),conditions:['stunned']}]};
    assert.equal(register(input).ok,false,change);assert.deepEqual(books.spellsFor(input.state,input.adventure,'original-npc'),[],change);
  }
});
test('nonce replay returns the same stable spell without duplication or restoring resources, mismatched owner/spec refuses',()=>{
  const learned=register(fixture()),damaged=structuredClone(learned);damaged.state.party.members[1].hp.current=1;damaged.state.party.members[1].spellcasting.slots['1'].current=0;damaged.state.party.members[1].resources.find(r=>r.id==='spell_slots_1').current=0;
  const replay=register(damaged);assert.equal(replay.outcome.replayed,true);assert.equal(replay.spell.id,learned.spell.id);assert.deepEqual(replay.state,damaged.state);assert.equal(replay.adventure.companions.records[0].createdSpells.length,1);assert.equal(register(damaged,'hero').refusal.code,'spell_registration_replay_mismatch');assert.equal(register(damaged,'original-npc','study-1',{...draft,name:'Different'}).refusal.code,'spell_registration_replay_mismatch');
});
test('NPC spellbook survives dismissal/rejoin without recharging its cached or actual body',()=>{
  const learned=register(fixture()),record=learned.adventure.companions.records[0];record.character.hp.current=2;record.character.spellcasting.slots['1'].current=0;record.character.resources.find(r=>r.id==='spell_slots_1').current=0;record.joined=false;record.state='dismissed';learned.state.party.members=learned.state.party.members.slice(0,1);assert.deepEqual(books.spellsFor(learned.state,learned.adventure,'original-npc'),[]);
  record.joined=true;record.state='joined';learned.state.party.members.push(structuredClone(record.character));assert.equal(books.spellsFor(learned.state,learned.adventure,'original-npc')[0].id,learned.spell.id);assert.equal(learned.state.party.members[1].hp.current,2);assert.equal(learned.state.party.members[1].spellcasting.slots['1'].current,0);assert.equal(record.createdSpells.length,1);
});
test('hero and NPC caps refuse additional registration without dropping old entries',()=>{
  for(const [casterId,cap] of [['hero',200],['original-npc',32]]){const input=fixture(),entries=Array.from({length:cap},(_,i)=>({...draft,id:`existing-${i}`,ownerId:casterId}));if(casterId==='hero')input.adventure.createdSpells=entries;else input.adventure.companions.records[0].createdSpells=entries;const before=structuredClone(input);assert.equal(register(input,casterId).refusal.code,'spellbook_full');assert.deepEqual(input,before);}
});
