const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const engine = require('../src/adventure-engine'), discussion = require('../src/adventure-discussion');
const ai = require('../src/ai-bridge'), srd = require('../src/srd-engine'), narration = require('../src/adventure-narration');
const { contextFor, MAX_CHARS } = require('../src/adventure-context');
const dialogue=require('../src/dialogue');
const memory=require('../src/adventure-memory');
let directory, originalGenerate, handler, calls, view;
const world = { title: 'The bridge council', opening: 'Mira arrives at the sheltered bridge.', startLocationId: 'bridge',
  locations: [{ id: 'bridge', name: 'Bridge', description: 'A sheltered bridge.', kind: 'settlement', connectsTo: ['road'] }, { id: 'road', name: 'Road', description: 'An empty road.', kind: 'road', connectsTo: ['bridge'] }],
  npcs: [{ id: 'guide', name: 'Iris', role: 'Guide', personality: 'Cautious and direct.', locationId: 'bridge' }, { id: 'scholar', name: 'Ren', role: 'Scholar', personality: 'Curious and patient.', locationId: 'bridge' }, { id: 'absent', name: 'Far traveller', role: 'Traveller', locationId: 'road' }], items: [], quests: [], checks: [] };
const conversation = () => ({ narration: 'Iris studies the crossing while Ren listens.', lines: [
  { speakerId: 'guide', text: 'Let us inspect the bridge first.', proposal: { actionId: 'inspect', label: 'Inspect the bridge' } },
  { speakerId: 'scholar', text: 'Wait, the marks on the rail may explain its age.', interruptsSpeakerId: 'guide' },
  { speakerId: 'guide', text: 'UNSPOKEN_SECRET_REPLY' }
] });
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-scene-dialogue-'));
  process.env.DND_DATA_DIR = directory; process.env.AI_PROVIDER = 'fallback'; originalGenerate = ai.generateStructured;
  ai.generateStructured = async (type, payload, fallback) => { calls.push({ type, payload }); return type === 'adventure_world' ? structuredClone(world) : handler(type, payload, fallback); };
});
beforeEach(async () => {
  calls = []; handler = (type, payload, fallback) => fallback();
  view = await engine.create({ heroName: 'Mira', worldIdea: 'An original world of ancient bridges', language: 'en' }); calls = [];
});
after(async () => { ai.generateStructured = originalGenerate; await srd.closeSessions(); await fs.rm(directory, { recursive: true, force: true }); });
async function act(command) {
  view = await engine.getView(view.campaign.id);
  view = await engine.perform({ campaignId: view.campaign.id, expectedRevision: view.campaign.revision, operationId: crypto.randomUUID(), command });
}
async function talk() { handler = () => conversation(); await act({ type: 'talk', npcId: 'guide' }); return discussion.status(view.campaign.id); }

test('scene talk uses the narration request, persists the queue and commits only presented lines', async () => {
  const queue = await talk();
  assert.deepEqual(calls.map(c => c.type), ['adventure_narration']);
  assert.deepEqual(calls[0].payload.dialogue.actors.map(a => a.id), ['dm', 'guide', 'scholar']);
  assert.equal(queue.source, 'scene'); assert.equal(queue.sceneId, 'bridge'); assert.equal(queue.spoken[0].speakerId, 'dm'); assert.equal(queue.remaining, 3); assert.equal(queue.proposals.length, 0);
  assert.equal(view.dialogueSummary.spokenCount, 1); assert.equal(view.dialogueSummary.remaining, 3);
  assert.ok(!JSON.stringify(view.messages).includes('Let us inspect')); assert.ok(!JSON.stringify(queue).includes('UNSPOKEN_SECRET_REPLY'));
  let next = await discussion.next(view.campaign.id, queue.id);
  assert.equal(next.spoken.at(-1).speakerName, 'Iris'); assert.equal(next.proposals[0].status, 'offered'); assert.equal(calls.length, 1);
  next = await discussion.next(view.campaign.id, queue.id); assert.equal(next.spoken.at(-1).interruptsSpeakerId, 'guide');
  const loaded = await engine.loaded(view.campaign.id), context = contextFor(loaded.state, loaded.adventure);
  assert.ok(JSON.stringify(context.packet).includes('Let us inspect')); assert.ok(!JSON.stringify(context.packet).includes('UNSPOKEN_SECRET_REPLY')); assert.ok(context.metrics.chars <= MAX_CHARS);
  await srd.closeSessions(); const persisted = await discussion.status(view.campaign.id);
  assert.equal(persisted.id, queue.id); assert.equal(persisted.remaining, 1); assert.equal(persisted.spoken.length, 3);
});

