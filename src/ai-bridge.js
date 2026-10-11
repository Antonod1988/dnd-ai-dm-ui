const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chatgpt } = require('./chatgpt-auth');

const rootDir = path.resolve(__dirname, "..");
loadLocalEnv(path.join(rootDir, ".env.local"));

function getAiConfig() {
  const provider = (chatgpt.isEnabled() ? 'chatgpt' : process.env.AI_PROVIDER || "fallback").toLowerCase();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 120000);
  return {
    provider,
    modelLabel: provider === 'chatgpt' ? chatgpt.modelLabel() : '',
    usage: provider === 'chatgpt' ? chatgpt.lastUsage() : null,
    timeoutMs,
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-5.2",
      baseUrl: trimTrailingSlash(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
    },
    compatible: {
      apiKey: process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.LOCAL_AI_API_KEY,
      model: process.env.AI_MODEL || process.env.OPENROUTER_MODEL || process.env.LOCAL_AI_MODEL,
      baseUrl: trimTrailingSlash(process.env.AI_BASE_URL || process.env.OPENROUTER_BASE_URL || "")
    },
    local: {
      apiKey: process.env.LOCAL_AI_API_KEY || "local",
      model: process.env.LOCAL_AI_MODEL || process.env.AI_MODEL || "qwen3:8b",
      baseUrl: trimTrailingSlash(process.env.LOCAL_AI_BASE_URL || "http://127.0.0.1:11434/v1")
    },
    cliCommand: process.env.DND_AI_COMMAND || ""
  };
}

async function resolveIntent(input, context, availableActions) {
  const config = getAiConfig();
  const fallback = () => fallbackResolveIntent(input, availableActions);
  if (!isConfigured(config)) return fallback();

  const prompt = {
    task: "resolve_player_intent",
    instruction: 'Return JSON only with this exact schema: {"kind":"actionId","actionId":"one exact id from availableActions","confidence":"high","reason":"brief explanation"}. If no available action fits, return {"kind":"clarify","question":"a short Russian question"}. Never narrate. Never invent mechanics or action ids.',
    input,
    scene: context.scene,
    hero: summarizeHero(context.hero),
    availableActions: availableActions.map(({ id, label, kind, description }) => ({ id, label, kind, description })),
    memory: context.memory
  };

  try {
    const text = await callConfiguredProvider(config, prompt, "intent");
    const intent = normalizeIntent(parseJsonLoose(text), availableActions);
    if (!intent && config.provider === 'chatgpt') throw Object.assign(new Error('ChatGPT вернул неподдержанное действие. Повторите запрос.'), { status: 502 });
    return intent || fallback();
  } catch (error) {
    if (config.provider === 'chatgpt') throw Object.assign(error, { status: 502 });
    return fallback();
  }
}

async function generateNarration(state, actionResult) {
  const config = getAiConfig();
  if (!isConfigured(config)) return fallbackNarration(state, actionResult);

  const prompt = {
    task: "generate_scene_narration",
    instruction: "Speak Russian. Write 1-3 compact paragraphs for the player. Preserve all engine numbers exactly. Do not invent HP, XP, items, conditions or victory. Return JSON: {\"narration\":\"...\",\"choices\":[{\"label\":\"...\",\"intent\":\"...\",\"likelyActionId\":\"...\"}]}",
    scene: state.scene,
    hero: summarizeHero(state.hero),
    memory: require('./context-memory').buildContext(state, actionResult.narrationHook || ''),
    actionResult
  };

  try {
    const text = await callConfiguredProvider(config, prompt, "narration");
    const parsed = parseJsonLoose(text);
    if (parsed && typeof parsed.narration === "string") {
      return {
        narration: parsed.narration,
        choices: Array.isArray(parsed.choices) ? parsed.choices.slice(0, 6) : []
      };
    }
  } catch (error) {
    if (config.provider === 'chatgpt') throw Object.assign(error, { status: 502 });
    // fall through to deterministic narration
  }
  if (config.provider === 'chatgpt') throw Object.assign(new Error('ChatGPT вернул некорректное повествование. Повторите запрос.'), { status: 502 });
  return fallbackNarration(state, actionResult);
}

