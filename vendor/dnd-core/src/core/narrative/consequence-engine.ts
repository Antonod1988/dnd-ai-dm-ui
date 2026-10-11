import { createAlly } from "../content/classes.js";
import { addInventoryItem, removeInventoryItem } from "../content/items.js";
import { getEncounter } from "../content/monsters.js";
import { rollExpression, type Rng } from "../dice.js";
import { addXp } from "../rules/progression.js";
import { shortRestDetailed } from "../rules/rests.js";
import {
  characterToCombatant,
  runAutomaticTurns,
  startCombat,
  syncCombatantToCharacter
} from "../rules/combat.js";
import {
  addExhaustion,
  applyCondition,
  applyConditionInstance,
  effectiveHitPointMaximum,
  exhaustionLevel,
  normalizeDefeatConditions,
  removeCondition,
  removeConditionInstance,
  removeExpiredConditionInstances,
  syncConditionInstancesWithConditions
} from "../rules/conditions.js";
import { newId, nowIso } from "../util/id.js";
import type {
  Character,
  ConditionInstance,
  Consequence,
  DiscoveredFact,
  GameState,
  JournalEntryInput,
  RollLogEntry
} from "../types.js";

export type ConsequenceContext = {
  rng: Rng;
  reason?: string;
};

export function applyConsequences(
  state: GameState,
  consequences: Consequence[],
  context: ConsequenceContext
): { state: GameState; messages: string[]; rolls: RollLogEntry[] } {
  let current = state;
  const messages: string[] = [];
  const rolls: RollLogEntry[] = [];

  for (const consequence of consequences) {
    switch (consequence.type) {
      case "set_flag": {
        current = { ...current, flags: { ...current.flags, [consequence.key]: consequence.value } };
        break;
      }
      case "clear_sandbox_site_room": {
        if (!current.sandboxWorld) {
          break;
        }
        const location = current.sandboxWorld.locations.find((item) => item.id === consequence.locationId);
        const room = location?.site?.rooms?.find((item) => item.id === consequence.roomId);
        const eventMatches = (eventId: string | undefined, tags: string[]): boolean =>
          Boolean(
            eventId &&
              (eventId === consequence.eventId ||
                (eventId.startsWith("site_complication_") &&
                  tags.includes(consequence.locationId) &&
                  tags.includes(consequence.roomId)))
          );
        current = {
          ...current,
          flags: {
            ...current.flags,
            [`sandbox_site_${consequence.locationId}_${consequence.roomId}_combat_cleared`]: true
          },
          sandboxWorld: {
            ...current.sandboxWorld,
            locations: current.sandboxWorld.locations.map((item) => {
              if (item.id !== consequence.locationId || !item.site?.rooms) {
                return item;
              }
              const rooms = item.site.rooms.map((siteRoom) =>
                siteRoom.id === consequence.roomId ? { ...siteRoom, status: "cleared" as const } : siteRoom
              );
              const allCleared = rooms.every((siteRoom) => siteRoom.status === "cleared");
              return {
                ...item,
                site: {
                  ...item.site,
                  rooms,
                  tags: [...new Set([...item.site.tags, "combat_cleared", ...(allCleared ? ["cleared"] : [])])]
                }
              };
            }),
            events: current.sandboxWorld.events.map((event) =>
              event.status === "active" && eventMatches(event.id, event.tags)
                ? { ...event, status: "resolved" as const, outcome: `Cleared through combat at ${location?.name ?? consequence.locationId}.` }
                : event
            ),
            eventLog: [
              ...current.sandboxWorld.eventLog,
              {
                turn: current.sandboxWorld.calendar.turn,
                eventId: consequence.eventId ?? `site_room_${consequence.locationId}_${consequence.roomId}`,
                message: `Site room cleared through combat: ${location?.name ?? consequence.locationId} - ${room?.title ?? consequence.roomId}.`,
                tags: ["site", "room", "combat", "cleared", consequence.locationId, consequence.roomId]
              }
            ]
          }
        };
        messages.push(`Site room cleared: ${room?.title ?? consequence.roomId}.`);
        break;
      }
      case "advance_clock": {
        const previous = current.clocks?.[consequence.clockId];
        const max = Math.max(1, consequence.max ?? previous?.max ?? 6);
        const value = Math.max(0, Math.min(max, (previous?.value ?? 0) + consequence.amount));
        const completed = value >= max;
        const clock = {
          id: consequence.clockId,
          label: consequence.label ?? previous?.label ?? consequence.clockId,
          value,
          max,
          description: consequence.description ?? previous?.description,
          tags: consequence.tags ?? previous?.tags ?? [],
          completed
        };
        current = {
          ...current,
          clocks: {
            ...(current.clocks ?? {}),
            [clock.id]: clock
          },
          journal: [
            ...current.journal,
            makeJournalEntry({
              kind: "story",
              title: consequence.journalTitle ?? `${clock.label}: ${clock.value}/${clock.max}`,
              body:
                consequence.journalBody ??
                `${clock.label} advances to ${clock.value}/${clock.max}.${completed ? " The clock is now complete." : ""}`,
              tags: ["clock", clock.id, ...clock.tags]
            })
          ]
        };
        messages.push(`${clock.label}: ${clock.value}/${clock.max}.`);
        break;
      }
      case "add_item": {
        const targetId = resolveTargetId(current, consequence.targetId);
        current = updatePartyMember(current, targetId, (character) => ({
          ...character,
          inventory: addInventoryItem(character.inventory, consequence.itemId, consequence.quantity)
        }));
        messages.push(`Item received: ${consequence.itemId} x${consequence.quantity}.`);
        break;
      }
      case "remove_item": {
        const targetId = resolveTargetId(current, consequence.targetId);
        current = updatePartyMember(current, targetId, (character) => ({
          ...character,
          inventory: removeInventoryItem(character.inventory, consequence.itemId, consequence.quantity)
        }));
        break;
      }
      case "damage": {
        const targetId = resolveTargetId(current, consequence.targetId);
        const damageRoll = rollExpression(consequence.amount, { rng: context.rng });
        const logEntry = makeRollLog(targetId, `Damage ${consequence.damageType ?? ""}`.trim(), damageRoll);
        rolls.push(logEntry);
        current = {
          ...updatePartyMember(current, targetId, (character) =>
            normalizeDefeatConditions({
              ...character,
              hp: {
                ...character.hp,
                current: Math.max(0, character.hp.current - Math.max(1, damageRoll.total))
              }
            })
          ),
          rollLog: [...current.rollLog, logEntry]
        };
        messages.push(`Damage received: ${damageRoll.total}.`);
        break;
      }
      case "heal": {
        const targetId = resolveTargetId(current, consequence.targetId);
        const healRoll = rollExpression(consequence.amount, { rng: context.rng });
        const logEntry = makeRollLog(targetId, "Healing", healRoll);
        rolls.push(logEntry);
        current = {
          ...updatePartyMember(current, targetId, (character) =>
            syncConditionInstancesWithConditions({
              ...character,
              hp: {
                ...character.hp,
                current: Math.min(effectiveHitPointMaximum(character), character.hp.current + Math.max(1, healRoll.total))
              },
              conditions: character.conditions.filter(
                (condition) => condition !== "unconscious" && condition !== "dying"
              )
            })
          ),
          rollLog: [...current.rollLog, logEntry]
        };
        messages.push(`HP restored: ${healRoll.total}.`);
        break;
      }
      case "add_condition": {
        const targetId = resolveTargetId(current, consequence.targetId);
        const hasInstanceMetadata = Boolean(
          consequence.instanceId ||
            consequence.sourceId ||
            consequence.sourceType ||
            consequence.appliedBy ||
            consequence.endsOnDamage ||
            consequence.saveEnds ||
            consequence.expiresAt
        );
        current = updatePartyMember(current, targetId, (character) =>
          hasInstanceMetadata
            ? applyConditionInstance(character, {
                id: consequence.instanceId ?? newId("condition"),
                condition: consequence.condition,
                sourceId: consequence.sourceId ?? context.reason ?? current.currentScene.id,
                sourceType: consequence.sourceType ?? "scene",
                appliedBy: consequence.appliedBy,
                endsOnDamage: consequence.endsOnDamage,
                saveEnds: consequence.saveEnds,
                expiresAt: consequence.expiresAt
              })
            : applyCondition(character, consequence.condition)
        );
        messages.push(`Condition: ${consequence.condition}.`);
        break;
      }
      case "remove_condition": {
        const targetId = resolveTargetId(current, consequence.targetId);
        current = updatePartyMember(current, targetId, (character) => {
          const withoutCondition = removeConditionByConsequence(character, consequence);
          return syncConditionInstancesWithConditions({
            ...withoutCondition,
            deathSaves:
              (consequence.condition === "dying" || consequence.condition === "dead") &&
              !withoutCondition.conditions.includes(consequence.condition)
                ? undefined
                : character.deathSaves
          });
        });
        messages.push(`Condition removed: ${consequence.condition}.`);
        break;
      }
      case "add_exhaustion": {
        const targetId = resolveTargetId(current, consequence.targetId);
        let nextLevel = 0;
        current = updatePartyMember(current, targetId, (character) => {
          const updated = addExhaustion(character, consequence.amount ?? 1);
          nextLevel = exhaustionLevel(updated);
          return updated;
        });
        messages.push(`Exhaustion: level ${nextLevel}.`);
        break;
      }
      case "start_combat": {
        const encounter = getEncounter(consequence.encounterId);
        const party = current.party.members.map(characterToCombatant);
        const enemies = encounter.enemies();
        const combat = startCombat([...party, ...enemies], encounter.environment, context.rng);
        const autoCombat = runAutomaticTurns(combat, context.rng, current.campaign.rules);
        current = {
          ...current,
          combat: autoCombat,
          journal: [
            ...current.journal,
            makeJournalEntry({
              kind: "combat",
              title: encounter.title,
              body: encounter.description,
              tags: ["combat", consequence.encounterId]
            })
          ]
        };
        messages.push(`Combat started: ${encounter.title}.`);
        break;
      }
      case "move_scene": {
        const party = {
          ...current.party,
          members: current.party.members.map((member) => removeExpiredConditionInstances(member, "sceneEnd"))
        };
        current = {
          ...current,
          party,
          currentScene: { id: consequence.sceneId, discovered: [] },
          sceneHistory: [...current.sceneHistory, current.currentScene.id]
        };
        break;
      }
      case "add_ally": {
        const ally = createAlly(consequence.allyId);
        if (!current.party.members.some((member) => member.id === ally.id)) {
          current = {
            ...current,
            party: {
              ...current.party,
              members: [...current.party.members, ally]
            }
          };
          messages.push(`${ally.name} joined the party.`);
        }
        break;
      }
      case "reward_xp": {
        const before = current.party.members;
        const after = before.map((member) => addXp(member, consequence.amount));
        const levelUps = after
          .map((member, index) => ({ member, previousLevel: before[index]?.level ?? member.level }))
          .filter((entry) => entry.member.level > entry.previousLevel);
        current = {
          ...current,
          party: {
            ...current.party,
            members: after
          },
          journal: [
            ...current.journal,
            makeJournalEntry({
              kind: "system",
              title: levelUps.length > 0 ? "Level up" : "XP gained",
              body:
                levelUps.length > 0
                  ? `XP +${consequence.amount} each. ${levelUps.map((entry) => `${entry.member.name} reached level ${entry.member.level}`).join("; ")}.`
                  : `XP +${consequence.amount} each.`,
              tags: ["xp", ...(levelUps.length > 0 ? ["level_up"] : [])]
            })
          ]
        };
        messages.push(`Experience: +${consequence.amount}.`);
        if (levelUps.length > 0) {
          messages.push(
            `Level up: ${levelUps.map((entry) => `${entry.member.name} ${entry.previousLevel}->${entry.member.level}`).join(", ")}.`
          );
        }
        break;
      }
      case "complete_campaign": {
        current = {
          ...current,
          campaign: { ...current.campaign, completed: true },
          flags: { ...current.flags, campaign_completed: true }
        };
        break;
      }
      case "discover_fact": {
        if (!current.facts.some((fact) => fact.id === consequence.factId)) {
          const fact = makeDiscoveredFact({
            id: consequence.factId,
            text: consequence.text,
            sourceSceneId: consequence.sourceSceneId ?? current.currentScene.id,
            tags: consequence.tags
          });
          current = { ...current, facts: [...current.facts, fact] };
          messages.push(`Fact discovered: ${fact.text}`);
        }
        break;
      }
      case "journal": {
        current = { ...current, journal: [...current.journal, makeJournalEntry(consequence.entry)] };
        break;
      }
    }
  }

  return { state: current, messages, rolls };
}

