const API_BASE = '/api';

const dom = {
  provider: document.querySelector(".provider-pill"),
  openSetup: document.querySelector("#openSetup"),
  setupOverlay: document.querySelector("#setupOverlay"),
  setupForm: document.querySelector("#setupForm"),
  closeSetup: document.querySelector("#closeSetup"),
  resetSetup: document.querySelector("#resetSetup"),
  setupPreview: document.querySelector("#setupPreview"),
  brandTitle: document.querySelector(".brand strong"),
  brandSub: document.querySelector(".brand span"),
  modeButtons: document.querySelectorAll("[data-mode]"),
  sceneTitle: document.querySelector("#sceneTitle"),
  sceneSummary: document.querySelector("#sceneSummary"),
  sceneBadges: document.querySelector(".scene-badges"),
  actionToolbar: document.querySelector("#actionToolbar"),
  messageFeed: document.querySelector("#messageFeed"),
  choiceDock: document.querySelector(".choice-dock"),
  composer: document.querySelector("#composer"),
  playerInput: document.querySelector("#playerInput"),
  heroName: document.querySelector(".hero-block h2"),
  heroMeta: document.querySelector(".hero-block p"),
  heroSigil: document.querySelector("#heroSigil"),
  hpValue: document.querySelector("#hpValue"),
  acValue: document.querySelector("#acValue"),
  metricCards: document.querySelectorAll(".metric strong"),
  locationValue: document.querySelector("#locationValue"),
  timeValue: document.querySelector("#timeValue"),
  moneyValue: document.querySelector("#moneyValue"),
  conditionValue: document.querySelector("#conditionValue"),
  abilityGrid: document.querySelector(".ability-grid"),
  alliesList: document.querySelector("#alliesList"),
  enemiesList: document.querySelector("#enemiesList"),
  allyCount: document.querySelector("#allyCount"),
  enemyCount: document.querySelector("#enemyCount"),
  allyPreview: document.querySelector("#allyPreview"),
  enemyPreview: document.querySelector("#enemyPreview"),
  journalList: document.querySelector("#journalList"),
  panelActionsList: document.querySelector("#panelActionsList"),
  inventoryPanel: document.querySelector('[data-panel-content="inventory"] .compact-list'),
  spellsPanel: document.querySelector('[data-panel-content="spells"] .compact-list'),
  rollsPanel: document.querySelector('[data-panel-content="rolls"] .compact-list'),
  notesPanel: document.querySelector('[data-panel-content="notes"] .compact-list')
};

let currentView = null;
let busy = false;
let setupOptions = null;
let journalExpanded = false;

init();

async function init() {
  wireEvents();
  await refreshState();
}

function wireEvents() {
  document.querySelector('#expandJournal').addEventListener('click', () => {
    journalExpanded = !journalExpanded;
    document.querySelector('#expandJournal').textContent = journalExpanded ? 'Свернуть' : 'Все записи';
    renderJournal(currentView?.journal || []);
  });
  document.querySelector('.top-actions [aria-label="Сохранить кампанию"]')?.addEventListener('click', () => { if (!busy) sendAction({ actionId: 'save' }); });
  document.querySelector('.composer [aria-label="Бросок или проверка"]')?.addEventListener('click', () => document.querySelector('[data-panel="rolls"]')?.click());
  dom.composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = dom.playerInput.value.trim();
    if (!input || busy) return;
    if (await sendAction({ input })) dom.playerInput.value = '';
  });

  document.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action-id]");
    if (actionButton && !busy) {
      await sendAction({ actionId: actionButton.dataset.actionId, input: actionButton.dataset.intent || actionButton.textContent.trim() });
      return;
    }

    const legacyChoice = event.target.closest("[data-choice]");
    if (legacyChoice && !busy) {
      await sendAction({ input: legacyChoice.dataset.choice || legacyChoice.textContent.trim() });
    }
  });

  dom.modeButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!busy) {
        try { render(await apiGet(`/state?screen=${button.dataset.mode}`)); }
        catch (error) { appendLocalMessage('system', 'UI', error.message); }
      }
    });
  });

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.panel;
      document.querySelectorAll("[data-panel]").forEach((item) => item.classList.remove("is-active"));
      document.querySelectorAll("[data-panel-content]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      document.querySelector(`[data-panel-content="${panel}"]`)?.classList.add("is-active");
    });
  });

  dom.openSetup?.addEventListener("click", openSetup);
  dom.closeSetup?.addEventListener("click", closeSetup);
  dom.setupOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.setupOverlay) closeSetup();
  });
  dom.resetSetup?.addEventListener("click", () => {
    applySetupDefaults();
    renderSetupPreview();
  });
  dom.setupForm?.addEventListener("input", renderSetupPreview);
  dom.setupForm?.addEventListener("change", renderSetupPreview);
  dom.setupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    await createNewCampaign();
  });
}

