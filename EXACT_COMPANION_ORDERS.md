# Exact companion spell orders

The Party section separates ongoing combat preferences from an exact spell instruction. The player selects a genuinely available spell/target pair, or names that request in free text. The same intent request may compile it into `party_order` / `mode:cast`; speech does not cast immediately.

## One actual attempt

Only a registered, joined, local, visible, cooperative, conscious NPC may receive a cast instruction during the hero's own combat turn. A pure preview reads that NPC's current known/prepared spells, resources, targets and positions using a disposable prospective-turn view. It changes no real round, body, budget, roll or slot. The command stores exact action, directive and combat IDs.

Execution occurs on that NPC's actual automatic turn. The shared casting resolver pays its action/bonus cost and its own slot, handles target state, range, cover, charm restrictions, Counterspell and readied reactions, and records the outcome. Conditions are checked again after turn-start reactions. A dead/moved/covered target or depleted slot can invalidate the earlier preview. Refusal ends the instruction without substituting another spell, target or attack. A nonreviving death-save turn also cancels it; a natural20 revival may permit the remaining actual turn.

The directive is consumed once, even after saving/reopening; the preference returns to Auto. This exact instruction occupies the NPC's automatic turn: after a bonus spell it currently leaves the main action unused. Existing Support remains the mode for ordinary bonus healing plus Dodge. A different preference, departure or encounter ends a pending instruction. Matching actor/directive/combat/action IDs distinguish actual results from stale flags.

Only the two order/result flags are carried through core hooks into saved state; campaign metadata, script/surprise flags and terminal NPC snapshots are retained. The journal stores a separate actual `party_order_result`, its actor, exact requested action and resolved/refused/cancelled status. Queue events retain `instructionOnly:true`; placing a request never proves its execution.

## Areas and healing

Sleep and Color Spray now include eligible allies in the common resolver. A player or NPC request with exposed allies requires explicit permission. The checkbox grants permission for this attempt; it does not change the spell's targets. The NPC rechecks the current footprint at its turn, so an ally who entered later can cause refusal.

The current area approximation uses distance bands relative to the caster and excludes the caster. Selecting an enemy does not place a precise tabletop area around that enemy. Candidate IDs are possible recipients, not guaranteed effects: HP pools, immunity, saves and protection still apply. Other area spells retain their existing modeling, including enemy-only defaults; full cones, chosen centers and uniform friendly-fire rules remain open.

Healing a positive-HP unconscious creature no longer wakes magical Sleep or deletes its condition/effect sources. Ordinary0-to-positive revival still clears death-save unconsciousness. Damage/duration use their existing effect handling. A general explicit wake/shake action is not provided by this spell instruction.

Rules reference: [2014 Basic Rules spell descriptions](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/spells). The above distance model is an application approximation, not complete tabletop geometry.

## Model cost and limits

Direct menu queueing and automatic execution add no model request. Free text uses one ordinary intent request. A bounded optional NPC spell menu (at most24 rows per selected NPC and4,800 serialized characters combined) supplies exact IDs; clearly self-directed ordinary input omits that menu. An ambiguous third-person request can still receive it. The general selected context remains within12,000 characters; menus/instructions/outcomes contribute separately to actual input tokens.

This release orders actual accessible catalog-backed spells, including control/buffs. Invented NPC spell ownership/learning, richer class tactics, reaction instructions, movement-plus-cast and multi-action plans remain part of the continuing objective. It does not connect another human player or external agent.

## Evidence

408 tests,94 JS syntax checks and isolated smoke passed before publication. Actual-service/controller tests cover saved consumption, one shot, current actor/resources, exact cast/control/heal, Counterspell/readied triggers, death saves, changed targets/fights, friendly exposure, real hero Sleep with consent, historical source provenance and forwarding caster/target HP transitions to narration. Numerical fixtures are isolated from live saves.

Live GPT-6-Luna in «Колокол над старой башней»: enemies reduced Rэй to0 HP before the hero's turn. Real Healing Word restored5/8 HP and spent the hero's remaining slot/bonus. Vicious Mockery dealt2 damage and imposed attack disadvantage. A free sentence queued the exact Magic Missile against the7-HP enemy with one intent request, leaving turn23, time, hero budget and Rэй's1/2 slot unchanged. On her own next turn she dealt9 force damage, killed that target and spent her remaining slot1→0; the order returned to Auto with one recorded result. Rэй remained at3/8 HP and the hero at9/9. The subsequent hero arrow missed and consumed one arrow. No HP, XP, initiative or seeds were edited in this live run.

One live narration incorrectly placed the target's death before the spell impact. Exact order outcomes with before/after HP and an explicit chronology contract were added and verified in the controller prompt regression. Future narration quality still needs observation; a stronger contract alone does not prove all prose correct. The QA battle remains ongoing at turn25; the original Mira campaign stays on turn1/8 HP.
