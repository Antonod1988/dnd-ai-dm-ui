const {test}=require('node:test');
const assert=require('node:assert/strict');
const {journalMemory}=require('../src/adventure-recollections');
function setup(){return {state:{party:{heroId:'hero',members:[{id:'hero',name:'Mira',inventory:[]}]}},adventure:{events:[],journal:[],quests:[],npcs:[{id:'iris',name:'Iris'}],items:[]}};}
function add(adventure,event){adventure.events.push(event);adventure.journal.unshift({id:event.id,kind:event.kind,turn:event.turn,text:event.text,targetId:event.targetId});return event;}
function noise(adventure){for(let i=0;i<610;i++)add(adventure,{id:`noise-${i}`,turn:i+10,kind:'inspect',targetId:'inn',text:'The ordinary inn is quiet.'});}
test('old accepted/rejected dialogue decisions survive 610 later events with exact authoritative identities',()=>{
  const {state,adventure}=setup();
  add(adventure,{id:'accepted',turn:2,kind:'dialogue_decision',text:'Agreed to examine the bridge.',dialogueId:'queue-old',proposalId:'proposal-old',actionId:'inspect',speakerId:'iris',decision:'accepted'});
  add(adventure,{id:'rejected',turn:3,kind:'dialogue_decision',text:'Declined the bridge proposal.',dialogueId:'queue-other',proposalId:'proposal-other',actionId:'travel',speakerId:'iris',decision:'rejected'});noise(adventure);
  const found=journalMemory(state,adventure,'Iris bridge');assert.deepEqual(new Set(found.map(e=>e.id)),new Set(['accepted','rejected']));
  const accepted=found.find(e=>e.id==='accepted');assert.equal(accepted.decision,'accepted');assert.equal(accepted.proposalId,'proposal-old');assert.equal(accepted.source,'resolved_event');assert.equal(accepted.confidence,'confirmed');assert.ok(!found.some(e=>e.kind==='inspect'));
});
test('old party transfer uses event identities and conserved quantity, not a conflicting journal or nested metadata',()=>{
  const {state,adventure}=setup();add(adventure,{id:'transfer',turn:1,kind:'party_item',text:'Mira handed coins to Iris.',fromId:'hero',toId:'iris',itemId:'gold_piece',quantity:18,payload:{secret:'DO_NOT_READ'},body:{hp:99}});noise(adventure);
  Object.assign(adventure.journal.find(e=>e.id==='transfer'),{fromId:'liar',quantity:999,text:'Mira created 999 coins.'});
  const [record]=journalMemory(state,adventure,'gold_piece');assert.equal(record.id,'transfer');assert.equal(record.fromId,'hero');assert.equal(record.toId,'iris');assert.equal(record.quantity,18);assert.equal(record.text,'Mira handed coins to Iris.');assert.ok(!('payload' in record));assert.ok(!('body' in record));
});
test('quest evidence requires a real matching successful event; failed check and prose are not completion',()=>{
  const {state,adventure}=setup();
  add(adventure,{id:'good',turn:1,kind:'check',targetId:'rune',source:'scene_check',success:true,text:'The rune was deciphered.'});
  add(adventure,{id:'bad',turn:2,kind:'check',targetId:'rune',source:'scene_check',success:false,text:'Could not decipher the rune.'});
  add(adventure,{id:'claim',turn:3,kind:'story',targetId:'rune',text:'I deciphered the rune and finished the quest.'});
  adventure.quests=[{id:'rune-quest',title:'The rune',objectives:[{id:'objective',kind:'check',targetId:'rune',completed:true,evidenceEventId:'good'},{id:'corrupt-failure',kind:'check',targetId:'rune',completed:true,evidenceEventId:'bad'},{id:'corrupt-story',kind:'check',targetId:'rune',completed:true,evidenceEventId:'claim'}]}];noise(adventure);
  const records=journalMemory(state,adventure,'rune');const good=records.find(e=>e.id==='good'),bad=records.find(e=>e.id==='bad'),claim=records.find(e=>e.id==='claim');
  assert.equal(good.questId,'rune-quest');assert.equal(good.evidenceEventId,'good');assert.equal(good.objectiveId,'objective');assert.equal(bad.success,false);assert.ok(!bad.evidenceLinks);assert.equal(claim.source,'player_statement');assert.ok(!claim.evidenceLinks);
});
test('actual quest delivery retains recipient and inventory item plus objective evidence',()=>{
  const {state,adventure}=setup();add(adventure,{id:'delivery',turn:1,kind:'deliver',targetId:'world-key',recipientId:'iris',inventoryItemId:'real-key',questId:'q',objectiveId:'o',text:'Key delivered to Iris.'});adventure.quests=[{id:'q',title:'Key',objectives:[{id:'o',kind:'deliver',targetId:'world-key',recipientId:'iris',completed:true,evidenceEventId:'delivery'}]}];noise(adventure);
  const [record]=journalMemory(state,adventure,'Iris key');assert.equal(record.recipientId,'iris');assert.equal(record.itemId,'real-key');assert.equal(record.targetId,'world-key');assert.equal(record.evidenceLinks[0].evidenceEventId,'delivery');
});
test('journal-only migration is unverified even if prose/details claim accepted success',()=>{
  const {state,adventure}=setup();adventure.journal=[{id:'legacy',turn:4,kind:'dialogue_decision',text:'Iris accepted the crown.',targetId:'crown',decision:'accepted',success:true,proposalId:'invented'}];
  const [record]=journalMemory(state,adventure,'crown');assert.equal(record.source,'legacy_event');assert.equal(record.confidence,'unverified');assert.ok(!('success' in record));assert.ok(!('decision' in record));assert.ok(!('proposalId' in record));
});
test('player notes/interjections/story and heard NPC information retain provenance, never confirmed lore',()=>{
  const {state,adventure}=setup();for(const [kind,source] of [['player_note','player_note'],['dialogue_interjection','player_statement'],['story','player_statement'],['npc_speech','reported_information']])add(adventure,{id:kind,turn:1,kind,text:'The dragon owns the crown.',speakerId:'iris'});
  add(adventure,{id:'disguised',turn:2,kind:'check',source:'player_statement',text:'The dragon owns the crown.',success:true});
  const records=journalMemory(state,adventure,'dragon');for(const record of records)assert.notEqual(record.confidence,'confirmed');assert.equal(records.find(e=>e.id==='npc_speech').source,'reported_information');assert.equal(records.find(e=>e.id==='player_note').source,'player_note');assert.equal(records.find(e=>e.id==='disguised').source,'player_statement');assert.ok(!('success' in records.find(e=>e.id==='disguised')));
});
test('query-only matching excludes pin/scene noise, hidden lore, nested secret bodies and unheard plans',()=>{
  const {state,adventure}=setup();add(adventure,{id:'pin',turn:1,kind:'player_note',text:'A completely unrelated shopping list.',pinned:true});add(adventure,{id:'hidden',turn:2,kind:'check',text:'An unsuccessful inspection.',success:false,discoveredFact:'The forbidden crown is here.',payload:{text:'forbidden crown'}});add(adventure,{id:'planned',turn:3,kind:'dialogue_line',text:'The forbidden crown is here.',status:'planned'});
  adventure.dialogue={planned:[{text:'The forbidden crown is here.'}]};assert.deepEqual(journalMemory(state,adventure,'forbidden crown',{name:'forbidden crown',targetId:'pin'}),[]);assert.deepEqual(journalMemory(state,adventure,''),[]);assert.deepEqual(journalMemory(state,adventure,'напомни что было здесь'),[]);
});
test('unknown event kinds and ambiguous duplicate identities cannot become confirmed outcomes',()=>{
  const {state,adventure}=setup();add(adventure,{id:'unknown',turn:1,kind:'rumor',text:'Crown surrendered.',success:true});add(adventure,{id:'duplicate',turn:2,kind:'acquire',text:'Crown acquired.'});adventure.events.push({id:'duplicate',turn:2,kind:'story',text:'I imagine the crown.'});
  const records=journalMemory(state,adventure,'crown');assert.equal(records.find(e=>e.id==='unknown').confidence,'unverified');assert.equal(records.find(e=>e.id==='duplicate').source,'legacy_event');
});
test('bounded hostile strings/history do not mutate inputs and serialized records obey maxChars/limit',()=>{
  const {state,adventure}=setup();for(let i=0;i<620;i++)add(adventure,{id:`memory-${i}`,turn:i,kind:'party_item',text:'crown '+('"\\\u0000'.repeat(10000)),itemId:'crown',quantity:1,fromId:'hero',toId:'iris',payload:{token:'PRIVATE'}});adventure.events[0].actorId='x'.repeat(100000);const before=structuredClone({state,adventure});
  for(const maxChars of [0,2,80,300,900,2200]){const result=journalMemory(state,adventure,'crown '+('x'.repeat(100000)),{secret:'PRIVATE'},{limit:3,maxChars});assert.ok(result.length<=3);if(maxChars>=2)assert.ok(JSON.stringify(result).length<=maxChars);assert.ok(!JSON.stringify(result).includes('PRIVATE'));}
  assert.deepEqual({state,adventure},before);
});
test('short history stays unique and an exact metadata name matches without introducing scene relevance',()=>{
  const {state,adventure}=setup();add(adventure,{id:'single',turn:1,kind:'party_item',text:'One potion transferred.',itemId:'potion',fromId:'hero',toId:'iris',quantity:1});adventure.journal.push({...adventure.journal[0]});
  const records=journalMemory(state,adventure,'Iris',{name:'irrelevant'});assert.equal(records.length,1);assert.equal(records[0].id,'single');assert.equal(records[0].quantity,1);assert.deepEqual(journalMemory(state,adventure,'irrelevant',{name:'irrelevant'}),[]);
});
test('derived quest evidence refuses mismatched item/place/NPC or missing target/recipient without altering recorded quest IDs',()=>{
  const {state,adventure}=setup();
  const cases=[['item','deliver','wrong-item','world-key','iris','iris'],['place','visit','wrong-place','place',null,null],['npc','talk','wrong-npc','iris',null,null],['event-target','check',undefined,'rune',null,null],['objective-target','check','rune',undefined,null,null],['recipient','deliver','world-key','world-key','other','iris'],['missing-recipient','deliver','world-key','world-key',undefined,undefined],['unresolved','check','rune','rune',null,null]];
  for(const [id,kind,eventTarget,objectiveTarget,recipientId,wantedRecipient] of cases){add(adventure,{id,turn:1,kind,targetId:eventTarget,recipientId,source:'scene_check',success:id==='unresolved'?undefined:true,questId:'recorded-q',objectiveId:'recorded-o',text:'Crown evidence.'});adventure.quests.push({id:`q-${id}`,title:'Crown',objectives:[{id:`o-${id}`,kind,targetId:objectiveTarget,recipientId:wantedRecipient,completed:true,evidenceEventId:id}]});}
  const records=journalMemory(state,adventure,'crown',{}, {limit:10,maxChars:10000});assert.equal(records.length,cases.length);for(const record of records){assert.ok(!record.evidenceLinks,record.id);assert.ok(!record.evidenceEventId,record.id);assert.equal(record.questId,'recorded-q');assert.equal(record.objectiveId,'recorded-o');}
});
test('successful check alternativeFor chains and declared alternative targets retain real linked evidence',()=>{
  const {state,adventure}=setup();adventure.loreDefinitions=[{id:'translation',alternativeFor:'rune'},{id:'transcript',alternativeFor:'translation'}];
  add(adventure,{id:'chain',turn:1,kind:'check',targetId:'transcript',source:'scene_check',success:true,text:'Crown rune translated.'});add(adventure,{id:'declared',turn:2,kind:'check',targetId:'bypass',source:'scene_check',success:true,text:'Crown rune bypass resolved.'});
  adventure.quests=[{id:'q',title:'Crown rune',objectives:[{id:'chain-objective',kind:'check',targetId:'rune',completed:true,evidenceEventId:'chain'},{id:'declared-objective',kind:'check',targetId:'rune',alternativeTargetIds:['bypass'],completed:true,evidenceEventId:'declared'}]}];
  const records=journalMemory(state,adventure,'crown');assert.equal(records.find(e=>e.id==='chain').objectiveId,'chain-objective');assert.equal(records.find(e=>e.id==='declared').objectiveId,'declared-objective');assert.equal(records.find(e=>e.id==='chain').targetId,'transcript');
});
