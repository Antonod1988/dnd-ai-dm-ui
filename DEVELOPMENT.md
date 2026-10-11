# Active development contract

User objective: a working, attractive D&D-style game UI, with reliable mechanics, AI-created adventures and economical long-campaign memory. The objective remains active until all requirements below have runtime evidence.

Ordered milestones and acceptance criteria: [ROADMAP.md](ROADMAP.md). Current stage: playable single-player alpha (package 0.2.0). The `63ea265` checkpoint had 76 tests and successful Windows/Linux, Node 20/22 CI; the loot/progression follow-up had 79 tests; the economy follow-up passed 91 tests and Windows/Linux CI; the quest follow-up passed 103 tests; the access/correction follow-up has 127 tests. Earlier counts below describe historical checkpoints.

## Required outcome

1. General D&D resolution: abilities, skills, proficiency, dice and advantage; action/bonus/reaction/movement economy; initiative, damage, saves, conditions, concentration, death, rests and progression.
2. AI can create events, situations, NPCs/heroes, quests, spells and items. A fixed spell/item list must not be the only gameplay path. New mechanics use validated composable effects executed by code; flavor and fiction stay flexible.
3. Playable UI: readable story/chat, live character sheet, spell/item targets and resources, clear combat controls, journal and quest views, usable map, campaign creation/resume, desktop and narrow layouts.
4. Persistent journal, objectives, evidence, promised obligations, NPC relationships and reputation. Quest rewards and completion come from recorded events and validated rules, rather than unverified narration.
5. Survival as an optional campaign system: time, supplies, fatigue, travel, weather and consequences supported by rules.
6. Long-session memory: full local history remains recoverable; selected canonical state + relevant recollection + short recent dialogue form a bounded model prompt. Critical facts and unfinished quests must survive compaction. Measure context size and actual reported usage; test hundreds of turns.
7. Optional scene/portrait images: user uploads and optional independently configured image provider. Current ChatGPT-plan OAuth does not support image generation; do not silently bill another route.
8. Preserve GPT-6-Luna and current login, saves and neighboring projects. Publish tested changes without runtime/private data.
9. Scene and dialogue skill checks (History, Religion, Perception, Insight, etc.): AI defines the fictional reason and possible discovery, rules resolve the roll, facts are unlocked only by the outcome. Persist attempts so reloads/re-entry cannot reroll the same check indefinitely.
10. Party/NPC dialogue inspired by the classroom project's interaction pattern: distinct visible speakers, player interventions, proposals that can be accepted/rejected. Independently implemented; avoid automatic unbounded role loops.
11. Investigate cooperative multiplayer and optional external agents. Do not label it working until two human characters, actor ownership, simultaneous input, reconnection and a genuine remote join have been verified. Findings are in DIALOGUE_AND_COOP.md.
12. Meaningful economy and settlements: money buys useful services and goods, with recorded income/spending, finite stock and coherent prices. Settlements have distinct livelihoods, shortages, contacts and encounters. Connect loot, trade, travel, information, lodging and reputation to consequences; the model invents their fiction while validated transactions change currency/inventory. A static supplies button alone does not satisfy this requirement.

Latest user clarification: maximize narrative freedom in any world co-created by the player and AI. Use general mechanics and composable effects rather than a mandatory fixed spell/item catalog. SRD classes and catalog entries are optional foundations/references.

## Architecture decisions

- Import the committed MIT D&D core snapshot as an independent rules substrate; preserve SRD attribution. Its catalog is a reference and source of tested primitives, not a boundary on AI-created content.
- Generated content is a data DSL: validated target, cost, range, dice, save, condition, duration and concentration; no JavaScript, shell, arbitrary file/network access or direct mutation of authoritative values.
- State and numbers belong to the rules engine. Narrative generation cannot grant an unearned reward or overwrite HP/inventory.
- Journal/quests/relationships have stable IDs and event provenance. Player-facing text avoids engine implementation details.
- Compaction summarizes older narrative, never replaces the source of truth. Exact entities/objectives remain stored; retrieval can bring back older evidence without resending the whole campaign.
- Use bounded offline tests for most changes. Run only purposeful real AI checks, with the selected model and the existing login.

## Completion evidence still required

The main UI, map and campaign flow are integrated. A complete first-level adventure with growth and a basic economy have live evidence. Remaining acceptance work includes broader combat/class/progression coverage, richer generated item mechanics and quest cases, deeper relationships/reputation, weather/survival depth, optional image controls, and broader long-session runtime validation. Cooperative networking is researched, not implemented. Passing the previous alpha tests does not prove the complete objective.

## Current checkpoint — 2026-10-11