type RemoveConditionConsequence = Extract<Consequence, { type: "remove_condition" }>;

function removeConditionByConsequence(character: Character, consequence: RemoveConditionConsequence): Character {
  if (!hasConditionInstanceRemovalFilter(consequence)) {
    return removeCondition(character, consequence.condition);
  }

  const matchingInstances = (character.conditionInstances ?? []).filter((instance) =>
    matchesConditionInstanceRemoval(instance, consequence)
  );
  if (matchingInstances.length === 0) {
    return character;
  }

  let current = character;
  for (const instance of matchingInstances) {
    current = removeConditionInstance(current, instance.id).target;
  }
  return current;
}

function hasConditionInstanceRemovalFilter(consequence: RemoveConditionConsequence): boolean {
  return Boolean(
    consequence.instanceId ||
      consequence.sourceId ||
      consequence.sourceType ||
      consequence.sourceEffectId ||
      consequence.appliedBy
  );
}

function matchesConditionInstanceRemoval(
  instance: ConditionInstance,
  consequence: RemoveConditionConsequence
): boolean {
  return (
    instance.condition === consequence.condition &&
    (!consequence.instanceId || instance.id === consequence.instanceId) &&
    (!consequence.sourceId || instance.sourceId === consequence.sourceId) &&
    (!consequence.sourceType || instance.sourceType === consequence.sourceType) &&
    (!consequence.sourceEffectId || instance.sourceEffectId === consequence.sourceEffectId) &&
    (!consequence.appliedBy || instance.appliedBy === consequence.appliedBy)
  );
}

