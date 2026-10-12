const {test}=require('node:test');
const assert=require('node:assert/strict');
const ai=require('../src/ai-bridge'),meter=require('../src/adventure-usage');
test('last request records selected character counts separately from actual provider tokens without another inference',async()=>{
  const originalConfig=ai.getAiConfig,originalGenerate=ai.generateStructured;let usage=null,calls=0;const adventure={},context={pastEvents:[{id:'e',source:'resolved_event',confidence:'confirmed',text:'A saved outcome.'}],recollections:[{id:'m',role:'player',text:'A claim.'}]},before=structuredClone(context);
  ai.getAiConfig=()=>({usage});ai.generateStructured=async()=>{calls++;usage={inputTokens:987,outputTokens:42,cachedTokens:100,model:'fixture',reportedByProvider:true};return {narration:'A reply.'};};
  try{await meter.generate(adventure,'master_question',{context,instruction:'Review history.'},()=>({}));assert.equal(calls,1);assert.equal(adventure.usage.last.contextChars,JSON.stringify(context).length);assert.equal(adventure.usage.last.recalledEvents,1);assert.equal(adventure.usage.last.recalledMessages,1);assert.equal(adventure.usage.last.inputTokens,987);assert.deepEqual(context,before);}
  finally{ai.getAiConfig=originalConfig;ai.generateStructured=originalGenerate;}
});
test('usage adds fresh provider counters once and never counts a stale fallback response',async()=>{
  const originalConfig=ai.getAiConfig,originalGenerate=ai.generateStructured;
  let usage=null;const adventure={};ai.getAiConfig=()=>({usage});
  try {
    ai.generateStructured=async()=>{usage={inputTokens:200,outputTokens:40,cachedTokens:100,model:'fixture-model',reportedByProvider:true};return {narration:'Сцена'};};
    await meter.generate(adventure,'narration',{},()=>({}));await meter.generate(adventure,'narration',{},()=>({}));
    assert.equal(adventure.usage.reportedCalls,2);assert.equal(adventure.usage.inputTokens,400);assert.equal(adventure.usage.outputTokens,80);assert.equal(adventure.usage.cachedTokens,200);
    ai.generateStructured=async()=>({narration:'Локальный шаблон'});await meter.generate(adventure,'narration',{},()=>({}));assert.equal(adventure.usage.reportedCalls,2);
  }finally{ai.getAiConfig=originalConfig;ai.generateStructured=originalGenerate;}
});
