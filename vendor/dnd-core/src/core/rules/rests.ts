import { rollExpression, type Rng } from "../dice.js";
import { rechargeLongRestInventoryItems } from "../content/items.js";
import type { Character } from "../types.js";
import { abilityModifier, formatModifier } from "./checks.js";
import {
  effectiveHitPointMaximum,
  reduceExhaustion,
  removeExpiredConditionInstances,
  syncConditionInstancesWithConditions
} from "./conditions.js";
import { hasSrdDurableFeat } from "../rulesets/srd5e2014/feats.js";

export type HitDieSpend = {
  die: string;
  roll: ReturnType<typeof rollExpression>;
  healing: number;
};

export type ShortRestResult = {
  character: Character;
  hitDiceSpent: HitDieSpend[];
  healing: number;
};

export function shortRest(character: Character, rng?: Rng): Character {
  return shortRestDetailed(character, { rng }).character;
}

export function shortRestDetailed(
  character: Character,
  options: { rng?: Rng; spendHitDice?: number | "auto" } = {}
): ShortRestResult {
  if (character.hitDice) {
    return spendHitDiceForShortRest(character, options);
  }

  const effectiveMax = effectiveHitPointMaximum(character);
  const healed = Math.max(1, Math.floor(effectiveMax / 4));
  const spellcasting = restoreShortRestSpellcastingSlots(character.spellcasting);
  const rested = removeExpiredConditionInstances({
    ...character,
    hp: {
      ...character.hp,
      current: Math.min(effectiveMax, character.hp.current + healed)
    },
    resources: refreshShortRestResources(character.resources, spellcasting),
    spellcasting
  }, "restEnd");
  return { character: rested, hitDiceSpent: [], healing: Math.max(0, rested.hp.current - character.hp.current) };
}

export function longRest(character: Character): Character {
  const exhaustionAdjusted = removeExpiredConditionInstances(reduceExhaustion(character), "restEnd");
  const restEffectAdjusted = removeRestEndActiveEffects(exhaustionAdjusted);
  const spellcasting = restoreSpellcastingSlots(restEffectAdjusted.spellcasting);
  const effectiveMax = effectiveHitPointMaximum(restEffectAdjusted);
  return syncConditionInstancesWithConditions({
    ...restEffectAdjusted,
    hp: {
      current: restEffectAdjusted.conditions.includes("dead") ? 0 : effectiveMax,
      max: restEffectAdjusted.hp.max,
      temp: 0
    },
    conditions: restEffectAdjusted.conditions.filter((condition) => !longRestClearedConditions.has(condition)),
    resources: resetRelentlessRageDc(
      restEffectAdjusted.resources.map((resource) =>
        resource.refresh === "short_rest" || resource.refresh === "long_rest"
          ? { ...resource, current: resource.max }
          : resource
      )
    ),
    hitDice: restoreLongRestHitDice(restEffectAdjusted.hitDice),
    inventory: rechargeLongRestInventoryItems(restEffectAdjusted.inventory),
    spellcasting
  });
}

const longRestClearedConditions = new Set<string>([
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "dying"
]);

function removeRestEndActiveEffects(character: Character): Character {
  const activeEffects = character.activeEffects ?? [];
  if (activeEffects.length === 0) {
    return character;
  }
  const kept = activeEffects.filter((effect) => !effect.expiresAtRestEnd);
  if (kept.length === activeEffects.length) {
    return character;
  }
  const withoutExpired = {
    ...character,
    activeEffects: kept.length > 0 ? kept : undefined
  };
  return {
    ...withoutExpired,
    hp: {
      ...withoutExpired.hp,
      current: Math.min(withoutExpired.hp.current, effectiveHitPointMaximum(withoutExpired))
    }
  };
}