test('player interjection cancels unspoken dialogue and offered actions without taking a rules turn', async () => {
  const queue = await talk(), heard = await discussion.next(view.campaign.id, queue.id), turn = view.campaign.turn;
  const result = await discussion.intervene(view.campaign.id, 'No. Explain what you saw first.', queue.id);
  assert.equal(result.status, 'interrupted'); assert.equal(result.remaining, 0); assert.equal(result.proposals[0].status, 'withdrawn');
  assert.equal(result.spoken.at(-1).speakerId, 'player'); assert.equal(result.spoken.at(-1).speakerName, 'Mira');
  assert.equal((await engine.getView(view.campaign.id)).campaign.turn, turn); assert.ok(!JSON.stringify(result).includes('UNSPOKEN_SECRET_REPLY'));
  await assert.rejects(discussion.decide(view.campaign.id, heard.proposals[0].id, 'accept', queue.id), /закрыто/);
  assert.equal((await discussion.next(view.campaign.id, queue.id)).spoken.length, result.spoken.length); assert.equal(calls.length, 1);
});

test('joined companion voices still require actual local visibility and both death markers',async()=>{
  const {state,adventure:meta}=await engine.loaded(view.campaign.id),hero=state.party.members[0];
  state.party.members.push({...structuredClone(hero),id:'guide',name:'Iris',kind:'ally'});
  assert.ok(narration.scenePacket(state,meta,[]).actors.some(a=>a.id==='guide'));
  const npc=meta.npcs.find(n=>n.id==='guide');npc.hidden=true;assert.ok(!narration.scenePacket(state,meta,[]).actors.some(a=>a.id==='guide'));
  npc.hidden=false;npc.locationId='road';assert.ok(!narration.scenePacket(state,meta,[]).actors.some(a=>a.id==='guide'));
  npc.locationId=meta.currentLocationId;state.party.members.at(-1).deathSaves={dead:true};
  meta.environment={npcStates:[{npcId:'guide',body:{hp:{current:4,max:4},conditions:[],deathSaves:{dead:true}}}]};
  assert.ok(!narration.scenePacket(state,meta,[]).actors.some(a=>a.id==='guide'));
});
test('invalid, absent and human speaker references and guessed actions are rejected before queue installation', async () => {
  const { state, adventure: meta, service } = await engine.loaded(view.campaign.id);
  const packet = narration.scenePacket(state, meta, engine.choices(service, state, meta));
  for (const speakerId of ['absent', 'missing', 'player', state.party.heroId]) assert.throws(() => narration.validateSceneDialogue([{ speakerId, text: 'Invalid actor' }], packet, meta.turn), /Unknown dialogue speaker/);
  assert.throws(() => narration.validateSceneDialogue([{ text: 'Missing actor' }], packet, meta.turn));
  assert.throws(() => narration.validateSceneDialogue([{ speakerId: 'guide', text: 'Wrong action', proposal: { actionId: 'invent-money', label: 'Money' } }], packet, meta.turn), /unavailable action/);
  for (const target of ['absent', 'guide', 'player']) assert.throws(() => narration.validateSceneDialogue([{ speakerId: 'guide', text: 'Interrupt', interruptsSpeakerId: target }], packet, meta.turn), /interruption target/);
  handler = type => type === 'adventure_narration' ? { narration: 'Rejected draft.', lines: [{ speakerId: 'absent', text: 'I should not be here.' }] } : conversation();
  await act({ type: 'talk', npcId: 'guide' });
  assert.deepEqual(calls.map(c => c.type), ['adventure_narration', 'adventure_narration_repair']); assert.match(calls[1].payload.correction.reason, /Unknown dialogue speaker/);
  assert.ok(calls[1].payload.correction.rejectedLines.length <= 2500); assert.equal(view.pendingNarration, false); assert.equal(view.campaign.turn, 2);
  assert.ok(!JSON.stringify(view.messages).includes('I should not be here'));
});

