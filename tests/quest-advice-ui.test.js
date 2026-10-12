const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
function setup(){
  const elements=new Map(),calls=[],view={ready:true,campaign:{id:'camp-a',revision:8,language:'en'},quests:[{id:'quest-a',status:'active',title:'Return the parcels',objectives:[{id:'step-a',text:'Give three parcels to Iris',completed:false}]}]};
  const context={busy:false,currentView:view,T:String,$:selector=>{if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',open:false,showModal(){this.open=true;},close(){this.open=false;}});return elements.get(selector);},askMaster:async input=>{calls.push(input);return context.answer!==false;},module:{exports:null}};
  const section=source.slice(source.indexOf('let questAdviceDraft='),source.indexOf('function openQuestDecision('));vm.runInNewContext(`${section}\nmodule.exports={openQuestAdvice,submitQuestAdvice};`,context);
  context.$('#playerIntent').value='My unsent in-world action';return {...context.module.exports,context,elements,calls,view};
}
test('opening or cancelling quest advice leaves the action draft and game untouched and makes no model request',()=>{
  const fixture=setup(),before=JSON.stringify(fixture.view);fixture.openQuestAdvice('quest-a','step-a');assert.equal(fixture.elements.get('#questAdvice').open,true);assert.match(fixture.elements.get('#questAdviceInput').value,/Return the parcels/);assert.equal(fixture.context.$('#playerIntent').value,'My unsent in-world action');assert.equal(fixture.calls.length,0);fixture.elements.get('#questAdvice').close();assert.equal(JSON.stringify(fixture.view),before);
});
test('stale campaign, revision or completed objective cannot send advice against another world',async()=>{
  for(const change of [f=>f.view.campaign.id='camp-b',f=>f.view.campaign.revision++,f=>f.view.quests[0].objectives[0].completed=true]){
    const f=setup();f.openQuestAdvice('quest-a','step-a');change(f);assert.equal(await f.submitQuestAdvice(),false);assert.equal(f.calls.length,0);assert.match(f.elements.get('#questAdviceStatus').textContent,/изменилась/);assert.equal(f.elements.get('#questAdvice').open,true);
  }
});
test('explicit advice submission uses the question path once and failed inference retains the editable question',async()=>{
  const f=setup();f.openQuestAdvice('quest-a','step-a');f.elements.get('#questAdviceInput').value='Could I help Iris first?';f.context.answer=false;assert.equal(await f.submitQuestAdvice(),false);assert.equal(f.elements.get('#questAdvice').open,true);assert.equal(f.elements.get('#questAdviceInput').value,'Could I help Iris first?');f.context.answer=true;assert.equal(await f.submitQuestAdvice(),true);assert.deepEqual(f.calls,['Could I help Iris first?','Could I help Iris first?']);assert.equal(f.elements.get('#questAdvice').open,false);assert.equal(await f.submitQuestAdvice(),false);assert.equal(f.context.$('#playerIntent').value,'My unsent in-world action');
});
