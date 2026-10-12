const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const loader=source.slice(source.indexOf('async function loadQuestHistory()'),source.indexOf('function renderJournal(view)'));
function fixture(){
  let resolve;const pending=new Promise(done=>{resolve=done;});let renders=0;
  const context={currentView:{ready:true,campaign:{id:'camp-a',revision:4}},questState:{selectedId:'quest-a'},questHistory:null,questHistoryRequest:0,request:()=>pending,renderQuests:()=>{renders++;},module:{exports:null}};
  vm.runInNewContext(`${loader}\nmodule.exports=loadQuestHistory;`,context);
  return {context,run:context.module.exports,resolve,get renders(){return renders;}};
}
const reply={campaignId:'camp-a',revision:4,questId:'quest-a',entries:[{id:'receipt',text:'A real recorded event.'}],missingEvidenceIds:[]};
test('a completed read applies only the exact selected campaign/revision/quest without initiating game operations',async()=>{
  const f=fixture(),job=f.run();assert.equal(f.context.questHistory.status,'loading');f.resolve(reply);await job;assert.equal(f.context.questHistory.status,'ready');assert.equal(f.context.questHistory.data,reply);assert.equal(f.renders,2);assert.equal(f.context.currentView.campaign.revision,4);
});
test('late evidence responses cannot reappear after selection, campaign, revision or an empty view changes',async()=>{
  for(const mutate of [f=>{f.context.questState.selectedId='quest-b';},f=>{f.context.currentView.campaign.id='camp-b';},f=>{f.context.currentView.campaign.revision=5;},f=>{f.context.currentView={ready:false};},f=>{f.context.currentView=null;}]){
    const f=fixture(),job=f.run();mutate(f);f.context.questHistory=null;f.resolve(reply);await job;assert.equal(f.context.questHistory,null);assert.equal(f.renders,1);
  }
});
test('a mismatched server stamp produces a visible retry state and never attaches foreign proof',async()=>{
  for(const response of [{...reply,questId:'quest-b'},{...reply,campaignId:'camp-b'},{...reply,revision:5}]){
    const f=fixture(),job=f.run();f.resolve(response);await job;assert.equal(f.context.questHistory.status,'error');assert.equal(f.context.questHistory.data,undefined);assert.equal(f.context.currentView.campaign.revision,4);
  }
});