test('failed dialogue correction saves mechanics but no partial dialogue or world developments', async () => {
  handler = () => ({ narration: 'Invalid character speech.', lines: [{ speakerId: 'missing', text: 'Ghost' }], developments: { npcs: [{ id: 'new', name: 'New', role: 'Visitor', locationId: 'bridge' }] } });
  await act({ type: 'talk', npcId: 'guide' });
  assert.equal(calls.length, 2); assert.equal(view.pendingNarration, true); assert.equal(view.dialogueSummary, null); assert.ok(!view.npcs.some(n => n.id === 'new'));
  const turn = view.campaign.turn, familiarity = view.npcs.find(n => n.id === 'guide').familiarity;
  handler = () => conversation(); view = await engine.retryNarration(view.campaign.id);
  assert.equal(view.campaign.turn, turn); assert.equal(view.npcs.find(n => n.id === 'guide').familiarity, familiarity); assert.equal(view.pendingNarration, false); assert.equal(view.dialogueSummary.source, 'scene');
});

test('scene and turn changes prevent stale advance, interjection and proposal acceptance', async () => {
  const queue = await talk(), heard = await discussion.next(view.campaign.id, queue.id);
  handler = () => ({ narration: 'The road is quiet.' }); await act({ type: 'travel', locationId: 'road' });
  assert.equal(view.dialogueSummary.status, 'stale'); assert.equal(view.dialogueSummary.remaining, 0);
  await assert.rejects(discussion.next(view.campaign.id, queue.id), error => error.status === 409);
  await assert.rejects(discussion.intervene(view.campaign.id, 'Old scene', queue.id), error => error.status === 409);
  await assert.rejects(discussion.decide(view.campaign.id, heard.proposals[0].id, 'accept', queue.id), error => error.status === 409);
  assert.equal((await discussion.status(view.campaign.id)).proposals[0].status, 'withdrawn');
});

test('scene identity is checked even when a location changes without a new turn', async () => {
  const queue = await talk(), loaded = await engine.loaded(view.campaign.id);
  loaded.adventure.currentLocationId = 'road'; await engine.save(loaded.service, loaded.state, loaded.adventure, 'test_scene_change');
  await assert.rejects(discussion.next(view.campaign.id, queue.id), error => error.status === 409);
  assert.equal((await discussion.status(view.campaign.id)).status, 'stale');
});

test('an old modal cannot advance or interject into a replacement scene queue', async () => {
  const old = await talk(); await act({ type: 'talk', npcId: 'scholar' }); const replacement = await discussion.status(view.campaign.id);
  assert.notEqual(old.id, replacement.id);
  await assert.rejects(discussion.next(view.campaign.id, old.id), error => error.status === 409);
  await assert.rejects(discussion.intervene(view.campaign.id, 'Old question', old.id), error => error.status === 409);
  assert.equal((await discussion.status(view.campaign.id)).remaining, replacement.remaining);
});

test('accept executes the real action once; reject consumes no turn or action', async () => {
  const queue = await talk(), heard = await discussion.next(view.campaign.id, queue.id), proposal = heard.proposals[0];
  handler = () => ({ narration: 'The inspection is complete.' });
  await discussion.decide(view.campaign.id, proposal.id, 'accept', queue.id);
  const after = await engine.getView(view.campaign.id); assert.equal(after.campaign.turn, 3); assert.equal(after.journal.filter(e => e.kind === 'inspect').length, 1);
  assert.equal((await discussion.status(view.campaign.id)).proposals[0].status, 'accepted');
  await assert.rejects(discussion.decide(view.campaign.id, proposal.id, 'accept', queue.id));
  assert.equal((await engine.getView(view.campaign.id)).journal.filter(e => e.kind === 'inspect').length, 1);
  const fresh = await talk(), offered = await discussion.next(view.campaign.id, fresh.id), turn = view.campaign.turn, callsBefore = calls.length;
  const rejected = await discussion.decide(view.campaign.id, offered.proposals[0].id, 'reject', fresh.id);
  assert.equal(rejected.proposals[0].status, 'rejected'); assert.equal((await engine.getView(view.campaign.id)).campaign.turn, turn); assert.equal(calls.length, callsBefore);
});

