function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollD20(modifier = 0, label = "Check", dc = 15) {
  const die = rollDie(20);
  const total = die + modifier;
  return {
    id: `roll-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    die,
    modifier,
    total,
    dc,
    success: total >= dc,
    formula: `${label}: d20 ${die} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total} против DC ${dc}`
  };
}

function rollDamage(count, sides, modifier = 0) {
  const dice = Array.from({ length: count }, () => rollDie(sides));
  const total = dice.reduce((sum, value) => sum + value, 0) + modifier;
  return { dice, modifier, total, formula: `${count}d${sides}${modifier ? `+${modifier}` : ""} = ${total}` };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spendSpellSlot(hero, level) {
  const key = String(level);
  const slot = hero.resources?.spellSlots?.[key];
  if (!slot || slot.used >= slot.max) return false;
  slot.used += 1;
  return true;
}

function restoreHero(hero) {
  hero.hp = hero.maxHp;
  if (hero.resources?.spellSlots) {
    for (const slot of Object.values(hero.resources.spellSlots)) {
      slot.used = 0;
    }
  }
  hero.conditions = ["Долгий отдых завершён"];
  hero.ac = hero.baseAc;
  hero.resources.concentration = null;
}

module.exports = {
  abilityMod,
  rollDie,
  rollD20,
  rollDamage,
  clamp,
  spendSpellSlot,
  restoreHero
};
