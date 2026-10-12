# Classes and combat

The adventure uses the same persisted character and combat state for its sheet, action dock and magic panel. The model describes the resolved outcome; it cannot waive action costs, create arbitrary resource balances or declare victory by prose.

## Casting and controls

- In combat, a catalog spell selected from the sheet submits an actual engine action, using its current valid target and action/bonus/reaction cost. Direct `cast_spell` commands resolve through the same `chooseAction` path. This preserves turn ownership, slot spending, ready reactions, normal victory/defeat resolution, XP and ground loot.
- Available combat spells are grouped under **Spells available this turn**. The hero sheet stays restricted to the hero's turn; the shared dock preserves a controllable allied caster's actions. This is not a multiplayer implementation.
- Public actions exclude costs that cannot be paid with the current turn budget. That preview uses the engine's action metadata and spend helpers; execution remains authoritative. Extra-action restrictions still apply.
- Original spells choose the lowest remaining slot at or above their authored level. A higher slot pays the spell's cost; it does not silently increase the authored effects. Both party and combatant resource records are updated, so synchronization cannot restore a spent slot. Pact slots recover using normal short-rest mechanics.
- The original-spell turn marker includes the combat ID and is reset on a new encounter. Incapacitated casting uses the same condition helper as the core engine.

## Proven coverage

Isolated tests advance all 12 class foundations to level three through the existing XP progression service, then enter a generated encounter, retreat and reopen SQLite. This proves those routes and saves, not all subclasses or high levels. Specific tests exercise monk Ki, barbarian Rage, fighter Action Surge, cleric bonus casting, warlock higher pact slots and their rest recovery.

Separate regressions cover a spell-panel victory/one-time quest reward/ground loot, rejection of repeated casts and wrong actor/target without saved-resource changes, real Hellish Rebuke reaction costs, prepared Shatter area resolution, and an allied wizard's normal spell action.

Live GPT-6-Luna campaign **Огонь на мосту**, hero **Илия**: a real enemy hit left 5/10 HP. Healing Word from the hero sheet restored 10/10, consumed one slot and only the bonus action. Sacred Flame then consumed the main action and dealt 1 damage. A later ordinary sword attack missed with a roll of 9. No outcome, HP, XP or dice were edited to obtain these results.

## Open limits

- The current generated-spell leveled-cast marker and catalog casting do not yet share a complete SRD bonus-action spell restriction. Broader mixed casting, concentration interactions and high-level features require more coverage.
- Area spells use the core's distance bands from the caster. An enemy-labeled choice does not reposition the area around that enemy; arbitrary area anchoring and tactical coordinates are not implemented.
- Persistent mechanical companions and exact one-shot known-spell orders are integrated. They use their own slots/actions, while humans remain controlled by their player. See [COMPANIONS.md](COMPANIONS.md) and [EXACT_COMPANION_ORDERS.md](EXACT_COMPANION_ORDERS.md). This does not claim remote cooperative play or all class tactics.
- The current class fixtures do not prove every subclass, defeat/revival branch or high-level combination. Live class/adventure testing continues.
