const crypto = require('node:crypto');
const spec = require('../vendor/dnd-core/src/core/homebrew/original-spell-spec.cjs');
function validateSpell(input) {
  const checked = spec.validateSpell(input);
  return checked.ok ? {...checked, spell: {...checked.spell, id: 'spell-created-' + crypto.randomUUID()}} : checked;
}
async function castGeneratedSpell(original, spellInput, {casterId, targetId, seed} = {}) {
  const ownerId = casterId || original.party.heroId;
  if (spellInput?.ownerId !== undefined && spellInput.ownerId !== ownerId) throw Object.assign(new Error('This spell belongs to a different caster.'), {status: 400});
  const checked = validateSpell(Object.fromEntries(Object.entries(spellInput || {}).filter(([key]) => !['id', 'sourceEventId', 'ownerId', 'sourceId'].includes(key))));
  if (!checked.ok) throw Object.assign(new Error(checked.errors.join(' ')), {status: 400});
  const spell = {...checked.spell, id: spellInput.id || checked.spell.id, ...(spellInput.sourceEventId !== undefined ? {sourceEventId: spellInput.sourceEventId} : {})};
  const core = await import('../vendor/dnd-core/dist/engine.mjs');
  const result = core.castOriginalSpell(original, spell, {casterId: ownerId, targetId, rng: new core.SeededRng(seed === undefined ? crypto.randomUUID() : seed)});
  return {...result,spell:{...result.spell,...(spellInput.ownerId !== undefined ? {ownerId: spellInput.ownerId} : {}),...(spellInput.sourceId !== undefined ? {sourceId: spellInput.sourceId} : {})}};
}
module.exports = {validateSpell, castGeneratedSpell, spellSchema: spec.spellSchema};