- The main UI now uses one rules-backed campaign through `/api/adventure/*`: player-defined world/hero, story, map, quests, journal, people, live character sheet, spell workshop and party council. `/legacy` preserves the original alpha and its save.
- Separate campaigns resume from SQLite. Quests have sequential objectives, recorded evidence, and a single durable reward. A failed narrative reply can be retried without repeating the resolved mechanics.
- Optional food/water consumption and fatigue share the real inventory; buying supplies spends real coins. Numeric combat outcomes distinguish victory from retreat/defeat. Racial Dexterity contributes to armor class.
- 55 offline tests passed, including HTTP flow, quest provenance, anti-reroll checks, narrative retry, supplies, campaign/language resume, generated spells, OAuth and 400-turn context bounds. Syntax checks and the isolated legacy smoke test also passed.
- Real GPT-6-Luna created Russian and English original whale-city worlds. English play, quest, map and council screenshots were captured from the running UI. The selected language is stored per campaign and sent to world/narration/dialogue prompts.
- The English demo council produced a concrete proposal that the player could accept/reject; speech itself did not spend a mechanical turn.
- Full local history remains archived. Current scene context is about 3–4k characters in the demonstrated campaign; selection caps context at 12k characters. This is a character bound, not an exact billed-token guarantee.

Remaining work includes a broader live adventure audit (combat, death and progression), richer reputation/relationship consequences, survival/weather depth, optional image controls, and long-session runtime validation. Multiplayer is researched, not connected. The objective remains active.

### Memory and mechanics follow-up

- Full-journal search/pagination, player notes and pinning are integrated in the UI. They preserve game time/resources and require no AI call. The packet now ranks quests by relevance and recalls archived dialogue, rather than always selecting the first six tasks.
- A 600-turn test uses the new adventure model and verifies full history preservation, an early promise recall, and the 12k-character bound. Source state remains intact. See CAMPAIGN_MEMORY.md for the packet contract and limits.
- Actual provider counters are recorded per campaign. A live GPT-6-Luna check correctly recalled a saved promise and phrase; two reported requests used 3,641 input and 133 output tokens. It preserved HP, XP, inventory and location.
- Combat/clock tests verify six-second rounds, exact rest/travel duration, timed spell expiration, effective armor in the sheet, death/stable/dead recovery paths, and one reward after a lethal created spell resolves combat.
- This is progress toward the full objective. Optional images, deeper social consequences, weather/survival depth and the broader live gameplay/progression audit remain open.

- A second check executes 200 controller turns against SQLite and reopens the store, preserving all dialogue/events and recalling an early promise. A separate 600-turn context fixture verifies the budget across longer histories.
- The composer now distinguishes a hero action from a question to the master. Questions use one request and do not advance rules/time or apply world developments. Notes and journal browsing use no AI.
- Live GPT-6-Luna generated and learned an original protection spell. Free-text casting spent a slot and changed armor 12→13; exploration expired the effect and unlocked lore through a real History roll (23 against DC 14).
- New scene checks no longer get blocked by three previously attempted checks. Multi-place world developments add all nodes before wiring reciprocal links. The journal records mechanical actions and uses the same turn number as dialogue.
- On narrow layouts a compact hero strip keeps HP/armor visible and links to the character sheet. Spell previews show target, duration, concentration and cost; inaccessible catalog spells are omitted from the playable book.

### Loot, progression and the complete adventure follow-up

- Battle loot appears after confirmed victory, remains in the location until collected, and survives restarting. Exploration, battle and quest sources are recorded. Effects use the existing bounded generator; rarity is capped by hero level. There is an inventory Loot filter and cards show exact properties and provenance.
- Main campaigns keep the living player's turn until End Turn. Combat item use now spends an actual action; Second Wind can follow as a bonus action. Equipment changes and attunement are guarded outside combat. Typed defensive/attack/save consumables can be prepared outside combat and expire through the clock.
- XP gains and level changes are journaled; the sheet shows progress to the next level. Model narration receives actual inventory deltas, separate ground loot, and current time. Plain prose is accepted for narration only; world/intent/spell drafts remain structured.
- A complete offline adventure uses an unmodified fighter, real attacks, two five-step tasks, pickup/use, level 2, rest, and SQLite reopening. Separate tests cover a real equipped generated weapon, retreat without battle loot, and item action/bonus budgets. Total 79 tests; syntax and isolated smoke pass.
- Real GPT-6-Luna campaign «Дорога над облаками»: History 15 vs 10, an ordinary longsword attack 22 vs AC 13 with 8 damage, confirmed victory, 25 XP + 2 coins, one collected battle find, return/report, both tasks rewarded once, level 2 with 375 XP and 20/20 HP, Action Surge, long rest and successful server restart. Three earlier format failures were retried without repeating actions; plain-prose handling was then improved.
- Economy/settlements were added as a requirement. The design and acceptance checks are in [LOOT_AND_ECONOMY.md](LOOT_AND_ECONOMY.md); At that checkpoint trading, meaningful services and distinct markets were not yet implemented; the follow-up below records their implementation. The full objective remains active.

