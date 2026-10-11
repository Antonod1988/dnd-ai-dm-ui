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

Each method has its own stable ID, location, optional nearby NPC, skill and DC. Its attempt survives reloads; failure unlocks no discovery and cannot be rerolled by reopening the scene. Another declared method can still work. Only an actual successful declared check advances the objective. An ordinary unrelated ability roll or freeform success claim cannot impersonate it.

The quest card shows methods, their locations/DCs, failed results and available actions. Unopened discoveries stay hidden from the UI and the bounded model context.

## Delivery

Delivery is explicit: an active, currently available delivery objective determines the item and recipient. The player cannot substitute another recipient through a command field. The recipient must be nearby, the hero must be alive/conscious, and the item must actually be held and not equipped/attuned. Delivery is unavailable during combat.

The recipient retains the transferred item snapshot, original inventory ID, source hero, event and turn in the full local save. Public state exposes a count instead of resending the entire possession history. The journal retains the handover. Trust and local reputation rise once for the actual delivery; they do not imply every social feature is implemented.

Revision/operation guards protect a repeated request. Completing the task grants its existing bounded XP/item reward once. A restart retains the completed objectives, evidence and recipient record.

## Limits still open

Alternative methods currently share a check objective. Arbitrary multi-branch negotiation, commodity quantities, NPC-to-player return of delivered objects, quest cancellation and timed failure/recovery need additional mechanics. Describing an item inside a locked cache does not itself create a mechanical lock; explicit access conditions are still a separate task. Older quests with a `talk` report objective retain that schema and are not silently converted to delivery.

These limits are tracked alongside broader combat, survival, social and image work in ROADMAP.md and DEVELOPMENT.md.
