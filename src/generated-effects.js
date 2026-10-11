const { z } = require('zod');
const crypto = require('node:crypto');
const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const damageTypes = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const conditions = ['blinded', 'charmed', 'deafened', 'frightened', 'poisoned', 'prone', 'restrained', 'stunned', 'paralyzed'];
const skills = ['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'];
const dice = z.string().regex(/^[1-9]\d?d(?:4|6|8|10|12)(?:\+[0-9]{1,2})?$/);
const effects = z.discriminatedUnion('type', [
  z.object({ type: z.literal('damage'), dice, damageType: z.enum(damageTypes), halfOnSave: z.boolean().default(false) }).strict(),
  z.object({ type: z.literal('healing'), dice }).strict(),
  z.object({ type: z.literal('temporary_hp'), dice }).strict(),
  z.object({ type: z.literal('condition'), condition: z.enum(conditions), repeatSave: z.boolean().default(true) }).strict(),
  z.object({ type: z.literal('remove_condition'), condition: z.enum(conditions) }).strict(),
  z.object({ type: z.literal('armor'), amount: z.number().int().min(1).max(3) }).strict(),
  z.object({ type: z.literal('speed'), feet: z.number().int().min(5).max(30) }).strict(),
  z.object({ type: z.literal('skill_bonus'), skill: z.enum(skills), dice: z.enum(['1d4', '1d6']) }).strict(),
  z.object({ type: z.literal('resistance'), damageType: z.enum(damageTypes) }).strict(),
  z.object({ type: z.literal('utility'), feature: z.enum(['light', 'water_breathing', 'water_walk', 'see_invisible', 'spider_climb']) }).strict()
]);
const spellSchema = z.object({
  name: z.string().trim().min(1).max(100), description: z.string().min(1).max(1200),
  level: z.number().int().min(0).max(9), rangeFeet: z.number().int().min(0).max(120),
  cost: z.enum(['action', 'bonus_action']).default('action'),
  target: z.enum(['self', 'creature']).default('creature'),
  saveAbility: z.enum(abilities).optional(), durationTurns: z.number().int().min(0).max(10).default(0),
  concentration: z.boolean().default(false), effects: z.array(effects).min(1).max(3)
}).strict();
function diceAverage(value) { const [, count, sides, bonus = '0'] = value.match(/^(\d+)d(\d+)(?:\+(\d+))?$/); return Number(count) * (Number(sides) + 1) / 2 + Number(bonus); }
function validateSpell(input) {
  const parsed = spellSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  const spell = parsed.data, errors = [];
  let power = 0;
  for (const effect of spell.effects) {
    if (effect.dice) power += diceAverage(effect.dice) * (effect.type === 'healing' ? 1.5 : 1);
    if (effect.type === 'condition') {
      power += ['stunned', 'paralyzed'].includes(effect.condition) ? 22 : effect.condition === 'prone' ? 4 : 11;
      if (!spell.saveAbility) errors.push('A hostile condition requires a saving throw.');
      if (effect.condition !== 'prone' && spell.durationTurns === 0) errors.push('An ongoing condition needs a finite duration.');
    }
    if (effect.type === 'armor') power += 8 * effect.amount;
    if (effect.type === 'speed') power += effect.feet / 2;
    if (effect.type === 'resistance') power += 16;
    if (effect.type === 'remove_condition') power += 16;
    if (effect.type === 'utility') power += effect.feature === 'light' ? 0 : 14;
  }
  const allowedPower = spell.level === 0 ? 6.5 : 9 + spell.level * 9;
  if (power > allowedPower) errors.push(`Combined power ${power} exceeds level ${spell.level} budget ${allowedPower}.`);
  const ongoing = spell.effects.some(e => ['armor', 'speed', 'skill_bonus', 'resistance', 'condition'].includes(e.type) && !(e.type === 'condition' && e.condition === 'prone'));
  if (ongoing && !spell.durationTurns) errors.push('An ongoing effect needs a finite duration.');
  if (ongoing && spell.durationTurns > 1 && !spell.concentration) errors.push('Sustained effects require concentration.');
  if (spell.level === 0 && spell.effects.some(e => ['healing', 'temporary_hp', 'remove_condition', 'armor', 'resistance'].includes(e.type))) errors.push('Renewable cantrips cannot provide free healing or persistent defense.');
  if (spell.effects.some(e => e.type === 'damage') && !spell.saveAbility) errors.push('Generated damage spells need a saving throw.');
  if (spell.cost === 'bonus_action' && power > allowedPower * 0.65) errors.push('A bonus-action spell exceeds its speed-adjusted power budget.');
  return errors.length ? { ok: false, errors } : { ok: true, spell: { ...spell, id: `spell-created-${crypto.randomUUID()}` }, power, allowedPower };
}

