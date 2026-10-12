const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const memory=require('../src/adventure-memory'),engine=require('../src/adventure-engine'),model=require('../src/adventure-model'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge');

function fixture(ids=['proof']) {
  return {revision:7,quests:[{id:'quest-a',status:'completed',objectives:ids.map(id=>({completed:true,evidenceEventId:id}))}],journal:[],events:[],archive:[]};
}
function read(adventure){return memory.questHistoryRecords(adventure,'quest-a','campaign-a');}
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}

test('old exact evidence survives six hundred newer entries and the full journal wins conflicting retained events',()=>{
  const adventure=fixture();
  adventure.journal=[...Array.from({length:600},(_,i)=>({id:`road-${i}`,turn:601-i,kind:'story',targetId:'quest-a',text:'A road, not evidence.'})),{id:'proof',turn:1,kind:'deliver',targetId:'locket',text:'The actual locket was handed to Rae.'}];
  adventure.events=[{id:'proof',turn:1,kind:'deliver',targetId:'locket',text:'The actual locket was handed to Rae.',source:'quest_delivery',confidence:'confirmed',success:true,rawPrompt:'secret',usage:{tokens:999}},{id:'proof',turn:99,kind:'story',text:'Conflicting substitute'}];
  const before=JSON.stringify(adventure),result=read(freeze(adventure));
  assert.deepEqual(result,{campaignId:'campaign-a',revision:7,questId:'quest-a',offset:0,entries:[{id:'proof',turn:1,kind:'deliver',text:'The actual locket was handed to Rae.',source:'quest_delivery',confidence:'confirmed',success:true}],missingEvidenceIds:[],total:1,nextOffset:null});
  assert.equal(JSON.stringify(adventure),before);assert.ok(!JSON.stringify(result).includes('secret'));
});

test('journal text and provenance cannot be overwritten by conflicting event classifications or world claims',()=>{
  const adventure=fixture(['note','conflict','legacy']);
  adventure.journal=[{id:'note',turn:3,kind:'player_note',text:'I claim the dragon died.',source:'player_note',confidence:'unverified'},{id:'conflict',turn:2,kind:'talk',targetId:'rae',text:'Rae said the dragon may be dead.'},{id:'legacy',turn:1,kind:'check',text:'An old check record.'},{id:'unlinked',turn:4,kind:'story',targetId:'quest-a',text:'Quest quest-a was completed.'}];
  adventure.events=[{id:'note',turn:3,kind:'player_note',text:'I claim the dragon died.',source:'resolved_event',confidence:'confirmed'},{id:'conflict',turn:2,kind:'victory',targetId:'dragon',text:'The dragon is definitely dead.',source:'resolved_event',success:true}];
  const entries=read(adventure).entries;
  assert.deepEqual(entries.map(e=>e.id),['legacy','conflict','note']);
  assert.equal(entries[2].source,'player_note');assert.equal(entries[2].confidence,'unverified');assert.equal(entries[1].kind,'talk');assert.ok(!Object.hasOwn(entries[1],'success'));assert.ok(!Object.hasOwn(entries[0],'confidence'));
});

test('only exact quest lifecycle associations join linked evidence, in chronological order',()=>{
  const adventure=fixture();
  adventure.journal=[{id:'foreign',turn:9,kind:'quest_reward',targetId:'quest-b',text:'quest-a mentioned in prose.'},{id:'reward',turn:8,kind:'quest_reward',targetId:'quest-a',text:'Reward paid.'},{id:'failure',turn:6,kind:'quest_failed',questId:'quest-a',targetId:'rae',text:'Deadline missed.',success:false},{id:'proof',turn:5,kind:'check',text:'Real failed roll.',success:false},{id:'accept',turn:2,kind:'quest_accept',targetId:'quest-a',text:'Accepted.'},{id:'not-lifecycle',turn:1,kind:'story',questId:'quest-a',text:'Unlinked story.'}];
  const result=read(adventure);
  assert.deepEqual(result.entries.map(e=>e.id),['accept','proof','failure','reward']);assert.equal(result.entries[1].success,false);assert.equal(result.entries[2].success,false);
});

test('matching events supply explicit questId on journal stubs, but conflicting foreign records do not',()=>{
  const adventure=fixture([]);
  adventure.journal=[{id:'yes',turn:1,kind:'quest_failed',targetId:'rae',text:'Failed.'},{id:'no',turn:2,kind:'quest_reward',targetId:'quest-b',text:'Foreign reward.'}];
  adventure.events=[{id:'yes',turn:1,kind:'quest_failed',targetId:'rae',questId:'quest-a',text:'Failed.',success:false},{id:'no',turn:2,kind:'quest_reward',targetId:'quest-a',text:'Foreign reward.'}];
  assert.deepEqual(read(adventure).entries.map(e=>e.id),['yes']);
});