test('accepting can create a fresh conversation without losing safety on the consumed proposal', async () => {
  const queue = await talk(), heard = await discussion.next(view.campaign.id, queue.id), proposal = heard.proposals[0];
  const fresh = await discussion.decide(view.campaign.id, proposal.id, 'accept', queue.id);
  assert.notEqual(fresh.id, queue.id); assert.equal(fresh.source, 'scene'); assert.equal(fresh.remaining, 3);
  await assert.rejects(discussion.decide(view.campaign.id, proposal.id, 'accept', queue.id), error => error.status === 409);
  const after = await engine.getView(view.campaign.id); assert.equal(after.campaign.turn, 3); assert.equal(after.journal.filter(e => e.kind === 'inspect').length, 1);
  const decisions=after.journal.filter(e=>e.kind==='dialogue_decision'&&e.proposalId===proposal.id);
  assert.equal(decisions.length,1);assert.equal(decisions[0].decision,'accepted');assert.equal(decisions[0].dialogueId,queue.id);assert.equal(decisions[0].speakerName,'Iris');
  assert.equal(after.messages.filter(message=>message.role==='player'&&message.text.startsWith('I accept the proposal:')).length,1);
});

test('a failure before mechanics leaves the same proposal available and performs no hidden action', async () => {
  const queue = await talk(), heard = await discussion.next(view.campaign.id, queue.id), originalPerform = engine.perform;
  try {
    engine.perform = async () => { throw new Error('Simulated rules rejection before execution'); };
    await assert.rejects(discussion.decide(view.campaign.id, heard.proposals[0].id, 'accept', queue.id), /rules rejection/);
  } finally { engine.perform = originalPerform; }
  const after = await engine.getView(view.campaign.id), restored = await discussion.status(view.campaign.id);
  assert.equal(after.campaign.turn, 2); assert.equal(restored.proposals[0].status, 'offered'); assert.equal(restored.remaining, 2);
  assert.equal(after.journal.filter(event=>event.kind==='dialogue_decision').length,0);
});

test('rejected proposals remain in journal/history and heard memory after another council overwrites the queue',async()=>{
  const queue=await talk(),heard=await discussion.next(view.campaign.id,queue.id),proposal=heard.proposals[0],turn=view.campaign.turn,callsBefore=calls.length;
  await discussion.decide(view.campaign.id,proposal.id,'reject',queue.id);
  await assert.rejects(discussion.decide(view.campaign.id,proposal.id,'reject',queue.id),/закрыто/);
  view=await engine.getView(view.campaign.id);assert.equal(view.campaign.turn,turn);assert.equal(calls.length,callsBefore);
  const decisions=view.journal.filter(event=>event.kind==='dialogue_decision');assert.equal(decisions.length,1);
  assert.equal(decisions[0].decision,'rejected');assert.equal(decisions[0].proposalId,proposal.id);assert.equal(decisions[0].dialogueId,queue.id);assert.equal(decisions[0].speakerId,'guide');assert.equal(decisions[0].speakerName,'Iris');assert.equal(decisions[0].label,proposal.label);
  assert.equal(view.messages.filter(message=>message.role==='player'&&message.text.includes("rejected Iris's proposal")).length,1);
  handler=(type,payload,fallback)=>fallback();const fresh=await discussion.start(view.campaign.id,'Another route');assert.notEqual(fresh.id,queue.id);
  const history=await memory.history(view.campaign.id,{query:'rejected'});assert.equal(history.total,1);assert.equal(history.entries[0].proposalId,proposal.id);assert.equal(history.entries[0].dialogueId,queue.id);
  const loaded=await engine.loaded(view.campaign.id),packet=contextFor(loaded.state,loaded.adventure,'rejected Iris Inspect the bridge').packet;
  assert.ok(JSON.stringify(packet).includes("rejected Iris's proposal"));assert.ok(!JSON.stringify(packet).includes('UNSPOKEN_SECRET_REPLY'));
  await srd.closeSessions();const reopened=await memory.history(view.campaign.id,{query:'rejected'});assert.equal(reopened.total,1);assert.equal(reopened.entries[0].proposalId,proposal.id);
});

