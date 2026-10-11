(() => {
  const dialog = document.querySelector('#aiSettings');
  const status = document.querySelector('#authStatus');
  const accounts = document.querySelector('#chatgptAccount');
  const models = document.querySelector('#chatgptModel');
  const signInId = document.querySelector('#signInAccountId');
  const signOut = document.querySelector('#signOutChatgpt');
  const reload = document.querySelector('#reloadModels');
  let snapshot;
  let loading = false;
  let modelAccount = '';
  const option = (value, label) => new Option(label, value);

  async function request(route, body) {
    const response = await fetch(`/api/auth/${route}`, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }
  async function refresh(loadModels = false) {
    if (loading) return;
    loading = true;
    try {
      snapshot = await request('status');
      document.querySelector('#authUsage').textContent = snapshot.usage
        ? `Последний запрос: ${snapshot.usage.inputTokens ?? '—'} входных и ${snapshot.usage.outputTokens ?? '—'} выходных токенов. Данные провайдера; это не сумма за всю игровую сессию.`
        : 'Расход последнего запроса появится после ответа AI, если провайдер вернёт счётчики.';
      const previous = accounts.value;
      accounts.replaceChildren(...snapshot.accounts.map(a => option(a.id, `${a.label} · ${a.registration}${a.connected ? '' : ' · нужен вход'}`)), option('', 'Добавить аккаунт / рабочее пространство'));
      accounts.value = snapshot.activeId || previous || '';
      signInId.value = accounts.value;
      signOut.hidden = !snapshot.accounts.find(a => a.id === snapshot.activeId)?.connected;
      reload.hidden = !snapshot.connected;
      status.textContent = snapshot.error || (snapshot.pending ? 'Завершите вход в открывшейся вкладке OpenAI.' : snapshot.connected ? 'ChatGPT подключён. Выберите модель для игры.' : 'ChatGPT не подключён. Игра работает с локальными шаблонами.');
      if (!snapshot.connected) { models.replaceChildren(option('', 'Сначала войдите')); models.disabled = true; modelAccount = ''; }
      else if (loadModels || modelAccount !== snapshot.activeId) await populateModels();
      await refreshState();
    } catch (error) { status.textContent = error.message; }
    finally { loading = false; }
  }
  async function populateModels() {
    const catalog = await request('models');
    models.replaceChildren(option('', 'Выберите модель'), ...catalog.models.map(m => option(m.id, m.name)));
    models.value = snapshot.model || '';
    models.disabled = false;
    modelAccount = snapshot.activeId;
    if (!catalog.models.length) status.textContent = 'Аккаунт не вернул доступных моделей. Проверьте план и разрешение на использование.';
  }
  document.querySelector('.provider-pill').addEventListener('click', () => { dialog.showModal(); refresh(true); });
  document.querySelector('#closeAiSettings').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
  accounts.addEventListener('change', async () => {
    signInId.value = accounts.value;
    if (!accounts.value) return;
    try { await request('switch', { accountId: accounts.value }); modelAccount = ''; await refresh(true); }
    catch (error) { status.textContent = error.message; }
  });
  models.addEventListener('change', async () => {
    if (!models.value) return;
    try { await request('model', { model: models.value }); status.textContent = 'Модель сохранена. Можно продолжать игру.'; }
    catch (error) { status.textContent = error.message; }
  });
  reload.addEventListener('click', () => refresh(true));
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try { await request('logout', {}); modelAccount = ''; await refresh(); }
    catch (error) { status.textContent = error.message; }
    finally { signOut.disabled = false; }
  });
  document.querySelector('#chatgptSignInForm').addEventListener('submit', () => {
    status.textContent = 'Завершите вход и разрешите использование плана во вкладке OpenAI.';
    setTimeout(() => refresh(), 1000);
  });
  setInterval(() => { if (dialog.open && !busy) refresh(); }, 3000);
  if (new URLSearchParams(location.search).get('chatgpt') === 'returned') { history.replaceState(null, '', '/'); dialog.showModal(); refresh(true); }
})();