async function refreshState() {
  try {
    const view = await apiGet("/state");
    render(view);
  } catch (error) {
    renderConnectionError(error);
  }
}

async function sendAction(payload) {
  if (payload.actionId?.startsWith('show_') || payload.actionId === 'open_journal') {
    try { render(await apiGet(`/state?screen=${payload.actionId === 'open_journal' ? 'journal' : payload.actionId.slice(5)}`)); }
    catch (error) { appendLocalMessage('system', 'UI', error.message); }
    return;
  }
  setBusy(true);
  try {
    const view = await apiPost("/action", payload);
    render(view);
    return true;
  } catch (error) {
    appendLocalMessage("system", "UI", `Ошибка связи с сервером: ${error.message}`);
    return false;
  } finally {
    setBusy(false);
  }
}

async function openSetup() {
  dom.setupOverlay.classList.add("is-open");
  dom.setupOverlay.setAttribute("aria-hidden", "false");
  try {
    if (!setupOptions) {
      setupOptions = await apiGet("/setup-options");
      populateSetupForm();
    }
    renderSetupPreview();
  } catch (error) {
    dom.setupPreview.innerHTML = `<strong>Не удалось загрузить мастер</strong><p>${escapeHtml(error.message)}</p>`;
  }
}

function closeSetup() {
  dom.setupOverlay.classList.remove("is-open");
  dom.setupOverlay.setAttribute("aria-hidden", "true");
}

async function createNewCampaign() {
  setBusy(true);
  try {
    const payload = Object.fromEntries(new FormData(dom.setupForm).entries());
    const view = await apiPost("/new-campaign", payload);
    render(view);
    closeSetup();
  } catch (error) {
    dom.setupPreview.innerHTML = `<strong>Кампания не создана</strong><p>${escapeHtml(error.message)}</p>`;
  } finally {
    setBusy(false);
  }
}

function populateSetupForm() {
  fillSelect("lineageId", setupOptions.lineages);
  fillSelect("classId", setupOptions.classes, (item) => item.backgroundHint);
  fillSelect("backgroundId", setupOptions.backgrounds, (item) => item.note);
  fillSelect("regionId", setupOptions.regions, (item) => item.note);
  fillSelect("toneId", setupOptions.tones, (item) => item.note);
  fillSelect("hookId", setupOptions.hooks, (item) => item.summary);
  applySetupDefaults();
}

function fillSelect(name, items, detail = null) {
  const select = dom.setupForm.elements[name];
  select.innerHTML = items.map((item) => {
    const suffix = detail ? ` — ${detail(item)}` : "";
    return `<option value="${escapeAttr(item.id)}">${escapeHtml(item.label + suffix)}</option>`;
  }).join("");
}

function applySetupDefaults() {
  if (!setupOptions) return;
  for (const [key, value] of Object.entries(setupOptions.defaults || {})) {
    if (dom.setupForm.elements[key]) dom.setupForm.elements[key].value = value;
  }
  dom.setupForm.elements.campaignTitle.value = "";
  dom.setupForm.elements.customRegion.value = "";
}

function renderSetupPreview() {
  if (!setupOptions) return;
  const values = Object.fromEntries(new FormData(dom.setupForm).entries());
  const lineage = findOption(setupOptions.lineages, values.lineageId);
  const heroClass = findOption(setupOptions.classes, values.classId);
  const background = findOption(setupOptions.backgrounds, values.backgroundId);
  const region = findOption(setupOptions.regions, values.regionId);
  const tone = findOption(setupOptions.tones, values.toneId);
  const hook = findOption(setupOptions.hooks, values.hookId);
  const regionText = values.regionId === "custom" && values.customRegion.trim() ? values.customRegion.trim() : region.label;
  dom.setupPreview.innerHTML = `
    <strong>${escapeHtml(values.heroName || "Герой")} · ${escapeHtml(heroClass.label)} · ${escapeHtml(hook.label)}</strong>
    <p>${escapeHtml(lineage.label)}, ${escapeHtml(background.label)}. Регион: ${escapeHtml(regionText)}. Тон: ${escapeHtml(tone.label)}. ${escapeHtml(hook.summary)}</p>
  `;
}

