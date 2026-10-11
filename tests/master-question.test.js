const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chatgpt}=require('../src/chatgpt-auth');
const ai=require('../src/ai-bridge');
test('plain-text narration and master answers are accepted while world/mechanics drafts still require structured JSON',async()=>{
  const enabled=chatgpt.isEnabled,infer=chatgpt.infer,modelLabel=chatgpt.modelLabel;
  chatgpt.isEnabled=()=>true;chatgpt.modelLabel=()=> 'fixture-model';chatgpt.infer=async()=> 'Your phrase was Amber Compass. The markers pointed toward the Hollow Beacon.';
  try {
    const result=await ai.generateStructured('master_question',{instruction:'Review the journal.'},()=>({narration:'Fallback'}));assert.match(result.narration,/Amber Compass/);
    const story=await ai.generateStructured('adventure_narration',{instruction:'Describe the resolved action.'},()=>({narration:'Fallback'}));assert.match(story.narration,/Amber Compass/);assert.equal(story.developments,undefined);
    const repaired=await ai.generateStructured('adventure_narration_repair',{instruction:'Correct the report.'},()=>({narration:'Fallback'}));assert.match(repaired.narration,/Amber Compass/);
    await assert.rejects(ai.generateStructured('adventure_world',{instruction:'Create a world.'},()=>({})),/некорректные данные/);
    await assert.rejects(ai.generateStructured('adventure_intent',{instruction:'Resolve an action.'},()=>({})),/некорректные данные/);
    await assert.rejects(ai.generateStructured('created_spell',{instruction:'Design a spell.'},()=>({})),/некорректные данные/);
  }finally{chatgpt.isEnabled=enabled;chatgpt.infer=infer;chatgpt.modelLabel=modelLabel;}
});

test('malformed structured text carries bounded correction feedback without accepting world or intent prose',async()=>{
  const enabled=chatgpt.isEnabled,infer=chatgpt.infer,modelLabel=chatgpt.modelLabel;chatgpt.isEnabled=()=>true;chatgpt.modelLabel=()=> 'fixture-model';chatgpt.infer=async()=> '[broken-json '+ 'x'.repeat(6000);
  try{await assert.rejects(ai.generateStructured('adventure_narration',{},()=>({})),e=>e.code==='INVALID_AI_DRAFT'&&e.draftText.length===4000);}
  finally{chatgpt.isEnabled=enabled;chatgpt.infer=infer;chatgpt.modelLabel=modelLabel;}
});