async function generateStructured(type, promptPayload, fallbackFactory) {
  const config = getAiConfig();
  if (!isConfigured(config)) return fallbackFactory();

  const prompt = {
    task: `generate_${type}`,
    instruction: "Return JSON only. Draft flavour is allowed, but mechanics will be validated and clamped by the engine.",
    payload: promptPayload
  };

  try {
    const text = await callConfiguredProvider(config, prompt, type);
    const draft = parseJsonLoose(text);
    if(type==='master_question'&&(!draft||typeof draft==='string')) {
      const answer=(typeof draft==='string'?draft:String(text||'')).trim();
      if(answer&&answer.length<=6000&&!/^[\[{]|^```/.test(answer))return {narration:answer};
    }
    if ((!draft || typeof draft !== 'object' || Array.isArray(draft)) && config.provider === 'chatgpt') throw new Error('ChatGPT вернул некорректные данные. Повторите запрос.');
    return draft || fallbackFactory();
  } catch (error) {
    if (config.provider === 'chatgpt') throw Object.assign(error, { status: 502 });
    return fallbackFactory();
  }
}

function fallbackResolveIntent(input, availableActions) {
  const normalized = String(input || "").toLowerCase();
  const byId = (id) => availableActions.find((action) => action.id === id);
  const matchLabel = availableActions.find((action) => {
    const label = `${action.label} ${action.description || ""}`.toLowerCase();
    return normalized && label.includes(normalized);
  });
  if (matchLabel) return { kind: "actionId", actionId: matchLabel.id, confidence: "medium", reason: "Совпадение с подписью действия." };

  const patterns = [
    [/атак|удар|бей|сраж|fight|attack/, "attack"],
    [/заклин|маг|spell|cast|missile/, "cast_spell"],
    [/осмотр|изуч|провер|след|investig|inspect|look/, "inspect_scene"],
    [/говор|спрос|убежд|talk|ask|persuad/, "talk"],
    [/союз|совет|party|ally/, "ask_allies"],
    [/журнал|запис|fact|note/, "open_journal"],
    [/отдых|сон|rest/, "rest_long"],
    [/инвент|предмет|item|potion/, "open_inventory"],
    [/враг|монстр|enemy|monster/, "generate_enemy"],
    [/npc|персонаж|жител|свидетел/, "generate_npc"],
    [/лут|награ|предмет|item/, "generate_item"],
    [/иди|пойти|дорог|русл|travel|go/, "travel_river"],
    [/сохран|save/, "save"]
  ];
  for (const [pattern, id] of patterns) {
    if (pattern.test(normalized) && byId(id)) {
      return { kind: "actionId", actionId: id, confidence: "medium", reason: "Локальный intent resolver." };
    }
  }
  return { kind: "clarify", question: "Уточни действие героя. В локальном режиме можно выбрать кнопку действия или подключить ChatGPT для свободного ввода." };
}

function fallbackNarration(state, actionResult) {
  const changes = actionResult.mechanicalEvents.length
    ? actionResult.mechanicalEvents.map((event) => event.text).join(" ")
    : "Состояние мира обновлено без числовых изменений.";
  const enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  const pressure = enemies.length
    ? ` Перед вами остаётся ${enemies.map((enemy) => `${enemy.name} (${enemy.hp}/${enemy.maxHp} HP)`).join(", ")}.`
    : "";
  return {
    narration: `${actionResult.narrationHook} ${changes}${pressure}`,
    choices: []
  };
}

async function callConfiguredProvider(config, payload, purpose) {
  if (config.provider === 'chatgpt') return chatgpt.infer(payload, config.timeoutMs);
  if (config.provider === "openai") {
    return callOpenAiResponses(config.openai, payload, config.timeoutMs);
  }
  if (config.provider === "openai_compatible") {
    return callOpenAiCompatible(config.compatible, payload, config.timeoutMs);
  }
  if (config.provider === "local") {
    return callOpenAiCompatible(config.local, payload, config.timeoutMs);
  }
  if (config.provider === "cli") {
    return callCli(config.cliCommand, payload, config.timeoutMs, purpose);
  }
  return "";
}

async function callOpenAiResponses(settings, payload, timeoutMs) {
  if (!settings.apiKey) throw new Error("OPENAI_API_KEY is missing");
  const response = await fetchWithTimeout(`${settings.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      instructions: "You are an AI Dungeon Master helper. Follow JSON contracts exactly when asked.",
      input: JSON.stringify(payload)
    })
  }, timeoutMs);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `OpenAI HTTP ${response.status}`);
  return json.output_text || extractResponseText(json) || "";
}

async function callOpenAiCompatible(settings, payload, timeoutMs) {
  if (!settings.baseUrl || !settings.model) throw new Error("AI_BASE_URL/AI_MODEL is missing");
  const response = await fetchWithTimeout(`${settings.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey || "local"}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: "You are an AI Dungeon Master helper. Follow JSON contracts exactly when asked." },
        { role: "user", content: JSON.stringify(payload) }
      ],
      temperature: 0.7
    })
  }, timeoutMs);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `AI HTTP ${response.status}`);
  return json.choices?.[0]?.message?.content || "";
}

function callCli(command, payload, timeoutMs, purpose) {
  if (!command) return Promise.reject(new Error("DND_AI_COMMAND is missing"));
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`CLI AI timeout for ${purpose}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr || `CLI exited with ${code}`));
      else resolve(stdout.trim());
    });
    child.stdin.end(JSON.stringify(payload, null, 2));
  });
}

function isConfigured(config) {
  if (config.provider === 'chatgpt') return chatgpt.isEnabled();
  if (config.provider === "fallback" || config.provider === "off") return false;
  if (config.provider === "openai") return Boolean(config.openai.apiKey);
  if (config.provider === "openai_compatible") return Boolean(config.compatible.baseUrl && config.compatible.model);
  if (config.provider === "local") return Boolean(config.local.baseUrl && config.local.model);
  if (config.provider === "cli") return Boolean(config.cliCommand);
  return false;
}

function normalizeIntent(parsed, availableActions) {
  if (!parsed || typeof parsed !== "object") return null;
  if ((parsed.kind === 'actionId' || parsed.kind === undefined) && typeof parsed.actionId === 'string' && availableActions.some((action) => action.id === parsed.actionId)) {
    return {
      kind: "actionId",
      actionId: parsed.actionId,
      confidence: parsed.confidence || "medium",
      reason: parsed.reason || "AI resolved intent."
    };
  }
  if (["abilityCheck", "savingThrow", "startCombat", "clarify"].includes(parsed.kind)) return parsed;
  return null;
}

function parseJsonLoose(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractResponseText(json) {
  const chunks = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function loadLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function summarizeHero(hero) {
  return {
    name: hero.name,
    className: hero.className,
    level: hero.level,
    hp: `${hero.hp}/${hero.maxHp}`,
    ac: hero.ac,
    conditions: hero.conditions,
    abilities: hero.abilities
  };
}

module.exports = {
  getAiConfig,
  resolveIntent,
  generateNarration,
  generateStructured,
  isConfigured
};
