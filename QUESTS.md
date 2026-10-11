# Quests and recorded consequences

The model creates the fiction, titles, people, objects and possible approaches. The game resolves supported mechanics and keeps event evidence. Saying that a task is finished cannot complete it or grant a reward.

## Objective types

| Kind | Target | Evidence |
| --- | --- | --- |
| `visit` | Location ID | Recorded arrival |
| `talk` | NPC ID | Conversation with that nearby NPC |
| `check` | Scene-check ID | Successful persisted check; optionally one of up to three `alternativeTargetIds` |
| `victory` | Location ID | Confirmed won encounter, excluding retreat/defeat |
| `acquire` | World-item ID | Actual pickup into the hero's inventory |
| `deliver` | World-item ID plus NPC `recipientId` | One actual carried item removed from the hero and stored with the nearby recipient |

Sequential objectives become actionable after the earlier steps. Offered quests do not grant progress/rewards until accepted. A previously discovered fact or a previously collected item can satisfy the corresponding newly active objective using its original event. Acquisition reuse also requires that the hero still carries the object. Conversations and deliveries are not retroactively invented.

## Player-chosen approaches

A check objective can declare several genuinely different methods to achieve the same goal. A `manual` scene check rolls only when the player chooses it. Automatic entry, inspection and dialogue checks continue to work separately.

A genuinely new player idea can add a manual check with `alternativeFor` pointing to an existing check goal. It is a new persisted method, not a reroll or an automatic success. It can satisfy the same quest/access check condition without bypassing a separate required key. Self-links, unknown goals and cycles are rejected.

Each method has its own stable ID, location, optional nearby NPC, skill and DC. Its attempt survives reloads; failure unlocks no discovery and cannot be rerolled by reopening the scene. Another declared method can still work. Only an actual successful declared check advances the objective. An ordinary unrelated ability roll or freeform success claim cannot impersonate it.

The quest card shows methods, their locations/DCs, failed results and available actions. Unopened discoveries stay hidden from the UI and the bounded model context.

## Delivery

Delivery is explicit: an active, currently available delivery objective determines the item and recipient. The player cannot substitute another recipient through a command field. The recipient must be nearby, the hero must be alive/conscious, and the item must actually be held and not equipped/attuned. Delivery is unavailable during combat.

The recipient retains the transferred item snapshot, original inventory ID, source hero, event and turn in the full local save. Public state exposes a count instead of resending the entire possession history. The journal retains the handover. Trust and local reputation rise once for the actual delivery; they do not imply every social feature is implemented.

Revision/operation guards protect a repeated request. Completing the task grants its existing bounded XP/item reward once. A restart retains the completed objectives, evidence and recipient record.

## Access to finds

A world item can carry optional `access` data: `mode` (`any` or `all`), up to four `conditions` (`check`, `item`, or `victory` with a stable target ID), a visible description/label and `concealed`.

A check condition uses the real persisted scene-check ledger, not a generic ability roll or narrative claim. A key condition requires that exact world item in the hero's inventory; using it does not consume it. A victory condition requires a recorded victory at the specified place. `any` accepts one route; `all` needs every condition. Impossible circular key dependencies are rejected; a genuine independent alternative can make a cycle reachable.

Before a concealed find opens, its actual name, description and properties are excluded from public item state and the model packet. The UI shows its visible container and unmet conditions. The pickup action is absent and a direct request rejects without a state change. World-item pickup currently occurs outside combat; it cannot bypass the combat action budget. After valid access, the real find and pickup action appear. Reloads preserve check attempts, unlocked evidence and collected state.

Existing items without access fields stay available as before; descriptive prose alone is not used to invent a lock in an old save.

## Limits still open

Alternative methods currently share a check objective. Arbitrary multi-branch negotiation, commodity quantities, NPC-to-player return of delivered objects, quest cancellation and timed failure/recovery need additional mechanics. New closed caches use explicit access conditions; physical obstacle types beyond checks, held keys and victories need further primitives. Older quests with a `talk` report objective retain that schema and are not silently converted to delivery.

These limits are tracked alongside broader combat, survival, social and image work in ROADMAP.md and DEVELOPMENT.md.