async function castGeneratedSpell(original, spellInput, { casterId, targetId, seed } = {}) {
  const checked = validateSpell(Object.fromEntries(Object.entries(spellInput).filter(([key]) => !['id', 'sourceEventId'].includes(key))));
  if (!checked.ok) throw Object.assign(new Error(checked.errors.join(' ')), { status: 400 });
  const spell = { ...checked.spell, id: spellInput.id || checked.spell.id };
  const core = await import('../vendor/dnd-core/dist/engine.mjs');
  let state = structuredClone(original);
  const id = casterId || state.party.heroId;
  const hero = state.party.members.find(p => p.id === id);
  if (!hero?.spellcasting) throw new Error('This character has no spellcasting resource.');
  const actor = state.combat ? state.combat.participants.find(p => p.id === id || p.sourceCharacterId === id) : hero;
  if (!actor || actor.hp.current <= 0 || actor.conditions.some(c => ['incapacitated', 'stunned', 'paralyzed', 'unconscious', 'dead'].includes(c))) throw new Error('Caster cannot act.');
  if (state.combat) {
    state.combat = core.ensureTurnBudget(state.combat);
    if (core.currentCombatant(state.combat).id !== actor.id) throw new Error('Not this caster’s turn.');
    const spent = spell.cost === 'bonus_action' ? core.spendBonusAction(state.combat.turnBudget, 'cast_spell') : core.spendAction(state.combat.turnBudget, 'cast_spell');
    if (!spent.ok) throw new Error(spent.message);
    state.combat.turnBudget = spent.budget;
    if (spell.level > 0 && state.flags.generated_leveled_spell_turn === `${state.combat.round}:${actor.id}`) throw new Error('A leveled generated spell was already cast this turn.');
  }
  const slot = hero.spellcasting.slots[String(spell.level)];
  if (spell.level > 0 && (!slot || slot.current <= 0)) throw new Error('No spell slot for this spell level.');
  const targetKey = spell.target === 'self' ? actor.id : targetId;
  let collection = state.combat ? state.combat.participants : state.party.members;
  const target = collection.find(p => p.id === targetKey || p.sourceCharacterId === targetKey);
  if (!target) throw new Error('Choose an existing target.');
  if (target.id !== actor.id && state.combat) {
    const distance = core.combatDistanceBand(state.combat, actor.id, target.id);
    const minimumFeet = { engaged: 5, near: 15, far: 60, out_of_range: Infinity }[distance] ?? Infinity;
    if (minimumFeet > spell.rangeFeet) throw new Error('Target is beyond the spell range.');
  }
  if (spell.level > 0) {
    slot.current -= 1;
    if (actor.spellcasting?.slots[String(spell.level)]) actor.spellcasting.slots[String(spell.level)].current = slot.current;
    if (state.combat) state.flags.generated_leveled_spell_turn = `${state.combat.round}:${actor.id}`;
  }
  const rng = seed === undefined ? undefined : new core.SeededRng(seed);
  const dc = 8 + hero.proficiencyBonus + Math.floor((hero.abilities[hero.spellcasting.ability] - 10) / 2);
  const save = spell.saveAbility ? core.rollSavingThrow(target, { ability: spell.saveAbility, dc, magical: true, rng, rules: state.campaign.rules }) : null;
  const events = [];
  const effectBase = { id: `${spell.id}:${actor.id}`, label: spell.name, sourceId: actor.id, spellId: spell.id, remainingSourceTurnEnds: Math.max(1, spell.durationTurns), expiresAtRestEnd: true };
  if (spell.concentration) {
    if (state.combat) { state.combat = core.removeConcentrationEffectsForSource(state.combat, actor.id).combat; collection = state.combat.participants; }
    else { state.party.members = core.removeConcentrationEffectsForSource({ participants: state.party.members }, actor.id).combat.participants; collection = state.party.members; }
  }
  for (let index = 0; index < spell.effects.length; index++) {
    const effect = spell.effects[index];
    let current = collection.find(p => p.id === target.id);
    const roll = effect.dice && ['damage', 'healing', 'temporary_hp'].includes(effect.type) ? core.rollExpression(effect.dice, { rng }) : null;
    let updated = current;
    if (effect.type === 'damage') {
      const amount = save?.success ? (effect.halfOnSave ? Math.floor(roll.total / 2) : 0) : roll.total;
      updated = core.applyDamage(current, amount, effect.damageType, { rng });
      const actualDamage = current.hp.current + current.hp.temp - updated.hp.current - updated.hp.temp;
      events.push({ type: 'damage', targetId: target.id, amount: actualDamage, rolledAmount: amount, roll, save });
    } else if (effect.type === 'healing') { updated = core.applyHealing(current, roll.total); events.push({ type: 'healing', targetId: target.id, amount: updated.hp.current - current.hp.current, roll }); }
    else if (effect.type === 'temporary_hp') { updated = { ...current, hp: { ...current.hp, temp: Math.max(current.hp.temp, roll.total) } }; events.push({ type: effect.type, amount: roll.total, targetId: target.id }); }
    else if (effect.type === 'remove_condition') { updated = { ...current, conditions: current.conditions.filter(c => c !== effect.condition), conditionInstances: (current.conditionInstances || []).filter(c => c.condition !== effect.condition) }; events.push({ type: effect.type, condition: effect.condition, targetId: target.id }); }
    else {
      if (effect.type === 'condition' && save?.success) { events.push({ type: 'save', targetId: target.id, save }); continue; }
      if (effect.type === 'condition' && current.conditionImmunities?.includes(effect.condition)) { events.push({ type: 'immune', targetId: target.id, condition: effect.condition }); continue; }
      const active = { ...effectBase, id: `${effectBase.id}:${index}`, ...(spell.concentration ? { concentrationSourceId: actor.id } : {}) };
      if (effect.type === 'armor') active.armorClassBonus = effect.amount;
      if (effect.type === 'speed') active.movementFeetBonus = effect.feet;
      if (effect.type === 'skill_bonus') active.abilityCheckSkillBonuses = { [effect.skill]: effect.dice };
      if (effect.type === 'resistance') active.damageResistances = [effect.damageType];
      if (effect.type === 'condition') { active.appliedCondition = effect.condition; if (effect.repeatSave) active.repeatSavingThrow = { ability: spell.saveAbility, dc, timing: 'target_turn_end', removeOnSuccess: true }; }
      if (effect.type === 'utility') Object.assign(active, { light: { brightLightRadiusFeet: 20, dimLightRadiusFeet: 20 }, water_breathing: { canBreatheUnderwater: true }, water_walk: { canWalkOnLiquid: true }, see_invisible: { canSeeInvisible: true }, spider_climb: { canSpiderClimb: true } }[effect.feature]);
      updated = { ...current, activeEffects: [...(current.activeEffects || []).filter(e => e.id !== active.id), active], conditions: effect.type === 'condition' ? [...new Set([...current.conditions, effect.condition])] : current.conditions };
      events.push({ type: effect.type, targetId: target.id, durationTurns: spell.durationTurns });
    }
    const at = collection.findIndex(p => p.id === current.id); collection[at] = updated;
    if (effect.type === 'damage' && state.combat) {
      const actualDamage = current.hp.current + current.hp.temp - updated.hp.current - updated.hp.temp;
      const concentration = core.resolveConcentrationAfterDamage(state.combat, current.id, actualDamage, rng);
      state.combat = concentration.combat; collection = state.combat.participants;
      if (concentration.check) events.push({ type: 'concentration', targetId: current.id, check: concentration.check });
    }
  }
  if (state.combat) state = core.syncPartyFromCombat(state);
  return { state, spell, events, save, slotLevel: spell.level };
}
module.exports = { validateSpell, castGeneratedSpell, spellSchema };