test('archived event and retained event exact IDs are recoverable; absent legacy evidence is explicitly missing',()=>{
  const adventure=fixture(['archived','retained','missing-legacy','missing-legacy',null]);
  adventure.archive=[{id:'archived',turn:1,kind:'talk',text:'An archived conversation.',source:'reported_information'},{id:'unlinked-message',turn:2,role:'dm',text:'Quest completion mentioned.'}];
  adventure.events=[{id:'retained',turn:3,kind:'acquire',text:'An actual item was acquired.'}];
  const before=JSON.stringify(adventure),result=read(adventure);
  assert.deepEqual(result.entries.map(e=>e.id),['archived','retained']);assert.deepEqual(result.missingEvidenceIds,['missing-legacy']);assert.equal(JSON.stringify(adventure),before);assert.equal(adventure.quests[0].status,'completed');
});

test('bounded pages retain all five evidence identities and every lifecycle record without payload blobs',()=>{
  const adventure=fixture(Array.from({length:5},(_,i)=>`proof-${i}`));
  adventure.journal=[...Array.from({length:100},(_,i)=>({id:`reward-${i}`,turn:100+i,kind:'quest_reward',targetId:'quest-a',text:'Reward details '.repeat(150),body:{secret:'hidden'},usage:{model:'private'}})),...Array.from({length:5},(_,i)=>({id:`proof-${i}`,turn:i,kind:'check',text:'\u0000'.repeat(1000),source:'resolved_event',confidence:'confirmed',success:i%2===0}))];
  const before=JSON.stringify(adventure),result=read(adventure);
  assert.equal(result.entries.length,13);assert.deepEqual(result.entries.slice(0,5).map(e=>e.id),Array.from({length:5},(_,i)=>`proof-${i}`));
  assert.deepEqual(result.entries.slice(5).map(e=>e.id),Array.from({length:8},(_,i)=>`reward-${i}`));assert.deepEqual(result.missingEvidenceIds,[]);assert.equal(result.total,105);assert.equal(result.nextOffset,13);
  const ids=result.entries.map(e=>e.id);let offset=result.nextOffset;
  while(offset!==null){const page=memory.questHistoryRecords(adventure,'quest-a','campaign-a',{offset});assert.ok(page.entries.length<=13);assert.ok(JSON.stringify(page).length<=memory.MAX_QUEST_HISTORY_CHARS);ids.push(...page.entries.map(e=>e.id));offset=page.nextOffset;}
  assert.deepEqual(ids,[...Array.from({length:5},(_,i)=>`proof-${i}`),...Array.from({length:100},(_,i)=>`reward-${i}`)]);
  assert.ok(JSON.stringify(result).length<=memory.MAX_QUEST_HISTORY_CHARS);assert.ok(result.entries.every(e=>e.text.length<=1000));assert.ok(result.entries.some(e=>e.textTruncated));
  for(const entry of result.entries)assert.ok(adventure.journal.find(e=>e.id===entry.id).text.startsWith(entry.text));
  assert.ok(!JSON.stringify(result).includes('private'));assert.ok(!JSON.stringify(result).includes('hidden'));assert.equal(JSON.stringify(adventure),before);
});

test('hostile legacy metadata cannot expand the response budget or export object-valued internals',()=>{
  const adventure=fixture(['proof']);
  adventure.journal=[{id:'proof',turn:1,kind:'check',text:'Preserved text.',source:'\u0000'.repeat(10000),confidence:{rawPrompt:'private'},success:'true',payload:{secret:'private'}}];
  const result=read(adventure);
  assert.deepEqual(result.entries,[{id:'proof',turn:1,kind:'check',text:'Preserved text.'}]);assert.ok(JSON.stringify(result).length<=memory.MAX_QUEST_HISTORY_CHARS);
});