function spendHitDiceForShortRest(
  character: Character,
  options: { rng?: Rng; spendHitDice?: number | "auto" }
): ShortRestResult {
  const rng = options.rng;
  const hitDice = cloneHitDice(character.hitDice);
  const conMod = abilityModifier(character.abilities.con);
  const maxSpend =
    options.spendHitDice === undefined || options.spendHitDice === "auto"
      ? totalAvailableHitDice(hitDice)
      : Math.max(0, options.spendHitDice);
  const spent: HitDieSpend[] = [];
  let hpCurrent = character.hp.current;
  let remainingSpend = maxSpend;
  const spellcasting = restoreShortRestSpellcastingSlots(character.spellcasting);
  const durableMinimumHealing = hasSrdDurableFeat(character) ? Math.max(2, conMod * 2) : undefined;

  for (const die of Object.keys(hitDice).sort((a, b) => Number.parseInt(b.slice(1), 10) - Number.parseInt(a.slice(1), 10))) {
    const effectiveMax = effectiveHitPointMaximum(character);
    while (hitDice[die].current > 0 && hpCurrent < effectiveMax && remainingSpend > 0) {
      const roll = rollExpression(`${die}${formatModifier(conMod)}`, { rng });
      const healing = Math.max(1, durableMinimumHealing ?? 1, roll.total);
      hitDice[die] = { ...hitDice[die], current: hitDice[die].current - 1 };
      hpCurrent = Math.min(effectiveMax, hpCurrent + healing);
      remainingSpend -= 1;
      spent.push({ die, roll, healing });
    }
  }

  const rested = removeExpiredConditionInstances({
    ...character,
    hp: {
      ...character.hp,
      current: hpCurrent
    },
    hitDice,
    resources: refreshShortRestResources(character.resources, spellcasting),
    spellcasting
  }, "restEnd");

  return {
    character: rested,
    hitDiceSpent: spent,
    healing: Math.max(0, rested.hp.current - character.hp.current)
  };
}

function restoreShortRestSpellcastingSlots(spellcasting: Character["spellcasting"]): Character["spellcasting"] {
  return spellcasting?.preparationMode === "pact" ? restoreSpellcastingSlots(spellcasting) : spellcasting;
}

function refreshShortRestResources(
  resources: Character["resources"],
  spellcasting: Character["spellcasting"]
): Character["resources"] {
  const refreshed = resources.map((resource) =>
    resource.refresh === "short_rest"
      ? { ...resource, current: resource.max }
      : resource
  );
  return resetRelentlessRageDc(syncSpellSlotResourceState(refreshed, spellcasting));
}

function resetRelentlessRageDc(resources: Character["resources"]): Character["resources"] {
  return resources.map((resource) =>
    resource.id === "relentless_rage_dc"
      ? { ...resource, current: 10, max: 10 }
      : resource
  );
}

function syncSpellSlotResourceState(
  resources: Character["resources"],
  spellcasting: Character["spellcasting"]
): Character["resources"] {
  if (!spellcasting) {
    return resources;
  }
  return resources.map((resource) => {
    const match = resource.id.match(/^spell_slots_(\d+)$/);
    const slot = match ? spellcasting.slots[match[1]] : undefined;
    if (!slot) {
      return resource;
    }
    return {
      ...resource,
      current: slot.current,
      max: slot.max,
      refresh: spellcasting.preparationMode === "pact" ? "short_rest" : resource.refresh
    };
  });
}

function cloneHitDice(hitDice: Character["hitDice"]): NonNullable<Character["hitDice"]> {
  return Object.fromEntries(
    Object.entries(hitDice ?? {}).map(([die, pool]) => [die, { ...pool }])
  );
}

function totalAvailableHitDice(hitDice: NonNullable<Character["hitDice"]>): number {
  return Object.values(hitDice).reduce((sum, pool) => sum + pool.current, 0);
}

function restoreLongRestHitDice(hitDice: Character["hitDice"]): Character["hitDice"] {
  if (!hitDice) {
    return undefined;
  }
  const restored = cloneHitDice(hitDice);
  const totalMax = Object.values(restored).reduce((sum, pool) => sum + pool.max, 0);
  let recovery = Math.max(1, Math.floor(totalMax / 2));

  for (const die of Object.keys(restored).sort((a, b) => Number.parseInt(b.slice(1), 10) - Number.parseInt(a.slice(1), 10))) {
    if (recovery <= 0) {
      break;
    }
    const missing = Math.max(0, restored[die].max - restored[die].current);
    const recovered = Math.min(missing, recovery);
    restored[die] = { ...restored[die], current: restored[die].current + recovered };
    recovery -= recovered;
  }

  return restored;
}

function restoreSpellcastingSlots(spellcasting: Character["spellcasting"]): Character["spellcasting"] {
  if (!spellcasting) {
    return undefined;
  }
  return {
    ...spellcasting,
    slots: Object.fromEntries(
      Object.entries(spellcasting.slots).map(([level, slot]) => [level, { ...slot, current: slot.max }])
    )
  };
}
