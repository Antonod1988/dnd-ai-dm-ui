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

## Current checkpoint — 2026-10-11

- The main UI now uses one rules-backed campaign through `/api/adventure/*`: player-defined world/hero, story, map, quests, journal, people, live character sheet, spell workshop and party council. `/legacy` preserves the original alpha and its save.
- Separate campaigns resume from SQLite. Quests have sequential objectives, recorded evidence, and a single durable reward. A failed narrative reply can be retried without repeating the resolved mechanics.
- Optional food/water consumption and fatigue share the real inventory; buying supplies spends real coins. Numeric combat outcomes distinguish victory from retreat/defeat. Racial Dexterity contributes to armor class.
- 55 offline tests passed, including HTTP flow, quest provenance, anti-reroll checks, narrative retry, supplies, campaign/language resume, generated spells, OAuth and 400-turn context bounds. Syntax checks and the isolated legacy smoke test also passed.
- Real GPT-6-Luna created Russian and English original whale-city worlds. English play, quest, map and council screenshots were captured from the running UI. The selected language is stored per campaign and sent to world/narration/dialogue prompts.
- The English demo council produced a concrete proposal that the player could accept/reject; speech itself did not spend a mechanical turn.
- Full local history remains archived. Current scene context is about 3–4k characters in the demonstrated campaign; selection caps context at 12k characters. This is a character bound, not an exact billed-token guarantee.

Remaining work includes a broader live adventure audit (combat, death and progression), richer reputation/relationship consequences, survival/weather depth, optional image controls, and long-session runtime validation. Multiplayer is researched, not connected. The objective remains active.