export function applyShortRestToParty(
  state: GameState,
  rng?: Rng,
  hitDiceToSpendByCharacter?: Record<string, number>
): GameState {
  const hasExplicitHitDiceChoices = hitDiceToSpendByCharacter !== undefined;
  const results = state.party.members.map((member) =>
    shortRestDetailed(member, {
      rng,
      spendHitDice: hasExplicitHitDiceChoices ? Math.max(0, hitDiceToSpendByCharacter[member.id] ?? 0) : "auto"
    })
  );
  const songOfRestDie = songOfRestDieForParty(state.party.members);
  const rested = results.map((result) => applySongOfRest(result, songOfRestDie, rng));
  const hitDiceRolls = results.flatMap((result) =>
    result.hitDiceSpent.map((spent) => makeRollLog(result.character.id, `Hit Die ${spent.die}`, spent.roll))
  );
  const songRolls = rested.flatMap((result) =>
    result.songOfRestRoll ? [makeRollLog(result.character.id, "Song of Rest", result.songOfRestRoll)] : []
  );
  return {
    ...state,
    party: {
      ...state.party,
      members: rested.map((result) => result.character)
    },
    rollLog: [...state.rollLog, ...hitDiceRolls, ...songRolls]
  };
}

function applySongOfRest(
  result: ReturnType<typeof shortRestDetailed>,
  die: string | undefined,
  rng?: Rng
): ReturnType<typeof shortRestDetailed> & { songOfRestRoll?: ReturnType<typeof rollExpression> } {
  if (!die || result.hitDiceSpent.length === 0) {
    return result;
  }
  const effectiveMax = effectiveHitPointMaximum(result.character);
  if (result.character.hp.current >= effectiveMax) {
    return result;
  }
  const songOfRestRoll = rollExpression(die, { rng });
  const current = Math.min(effectiveMax, result.character.hp.current + Math.max(1, songOfRestRoll.total));
  return {
    ...result,
    character: {
      ...result.character,
      hp: {
        ...result.character.hp,
        current
      }
    },
    healing: result.healing + Math.max(0, current - result.character.hp.current),
    songOfRestRoll
  };
}

