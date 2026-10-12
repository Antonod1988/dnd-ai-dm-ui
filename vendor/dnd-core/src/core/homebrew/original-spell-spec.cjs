const { z } = require('zod');
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
  return errors.length ? { ok: false, errors } : { ok: true, spell, power, allowedPower };
}

module.exports = { validateSpell, spellSchema };
