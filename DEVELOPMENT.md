# Active development contract

User objective: a working, attractive D&D-style game UI, with reliable mechanics, AI-created adventures and economical long-campaign memory. The objective remains active until all requirements below have runtime evidence.

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

Latest user clarification: maximize narrative freedom in any world co-created by the player and AI. Use general mechanics and composable effects rather than a mandatory fixed spell/item catalog. SRD classes and catalog entries are optional foundations/references.

## Architecture decisions

- Import the committed MIT D&D core snapshot as an independent rules substrate; preserve SRD attribution. Its catalog is a reference and source of tested primitives, not a boundary on AI-created content.
- Generated content is a data DSL: validated target, cost, range, dice, save, condition, duration and concentration; no JavaScript, shell, arbitrary file/network access or direct mutation of authoritative values.
- State and numbers belong to the rules engine. Narrative generation cannot grant an unearned reward or overwrite HP/inventory.
- Journal/quests/relationships have stable IDs and event provenance. Player-facing text avoids engine implementation details.
- Compaction summarizes older narrative, never replaces the source of truth. Exact entities/objectives remain stored; retrieval can bring back older evidence without resending the whole campaign.
- Use bounded offline tests for most changes. Run only purposeful real AI checks, with the selected model and the existing login.

## Completion evidence still required

Rules integration and general generated effects are in progress. The complete UI, map, campaign flow, survival/social systems, optional image controls and long-session runtime audit are not yet complete. Passing the previous alpha tests does not prove this objective.

## Current checkpoint

- 40 offline tests + syntax checks + smoke pass. A live GPT-6-Luna party discussion produced separate companion lines and accepted a player intervention without a mechanical turn.
- Independent compiled SRD core, SQLite adapter, generated-spell effects and scene-check ledger are implemented and tested. `/api/dnd/*` exists; legacy UI has not yet been switched to the rules-backed campaign shape.
- Long history is archived locally instead of truncated. Model context is bounded and relevant older facts can be retrieved. Full quest/social canonical models still need implementation and integration.
- Dialogue UI is live. Multiplayer feasibility is researched; remote connectivity is absent.

Immediate next work: unify the rules-backed campaign and narrative state behind the main UI, let the player supply arbitrary world/hero concepts, add validated AI world developments/quests/item/spell drafts, implement quest/event provenance and usable map/journal/character views. Preserve current alpha saves as an importable legacy campaign, not a silently overwritten save.