test('an unconfirmed returned action cannot claim an accepted decision or add player action messages',async()=>{
  const queue=await talk(),heard=await discussion.next(view.campaign.id,queue.id),originalPerform=engine.perform;
  try{engine.perform=async()=>({ready:true});await assert.rejects(discussion.decide(view.campaign.id,heard.proposals[0].id,'accept',queue.id),/подтвердить/);}
  finally{engine.perform=originalPerform;}
  const after=await engine.getView(view.campaign.id);assert.equal(after.campaign.turn,2);assert.equal(after.journal.filter(event=>event.kind==='dialogue_decision').length,0);
  assert.equal(after.messages.filter(message=>message.role==='player'&&message.text.startsWith('I accept the proposal:')).length,0);assert.equal((await discussion.status(view.campaign.id)).proposals[0].status,'offered');
});

test('batch and actor/context limits apply, and older plain narration and council remain usable', async () => {
  const { state, adventure: meta, service } = await engine.loaded(view.campaign.id), packet = narration.scenePacket(state, meta, engine.choices(service, state, meta));
  assert.throws(() => narration.validateSceneDialogue(Array.from({ length: 6 }, () => ({ speakerId: 'guide', text: 'Too many' })), packet, meta.turn));
  assert.throws(() => narration.validateSceneDialogue([{ speakerId: 'guide', text: 'x'.repeat(651) }], packet, meta.turn));
  const cloned = structuredClone(state); cloned.party.members.push({ ...structuredClone(cloned.party.members[0]), id: 'human-two', kind: 'player' }, { ...structuredClone(cloned.party.members[0]), id: 'ally', kind: 'ally', name: 'Ally' });
  const many = { ...meta, npcs: Array.from({ length: 50 }, (_, i) => ({ id: `npc-${i}`, name: 'N'.repeat(400), role: 'R'.repeat(500), personality: 'P'.repeat(2000), locationId: meta.currentLocationId })) };
  const bounded = narration.scenePacket(cloned, many, Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, label: 'L'.repeat(1000) })));
  assert.equal(bounded.actors.length, 52); assert.equal(bounded.actions.length, 20); assert.ok(bounded.actors.some(a => a.id === 'ally')); assert.ok(!bounded.actors.some(a => a.id === 'human-two')); assert.ok(bounded.actors.some(a=>a.id==='npc-49')); assert.ok(JSON.stringify(bounded).length < 12000);
  handler = () => ({ narration: 'Plain old narration remains supported.' }); await act({ type: 'inspect' }); assert.equal(view.dialogueSummary, null); assert.equal(view.messages.at(-1).text, 'Plain old narration remains supported.');
  handler = (type, payload, fallback) => fallback(); const council = await discussion.start(view.campaign.id, 'Our route'); assert.equal(council.source, 'council'); assert.equal(council.spoken.length, 1);
  assert.equal(calls.at(-1).type, 'adventure_discussion'); assert.ok(JSON.stringify(calls.at(-1).payload.context).length <= MAX_CHARS);
});