function render(view) {
  currentView = view;
  const hero = view.hero;
  const scene = view.scene;
  const activeEnemies = (view.enemies || []).filter((enemy) => enemy.hp > 0);
  const threats = activeEnemies.length ? activeEnemies : (view.threats || []);

  dom.provider.textContent = view.provider.configured ? `AI: ${view.provider.model || view.provider.id}` : "AI: fallback";
  dom.brandTitle.textContent = `${hero.name}: живая кампания`;
  dom.brandSub.textContent = `День ${view.campaign.day}, ${view.campaign.timeOfDay} · ${scene.location}`;

  dom.sceneTitle.textContent = scene.title;
  dom.sceneSummary.textContent = scene.summary;
  dom.sceneBadges.innerHTML = (scene.badges || []).map((badge) => `<span>${escapeHtml(badge)}</span>`).join("");

  dom.heroName.textContent = hero.name;
  dom.heroMeta.textContent = `${hero.lineage ? `${hero.lineage} · ` : ""}${hero.className} ${hero.level} · ${hero.background} · ${view.campaign.mode}`;
  dom.heroSigil.textContent = hero.name.slice(0, 1).toUpperCase();
  dom.hpValue.textContent = `${hero.hp} / ${hero.maxHp}`;
  dom.acValue.textContent = String(hero.ac);
  if (dom.metricCards[2]) dom.metricCards[2].textContent = `+${hero.initiative}`;
  if (dom.metricCards[3]) dom.metricCards[3].textContent = String(hero.xp);
  dom.locationValue.textContent = scene.location;
  dom.timeValue.textContent = `День ${view.campaign.day}, ${view.campaign.timeOfDay}`;
  dom.moneyValue.textContent = formatMoney(hero.gold);
  dom.conditionValue.textContent = hero.conditions.length ? hero.conditions.join(", ") : "нет";
  document.querySelector('#heroStatus').textContent = hero.hp <= 0 ? 'Нужна помощь' : hero.hp < hero.maxHp ? 'Ранен' : 'В строю';
  document.querySelector('#journalCount').textContent = `${view.journal.length} записей`;
  dom.playerInput.placeholder = `Что делает ${hero.name}?`;

  dom.abilityGrid.innerHTML = Object.values(hero.abilities).map((ability) => `
    <div><span>${escapeHtml(ability.label)}</span><strong>${ability.score}</strong><em>${formatMod(ability.mod)}</em></div>
  `).join("");

  renderModeTabs(view.screen || scene.mode);
  renderButtons(dom.actionToolbar, view.actions.slice(0, 6), "action-button");
  renderButtons(dom.choiceDock, view.choices.slice(0, 6), "choice-card");
  renderMessages(view.messages);
  renderEntities(dom.alliesList, view.allies, "ally");
  renderEntities(dom.enemiesList, threats, activeEnemies.length ? "threat" : "threat");
  renderDashboard(view.allies, threats, activeEnemies.length);
  renderJournal(view.journal);
  renderPanels(view);
}

function renderModeTabs(mode) {
  const active = mode === "combat" ? "combat" : mode === "rest" ? "rest" : mode === "journal" ? "journal" : "scene";
  dom.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === active);
  });
}

function renderButtons(container, actions, className) {
  container.innerHTML = actions.map((action) => `
    <button class="${className}" data-action-id="${escapeAttr(action.id)}" data-intent="${escapeAttr(action.description || action.label)}">
      ${icon(action.icon || "icon-dice")}
      <span>${escapeHtml(action.label)}</span>
    </button>
  `).join("");
}

function renderMessages(messages) {
  dom.messageFeed.innerHTML = messages.map((message) => {
    if (message.type === "system") {
      return `
        <article class="message system">
          <div class="roll-line">
            ${icon("icon-dice")}
            <span>${escapeHtml(message.text)}</span>
          </div>
        </article>
      `;
    }
    return `
      <article class="message ${escapeAttr(message.type)}">
        <div class="message-meta">
          <span>${escapeHtml(message.author)}</span>
          <time>${escapeHtml(message.time || "")}</time>
        </div>
        ${escapeHtml(message.text).split("\n").filter(Boolean).map((line) => `<p>${line}</p>`).join("")}
      </article>
    `;
  }).join("");
  dom.messageFeed.scrollTop = dom.messageFeed.scrollHeight;
}