let directory,server,url,campaignId,questId,proofId,originalGenerate,calls=0;
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-quest-history-'));process.env.DND_DATA_DIR=path.join(directory,'data');process.env.CHATGPT_AUTH_DIR=path.join(directory,'auth');process.env.AI_PROVIDER='fallback';
  originalGenerate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>fallback();
  const view=await engine.create({heroName:'Mira',worldIdea:'Islands of stories'});campaignId=view.campaign.id;
  const {service,state,adventure}=await engine.loaded(campaignId);const quest=adventure.quests[0];questId=quest.id;
  const proof=model.addEvent(adventure,'deliver','locket','The old locket was actually delivered.',{recipientId:'guide',questId,source:'quest_delivery',success:true});proofId=proof.id;
  quest.objectives[0].completed=true;quest.objectives[0].evidenceEventId=proofId;
  model.addEvent(adventure,'quest_accept',questId,'Quest accepted.');
  for(let turn=2;turn<603;turn++){adventure.turn=turn;model.addEvent(adventure,'story','start',`Road ${turn}`);}
  await engine.save(service,state,adventure,'quest_history_fixture');
  await engine.loaded(campaignId);
  ai.generateStructured=async()=>{calls++;throw new Error('History cannot call the model');};
  server=await require('../src/server').createAlphaServer({port:0});url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{ai.generateStructured=originalGenerate;if(server)await new Promise(resolve=>server.close(resolve));await srd.closeSessions();if(directory)await fs.rm(directory,{recursive:true,force:true});});
const route=()=>`/api/adventure/quest-history?campaignId=${encodeURIComponent(campaignId)}&questId=${encodeURIComponent(questId)}`;

test('native store reopen and read-only HTTP recover evidence outside public last100 without changing game or calling AI',async()=>{
  const loaded=await engine.loaded(campaignId),before=JSON.stringify(loaded.state),fullBefore=JSON.stringify(loaded.adventure);
  assert.ok(!loaded.adventure.journal.slice(0,100).some(e=>e.id===proofId));
  let writes=0;const save=loaded.service.store.saveGameState;loaded.service.store.saveGameState=async()=>{writes++;throw new Error('Read-only endpoint wrote state');};
  try {
    const expected=await memory.questHistory(campaignId,questId),response=await fetch(url+route());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),expected);assert.equal(expected.entries.find(e=>e.id===proofId).source,'quest_delivery');assert.equal(writes,0);
  } finally {loaded.service.store.saveGameState=save;}
  assert.equal(JSON.stringify((await engine.loaded(campaignId)).state),before);assert.equal(JSON.stringify((await engine.loaded(campaignId)).adventure),fullBefore);
  await srd.closeSessions();const reopened=await memory.questHistory(campaignId,questId);assert.ok(reopened.entries.some(e=>e.id===proofId&&e.success===true));assert.equal(calls,0);
});

test('HTTP requires explicit bounded IDs, rejects foreign quest and preserves existing full history API',async()=>{
  for(const suffix of ['','?campaignId='+campaignId,'?campaignId='+campaignId+'&questId='+('x'.repeat(121))])assert.equal((await fetch(url+'/api/adventure/quest-history'+suffix)).status,400);
  assert.equal((await fetch(url+`/api/adventure/quest-history?campaignId=${campaignId}&questId=unknown`)).status,404);
  assert.equal((await fetch(url+`/api/adventure/quest-history?campaignId=unknown&questId=${questId}`)).status,404);
  const ordinary=await fetch(url+`/api/adventure/history?campaignId=${campaignId}&query=old%20locket`).then(r=>r.json());assert.equal(ordinary.total,1);assert.equal(ordinary.entries[0].id,proofId);assert.equal(calls,0);
  const page=await fetch(url+route()+'&offset=1&limit=1').then(r=>r.json());assert.deepEqual(page,await memory.questHistory(campaignId,questId,{offset:1,limit:1}));assert.equal(page.offset,1);assert.equal(page.entries.length,1);assert.equal(page.nextOffset,null);
  for(const suffix of ['&offset=-1','&offset=0.5','&limit=0','&limit=14'])assert.equal((await fetch(url+route()+suffix)).status,400);
  assert.equal((await fetch(url+'/quest-ui.js')).status,200);
});

test('quest-history uses the same HTTP serialization queue as existing history reads',async()=>{
  const oldHistory=memory.history,oldQuestHistory=memory.questHistory;
  let started,release;const entered=new Promise(resolve=>{started=resolve;});const gate=new Promise(resolve=>{release=resolve;});let questEntered=false;
  memory.history=async(...args)=>{started();await gate;return oldHistory(...args);};
  memory.questHistory=async(...args)=>{questEntered=true;return oldQuestHistory(...args);};
  let first,second;
  try {
    first=fetch(url+`/api/adventure/history?campaignId=${campaignId}`);await entered;
    second=fetch(url+route());await new Promise(resolve=>setTimeout(resolve,30));assert.equal(questEntered,false);
    release();assert.equal((await first).status,200);assert.equal((await second).status,200);assert.equal(questEntered,true);
  }finally{release();await Promise.allSettled([first,second]);memory.history=oldHistory;memory.questHistory=oldQuestHistory;}
});