test('dead and incapacitated NPC bodies and companions cannot enter a live speaking roster', async () => {
  const loaded=await engine.loaded(view.campaign.id),{state,adventure:meta,service}=loaded;
  meta.environment={npcStates:[{npcId:'guide',body:{hp:{current:0,max:4},conditions:[]}},{npcId:'scholar',body:{hp:{current:4,max:4},conditions:['incapacitated']}}]};
  state.party.members.push({...structuredClone(state.party.members[0]),id:'silent-ally',name:'Silent',kind:'ally',conditions:['unconscious']});
  const actors=narration.scenePacket(state,meta,engine.choices(service,state,meta)).actors;
  assert.deepEqual(actors.map(a=>a.id),['dm']);
  for(const condition of ['dead','unconscious','incapacitated','stunned','paralyzed','petrified']){
    meta.environment.npcStates[0].body={hp:{current:4,max:4},conditions:[condition]};
    assert.ok(!narration.scenePacket(state,meta,[], 'guide').actors.some(a=>a.id==='guide'));
  }
  meta.environment.npcStates[0].body={hp:{current:4,max:4},conditions:[]};meta.npcs.find(n=>n.id==='guide').hidden=true;
  assert.ok(!narration.scenePacket(state,meta,[]).actors.some(a=>a.id==='guide'));
});

test('spent combat actions are absent from council proposals and normal scene proposal validation', async () => {
  handler=(type,payload,fallback)=>fallback();await act({type:'combat',difficulty:'easy'});
  const loaded=await engine.loaded(view.campaign.id),core=await import('../vendor/dnd-core/dist/engine.mjs');
  loaded.state.combat.turnIndex=loaded.state.combat.participants.findIndex(p=>p.kind==='player');
  loaded.state.combat.turnBudget=undefined;loaded.state.combat=core.ensureTurnBudget(loaded.state.combat);
  const available=await engine.publicView(loaded.service,loaded.state,loaded.adventure);
  const attack=available.actions.find(a=>/core:combat\.attack\./.test(a.id));assert.ok(attack,'The actual attack must exist before spending the action.');
  loaded.state.combat.turnBudget.action=false;loaded.state.combat.turnBudget.extraActions=0;
  await engine.save(loaded.service,loaded.state,loaded.adventure,'spent_action_fixture');
  const refreshed=await engine.loaded(view.campaign.id),publicView=await engine.publicView(refreshed.service,refreshed.state,refreshed.adventure);
  assert.equal(publicView.turnBudget.action,false);assert.ok(!publicView.actions.some(a=>a.id===attack.id));
  // The registered raw action is deliberately present, but the canonical public action list is not.
  assert.ok(engine.choices(refreshed.service,refreshed.state,refreshed.adventure).some(a=>a.id===attack.id));
  const packet=narration.scenePacket(refreshed.state,refreshed.adventure,publicView.actions);
  assert.throws(()=>narration.validateSceneDialogue([{speakerId:'dm',text:'Attack now.',proposal:{actionId:attack.id,label:'Attack'}}],packet,refreshed.adventure.turn),/unavailable action/);
  handler=(type,payload)=>{assert.equal(type,'adventure_discussion');assert.ok(!payload.actions.some(a=>a.id===attack.id));return {lines:[{speakerId:'dm',text:'Attack now.',proposal:{actionId:attack.id,label:'Attack'}}]};};
  await assert.rejects(discussion.start(view.campaign.id,'Combat plan'),/unavailable action/);
});

test('older saved council queues expose safe arrays and preserve already heard dialogue', () => {
  const heard={id:'old-line',speakerId:'old-guide',speakerName:'Old guide',text:'A remembered discussion.'};
  const old={id:'old-queue',baseTurn:1,status:'finished',spoken:[heard]};
  const publicQueue=dialogue.publicDialogue(old,1,'bridge');
  assert.deepEqual(publicQueue.actors,[]);assert.deepEqual(publicQueue.proposals,[]);assert.equal(publicQueue.spoken[0].text,heard.text);assert.equal(publicQueue.remaining,0);
  assert.doesNotThrow(()=>publicQueue.actors.find(a=>a.id===heard.speakerId));
  const unvalidated={...old,status:'active',cursor:0,planned:[{speakerId:'unknown',text:'No verified roster.'}]};
  assert.equal(dialogue.nextLine(unvalidated),null);assert.equal(unvalidated.status,'stale');assert.equal(unvalidated.spoken[0].text,heard.text);
});
