const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const social=require('../src/adventure-social');
const encounters=require('../src/npc-encounters');
let core;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Гость',classId:'bard',raceId:'human'});hero.inventory=hero.inventory.filter(i=>i.itemId!=='gold_piece');hero.inventory.push({itemId:'gold_piece',name:'Gold',quantity:30,weight:0,tags:['currency'],description:'Монеты',identified:true,source:'starting'});
  const npc={id:'innkeeper',name:'Хозяин',role:'Обычный хозяин',locationId:'inn',trust:0,disposition:'neutral'};
  return {state:{campaign:{rules:{zeroHpPolicy:'standard5e'}},party:{heroId:'hero',members:[hero]},flags:{},rollLog:[],facts:[]},adventure:{currentLocationId:'inn',locations:[{id:'inn'},{id:'road'}],npcs:[npc],environment:{version:1,props:[],npcStates:[{npcId:npc.id,profile:'civilian',disposition:'neutral',body:encounters.createBody(npc,core)}],consequences:[],appliedPlans:[]},economy:{markets:[{id:'market',merchantId:npc.id,locationId:'inn',cash:7}]}}};
}
function command(overrides={}){return {npcId:'innkeeper',goal:'rapport',approach:'persuasion',statement:'Давайте познакомимся.',...overrides};}
async function run(input,cmd=command(),sourceId='social-one',seed='social-test'){return social.resolve({...input,command:cmd,sourceId,seed});}
async function rolled(input,cmd,success,source='social-one'){
  for(let n=0;n<50;n++){const result=await run(input,cmd,source,`social-${n}`);if(result.ok&&result.outcome.success===success)return result;}
  assert.fail(`no social roll with success=${success}`);
}
function gold(state){return state.party.members[0].inventory.filter(i=>i.itemId==='gold_piece').reduce((sum,i)=>sum+i.quantity,0);}
function harmed(input,{damage=3,healed=false,broken=true}={}){
  input.adventure.npcs[0].trust=-20;input.adventure.npcs[0].disposition='hostile';const record=input.adventure.environment.npcStates[0];record.disposition='hostile';record.body.hp={current:healed?11:11-damage,max:11,temp:0};record.profile='guard';
  input.adventure.environment.consequences.push({id:'injury-one',sourceId:'attack-one',targetId:'innkeeper',kind:'attempted_aggression',damage});
  if(broken)input.adventure.environment.props.push({id:'vessel',name:'Кружка',ownerNpcId:'innkeeper',material:'ceramic',condition:'broken',locationId:'inn'});
  return input;
}
test('rapport resolves a real CHA check with consumed inspiration/effects, pure inputs, claimed statement and no invented facts',async()=>{
  const input=fixture();input.state.party.members[0].bardicInspirationDie='1d6';input.state.party.members[0].activeEffects=[{id:'speech-nudge',label:'Уверенность',abilityCheckBonus:'1d4',expiresOnAbilityCheck:true}];const original=structuredClone(input),result=await rolled(input,command(),true);
  assert.equal(result.ok,true);assert.deepEqual(input,original);assert.equal(result.outcome.check.ability,'cha');assert.equal(result.outcome.check.skill,'persuasion');assert.ok(result.outcome.check.dc>=10&&result.outcome.check.dc<=22);
  assert.equal(result.state.party.members[0].bardicInspirationDie,undefined);assert.equal(result.state.party.members[0].activeEffects,undefined);assert.ok(result.state.rollLog.length>=3);assert.equal(result.adventure.npcs[0].trust,2);assert.equal(result.outcome.elapsedSeconds,60);
  assert.deepEqual(result.state.facts,[]);assert.deepEqual(result.outcome.facts,[]);assert.equal(result.outcome.statement.verified,false);assert.equal(result.outcome.statement.provenance,'player_claim');
  const replay=await run(result,command(),'social-one');assert.equal(replay.outcome.replayed,true);assert.deepEqual(replay.state,result.state);assert.deepEqual(replay.adventure,result.adventure);
});
test('failed same approach locks across new wording, own trust change and NPC renaming while distinct approaches get one attempt',async()=>{
  const failed=await rolled(fixture(),command(),false);assert.equal(failed.adventure.npcs[0].trust,-1);failed.adventure.npcs[0].name='Новое имя';
  const retry=await run(failed,command({statement:'Совсем другие слова!'}),'new-source');assert.equal(retry.refusal.code,'social_attempt_locked');assert.deepEqual(retry.state,failed.state);
  const alternative=await run(failed,command({approach:'deception'}),'other-method');assert.equal(alternative.ok,true);assert.equal(alternative.adventure.social.attempts.length,2);
});
test('rapport success cannot be farmed by cycling approaches; intimidation never creates affection or rapport',async()=>{
  const first=await rolled(fixture(),command(),true);const repeated=await run(first,command({approach:'deception'}),'other-rapport');assert.equal(repeated.refusal.code,'rapport_already_established');
  assert.equal((await run(fixture(),command({approach:'intimidation'}))).refusal.code,'intimidation_not_rapport');
  const hostile=fixture();hostile.adventure.npcs[0].disposition='hostile';hostile.adventure.environment.npcStates[0].disposition='hostile';
  const intimidated=await rolled(hostile,command({goal:'deescalate',approach:'intimidation'}),true);assert.equal(intimidated.adventure.npcs[0].trust,-2);assert.equal(intimidated.adventure.npcs[0].disposition,'neutral');assert.equal(intimidated.adventure.environment.npcStates[0].disposition,'neutral');assert.equal(intimidated.adventure.npcs[0].socialCompliance.kind,'keep_distance');
});
test('serious outstanding bodily aggression requires real restitution, then an independent check preserves wounds and broken props',async()=>{
  const input=harmed(fixture()),before=structuredClone(input),status=social.publicStatus(input.adventure,'innkeeper');assert.equal(status.dueCoins,17);assert.equal(status.serious,true);
  const refused=await run(input,command({goal:'deescalate'}));assert.equal(refused.refusal.code,'restitution_required');assert.deepEqual(input,before);assert.equal(gold(refused.state),30);
  const paid=await run(input,command({goal:'deescalate',approach:'restitution',coins:17}),'payment');assert.equal(paid.ok,true);assert.equal(gold(paid.state),13);assert.equal(paid.adventure.npcs[0].receivedCoins,17);assert.equal(paid.adventure.economy.markets[0].cash,24);assert.equal(paid.adventure.npcs[0].disposition,'hostile');assert.equal(paid.state.rollLog.length,0);
  assert.equal(social.publicStatus(paid.adventure,'innkeeper').dueCoins,0);assert.equal(paid.adventure.environment.props[0].condition,'broken');assert.equal(paid.adventure.environment.npcStates[0].body.hp.current,8);
  const reconciled=await rolled(paid,command({goal:'deescalate'}),true,'speech-after-payment');assert.equal(reconciled.adventure.npcs[0].disposition,'neutral');assert.equal(reconciled.adventure.environment.npcStates[0].disposition,'neutral');assert.equal(reconciled.adventure.environment.npcStates[0].body.hp.current,8);assert.equal(reconciled.adventure.environment.props[0].condition,'broken');
  assert.equal((await run(paid,command({goal:'deescalate',approach:'restitution',coins:17}),'double-payment')).refusal.code,'nothing_to_restitute');
});
test('healing does not erase unpaid recorded injury and fixed mundane property values cap the payable total at twenty',async()=>{
  const input=harmed(fixture(),{damage:3,healed:true,broken:false});assert.equal(social.publicStatus(input.adventure,'innkeeper').dueCoins,15);
  assert.equal((await run(input,command({goal:'deescalate'}))).refusal.code,'restitution_required');
  input.adventure.environment.props.push(...Object.entries({ceramic:2,glass:2,wood:2,metal:5,stone:1,cloth:1}).map(([material])=>({id:material,material,condition:'broken',ownerNpcId:'innkeeper',locationId:'inn'})));
  assert.equal(social.publicStatus(input.adventure,'innkeeper').dueCoins,20);
  const paid=await run(input,command({goal:'deescalate',approach:'restitution',coins:20}));assert.equal(paid.ok,true);assert.equal(social.publicStatus(paid.adventure,'innkeeper').dueCoins,0);assert.equal(paid.adventure.environment.consequences[0].socialSettled,true);
});
test('wrong, excess, invented or unaffordable payments and absent harm refuse with no money mint or mutation',async()=>{
  const input=harmed(fixture(),{damage:1,broken:false});
  for(const coins of [4,6,20]){const result=await run(input,command({goal:'deescalate',approach:'restitution',coins}));assert.equal(result.refusal.code,'incorrect_restitution');assert.deepEqual(result.state,input.state);assert.deepEqual(result.adventure,input.adventure);}
  const poor=harmed(fixture());poor.state.party.members[0].inventory=poor.state.party.members[0].inventory.filter(i=>i.itemId!=='gold_piece');assert.equal((await run(poor,command({goal:'deescalate',approach:'restitution',coins:17}))).refusal.code,'not_enough_coins');
  assert.equal((await run(fixture(),command({approach:'restitution',coins:2}))).refusal.code,'nothing_to_restitute');
  assert.equal((await run(fixture(),{...command(),dc:1,trust:100})).refusal.code,'invalid_social_command');
});
test('combat, remote/hidden/dead/unaware target and incapable hero are guarded before rolls or payments',async()=>{
  const busy=fixture();busy.state.combat={id:'combat'};assert.equal((await run(busy)).refusal.code,'social_in_combat');
  for(const condition of ['dead','unconscious','petrified','captured','fled']){const input=fixture();input.adventure.environment.npcStates[0].body.conditions.push(condition);if(condition==='dead')input.adventure.environment.npcStates[0].body.hp.current=0;assert.equal((await run(input)).refusal.code,'npc_unavailable');assert.equal(social.publicStatus(input.adventure,'innkeeper').available,false);}
  for(const condition of ['stunned','possessed','captured','fled']){const input=fixture();input.state.party.members[0].conditions.push(condition);assert.equal((await run(input)).refusal.code,'hero_unavailable');}
  const remote=fixture();remote.adventure.npcs[0].locationId='road';assert.equal((await run(remote)).refusal.code,'npc_absent');const hidden=fixture();hidden.adventure.npcs[0].hidden=true;assert.equal((await run(hidden)).refusal.code,'npc_absent');
});
test('new actual aggression opens a changed physical epoch without allowing statement or attitude cycling alone',async()=>{
  const first=await rolled(fixture(),command(),false);first.adventure.environment.consequences.push({id:'new-aggression',sourceId:'new-attack',targetId:'innkeeper',damage:0,kind:'attempted_aggression'});
  const next=await run(first,command(),'new-epoch');assert.equal(next.ok,true);assert.equal(next.adventure.social.attempts.length,2);
  const status=social.publicStatus(next.adventure,'innkeeper');assert.equal(typeof status.dueCoins,'number');assert.equal(typeof status.serious,'boolean');assert.equal(status.lastOutcome.approach,'persuasion');assert.ok(status.lastOutcome.check);assert.ok(next.adventure.social.attempts.length<=200);assert.ok(next.adventure.social.history.length<=200);
});
test('compact NPC attempt locks survive bounded history rotation and a real delivered item changes the physical relationship epoch',async()=>{
  const rotate=adventure=>{const others=Array.from({length:205},(_,i)=>({sourceId:`unrelated-${i}`,npcId:'other-person',goal:'rapport',approach:'persuasion',success:false,key:`other-${i}`}));adventure.social.attempts=[...adventure.social.attempts,...others].slice(-200);adventure.social.history=[...adventure.social.history,...others].slice(-200);};
  const failed=await rolled(fixture(),command(),false);rotate(failed.adventure);
  assert.equal((await run(failed,command(),'after-pruning')).refusal.code,'social_attempt_locked');
  failed.adventure.npcs[0].receivedItems=[{eventId:'real-delivery',item:{itemId:'lost-key',quantity:1}}];const allowed=await run(failed,command(),'after-delivery');assert.equal(allowed.ok,true);assert.ok(allowed.adventure.npcs[0].socialEpisode.attemptedMethods.length<=8);
  const succeeded=await rolled(fixture(),command(),true);rotate(succeeded.adventure);assert.equal((await run(succeeded,command({approach:'deception'}),'after-success-pruning')).refusal.code,'rapport_already_established');
  const hostile=fixture();hostile.adventure.npcs[0].disposition='hostile';hostile.adventure.environment.npcStates[0].disposition='hostile';const deescalated=await rolled(hostile,command({goal:'deescalate'}),true);rotate(deescalated.adventure);
  assert.equal((await run(deescalated,command({goal:'deescalate',approach:'deception'}),'neutral-farming')).refusal.code,'no_conflict');
});
test('neutral deescalation cannot farm trust through unused speech approaches',async()=>{
  for(const approach of ['persuasion','deception','intimidation']){const input=fixture(),result=await run(input,command({goal:'deescalate',approach}));assert.equal(result.refusal.code,'no_conflict');assert.deepEqual(result.state,input.state);assert.deepEqual(result.adventure,input.adventure);}
});
test('monotonic real injury debt survives healing and bills later ordinary combat damage once without adding duplicate consequence damage',async()=>{
  const input=harmed(fixture(),{damage:3,broken:false}),record=input.adventure.environment.npcStates[0];record.injuryHpTotal=3;
  const paid=await run(input,command({goal:'deescalate',approach:'restitution',coins:15}),'first-payment');assert.equal(paid.ok,true);assert.equal(paid.adventure.environment.npcStates[0].socialPaidInjuryHp,3);
  const next=structuredClone(paid),nextRecord=next.adventure.environment.npcStates[0];nextRecord.body.hp.current=11;assert.equal(social.publicStatus(next.adventure,'innkeeper').dueCoins,0);
  nextRecord.body.hp.current=9;nextRecord.injuryHpTotal=5;assert.equal(social.publicStatus(next.adventure,'innkeeper').dueCoins,10);
  next.adventure.environment.consequences.push({id:'second-hit',sourceId:'second-combat',targetId:'innkeeper',damage:4,hpDamage:2});assert.equal(social.publicStatus(next.adventure,'innkeeper').dueCoins,10,'same two HP damage is not added twice');
  const again=await run(next,command({goal:'deescalate',approach:'restitution',coins:10}),'second-payment');assert.equal(again.ok,true);assert.equal(gold(again.state),5);assert.equal(again.adventure.npcs[0].receivedCoins,25);assert.equal(again.adventure.environment.npcStates[0].socialPaidInjuryHp,5);assert.equal(social.publicStatus(again.adventure,'innkeeper').dueCoins,0);
  const temporary=fixture();temporary.adventure.environment.consequences.push({id:'temp-only',sourceId:'temp-hit',targetId:'innkeeper',damage:3,hpDamage:0});assert.equal(social.publicStatus(temporary.adventure,'innkeeper').dueCoins,0);
});
test('explicit compensation acknowledgment pays a real local broken unowned prop once without inventing historical ownership',async()=>{
  const input=fixture();input.adventure.environment.props.push({id:'unknown-cup',name:'Разбитая чашка',material:'ceramic',condition:'broken',locationId:'inn',visibility:'visible',ownerNpcId:undefined});
  const status=social.publicStatus(input.adventure,'innkeeper');assert.equal(status.dueCoins,0);assert.deepEqual(status.claimableDamage,[{propId:'unknown-cup',name:'Разбитая чашка',coins:2}]);
  assert.equal((await run(input,command({goal:'deescalate',approach:'restitution',coins:2}))).refusal.code,'nothing_to_restitute');
  const selected=command({goal:'deescalate',approach:'restitution',coins:2,propIds:['unknown-cup']}),result=await run(input,selected,'acknowledged-payment');assert.equal(result.ok,true);assert.equal(gold(result.state),28);assert.equal(result.adventure.npcs[0].receivedCoins,2);
  const prop=result.adventure.environment.props[0];assert.equal(prop.ownerNpcId,undefined);assert.equal(prop.condition,'broken');assert.deepEqual(prop.restitutionClaim,{npcId:'innkeeper',sourceId:'acknowledged-payment',playerAcknowledged:true});assert.equal(prop.restitutionPaid.coins,2);assert.equal(result.outcome.acknowledgedDamage[0].historicalOwnership,'unverified');assert.equal(result.outcome.facts.length,0);
  assert.equal(social.publicStatus(result.adventure,'innkeeper').claimableDamage.length,0);const replay=await run(result,selected,'acknowledged-payment');assert.equal(replay.outcome.replayed,true);assert.equal(gold(replay.state),28);
  result.adventure.npcs.push({id:'other',name:'Другой человек',locationId:'inn',trust:0,disposition:'neutral'});const other=await run(result,{...selected,npcId:'other'},'other-recipient');assert.equal(other.refusal.code,'damage_already_settled');assert.equal(gold(other.state),28);
});
test('invalid acknowledged property claims refuse atomically and cannot attach to speech or overpay',async()=>{
  for(const [change,code] of [[{locationId:'road'},'invalid_damage_claim'],[{condition:'intact'},'invalid_damage_claim'],[{visibility:'hidden'},'invalid_damage_claim'],[{ownerNpcId:'another-person'},'damage_wrong_owner'],[{restitutionPaid:{npcId:'innkeeper',sourceId:'old'}},'damage_already_settled']]){
    const input=fixture();input.adventure.environment.props.push({id:'broken',name:'Вещь',material:'wood',condition:'broken',locationId:'inn',visibility:'visible',...change});const original=structuredClone(input),result=await run(input,command({goal:'deescalate',approach:'restitution',coins:2,propIds:['broken']}));assert.equal(result.refusal.code,code);assert.deepEqual(input,original);assert.deepEqual(result.adventure,input.adventure);assert.equal(gold(result.state),30);
  }
  const input=fixture();input.adventure.environment.props.push({id:'broken',name:'Вещь',material:'ceramic',condition:'broken',locationId:'inn',visibility:'visible'});
  assert.equal((await run(input,command({propIds:['broken']}))).refusal.code,'unexpected_damage_claim');assert.equal((await run(input,command({goal:'deescalate',approach:'restitution',coins:2,propIds:['broken','broken']}))).refusal.code,'duplicate_damage_claim');
  assert.equal((await run(input,command({goal:'deescalate',approach:'restitution',coins:3,propIds:['broken']}))).refusal.code,'incorrect_restitution');assert.equal(input.adventure.environment.props[0].restitutionClaim,undefined);
  const missing=await run(input,command({goal:'deescalate',approach:'restitution',coins:2,propIds:['missing']}));assert.equal(missing.refusal.code,'invalid_damage_claim');
});
test('selected unowned damage combines with known owner/wound liability without doublecharging and public candidates are bounded',async()=>{
  const input=harmed(fixture(),{damage:2});input.adventure.environment.props.push({id:'unknown-metal',name:'Разбитая металлическая вещь',material:'metal',condition:'broken',locationId:'inn',visibility:'visible'},...Array.from({length:5},(_,i)=>({id:`candidate-${i}`,name:'Ткань',material:'cloth',condition:'broken',locationId:'inn',visibility:'visible'})));
  assert.equal(social.publicStatus(input.adventure,'innkeeper').claimableDamage.length,3);assert.equal(social.publicStatus(input.adventure,'innkeeper').dueCoins,12);
  const paid=await run(input,command({goal:'deescalate',approach:'restitution',coins:17,propIds:['unknown-metal','vessel']}));assert.equal(paid.ok,true);assert.equal(gold(paid.state),13);assert.equal(paid.adventure.npcs[0].receivedCoins,17);assert.equal(paid.adventure.environment.props.find(p=>p.id==='unknown-metal').ownerNpcId,undefined);assert.equal(paid.adventure.environment.props.find(p=>p.id==='vessel').ownerNpcId,'innkeeper');assert.equal(paid.adventure.environment.props.find(p=>p.id==='candidate-0').restitutionPaid,undefined);
});
