const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const request=require('../src/ai-request');
const text=message=>typeof message.content==='string'?message.content:message.content.map(block=>block.text).join('');
function restore(messages){
  const instructions=JSON.parse(text(messages[0])),data=JSON.parse(text(messages[1]));
  const merged={...data,...instructions};
  if(instructions.payload&&data.payload)merged.payload={...data.payload,...instructions.payload};
  return merged;
}
const payload=()=>({instruction:'Narrate actual outcome; no invented mechanics.',lootRules:'Use real dropped loot.',questRules:'Preserve exact objective IDs.',input:'PLAYER_DYNAMIC_SECRET',context:{hero:{hp:{current:3,max:7}},instruction:'NESTED_USER_INSTRUCTION',fakeRules:'NESTED_USER_RULES',pastEvents:[{source:'engine',text:'PAST_EVENT_DYNAMIC'}]},idea:'IDEA_DYNAMIC',outcome:{text:'OUTCOME_DYNAMIC',hp:3},rejectedDraft:{instruction:'REJECTED_UNTRUSTED_INSTRUCTION'},correction:{reason:'CORRECTION_UNTRUSTED'},unknownRules:'ARBITRARY_RULE_UNTRUSTED'});

test('only known application instructions are developer text; every dynamic section and unknown Rules key stays user data losslessly',()=>{
  const original=payload(),snapshot=structuredClone(original),prompt=request.structuredPrompt('adventure_narration',original),input=request.responseInput(prompt),developer=text(input[0]),user=text(input[1]);
  assert.deepEqual(original,snapshot);assert.deepEqual(restore(input),JSON.parse(JSON.stringify(prompt)));assert.equal(input[0].role,'developer');assert.equal(input[1].role,'user');
  assert.ok(developer.includes(original.instruction));assert.ok(developer.includes(original.lootRules));assert.ok(developer.includes('generate_adventure_narration'));
  for(const marker of ['PLAYER_DYNAMIC_SECRET','NESTED_USER_INSTRUCTION','NESTED_USER_RULES','PAST_EVENT_DYNAMIC','IDEA_DYNAMIC','OUTCOME_DYNAMIC','REJECTED_UNTRUSTED_INSTRUCTION','CORRECTION_UNTRUSTED','ARBITRARY_RULE_UNTRUSTED']){assert.equal(developer.includes(marker),false);assert.ok(user.includes(marker));}
  prompt.payload.context.hero.hp.current=1;assert.equal(original.context.hero.hp.current,3);
});

test('changing context/input/outcome/repair feedback leaves the same developer prefix and preserves every trusted rule',()=>{
  const a=payload(),b=payload();Object.assign(b,{input:'different',outcome:{hp:0,text:'Failed attempt'},correction:{reason:'Different schema problem'},rejectedDraft:{instruction:'Other rejected reply'}});b.context.hero.hp.current=0;
  for(const name of ['accessRules','economyRules','companionRules','environmentRules','socialRules']){a[name]=`${name} fixed policy`;b[name]=a[name];}
  const first=request.responseInput(request.structuredPrompt('adventure_narration',a)),second=request.responseInput(request.structuredPrompt('adventure_narration',b));assert.equal(text(first[0]),text(second[0]));assert.notEqual(text(first[1]),text(second[1]));assert.deepEqual(restore(first),JSON.parse(JSON.stringify(request.structuredPrompt('adventure_narration',a))));
  const reversed=Object.fromEntries(Object.entries(a).reverse());assert.equal(text(first[0]),text(request.responseInput(request.structuredPrompt('adventure_narration',reversed))[0]));
});

test('top-level legacy contracts split too; nested contracts, arbitrary rules and nonstring instruction-shaped data are never promoted',()=>{
  const prompt={task:'resolve_player_intent',instruction:'Use supplied action IDs.',environmentRules:'Bounded props only.',input:'secret',unknownRules:'user rule',payload:{instruction:{claim:'not a trusted string'},questRules:['not trusted prose'],context:{task:'not an application task'}}};
  const input=request.responseInput(prompt);assert.deepEqual(restore(input),prompt);const developer=JSON.parse(text(input[0]));assert.equal(developer.payload,undefined);assert.equal(developer.unknownRules,undefined);assert.equal(JSON.parse(text(input[1])).payload.context.task,'not an application task');
  for(const value of ['raw user text',[{instruction:'user text'}],null,123])assert.deepEqual(JSON.parse(text(request.responseInput(value)[1])),value);
});

test('explicit breakpoint wraps only trusted developer text; default requests have no cache directives and text metrics do not change',()=>{
  const prompt=request.structuredPrompt('adventure_narration',payload()),plain=request.responseInput(prompt),explicit=request.responseInput(prompt,{cacheBreakpoint:true});
  assert.equal(typeof plain[0].content,'string');assert.deepEqual(explicit[0].content,[{type:'input_text',text:plain[0].content,prompt_cache_breakpoint:{mode:'explicit'}}]);assert.deepEqual(explicit[1],plain[1]);assert.deepEqual(restore(explicit),restore(plain));assert.equal(text(explicit[0]).length,text(plain[0]).length);
});

