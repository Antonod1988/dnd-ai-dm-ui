const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const engine = require('./game-engine');
const { chatgpt } = require('./chatgpt-auth');
const rootDir = path.resolve(__dirname, '..');
const publicFiles = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css'], ['/app.js', 'app.js'], ['/auth-ui.js', 'auth-ui.js'], ['/dialogue-ui.js', 'dialogue-ui.js']]);

async function createAlphaServer({ port = 8788 } = {}) {
  await chatgpt.status();
  let queue = Promise.resolve();
  const serialize = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  const server = http.createServer((req, res) => {
    route(req, res, serialize).catch(error => {
      if (!res.headersSent) sendJson(res, error.status || 500, { error: error.status ? error.message : 'Операция не завершена. Проверьте вход ChatGPT, выбранную модель и лимиты; сохранённое состояние не изменено.' });
      else res.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  return server;
}

async function route(req, res, serialize) {
  const port = req.socket.localPort;
  if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) return sendJson(res, 403, { error: 'Forbidden host' });
  const origin = `http://${req.headers.host}`;
  const url = new URL(req.url, origin);
  // Embedded browsers can submit a same-origin form with an opaque Origin.
  // Accept that only when the browser's Fetch Metadata attests same-origin.
  const sameOriginOpaque = req.headers.origin === 'null' && req.headers['sec-fetch-site'] === 'same-origin';
  const crossOrigin = req.headers.origin && req.headers.origin !== origin && !sameOriginOpaque;
  const crossSite = req.headers['sec-fetch-site'] === 'cross-site';
  if (url.pathname !== '/auth/callback' && (crossOrigin || crossSite)) return sendJson(res, 403, { error: 'Forbidden origin' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://auth.openai.com");
  if (req.method === 'GET' && url.pathname === '/auth/callback') {
    try {
      await chatgpt.callback(url.searchParams);
      res.writeHead(303, { location: '/?chatgpt=returned' }); res.end();
    } catch {
      res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html lang="ru"><meta charset="utf-8"><title>ChatGPT</title><p>Вход не подтверждён или истёк. Вернитесь в игру и повторите вход.</p><a href="/">Вернуться в игру</a></html>');
    }
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/start') {
    if (!req.headers.origin || (req.headers.origin !== origin && !sameOriginOpaque)) return sendJson(res, 403, { error: 'Open sign-in from the game UI' });
    const body = new URLSearchParams(await readBody(req));
    const authorize = await chatgpt.begin(`http://127.0.0.1:${port}`, body.get('accountId') || '');
    res.writeHead(303, { location: authorize }); res.end(); return;
  }
  if (req.method === 'GET' && url.pathname === '/api/auth/status') return sendJson(res, 200, await chatgpt.status());
  if (req.method === 'GET' && url.pathname === '/api/auth/models') return sendJson(res, 200, { models: await chatgpt.models() });
  if (req.method === 'GET' && url.pathname === '/api/dnd/options') return sendJson(res, 200, await require('./srd-engine').setupOptions());
  if (req.method === 'GET' && url.pathname === '/api/discussion/status') return sendJson(res, 200, await serialize(() => require('./discussion-service').status()));
  if (req.method === 'GET' && url.pathname === '/api/dnd/state') return sendJson(res, 200, await serialize(() => require('./srd-engine').getState(url.searchParams.get('campaignId') || undefined)));
  if (req.method === 'POST') {
    if (!req.headers['content-type']?.startsWith('application/json')) return sendJson(res, 415, { error: 'Expected JSON' });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return sendJson(res, 400, { error: 'Expected object' });
    const discussion = require('./discussion-service');
    const discussionRoutes = { '/api/discussion/start': () => discussion.start(body.topic), '/api/discussion/next': () => discussion.advance(), '/api/discussion/intervene': () => discussion.interrupt(body.text), '/api/discussion/decide': () => discussion.decide(body.proposalId, body.decision) };
    if (discussionRoutes[url.pathname]) return sendJson(res, 200, await serialize(discussionRoutes[url.pathname]));
    if (url.pathname === '/api/dnd/new-campaign') return sendJson(res, 200, await serialize(() => require('./srd-engine').createCampaign(body)));
    if (url.pathname === '/api/dnd/command') return sendJson(res, 200, await serialize(() => require('./srd-engine').command(body)));
    if (url.pathname === '/api/dnd/spell/preview') return sendJson(res, 200, require('./generated-effects').validateSpell(body));
    if (url.pathname === '/api/auth/model') { await chatgpt.selectModel(body.model); return sendJson(res, 200, await chatgpt.status()); }
    if (url.pathname === '/api/auth/switch') { await chatgpt.switchAccount(body.accountId); return sendJson(res, 200, await chatgpt.status()); }
    if (url.pathname === '/api/auth/logout') { await chatgpt.signOut(); return sendJson(res, 200, await chatgpt.status()); }
    const mutations = {
      '/api/action': () => engine.handleTurn(body),
      '/api/new-campaign': () => engine.startNewCampaign(body),
      '/api/reset': () => engine.resetCampaign(),
      '/api/generate': () => engine.generateContent(body.type)
    };
    if (mutations[url.pathname]) return sendJson(res, 200, await serialize(mutations[url.pathname]));
  }
  if (req.method === 'GET' && url.pathname === '/api/state') return sendJson(res, 200, await serialize(() => engine.getView(url.searchParams.get('screen'))));
  if (req.method === 'GET' && url.pathname === '/api/setup-options') return sendJson(res, 200, engine.getSetupOptions());
  if (req.method === 'GET') {
    const relative = publicFiles.get(url.pathname);
    if (relative) {
      const bytes = await fs.readFile(path.join(rootDir, relative));
      const type = relative.endsWith('.html') ? 'text/html' : relative.endsWith('.css') ? 'text/css' : 'text/javascript';
      res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }); res.end(bytes); return;
    }
  }
  sendJson(res, 404, { error: 'Not found' });
}

async function readBody(req) {
  let length = 0; const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 64 * 1024) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}
module.exports = { createAlphaServer };
