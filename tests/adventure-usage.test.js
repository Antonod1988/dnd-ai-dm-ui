const {test}=require('node:test');
const assert=require('node:assert/strict');
const ai=require('../src/ai-bridge'),meter=require('../src/adventure-usage');
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