function songOfRestDieForParty(members: Character[]): string | undefined {
  const bardLevel = Math.max(0, ...members.map((member) => srdClassLevel(member, "class_bard")));
  if (bardLevel < 2) {
    return undefined;
  }
  if (bardLevel >= 17) {
    return "1d12";
  }
  if (bardLevel >= 13) {
    return "1d10";
  }
  if (bardLevel >= 9) {
    return "1d8";
  }
  return "1d6";
}

function srdClassLevel(character: Character, classId: string): number {
  return character.classLevels
    ?.filter((level) => level.classId === classId)
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

export function syncPartyFromCombat(state: GameState): GameState {
  if (!state.combat) {
    return state;
  }
  return {
    ...state,
    party: {
      ...state.party,
      members: state.party.members.map((member) => {
        const combatant = state.combat?.participants.find(
          (participant) => participant.sourceCharacterId === member.id || participant.id === member.id
        );
        return combatant ? syncCombatantToCharacter(member, combatant) : member;
      })
    }
  };
}

export function updatePartyMember(
  state: GameState,
  characterId: string,
  updater: (character: Character) => Character
): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      members: state.party.members.map((member) =>
        member.id === characterId ? updater(member) : member
      )
    }
  };
}

export function makeJournalEntry(input: JournalEntryInput) {
  return {
    id: newId("journal"),
    ts: nowIso(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    tags: input.tags ?? []
  };
}

export function makeDiscoveredFact(input: {
  id: string;
  text: string;
  sourceSceneId?: string;
  tags?: string[];
}): DiscoveredFact {
  return {
    id: input.id,
    text: input.text,
    sourceSceneId: input.sourceSceneId,
    tags: input.tags ?? [],
    revealedAt: nowIso()
  };
}

export function makeRollLog(
  actorId: string | undefined,
  label: string,
  result: RollLogEntry["result"]
): RollLogEntry {
  return {
    id: newId("roll"),
    ts: nowIso(),
    actorId,
    label,
    result
  };
}

function resolveTargetId(state: GameState, targetId?: string): string {
  if (!targetId || targetId === "hero") {
    return state.party.heroId;
  }
  return targetId;
}
