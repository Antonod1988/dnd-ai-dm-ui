const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createChatgptAuth, readResponseStream } = require('../src/chatgpt-auth');
const { createAuthStore } = require('../src/auth-store');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function fixture(scope = 'openid chatgpt.tokens.use.direct', modelId='test-model', reportedUsage, responseFactory) {
  let saved, calls = [], nonce;
  const store = { async load() { return saved || null; }, async save(data) { saved = structuredClone(data); } };
  const tokens = { access_token: 'test-access', refresh_token: 'test-refresh', id_token: 'test-identity', token_type: 'Bearer', expires_in: 3600, scope };
  const auth = createChatgptAuth({ store,
    verify: async (token, client, expected) => { assert.equal(token, tokens.id_token); assert.equal(client, 'oaiapp_test'); assert.equal(expected, nonce); return { sub: 'test-user', email: 'test@example.invalid' }; },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/oauth/token')) return Response.json(tokens);
      if (String(url).endsWith('/models')) return Response.json({ models: [{ slug: modelId, display_name: 'Test model', visibility: 'list' }, { slug: 'hidden', visibility: 'hidden' }] });
      if (String(url).endsWith('openid-configuration')) return Response.json({ revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke' });
      if (String(url).endsWith('/oauth/revoke')) return new Response(null, { status: 200 });
      if (String(url).endsWith('/responses')) return responseFactory?responseFactory(options):new Response(`data: {"type":"response.output_text.delta","delta":"hello"}\n\ndata: ${JSON.stringify({type:'response.completed',...(reportedUsage?{response:{usage:reportedUsage}}:{})})}\n\n`);
      throw new Error('Unexpected endpoint');
    }
  });
  async function login() {
    const url = new URL(await auth.begin('http://127.0.0.1:8788')); nonce = url.searchParams.get('nonce');
    await auth.callback(new URLSearchParams({ state: url.searchParams.get('state'), code: 'test-code', client_id: 'oaiapp_test' }));
    return url;
  }
  return { auth, calls, login, tokens, get saved() { return saved; } };
}

test('PKCE, host ID and issued client registration survive returning sign-in', async () => {
  const f = fixture(); const url = await f.login(); const hostId = url.searchParams.get('ext_agent_host_id');
  assert.equal(url.searchParams.get('client_id'), 'dynamic_agent_client'); assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const exchange = f.calls[0].options.body;
  assert.equal(exchange.get('client_id'), 'oaiapp_test');
  assert.equal(crypto.createHash('sha256').update(exchange.get('code_verifier')).digest('base64url'), url.searchParams.get('code_challenge'));
  const status = await f.auth.status();
  const returning = new URL(await f.auth.begin('http://127.0.0.1:9000', status.activeId));
  assert.equal(returning.searchParams.get('client_id'), 'oaiapp_test'); assert.equal(returning.searchParams.get('ext_agent_host_id'), hostId);
  assert.equal(returning.searchParams.get('agent_name_hint'), null); assert.equal(returning.searchParams.get('id_token_hint'), 'test-identity');
  assert.doesNotMatch(JSON.stringify(status), /test-access|test-refresh|test-identity/);
});
test('wrong state, client mismatch and replay are rejected', async () => {
  const f = fixture();
  await f.auth.begin('http://127.0.0.1:8788');
  await assert.rejects(f.auth.callback(new URLSearchParams({ state: 'wrong', code: 'test-code' })));
  await f.login(); const id = (await f.auth.status()).activeId;
  const url = new URL(await f.auth.begin('http://127.0.0.1:8788', id));
  const callback = new URLSearchParams({ state: url.searchParams.get('state'), client_id: 'oaiapp_other', code: 'test-code' });
  await assert.rejects(f.auth.callback(callback)); await assert.rejects(f.auth.callback(callback));
});
test('identity sign-in without plan scope cannot send inference', async () => {
  const f = fixture('openid email'); await f.login(); assert.equal((await f.auth.status()).connected, false);
  assert.equal((await f.auth.status()).identityOnly, true); await assert.rejects(f.auth.infer({ task: 'test' }));
});
test('account models and completed SSE power inference with correct preview parameters', async () => {
  const f = fixture(); await f.login(); assert.deepEqual(await f.auth.models(), [{ id: 'test-model', name: 'Test model' }]);
  await assert.rejects(f.auth.selectModel('hidden')); await f.auth.selectModel('test-model');
  assert.equal(await f.auth.infer({ task: 'narration' }), 'hello');
  const call = f.calls.find(c => c.url.endsWith('/responses')); const body = JSON.parse(call.options.body);
  assert.equal(body.store, false); assert.equal(body.stream, true); assert.ok(Array.isArray(body.input));
  assert.equal(body.model, 'test-model'); assert.equal(body.temperature, undefined);
  assert.equal(body.instructions,require('../src/ai-request').BASIC_INSTRUCTIONS);assert.equal(body.input[0].role,'developer');assert.equal(body.input[1].role,'user');assert.equal(body.prompt_cache_options,undefined);
});

test('GPT6 actual transport defaults preserve the developer/user boundary without rejected cache options or breakpoints',async()=>{
  const requests=require('../src/ai-request'),f=fixture('openid chatgpt.tokens.use.direct','gpt-6-luna');await f.login();await f.auth.models();await f.auth.selectModel('gpt-6-luna');
  const prompt=requests.structuredPrompt('adventure_narration',{instruction:'Only describe the real outcome.',questRules:'No false quest closure.',input:'FIRST_DYNAMIC',context:{hero:{hp:3}},rejectedDraft:{instruction:'UNTRUSTED_REJECTED'}}),original=structuredClone(prompt);
  await f.auth.infer(prompt);const changed=structuredClone(prompt);changed.payload.input='SECOND_DYNAMIC';changed.payload.context.hero.hp=1;await f.auth.infer(changed);
  assert.deepEqual(prompt,original);const calls=f.calls.filter(call=>call.url.endsWith('/responses'));assert.equal(calls.length,2);const bodies=calls.map(call=>JSON.parse(call.options.body));
  for(const [index,body] of bodies.entries()){assert.deepEqual(body,{model:'gpt-6-luna',instructions:requests.BASIC_INSTRUCTIONS,input:requests.responseInput(index===0?prompt:changed),store:false,stream:true});assert.equal(JSON.stringify(body).includes('prompt_cache'),false);assert.ok(!body.input[0].content.includes('DYNAMIC'));assert.ok(!body.input[0].content.includes('UNTRUSTED_REJECTED'));}
  assert.deepEqual(bodies[0].input[0],bodies[1].input[0]);assert.notEqual(bodies[0].input[1].content,bodies[1].input[1].content);
});

test('provider cache-write counts remain optional and preserve a reported zero independently from reads and reasoning',async()=>{
  for(const value of [undefined,0,12]){const counters={input_tokens:80,output_tokens:20,input_tokens_details:{cached_tokens:4,...(value!==undefined?{cache_write_tokens:value}:{})},output_tokens_details:{reasoning_tokens:7}},f=fixture('openid chatgpt.tokens.use.direct','test-model',counters);await f.login();await f.auth.models();await f.auth.selectModel('test-model');await f.auth.infer({task:'fake-metric'});const usage=f.auth.lastUsage();assert.equal(usage.inputTokens,80);assert.equal(usage.outputTokens,20);assert.equal(usage.cachedTokens,4);assert.equal(usage.reasoningTokens,7);assert.equal(Object.hasOwn(usage,'cacheWriteTokens'),value!==undefined);assert.equal(usage.cacheWriteTokens,value);}
});

test('parallel inference receives separate A100/B2 receipts even when global lastUsage ends with B2',async()=>{
  let releaseA,releaseB;const waitA=new Promise(resolve=>releaseA=resolve),waitB=new Promise(resolve=>releaseB=resolve);
  const f=fixture('openid chatgpt.tokens.use.direct','test-model',undefined,async options=>{
    const body=JSON.parse(options.body),data=JSON.parse(body.input[1].content),key=data.input;await (key==='A'?waitA:waitB);
    return new Response(`data: ${JSON.stringify({type:'response.output_text.delta',delta:key})}\n\ndata: ${JSON.stringify({type:'response.completed',response:{usage:{input_tokens:key==='A'?100:2,output_tokens:1}}})}\n\n`);
  });await f.login();await f.auth.models();await f.auth.selectModel('test-model');
  const a={task:'parallel',input:'A'},b={task:'parallel',input:'B'},originalA=structuredClone(a),originalB=structuredClone(b),receiptsA=[],receiptsB=[];
  const promiseA=f.auth.infer(a,1000,receipt=>receiptsA.push(receipt)),promiseB=f.auth.infer(b,1000,receipt=>receiptsB.push(receipt));releaseA();releaseB();assert.deepEqual(await Promise.all([promiseA,promiseB]),['A','B']);
  assert.equal(f.auth.lastUsage().inputTokens,2);assert.deepEqual([f.auth.lastUsage().inputTokens,f.auth.lastUsage().inputTokens],[2,2]);assert.equal(receiptsA.length,1);assert.equal(receiptsB.length,1);assert.equal(receiptsA[0].inputTokens,100);assert.equal(receiptsB[0].inputTokens,2);assert.notEqual(receiptsB[0],f.auth.lastUsage());assert.deepEqual(a,originalA);assert.deepEqual(b,originalB);assert.equal(f.calls.filter(call=>call.url.endsWith('/responses')).length,2);
});

test('a failed terminal event reports its own usage synchronously before the inference rejects',async()=>{
  const f=fixture('openid chatgpt.tokens.use.direct','test-model',undefined,async()=>new Response(`data: ${JSON.stringify({type:'response.failed',response:{error:{code:'rate_limit_exceeded',message:'PRIVATE_FAILURE'},usage:{input_tokens:87,output_tokens:3,input_tokens_details:{cached_tokens:9,cache_write_tokens:11}}}})}\n\n`));await f.login();await f.auth.models();await f.auth.selectModel('test-model');let receipt;
  await assert.rejects(f.auth.infer({task:'failed-receipt'},1000,value=>receipt=value),error=>{assert.equal(receipt.inputTokens,87);assert.equal(receipt.cacheWriteTokens,11);assert.equal(receipt.cachedTokens,9);assert.equal(error.code,'CHATGPT_STREAM_FAILURE');return true;});assert.deepEqual(receipt,f.auth.lastUsage());assert.notEqual(receipt,f.auth.lastUsage());assert.equal(f.calls.filter(call=>call.url.endsWith('/responses')).length,1);
});

test('HTTP diagnostic exposes only a known rejected parameter/code, never raw provider text, and makes no automatic retry',async()=>{
  for(const diagnostic of [{code:'unsupported_parameter',param:'prompt_cache_options',message:'PRIVATE_HTTP_MESSAGE prompt_cache_options'},{code:'PRIVATE_UNKNOWN_CODE',param:'PRIVATE_UNKNOWN_PARAMETER',message:'PRIVATE_HTTP_MESSAGE'}]){
    const f=fixture('openid chatgpt.tokens.use.direct','gpt-6-luna',undefined,async()=>Response.json({error:diagnostic},{status:400}));await f.login();await f.auth.models();await f.auth.selectModel('gpt-6-luna');let receipt;
    await assert.rejects(f.auth.infer({task:'fake-http'},1000,value=>receipt=value),error=>{assert.equal(error.providerFailure.httpStatus,400);assert.equal(error.providerFailure.providerCode,diagnostic.code==='unsupported_parameter'?'unsupported_parameter':'unknown_error');assert.equal(error.providerFailure.parameter,diagnostic.code==='unsupported_parameter'?'prompt_cache_options':undefined);assert.equal(JSON.stringify(error).includes('PRIVATE'),false);assert.equal(error.message.includes('PRIVATE'),false);return true;});assert.equal(receipt,undefined);assert.equal(f.auth.lastUsage(),null);assert.equal(f.calls.filter(call=>call.url.endsWith('/responses')).length,1);
  }
});
test('expired tokens refresh once, rotate atomically and logout retains the registration', async () => {
  const f = fixture(); f.tokens.expires_in = 0; await f.login(); f.tokens.expires_in = 3600; f.tokens.refresh_token = 'test-rotated';
  await Promise.all([f.auth.models(), f.auth.models()]);
  assert.equal(f.calls.filter(c => c.options.body?.get?.('grant_type') === 'refresh_token').length, 1);
  assert.equal(f.saved.accounts[0].refresh_token, 'test-rotated');
  await f.auth.signOut(); assert.equal((await f.auth.status()).connected, false);
  assert.equal(f.saved.accounts[0].client_id, 'oaiapp_test'); assert.equal(f.saved.accounts[0].refresh_token, undefined);
});
test('denied login preserves the active account and stream failures do not masquerade as success', async () => {
  const f = fixture(); await f.login(); const active = (await f.auth.status()).activeId;
  const url = new URL(await f.auth.begin('http://127.0.0.1:8788'));
  assert.equal(await f.auth.callback(new URLSearchParams({ state: url.searchParams.get('state'), error: 'access_denied' })), false);
  assert.equal((await f.auth.status()).activeId, active);
  for (const event of ['response.failed', 'response.incomplete', 'error']) await assert.rejects(readResponseStream(new Response(`data: {"type":"${event}"}\n\n`).body));
  await assert.rejects(readResponseStream(new Response('data: {"type":"response.output_text.delta","delta":"unfinished"}\n\n').body));
});
test('fragmented UTF-8 stream reconstructs Russian text', async () => {
  const bytes = new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"Привет"}\r\n\r\ndata: {"type":"response.completed"}\r\n\r\n');
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1)); controller.close(); } });
  assert.equal(await readResponseStream(stream), 'Привет');
});
test('usage metrics come from the completed provider event, not a character-count estimate', async () => {
  let observed;
  const response = new Response('data: {"type":"response.output_text.delta","delta":"ok"}\n\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":123,"output_tokens":20}}}\n\n');
  assert.equal(await readResponseStream(response.body, event => { observed = event.usage; }), 'ok');
  assert.equal(observed.input_tokens, 123);
});
test('credential persistence protects Windows tokens and reads them back', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-auth-store-'));
  try {
    const store = createAuthStore(directory); await store.save({ access_token: 'test-secret-not-for-publication' });
    const raw = await fs.readFile(path.join(directory, 'accounts.dat'), 'utf8');
    if (process.platform === 'win32') assert.ok(!raw.includes('test-secret-not-for-publication'));
    assert.deepEqual(await store.load(), { access_token: 'test-secret-not-for-publication' });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('stream failures expose only known diagnostic codes, not provider messages, while preserving reported terminal usage',async()=>{
  let counters;const event={type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded',message:'PRIVATE_PROVIDER_MESSAGE'},usage:{input_tokens:90,output_tokens:12}}};
  await assert.rejects(readResponseStream(new Response(`data: ${JSON.stringify(event)}\n\n`).body,value=>counters=value.usage),error=>{assert.equal(error.code,'CHATGPT_STREAM_FAILURE');assert.equal(error.providerFailure.providerCode,'subscription_sharing_usage_limit_exceeded');assert.match(error.message,/Лимит/);assert.ok(!JSON.stringify(error).includes('PRIVATE_PROVIDER_MESSAGE'));return true;});assert.deepEqual(counters,{input_tokens:90,output_tokens:12});
  for(const [type,code,reason] of [['response.incomplete',undefined,'max_output_tokens'],['error','rate_limit_exceeded',undefined],['response.failed','UNKNOWN_PRIVATE_VALUE',undefined]]){
    const item={type,error:{code,message:'PRIVATE_PROVIDER_MESSAGE'},response:{incomplete_details:{reason}}};await assert.rejects(readResponseStream(new Response(`data: ${JSON.stringify(item)}\n\n`).body),error=>{assert.equal(error.providerFailure.providerCode,code==='rate_limit_exceeded'?code:'unknown_error');assert.equal(error.providerFailure.incompleteReason,reason);assert.ok(!JSON.stringify(error).includes('UNKNOWN_PRIVATE_VALUE'));return true;});
  }
});