function renderEntities(container, entities, kind) {
  container.innerHTML = (entities || []).map((entity) => `
    <article class="entity-card ${kind}">
      <div>
        <strong>${escapeHtml(entity.name)}</strong>
        <span>${escapeHtml(entity.role || entity.creatureType || "")}</span>
      </div>
      <em>${escapeHtml(entity.hp !== undefined ? `${entity.hp}/${entity.maxHp} HP` : entity.status || "")}</em>
    </article>
  `).join("") || `<article class="entity-card ${kind}"><div><strong>Нет записей</strong><span>пока пусто</span></div><em>--</em></article>`;
}

function renderDashboard(allies, threats, hasCombatEnemies) {
  dom.allyCount.textContent = `${allies.length} рядом`;
  dom.enemyCount.textContent = hasCombatEnemies ? `${threats.length} в бою` : `${threats.length} угроз`;
  dom.allyPreview.innerHTML = renderPreview(allies[0], "рядом");
  dom.enemyPreview.innerHTML = renderPreview(threats[0], hasCombatEnemies ? "в бою" : "угроза");
}

function renderPreview(entity, fallback) {
  if (!entity) return `<span>нет данных</span><strong>пусто</strong>`;
  return `<span>${escapeHtml(entity.name)}</span><strong>${escapeHtml(entity.status || fallback)}</strong>`;
}

function renderJournal(journal) {
  dom.journalList.innerHTML = (journalExpanded ? journal : journal.slice(0, 8)).map((entry) => `<li>${escapeHtml(entry.text)}</li>`).join("");
}

function renderPanels(view) {
  dom.inventoryPanel.innerHTML = view.inventory.map((item) => `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.status || item.type)}</strong></li>`).join("");
  dom.spellsPanel.innerHTML = view.spells.map((spell) => `<li><span>${escapeHtml(spell.name)}</span><strong>${escapeHtml(spell.status)}</strong></li>`).join("");
  dom.rollsPanel.innerHTML = view.rolls.length
    ? view.rolls.map((roll) => `<li><span>${escapeHtml(roll.label)}</span><strong>${roll.total}</strong></li>`).join("")
    : `<li><span>Бросков пока нет</span><strong>--</strong></li>`;
  dom.panelActionsList.innerHTML = view.actions.map((action) => `<li><span>${escapeHtml(action.description || action.label)}</span><strong>${escapeHtml(action.kind)}</strong></li>`).join("");
  dom.notesPanel.innerHTML = [
    ["Квест", view.quests[0]?.title || "нет"],
    ["Фактов", String(view.facts.length)],
    ["Память", `${view.memory.recentEvents.length} событий`],
    ["Сохранение", "auto"]
  ].map(([label, value]) => `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`).join("");
}

function renderConnectionError(error) {
  dom.provider.textContent = "server offline";
  dom.messageFeed.innerHTML = `
    <article class="message system">
      <div class="roll-line">
        ${icon("icon-save")}
        <span>Локальный сервер не отвечает: ${escapeHtml(error.message)}. Запусти: npm start, затем открой http://127.0.0.1:8788</span>
      </div>
    </article>
  `;
}

function appendLocalMessage(type, author, text) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  article.innerHTML = `
    <div class="message-meta"><span>${escapeHtml(author)}</span><time>${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time></div>
    <p>${escapeHtml(text)}</p>
  `;
  dom.messageFeed.appendChild(article);
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function setBusy(value) {
  busy = value;
  dom.playerInput.disabled = value;
  document.body.classList.toggle("is-busy", value);
  const sendButton = dom.composer.querySelector('.send-button');
  sendButton.disabled = value;
  document.querySelector('#turnStatus').textContent = value ? 'Мастер готовит ответ…' : '';
}

function icon(name) {
  return `<svg><use href="#${escapeAttr(name)}"></use></svg>`;
}

function formatMod(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function formatMoney(gold = {}) {
  const parts = [
    gold.gp ? `${gold.gp} зм` : "",
    gold.sp ? `${gold.sp} см` : "",
    gold.cp ? `${gold.cp} мм` : ""
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "0 зм";
}

function findOption(items, id) {
  return items.find((item) => item.id === id) || items[0] || { label: "", summary: "" };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
