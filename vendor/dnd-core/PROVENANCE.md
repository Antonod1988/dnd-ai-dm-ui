# Rules engine provenance

Source: user's `dnd-rpg-cli-mcp` repository, committed snapshot `905beabe71de91f3b1af0b30ba284d942787352b`.

Only `src/core/` and its MIT license were imported with `git archive`. Uncommitted edits, credentials, saves, browser/CLI providers and application assets were not imported. This snapshot is independent of the adjacent checkout.

Application-specific world, quest, dialogue and memory logic stays in the adapter. `entry.ts` and `scripts/build-rules.js` compile the source into an ESM module; built output is not committed.

One storage fix is applied in the snapshot: `state/store.ts` writes the SQLite export to a temporary file and renames it, avoiding a partially overwritten database after interruption.
Trailing spaces in four upstream TypeScript files have also been normalized; no rules logic was changed by that formatting step.

Two rules corrections are applied locally: level-one armor class is calculated from the final racial ability scores and equipped armor, and combat completion records an explicit victory/retreat/defeat outcome. The adapter awards victory objectives only for an actual victory. Inventory-use and armor-class helpers are exported so the UI uses the same authoritative rules.

The adapter also imports the existing effective-armor and removed-effect condition cleanup helpers. The cleanup helper was exported without changing its rules behavior, so elapsed exploration time removes an effect and its associated condition consistently with combat expiration.

The main adventure opts into explicit player turn completion with `ui_player_turn_control`: spending an action preserves the living player's remaining bonus action/movement until End Turn. Other callers retain the snapshot's automatic behavior. Typed inventory defense/attack/save bonuses can also be prepared outside combat, using the same consumption and duration fields; combat effects are mirrored into the party sheet. The adapter routes combat inventory use through the existing action-cost resolver. XP thresholds and inventory merging are exported for progression UI and durable loot.

The economy adapter imports the existing pure long-rest and state ability-check helpers (including bonus consumption and roll-log construction) through `entry.ts`; these exports do not modify their rules behavior. Market finances, stock, services and the optional comfortable-rest bonus are application mechanics in `src/adventure-economy.js`.

The adapter additionally exports existing incapacitation and reaction-spending helpers for original casting and accurate UI action costs. This changes no upstream helper behavior. Catalog combat casts in the application now use the existing chooseAction path rather than the direct castSpell resolver; original spells synchronize spent slot resources into combatants before normal party synchronization.

## SRD attribution

This work includes material from the System Reference Document 5.1 (SRD 5.1) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

The SRD text has been represented as executable rules and structured game content. Original compatible content and application code remain under their respective MIT licenses. This project is unofficial and does not include an endorsement by Wizards of the Coast.
