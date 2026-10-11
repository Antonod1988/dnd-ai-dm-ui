const { z } = require('zod');
const crypto = require('node:crypto');

const id = z.string().trim().min(1).max(160);
const propSchema = z.object({
  id, name: z.string().trim().min(1).max(100), aliases: z.array(z.string().trim().min(1).max(80)).max(4).default([]), locationId: id,
  material: z.enum(['ceramic', 'glass', 'wood', 'metal', 'stone', 'cloth']),
  size: z.enum(['tiny', 'small', 'medium', 'large']), weightLb: z.number().finite().min(0.1).max(500),
  portable: z.boolean(), visibility: z.enum(['visible', 'hidden']).default('visible'),
  accessible: z.boolean().default(true), ownerNpcId: id.optional(), anchorId: id.optional()
}).strict();
const physicalSkills = ['athletics', 'acrobatics', 'sleight_of_hand'];
const stepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('take'), propId: id }).strict(),
  z.object({ type: z.literal('drop'), propId: id }).strict(),
  z.object({ type: z.literal('throw'), propId: id, targetId: id }).strict(),
  z.object({ type: z.literal('strike'), propId: id, targetId: id }).strict(),
  z.object({ type: z.literal('check'), propId: id, skill: z.enum(physicalSkills), difficulty: z.enum(['easy', 'medium', 'hard']).default('medium') }).strict()
]);
const planSchema = z.object({ actorId: id.optional(), sourceId: id.optional(), props: z.array(propSchema).max(3).default([]), steps: z.array(stepSchema).min(1).max(3) }).strict();
const limits = { props: 120, npcs: 80, plans: 100, consequences: 200, summaryChars: 1800 };
let corePromise;
const core = () => corePromise ||= import('../vendor/dnd-core/dist/engine.mjs');
function fail(code, message, alternatives = ['Выберите доступный предмет или другую цель.']) {
  throw Object.assign(new Error(message), { interactionRefusal: { code, message, alternatives } });
}
function validatePropDefinition(input) {
  const parsed = propSchema.safeParse(input);
  return parsed.success ? { ok: true, prop: parsed.data } : { ok: false, errors: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`) };
}
function validatePlan(input) {
  const parsed = planSchema.safeParse(input);
  return parsed.success ? { ok: true, plan: parsed.data } : { ok: false, errors: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`) };
}
function store(adventure) {
  adventure.environment ||= { version: 1, props: [], npcStates: [], consequences: [], appliedPlans: [] };
  return adventure.environment;
}
function currentSceneSummary(adventure, { maxChars = limits.summaryChars } = {}) {
  const packet = { locationId: adventure.currentLocationId, props: [], npcs: [] };
  const budget = Math.min(limits.summaryChars, Math.max(256, maxChars));
  const append = (key, entry) => { packet[key].push(entry); if (JSON.stringify(packet).length > budget) packet[key].pop(); };
  for (const p of (adventure.environment?.props || []).filter(p => p.locationId === adventure.currentLocationId && p.visibility === 'visible').slice(0, 8)) {
    append('props', { id: p.id, name: p.name, material: p.material, size: p.size, weightLb: p.weightLb, condition: p.condition, holderId: p.holderId, ownerNpcId: p.ownerNpcId, accessible: p.accessible });
  }
  for (const n of (adventure.environment?.npcStates || []).filter(n => adventure.npcs.some(p => p.id === n.npcId && p.locationId === adventure.currentLocationId && !p.hidden)).slice(0, 4)) {
    append('npcs', { id: n.npcId, hp: n.body.hp, conditions: n.body.conditions, disposition: n.disposition, profile: n.profile });
  }
  return packet;
}
function nearbyNpc(adventure, npcId) {
  return adventure.npcs.find(n => n.id === npcId && n.locationId === adventure.currentLocationId && !n.hidden);
}
function materialize(adventure, plan) {
  const data = store(adventure);
  const normalized = name => String(name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  for (const definition of plan.props) {
    if (data.props.some(p => p.id === definition.id)) fail('prop_exists', 'Этот предмет уже установлен: используйте его сохранённый ID.');
    const names = [definition.name, ...definition.aliases].map(normalized);
    const existing = data.props.find(p => p.locationId === definition.locationId && [p.name, ...(p.aliases || [])].some(name => names.includes(normalized(name))));
    if (existing) fail('prop_alias_exists', 'Предмет с этим названием уже установлен: новое имя или ID не восстанавливает его.', [existing.visibility === 'visible' ? `Используйте сохранённый предмет ${existing.id}.` : 'Сначала установите доступ к существующему предмету.']);
    if(definition.anchorId){
      const anchor=adventure.locations.find(l=>l.id===definition.locationId)?.affordances?.find(a=>a.id===definition.anchorId);
      if(!anchor)fail('unsupported_source','Физический источник этого предмета не установлен.');
      const used=data.props.filter(p=>p.anchorId===definition.anchorId&&(p.originLocationId||p.locationId)===definition.locationId).length;
      if(used>=(anchor.quantity||1))fail('source_exhausted','Все отдельные предметы этого источника уже установлены; новое название не создаёт ещё один.', ['Используйте сохранившийся предмет или другой установленный источник.']);
    }
    if (definition.locationId !== adventure.currentLocationId || !adventure.locations.some(l => l.id === definition.locationId)) fail('remote_prop', 'Новый предмет должен находиться в текущем установленном месте.');
    if (definition.ownerNpcId && !nearbyNpc(adventure, definition.ownerNpcId)) fail('owner_absent', 'Владелец предмета отсутствует в этой сцене.');
    if (!plan.steps.some(s => s.propId === definition.id)) fail('unused_prop', 'Не создавайте предметы, с которыми этот план не взаимодействует.');
    if (data.props.length >= limits.props) fail('prop_limit', 'Достигнут предел сохраняемых предметов сцены.');
    data.props.push({ ...definition, originLocationId:definition.locationId, condition: 'intact', holderId: null });
  }
}
function actorFor(state, adventure, rules) {
  const hero = state.party.members.find(p => p.id === state.party.heroId);
  if (!hero || hero.hp.current <= 0 || rules.isActionIncapacitated(hero)) fail('cannot_act', 'Герой сейчас не может действовать.', ['Нужна помощь или восстановление героя.']);
  if (!adventure.locations.some(l => l.id === adventure.currentLocationId)) fail('unknown_scene', 'Текущее место не установлено.');
  if (!state.combat) return { hero, actor: rules.characterToCombatant(hero) };
  state.combat = rules.ensureTurnBudget(state.combat);
  const actor = rules.currentCombatant(state.combat);
  if ((actor.sourceCharacterId || actor.id) !== hero.id) fail('wrong_turn', 'Сейчас ход другого участника.', ['Дождитесь хода героя.']);
  if (actor.hp.current <= 0 || rules.isActionIncapacitated(actor) || actor.tactics?.surprised) fail('cannot_act', 'Герой сейчас не может действовать.');
  return { hero, actor };
}
function findProp(adventure, propId, heroId) {
  const p = store(adventure).props.find(p => p.id === propId);
  if (!p) fail('prop_absent', 'Такого установленного предмета нет в сцене.');
  if (p.locationId !== adventure.currentLocationId) {
    if (p.holderId === heroId) p.locationId = adventure.currentLocationId;
    else fail('remote_prop', 'Предмет находится в другом месте.');
  }
  if (p.visibility !== 'visible' || !p.accessible) fail('prop_unavailable', 'Предмет скрыт или недоступен.', ['Сначала откройте доступ или выберите видимый предмет.']);
  if (p.condition === 'broken') fail('prop_broken', 'Предмет уже разбит: его нельзя снова использовать как целый.');
  return p;
}
function spend(state, rules, kind) {
  if (!state.combat) return;
  const budget = state.combat.turnBudget;
  const result = kind === 'object' ? rules.spendObjectInteraction(budget) : rules.spendAction(budget, kind === 'attack' ? 'attack' : 'use_object');
  if (!result.ok) fail('no_budget', result.message, ['Завершите ход или выберите действие с оставшимся ресурсом.']);
  state.combat.turnBudget = result.budget;
}
function npcBody(npc,rules){return require('./npc-encounters').createBody(npc,rules);}
function targetFor(state, adventure, targetId, rules) {
  if (state.combat) {
    const target = state.combat.participants.find(p => p.id === targetId || p.sourceCharacterId === targetId);
    if (!target) fail('target_absent', 'Эта цель отсутствует среди участников боя.');
    return target;
  }
  const npc = nearbyNpc(adventure, targetId);
  if (!npc) fail('target_absent', 'Этот персонаж не находится рядом или скрыт.');
  const data = store(adventure);
  let record = data.npcStates.find(n => n.npcId === npc.id);
  if (!record) {
    if (data.npcStates.length >= limits.npcs) fail('npc_limit', 'Достигнут предел сохраняемых физических профилей NPC.');
    record = { npcId: npc.id, profile: npc.combatProfile||'civilian', disposition: 'neutral', body: npcBody(npc, rules) };
    data.npcStates.push(record);
  }
  return record.body;
}
function removeHeldItem(hero, prop) { hero.inventory = hero.inventory.filter(i => i.itemId !== `scene_prop_${prop.id}`); }
function takeItem(hero, prop) {
  hero.inventory.push({ itemId: `scene_prop_${prop.id}`, name: prop.name, quantity: 1, weight: prop.weightLb, tags: ['scene_prop', 'mundane'], description: `${prop.material}; ${prop.size}`, identified: true, source: 'generated' });
}
function requireHeldProjection(hero,prop){
  if(prop.holderId!==hero.id)fail('not_held','Сначала нужно взять предмет.');
  const held=hero.inventory.find(i=>i.itemId===`scene_prop_${prop.id}`&&i.quantity>0);
  if(!held)fail('projection_missing','Этой вещи больше нет у героя.', ['Выберите предмет, который действительно есть у героя.']);
}
function aggression(adventure, target, sourceId, event) {
  const data = store(adventure), npc = nearbyNpc(adventure, target.sourceCharacterId || target.id);
  const targetId = npc?.id || target.id;
  if (!data.consequences.some(c => c.sourceId === sourceId && c.targetId === targetId)) {
    data.consequences.push({ id: `${sourceId}:aggression:${targetId}`, sourceId, actorId: event.actorId, targetId, locationId: adventure.currentLocationId, kind: 'attempted_aggression', witnessResponse: 'local_alarm', damage: event.damage, hpDamage:event.hpDamage });
    data.consequences = data.consequences.slice(-limits.consequences);
    if (npc) { npc.trust = Math.max(-100, (npc.trust || 0) - 20); npc.disposition = 'hostile'; }
  }
  if (npc) {
    let record = data.npcStates.find(n => n.npcId === npc.id);
    if (!record) { record = { npcId: npc.id, profile: 'combat_bound', disposition: 'hostile', body: structuredClone(target) }; data.npcStates.push(record); }
    require('./npc-encounters').updateBody(record,target); record.disposition = 'hostile';
  }
}

async function execute(state, adventure, plan, rules, { dryRun, seed }) {
  materialize(adventure, plan);
  const initialHero = actorFor(state, adventure, rules).hero;
  if (plan.actorId && plan.actorId !== initialHero.id) fail('wrong_actor', 'План может выполнять только текущий герой.');
  const sourceId = plan.sourceId;
  const rng = new rules.SeededRng(seed === undefined ? sourceId : seed);
  const events = [];
  for (const [index, step] of plan.steps.entries()) {
    if (!dryRun && events.length) {
      const liveHero = state.party.members.find(p => p.id === state.party.heroId);
      const liveActor = state.combat ? rules.currentCombatant(state.combat) : liveHero;
      if (liveActor.hp.current <= 0 || rules.isActionIncapacitated(liveActor)) return { state, adventure, events, stoppedAt: index, interruption: 'actor_disabled_after_resolution' };
      if (['throw', 'strike'].includes(step.type)) {
        const liveTarget = state.combat ? state.combat.participants.find(p => p.id === step.targetId || p.sourceCharacterId === step.targetId) : store(adventure).npcStates.find(n => n.npcId === step.targetId)?.body;
        if (liveTarget && !rules.combatantStatusFlags(liveTarget).validAttackTarget) return { state, adventure, events, stoppedAt: index, interruption: 'target_defeated_after_resolution' };
      }
    }
    const { hero, actor } = actorFor(state, adventure, rules);
    const prop = findProp(adventure, step.propId, hero.id);
    if (step.type === 'take') {
      if (!prop.portable || prop.size === 'large') fail('fixed_prop', 'Этот предмет нельзя просто взять.');
      if (prop.weightLb > hero.abilities.str * 5) fail('too_heavy', 'Предмет слишком тяжёл для этого действия.', ['Выберите более лёгкий предмет или отдельный способ перемещения.']);
      if (prop.holderId) fail('already_held', 'Предмет уже удерживает персонаж.');
      if(hero.inventory.some(i=>i.itemId===`scene_prop_${prop.id}`&&i.quantity>0))fail('projection_mismatch','Эта вещь уже числится у героя; её нельзя взять второй раз.');
      if (store(adventure).props.filter(p => p.holderId === hero.id).length >= 2) fail('hands_full', 'Обе руки для предметов сцены уже заняты.');
      spend(state, rules, 'object'); prop.holderId = hero.id; takeItem(hero, prop);
      events.push({ type: 'take', propId: prop.id, actorId: hero.id });
    } else if (step.type === 'drop') {
      requireHeldProjection(hero,prop);
      spend(state, rules, 'object'); prop.holderId = null; removeHeldItem(hero, prop);
      events.push({ type: 'drop', propId: prop.id, actorId: hero.id });
    } else if (step.type === 'check') {
      spend(state, rules, 'check');
      if (dryRun) continue;
      const checked = rules.rollStateAbilityCheck(state, hero, { ability: step.skill === 'athletics' ? 'str' : 'dex', skill: step.skill, dc: { easy: 10, medium: 13, hard: 16 }[step.difficulty], rng, rules: state.campaign.rules });
      state = checked.state;
      const updatedHero = state.party.members.find(p => p.id === hero.id);
      Object.assign(hero, updatedHero);
      if (state.combat) state.combat.participants = state.combat.participants.map(p => p.id === actor.id ? { ...p, activeEffects: structuredClone(updatedHero.activeEffects || []), tactics:{...p.tactics,bardicInspirationDie:updatedHero.bardicInspirationDie} } : p);
      state.rollLog = [...(state.rollLog || []), ...rules.abilityCheckRollLogs(hero.id, `Environment: ${prop.name}`, checked.check)];
      events.push({ type: 'check', propId: prop.id, check: checked.check });
      if (!checked.check.success) return { state, adventure, events, stoppedAt: index, escalation: null };
    } else {
      requireHeldProjection(hero,prop);
      if (!['tiny', 'small'].includes(prop.size) || prop.weightLb > 5) fail('too_heavy', 'Этот предмет слишком велик или тяжёл для простой импровизированной атаки.');
      const target = targetFor(state, adventure, step.targetId, rules);
      if (target.id === actor.id) fail('self_target', 'Для этой атаки нужна другая цель.');
      if (!rules.combatantStatusFlags(target).validAttackTarget) fail('invalid_target', 'Эта цель уже не может быть целью живой атаки.');
      if (rules.isCharmedBySource(actor, target.id)) fail('charmed_target', 'Герой очарован этой целью и не может её атаковать.');
      const distance = state.combat ? rules.combatDistanceBand(state.combat, actor.id, target.id) : 'engaged';
      if (!((step.type === 'throw' ? ['engaged', 'near'] : ['engaged']).includes(distance))) fail('out_of_range', 'Цель вне небольшой дальности этого предмета.', ['Подойдите ближе или используйте подходящее оружие.']);
      const cover = state.combat?.cover?.[actor.id]?.[target.id] || state.combat?.cover?.[target.id]?.[actor.id];
      if (cover === 'total') fail('total_cover', 'Цель полностью закрыта укрытием.');
      spend(state, rules, 'attack');
      if (!dryRun) {
        const attack = { id: `improvised_${sourceId}_${index}_${prop.id}`, name: prop.name, ability: 'str', damageDice: '1d4', damageType: 'bludgeoning', range: step.type === 'throw' ? 'ranged' : 'melee', proficient: false, weaponBonus: 0, damageBonus: 0 };
        if (actor.attacks.some(a => a.id === attack.id)) fail('attack_collision', 'Идентификатор этой атаки уже занят.');
        let combat = state.combat || { id: `interaction_${sourceId}`, round: 1, turnIndex: 0, participants: [actor, target], log: [], environment: { id: adventure.currentLocationId, name: 'Scene interaction', description: '', victory: [], defeat: [] } };
        combat = { ...combat, participants: combat.participants.map(p => p.id === actor.id ? { ...p, attacks: [...p.attacks, attack] } : p) };
        const beforeHp=target.hp.current;
        const resolved = rules.resolveAttack(combat, actor.id, target.id, attack.id, rng, state.campaign.rules);
        resolved.combat.participants = resolved.combat.participants.map(p => p.id === actor.id ? { ...p, attacks: p.attacks.filter(a => a.id !== attack.id) } : p);
        const wasCombat = Boolean(state.combat);
        state = rules.syncPartyFromCombat({ ...state, combat: resolved.combat });
        if (!wasCombat) delete state.combat;
        const event = { type: step.type, propId: prop.id, actorId: hero.id, targetId: target.id, hit: resolved.resolution.hit, damage: resolved.resolution.damage, hpDamage:Math.max(0,beforeHp-resolved.resolution.target.hp.current), attack, resolution: resolved.resolution };
        events.push(event);
        state.rollLog = [...(state.rollLog || []), { id: crypto.randomUUID(), ts: new Date().toISOString(), actorId: hero.id, label: `Improvised: ${prop.name}`, result: resolved.resolution.attackRoll }];
        aggression(adventure, resolved.resolution.target, sourceId, event);
      }
      if (step.type === 'throw') {
        prop.holderId = null; prop.condition = ['ceramic', 'glass'].includes(prop.material) ? 'broken' : 'intact';
        removeHeldItem(state.party.members.find(p => p.id === hero.id), prop);
      }
    }
  }
  return { state, adventure, events, escalation: events.some(e => ['throw', 'strike'].includes(e.type)) ? { kind: 'consider_hostile_response', automatic: false, npcIds: [...new Set(events.filter(e => e.targetId && nearbyNpc(adventure, e.targetId)).map(e => e.targetId))] } : null };
}

async function resolveInteraction({ state, adventure, plan: input, seed }) {
  const checked = validatePlan(input);
  if (!checked.ok) return { ok: false, state, adventure, refusal: { code: 'invalid_plan', message: checked.errors.join('; '), alternatives: ['Уточните предмет, цель и не более трёх действий.'] } };
  const plan = { ...checked.plan, sourceId: checked.plan.sourceId || `interaction-${crypto.randomUUID()}` };
  const previous = adventure.environment?.appliedPlans?.find(p => p.sourceId === plan.sourceId);
  if (previous) return { ok: true, state: structuredClone(state), adventure: structuredClone(adventure), outcome: { ...structuredClone(previous.outcome), replayed: true } };
  try {
    const rules = await core();
    await execute(structuredClone(state), structuredClone(adventure), plan, rules, { dryRun: true, seed });
    const result = await execute(structuredClone(state), structuredClone(adventure), plan, rules, { dryRun: false, seed });
    const escalation = result.escalation || (result.events.some(e => ['throw', 'strike'].includes(e.type)) ? { kind: 'consider_hostile_response', automatic: false, npcIds: [...new Set(result.events.filter(e => e.targetId && nearbyNpc(result.adventure, e.targetId)).map(e => e.targetId))] } : null);
    const outcome = { type: 'environment_interaction', sourceId: plan.sourceId, events: result.events, stoppedAt: result.stoppedAt, interruption: result.interruption, escalation,
      limitations: ['NPC без установленного боевого профиля получает ограниченный профиль мирного жителя; это не полная симуляция профессий и снаряжения.'], text: result.events.map(e => e.type === 'check' ? `${e.check.success ? 'Успех' : 'Неудача'} физической проверки.` : e.type === 'take' ? 'Предмет взят.' : e.type === 'drop' ? 'Предмет оставлен.' : `${e.hit ? 'Попадание' : 'Промах'}: ${e.damage} урона.`).join(' ') };
    store(result.adventure).appliedPlans.push({ sourceId: plan.sourceId, outcome: structuredClone(outcome) });
    result.adventure.environment.appliedPlans = result.adventure.environment.appliedPlans.slice(-limits.plans);
    return { ok: true, state: result.state, adventure: result.adventure, outcome };
  } catch (error) {
    if (!error.interactionRefusal) throw error;
    return { ok: false, state, adventure, refusal: error.interactionRefusal };
  }
}
module.exports = { propSchema, planSchema, validatePropDefinition, validatePlan, currentSceneSummary, resolveInteraction, limits };