test('metrics count actual app input text and fixed numeric sections without retaining secret values or arbitrary property names',()=>{
  const original=payload();original['SECRET_AS_FIELD_NAME'.repeat(50)]='SECRET_AS_VALUE';original.context['SECRET_CONTEXT_FIELD'.repeat(50)]='SECRET_CONTEXT_VALUE';const before=structuredClone(original),metrics=request.requestMetrics('adventure_narration',original),input=request.responseInput(request.structuredPrompt('adventure_narration',original));
  assert.deepEqual(original,before);assert.equal(metrics.inputChars,request.BASIC_INSTRUCTIONS.length+input.reduce((sum,message)=>sum+text(message).length,0));assert.equal(metrics.staticChars,request.BASIC_INSTRUCTIONS.length+text(input[0]).length);assert.equal(metrics.dynamicChars,text(input[1]).length);assert.equal(metrics.staticChars+metrics.dynamicChars,metrics.inputChars);assert.equal(metrics.sections.context,JSON.stringify(original.context).length);assert.equal(metrics.sections['context.hero'],JSON.stringify(original.context.hero).length);assert.ok(metrics.sections.other>0);assert.equal(Object.keys(metrics.sections).length<100,true);assert.ok(Object.values(metrics.sections).every(value=>Number.isInteger(value)&&value>=0));assert.equal(JSON.stringify(metrics).includes('SECRET'),false);assert.equal(JSON.stringify(metrics).includes('PLAYER_DYNAMIC'),false);
});

// Compile only this source against synthetic transports. Never load local env or an auth store.
function fakeBridge(chatgpt={isEnabled:()=>false}){
  const calls=[],module={exports:{}};
  const fakeRequire=name=>name==='fs'?{existsSync:()=>false}:name==='./chatgpt-auth'?{chatgpt}:name==='./ai-request'?request:require(name);
  const source=fs.readFileSync(path.join(__dirname,'../src/ai-bridge.js'),'utf8')+'\nmodule.exports.testTransports={callOpenAiResponses,callOpenAiCompatible};';
  vm.runInNewContext(source,{module,exports:module.exports,require:fakeRequire,__dirname:path.join(__dirname,'../src'),process:{env:{}},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{calls.push({url:String(url),body:JSON.parse(options.body)});return Response.json({output_text:'{"ok":true}',choices:[{message:{content:'{"ok":true}'}}]});}});
  return {calls,bridge:{...module.exports,...module.exports.testTransports}};
}
test('official Responses defaults preserve the shared boundary without cache options or breakpoints even for GPT6',async()=>{
  const f=fakeBridge(),prompt=request.structuredPrompt('adventure_narration',payload());await f.bridge.callOpenAiResponses({baseUrl:'https://api.openai.com/v1',model:'gpt-6-luna',apiKey:'synthetic-key'},prompt,1000);const body=f.calls[0].body;
  assert.deepEqual(body,{model:'gpt-6-luna',instructions:request.BASIC_INSTRUCTIONS,input:request.responseInput(prompt)});assert.deepEqual(restore(body.input),JSON.parse(JSON.stringify(prompt)));assert.equal(f.calls.length,1);assert.equal(JSON.stringify(body).includes('prompt_cache'),false);
  for(const [model,baseUrl] of [['gpt-5.2','https://api.openai.com/v1'],['gpt-6-luna','https://synthetic.invalid/v1']]){await f.bridge.callOpenAiResponses({baseUrl,model,apiKey:'synthetic-key'},prompt,1000);const requestBody=f.calls.at(-1).body;assert.equal(requestBody.prompt_cache_options,undefined);assert.equal(typeof requestBody.input[0].content,'string');assert.equal(requestBody.model,model);}
});
test('compatible and local chat routes preserve the original system/user JSON and temperature with no unsupported developer/cache fields',async()=>{
  const f=fakeBridge(),prompt=request.structuredPrompt('adventure_narration',payload());await f.bridge.callOpenAiCompatible({baseUrl:'https://synthetic.invalid/v1',model:'local-test',apiKey:'synthetic-key'},prompt,1000);assert.deepEqual(f.calls[0].body,{model:'local-test',messages:[{role:'system',content:request.BASIC_INSTRUCTIONS},{role:'user',content:JSON.stringify(prompt)}],temperature:0.7});assert.equal(f.calls.length,1);
});

test('generateStructured forwards the request-scoped callback to ChatGPT without altering payload or using global usage for the receipt',async()=>{
  const original=payload(),before=structuredClone(original),seen=[],receipt={model:'synthetic-model',inputTokens:100,outputTokens:3,reportedByProvider:true};
  const f=fakeBridge({isEnabled:()=>true,modelLabel:()=> 'synthetic-model',lastUsage:()=>({inputTokens:2}),infer:async(prompt,timeoutMs,onUsage)=>{seen.push({prompt,timeoutMs,onUsage});onUsage(receipt);return '{"narration":"ok"}';}});let observed;const report=await f.bridge.generateStructured('adventure_narration',original,()=>{throw Error('No fallback expected');},{onUsage:value=>observed=value});assert.equal(report.narration,'ok');assert.equal(observed.inputTokens,100);assert.equal(seen.length,1);assert.equal(typeof seen[0].onUsage,'function');assert.deepEqual(seen[0].prompt,request.structuredPrompt('adventure_narration',original));assert.deepEqual(original,before);
});