### Economy and settlements follow-up

- Distinct AI-created markets and optional traveling traders are integrated into the shared campaign. Stock, trader funds, price/rarity rules, purchases, sale protection, charged resale, and receipts are authoritative data. No extra AI request is needed for ordinary transactions.
- Lodging provides real rest plus one consumed +1d4 check bonus; a declared inn is visited through the known route. Paid information is hidden until payment and retained as attributed information, not confirmed lore. Transport supports reachable destinations and proportional route time/cost.
- Local help resolves a persisted skill attempt or a two-coin contribution. Success changes NPC trust, local reputation, prices and stock once. Daily restocking follows game time, not UI refresh.
- Money history includes commerce and rule-based changes. UI has wallet, effects/duration before purchase, trader funds, sale controls, local encounters and recent receipts. Full receipt events remain searchable in the journal; bounded context retains exact coins and only selected market/history records.
- Live Luna world «Свет над тихими облаками»: two markets, a named inn, Investigation 9 vs 12 including the paid +2 bonus, a distinct donation approach, price reduction 5→4, purchase, paid rumor, a zero balance followed by sale restoring 3 coins, and the purchased shield changing AC 12→13. Shopping kept the AI counter unchanged. The second town has scarce medicine at 12 and a 30-minute ferry at 6; insufficient funds were rejected without a state change. Earned loot in the earlier Rook campaign was sold for 3 coins, 12→15, with no AI call.
- This closes the basic economy slice, not all social/world consequences. Complex trade, commodity obligations, training/repair, travel risk, weather and optional images remain open. The full objective remains active.

### Quest delivery and alternative approaches follow-up

- Generated quests can require a real item handover to a specific NPC, including provenance and a saved recipient possession. A conversation alone cannot complete that objective. Equipped/attuned items, absent recipients, missing items, inactive stages, combat and incapacitation reject delivery before changes.
- Check objectives support distinct declared alternatives. Manual checks roll only the chosen method; failed attempts remain saved, another method can succeed, and unrelated rolls do not advance the objective. Earlier successful discoveries and still-carried acquisitions remain valid evidence after accepting a task.
- The quest UI shows current objectives, approaches/DCs/locations, failed results, recipient details and contextual action buttons. Bounded context includes those IDs and attempt states without unopened discoveries. See [QUESTS.md](QUESTS.md).
- Explicit locked-container/item-access conditions, quantities, cancellation/timed failure and arbitrary negotiation branches remain open. Older talk/report objectives retain their meaning; existing saves are not converted into different promises.

- Live Luna campaign «Компас над облаками»: Investigation 17/25 failed, History 7/5 succeeded, normal conversation left the delivery pending, and explicit UI handover removed the compass, saved it with Oren, raised trust/reputation once and granted 125 XP plus an original item. A server restart preserved the result. One optional world-development draft was rejected after the successful check; the mechanics persisted and subsequent play continued. Better schema feedback for such narrative drafts is still needed.

### Access conditions and bounded AI correction follow-up

- Original world items can require a real scene-check success, reusable held key or actual victory, using any/all logic. Closed concealed finds expose only their container and conditions until eligible. Pickup is guarded in both actions and direct commands; attempts and access evidence survive reopening.
- Generic ability rolls cannot impersonate scene checks when IDs happen to match. Earlier legitimate scene evidence is still recognized from the persisted ledger. References, duplicated conditions, self-dependencies and impossible key cycles are validated before world creation.
- Narration and world creation receive at most one corrective request for an invalid structured draft, with bounded schema feedback. Rejected records are not applied. Explicit retry preserves the actual mechanics and records usage even when the provider is unavailable. Valid turns and local commerce avoid that extra request.
- The current offline set has 127 tests; syntax and isolated legacy smoke pass. Richer physical obstacle primitives, quantitative obligations, negotiated branches, broader classes/progression, deeper relationships, survival/weather and optional images remain open.

- Live Luna «Шкаф под парусами»: a concealed find stayed closed after Investigation 21/25. A natural player idea created a new History method (6/15, failure), and the old inventory method later succeeded at 22/5. Only then did «Медный язычок ветра» and its pickup appear. Return/delivery completed the task once with 125 XP and one saved NPC possession. The final context was 4,578 characters; the persisted provider counter recorded 13 calls, 35,651 input and 3,837 output tokens. Valid ordinary turns still use one narration request; freeform intent uses an additional request, with at most one correction per failed stage.
- The find panel is collapsible to leave space for narration, stays within the narrow layout, and the story follows its end on resizing unless the player has scrolled away. Hidden/collected names, legal IDs that match object keys, and pickup during combat have explicit guards/tests.
