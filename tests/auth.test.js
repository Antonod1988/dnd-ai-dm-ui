const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createChatgptAuth, readResponseStream } = require('../src/chatgpt-auth');
const { createAuthStore } = require('../src/auth-store');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function fixture(scope = 'openid chatgpt.tokens.use.direct') {
  let saved, calls = [], nonce;
  const store = { async load() { return saved || null; }, async save(data) { saved = structuredClone(data); } };
  const tokens = { access_token: 'test-access', refresh_token: 'test-refresh', id_token: 'test-identity', token_type: 'Bearer', expires_in: 3600, scope };
  const auth = createChatgptAuth({ store,
    verify: async (token, client, expected) => { assert.equal(token, tokens.id_token); assert.equal(client, 'oaiapp_test'); assert.equal(expected, nonce); return { sub: 'test-user', email: 'test@example.invalid' }; },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/oauth/token')) return Response.json(tokens);
      if (String(url).endsWith('/models')) return Response.json({ models: [{ slug: 'test-model', display_name: 'Test model', visibility: 'list' }, { slug: 'hidden', visibility: 'hidden' }] });
      if (String(url).endsWith('openid-configuration')) return Response.json({ revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke' });
      if (String(url).endsWith('/oauth/revoke')) return new Response(null, { status: 200 });
      if (String(url).endsWith('/responses')) return new Response('data: {"type":"response.output_text.delta","delta":"hello"}\n\ndata: {"type":"response.completed"}\n\n');
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
