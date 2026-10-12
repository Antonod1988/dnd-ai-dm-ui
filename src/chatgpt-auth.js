const crypto = require('node:crypto');
const { createAuthStore } = require('./auth-store');
const { BASIC_INSTRUCTIONS,responseInput } = require('./ai-request');
const ISSUER = 'https://auth.openai.com';
const RESOURCE = 'https://api.openai.com/v1';
const TOKEN_ENDPOINT = `${ISSUER}/api/accounts/oauth/token`;
const SCOPE = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
let jwtTools;

async function verifyIdentity(token, clientId, nonce) {
  if (!jwtTools) {
    const jose = await import('jose');
    jwtTools = { ...jose, jwks: jose.createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) };
  }
  const { payload } = await jwtTools.jwtVerify(token, jwtTools.jwks, {
    issuer: ISSUER, audience: clientId, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5, algorithms: ['RS256']
  });
  if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub) throw new Error('Identity validation failed');
  return payload;
}

function createChatgptAuth({ store = createAuthStore(), fetchImpl = fetch, verify = verifyIdentity } = {}) {
  let data;
  let loading;
  let pending;
  let refreshPromise;
  let lastError = '';
  let refreshingModels;
  let modelsFor = '';
  let models = [];
  let usage = null;
  let operation = Promise.resolve();
  const serial = fn => { const next = operation.then(fn); operation = next.catch(() => {}); return next; };
  async function load() {
    if (!loading) loading = (async () => {
      data = await store.load() || { hostId: `urn:uuid:${crypto.randomUUID()}`, accounts: [], activeId: null };
      await store.save(data);
    })();
    await loading;
    return data;
  }
  const active = () => data?.accounts.find(a => a.id === data.activeId);
  const enabled = a => Boolean(a?.access_token && a.scopes?.includes('chatgpt.tokens.use.direct'));
  async function tokenRequest(fields) {
    const response = await fetchImpl(TOKEN_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...fields, resource: RESOURCE }), signal: AbortSignal.timeout(20000) });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) {
      const error = new Error('Не удалось обновить вход ChatGPT. Войдите снова.');
      error.invalidGrant = ['invalid_grant', 'invalid_client'].includes(tokens.error);
      throw error;
    }
    return tokens;
  }
  function tokenFields(tokens, previous = {}) {
    if (tokens.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(Number(tokens.expires_in))) throw new Error('Invalid token response');
    return {
      access_token: tokens.access_token, refresh_token: tokens.refresh_token || previous.refresh_token,
      id_token: tokens.id_token || previous.id_token,
      scopes: typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/) : previous.scopes || [],
      expiresAt: Date.now() + Number(tokens.expires_in) * 1000
    };
  }
  async function credentials() {
    await load();
    const account = active();
    if (!enabled(account)) throw new Error('Войдите через ChatGPT и разрешите использование плана.');
    if (account.expiresAt > Date.now() + 60000) return account;
    if (!refreshPromise) refreshPromise = serial(async () => {
      if (account.expiresAt > Date.now() + 60000) return account;
      try {
        if (!account.refresh_token) throw Object.assign(new Error('Войдите через ChatGPT снова.'), { invalidGrant: true });
        const tokens = await tokenRequest({ grant_type: 'refresh_token', client_id: account.client_id, refresh_token: account.refresh_token });
        Object.assign(account, tokenFields(tokens, account));
        await store.save(data);
        if (!enabled(account)) throw new Error('Разрешение на использование плана ChatGPT больше не выдано. Войдите снова.');
        return account;
      } catch (error) {
        if (error.invalidGrant) { delete account.access_token; delete account.refresh_token; delete account.id_token; await store.save(data); }
        throw error;
      }
    }).finally(() => { refreshPromise = null; });
    return refreshPromise;
  }
  async function loadModels() {
    const account = await credentials();
    if (modelsFor === account.id) return models;
    if (!refreshingModels) refreshingModels = (async () => {
      const response = await fetchImpl(`${RESOURCE}/models`, { headers: { authorization: `Bearer ${account.access_token}` }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Список моделей ChatGPT недоступен (HTTP ${response.status}).`);
      const body = await response.json();
      models = (body.models || []).filter(m => m.visibility === 'list').map(m => ({ id: m.slug, name: m.display_name || m.slug })).filter(m => typeof m.id === 'string');
      modelsFor = account.id;
      return models;
    })().finally(() => { refreshingModels = null; });
    return refreshingModels;
  }
  return {
    async status() {
      await load();
      if (pending && pending.expires < Date.now()) { pending = null; lastError = 'Попытка входа истекла. Нажмите Continue with ChatGPT ещё раз.'; }
      const account = active();
      return { connected: enabled(account), identityOnly: Boolean(account?.access_token && !enabled(account)), activeId: data.activeId,
        accounts: data.accounts.map(a => ({ id: a.id, label: a.email || a.name || 'ChatGPT', registration: a.client_id.slice(-6), connected: Boolean(a.access_token) })),
        model: account?.model || '', models: modelsFor === account?.id ? models : [], usage, pending: Boolean(pending && pending.expires > Date.now()), error: lastError };
    },
    isEnabled() { return enabled(active()); },
    modelLabel() { const id = active()?.model || ''; return models.find(m => m.id === id)?.name || id; },
    lastUsage() { return usage; },
    async begin(origin, accountId = '') {
      await load();
      const account = accountId ? data.accounts.find(a => a.id === accountId) : null;
      if (accountId && !account) throw new Error('Unknown account');
      const state = crypto.randomBytes(32).toString('base64url');
      const nonce = crypto.randomBytes(32).toString('base64url');
      const verifier = crypto.randomBytes(48).toString('base64url');
      const redirectUri = `${origin}/auth/callback`;
      const clientId = account?.client_id || 'dynamic_agent_client';
      pending = { state, nonce, verifier, redirectUri, clientId, accountId, expires: Date.now() + 10 * 60000 };
      lastError = '';
      const params = new URLSearchParams({ client_id: clientId, ext_agent_host_id: data.hostId, response_type: 'code', redirect_uri: redirectUri, scope: SCOPE, resource: RESOURCE, state, nonce, code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url') });
      if (!account) params.set('agent_name_hint', 'DndAiDmUi');
      if (account?.id_token) params.set('id_token_hint', account.id_token);
      if (account?.email) params.set('login_hint', account.email);
      return `${ISSUER}/api/accounts/authorize?${params}`;
    },
    async callback(params) {
      const attempt = pending;
      if (!attempt || attempt.expires < Date.now() || params.get('state') !== attempt.state) throw new Error('Недействительная или истёкшая попытка входа.');
      pending = null;
      if (params.get('error')) { lastError = 'Вход отменён или разрешение не выдано.'; return false; }
      return serial(async () => {
        try {
          const clientId = params.get('client_id') || attempt.clientId;
          if (!clientId || clientId === 'dynamic_agent_client' || (attempt.accountId && clientId !== attempt.clientId)) throw new Error('Client registration mismatch');
          const code = params.get('code');
          if (!code) throw new Error('Missing code');
          const tokens = await tokenRequest({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri });
          const identity = await verify(tokens.id_token, clientId, attempt.nonce);
          let account = data.accounts.find(a => a.client_id === clientId && a.subject === identity.sub);
          const selected = data.accounts.find(a => a.id === attempt.accountId);
          if (selected && selected.subject !== identity.sub) throw new Error('Account identity mismatch');
          if (!account) { account = { id: crypto.randomUUID(), client_id: clientId, subject: identity.sub, issuer: ISSUER }; data.accounts.push(account); }
          Object.assign(account, tokenFields(tokens), { email: identity.email || '', name: identity.name || '' });
          data.activeId = account.id;
          modelsFor = ''; models = [];
          await store.save(data);
          lastError = enabled(account) ? '' : 'Вход выполнен. Использование плана ChatGPT не разрешено.';
          return true;
        } catch { lastError = 'Не удалось подтвердить вход ChatGPT. Попробуйте снова.'; throw new Error(lastError); }
      });
    },
    models: loadModels,
    async selectModel(model) {
      const catalog = await loadModels();
      if (!catalog.some(m => m.id === model)) throw new Error('Выберите модель из списка вашего аккаунта.');
      return serial(async () => { active().model = model; await store.save(data); });
    },
    async switchAccount(id) {
      await load();
      return serial(async () => {
        if (!data.accounts.some(a => a.id === id)) throw new Error('Unknown account');
        data.activeId = id; modelsFor = ''; models = []; lastError = ''; await store.save(data);
      });
    },
    async signOut() {
      await load();
      pending = null;
      return serial(async () => {
        const account = active();
        let revoked = true;
        if (account?.refresh_token) {
          try {
            const discovery = await fetchImpl(`${ISSUER}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(15000) }).then(r => r.json());
            const endpoint = new URL(discovery.revocation_endpoint);
            if (endpoint.origin !== ISSUER) throw new Error('Invalid revocation endpoint');
            const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: account.refresh_token, token_type_hint: 'refresh_token', client_id: account.client_id }), signal: AbortSignal.timeout(15000) });
            revoked = response.status === 200;
          } catch { revoked = false; }
        }
        if (account) { delete account.access_token; delete account.refresh_token; delete account.id_token; }
        modelsFor = ''; models = [];
        lastError = revoked ? '' : 'Выход выполнен локально. Отзыв доступа не подтверждён; отключите приложение в настройках ChatGPT.';
        await store.save(data);
        return { revoked };
      });
    },
    async infer(payload, timeoutMs = 120000, onUsage) {
      const account = await credentials();
      if (!account.model) throw new Error('Выберите модель ChatGPT в настройках AI.');
      const requestModel=account.model;
      const response = await fetchImpl(`${RESOURCE}/responses`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${account.access_token}` },
        body: JSON.stringify({ model: requestModel, instructions: BASIC_INSTRUCTIONS, input: responseInput(payload), store: false, stream: true }), signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        const detail=await response.json().catch(()=>null),error=detail?.error;
        const cacheField=['prompt_cache_options','prompt_cache_breakpoint'].find(field=>String(error?.param||'').includes(field)||String(error?.message||'').includes(field));
        const code=['unsupported_parameter','invalid_request_error','unsupported_value','invalid_value','rate_limit_exceeded','insufficient_quota'].includes(error?.code)?error.code:'unknown_error';
        throw Object.assign(new Error(`ChatGPT HTTP ${response.status}. ${cacheField?'Провайдер отклонил параметр кэширования '+cacheField+'.':'Проверьте вход и лимиты плана.'}`),{providerFailure:{type:'http_error',providerCode:code,httpStatus:response.status,...(cacheField?{parameter:cacheField}:{})}});
      }
      return readResponseStream(response.body, completed => {
        const counters = completed.usage;
        if (counters) {
          const cacheWriteTokens=counters.input_tokens_details?.cache_write_tokens;
          const receipt = { model: requestModel, inputTokens: counters.input_tokens, outputTokens: counters.output_tokens, cachedTokens: counters.input_tokens_details?.cached_tokens || 0, ...(Number.isFinite(cacheWriteTokens)&&cacheWriteTokens>=0?{cacheWriteTokens}:{}), reasoningTokens: counters.output_tokens_details?.reasoning_tokens || 0, reportedByProvider: true };
          usage=receipt;
          if(typeof onUsage==='function')onUsage({...receipt});
        }
      });
    }
  };
}

function streamFailure(event) {
  const knownCodes=new Set(['subscription_sharing_usage_limit_exceeded','subscription_sharing_usage_unavailable','rate_limit_exceeded','insufficient_quota','authentication_error','invalid_api_key','permission_denied','model_not_found','server_error','context_length_exceeded','invalid_request_error']);
  const raw=event.response?.error?.code||event.error?.code||event.code;
  const providerCode=knownCodes.has(raw)?raw:'unknown_error';
  const reason=event.response?.incomplete_details?.reason;
  const incompleteReason=['max_output_tokens','content_filter','steered'].includes(reason)?reason:undefined;
  const message=providerCode==='subscription_sharing_usage_limit_exceeded'||providerCode==='insufficient_quota'?'Лимит использования плана ChatGPT для приложения исчерпан. Проверьте лимиты или дождитесь их восстановления.':providerCode==='subscription_sharing_usage_unavailable'?'Использование плана ChatGPT сейчас недоступно для приложения. Проверьте доступ в настройках ChatGPT.':providerCode==='rate_limit_exceeded'?'ChatGPT ограничил частоту запросов. Повторите описание позже.':incompleteReason==='max_output_tokens'?'ChatGPT остановил ответ из-за ограничения длины. Незавершённый текст не применён.':incompleteReason==='content_filter'?'ChatGPT не завершил ответ из-за ограничения содержимого. Измените запрос.':providerCode==='context_length_exceeded'?'Контекст запроса превысил предел выбранной модели.':providerCode==='authentication_error'||providerCode==='invalid_api_key'?'Вход ChatGPT не подтверждён. Войдите снова в настройках AI.':'ChatGPT не завершил ответ. Игровой результат сохранён; описание можно повторить позже.';
  return Object.assign(new Error(message),{code:'CHATGPT_STREAM_FAILURE',providerFailure:{type:event.type,providerCode,...(incompleteReason?{incompleteReason}:{})}});
}
async function readResponseStream(body, onCompleted) {
  let buffer = '', text = '', completed = false;
  const decoder = new TextDecoder();
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      const raw = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!raw || raw === '[DONE]') continue;
      const event = JSON.parse(raw);
      if (event.type === 'response.output_text.delta') text += event.delta;
      if (event.type === 'response.failed' || event.type === 'error' || event.type === 'response.incomplete') {if(event.response?.usage&&onCompleted)onCompleted(event.response);throw streamFailure(event);}
      if (event.type === 'response.completed') {
        completed = true;
        if (onCompleted) onCompleted(event.response || {});
        if (!text) text = (event.response?.output || []).flatMap(i => i.content || []).map(c => c.text || '').join('');
      }
    }
    if (buffer.length > 4 * 1024 * 1024 || text.length > 1024 * 1024) throw new Error('ChatGPT response too large');
  }
  if (!completed || !text.trim()) throw new Error('ChatGPT оборвал ответ до завершения.');
  return text;
}
const chatgpt = createChatgptAuth();
module.exports = { chatgpt, createChatgptAuth, readResponseStream, verifyIdentity };
