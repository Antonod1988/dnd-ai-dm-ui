# Campaign memory

The full journal, recent dialogue and older dialogue archive remain in the local campaign store. Model context is a separate, disposable view of that history. Building it never rewrites the history or the rules state.

Artwork stays outside the text context: no image bytes, gallery labels or binding metadata are sent to the game master. Generation is a separate explicit request; campaign text counters exclude image-provider costs. See [ARTWORK.md](ARTWORK.md).

## What goes to the game master

- Current world and hero concept; exact HP, armor class, abilities, resources, spell slots, conditions and combat turn.
- Relevant unfinished quest objectives, exact delivery recipients, declared alternative check IDs/attempt results and their recorded completion evidence. A compact index covers additional quests when space permits. Previously completed quests can be recalled with their actual status and reward flag.
- Player bookmarks, confirmed discoveries and relevant excerpts of older dialogue, including their speaker and turn.
- Nearby people and routes, selected inventory and created spells, a short recent dialogue window and the latest events.
- Nearby world objects with actual access state. Concealed finds contribute their visible container and conditions, not their unopened contents.
- Exact wallet balance, selected local market offers and at most three relevant receipts. Unpaid information remains hidden. Purchased information retains its attribution and rumor status.

The packet has a hard 12,000-character budget and smaller budgets for individual sections. It is assembled by relevance and priority. A long history therefore does not mean resending every previous turn. This is retrieval and structured context reduction, rather than a paid AI summary after every turn.

Limits do not delete source records. If the campaign has more facts, notes or quests than fit, the packet reports omissions. A query can bring a previously omitted record back. No finite packet can include an unlimited number of full records simultaneously.

Unopened scene-check secrets stay outside the packet. Player notes retain their provenance: a hypothesis or personal goal is different from a confirmed discovery.

## Journal controls

The player can write a note, pin/unpin it, and pin a confirmed discovery. These operations save locally, check the campaign revision, and do not advance the game, roll dice or call AI. Search covers the full stored journal. Older entries are paginated, so the main state response does not grow by resending the entire journal.

The composer also has an “Ask the game master” mode. It uses one narrative request, skips intent resolution and preserves time, turn, resources, quests and world records. It can review the current situation or recall old records without performing a hero action. Suggested world developments in such a reply are not applied.

The memory panel shows the current context size, archive and journal counts. For completed requests that report usage, the campaign records actual input/output/cache counters from the provider. These counters are not the account's remaining allowance, and they are not a complete bill for requests that did not report or persist usage. Character counts and token estimates are explicitly separate from provider counters.

## Evidence

- A 600-turn rules-backed adventure fixture retains all 601 messages and all 600 events; an early promise/password is recalled from the archive. The context stays within its budget without mutating the source.
- A relevant active quest after 80 earlier quests is selected. Completed quest status and the reward flag remain recoverable.
- A 200-turn run executes the actual adventure controller and reopens SQLite halfway through and at the end. All 401 messages and 202 journal events (200 actions, one initial visit, one daily market restock) persist, HP/XP remain stable, and an early promise is recalled from the stored archive.
- Short names and words such as “Bob” and “key” are recalled without treating “monkey” as a match; speaker names participate in retrieval. Distant NPCs and late inventory items can enter the packet by relevance.
- Notes and pin changes persist through reopening, reject stale revisions, and replay without duplicating a note or calling AI.
- Full-journal search finds an old entry beyond the initial 100-row view. Pagination returns every stored event exactly once.
- A real GPT-6-Luna request recalled the saved promise to Sella and the phrase “Amber Compass”, while leaving the player in Azureback Harbor. The two reported inference requests used 3,641 input and 133 output tokens in that check; this is one observed example, not a per-turn guarantee.
- The same live game generated, learned and cast “Prismthread Mantle” through free text. It spent one slot, raised displayed armor from 12 to 13, and expired during the next exploration action. A History check then unlocked a persisted discovery.

## Mechanics checked alongside memory

Combat rounds advance six seconds; rests and travel advance their defined duration. Existing finite spell effects expire during exploration, and effective armor class appears in the sheet. A dying hero has a death-save action; a stable hero can wait to recover, while a dead hero cannot use that path. The stable recovery rule (1 HP after 1d4 hours) follows the [2014 Basic Rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/combat).

## Invalid AI drafts

Valid narration uses one request. An invalid structured intent, narration or world proposal can receive one bounded correction request with schema/reference feedback. No mechanics are replayed. Rejected world records are validated before application; an unresolved report remains retryable. Retry keeps the actual outcome and saves diagnostics and reported usage. Transport outages do not trigger a repair loop. Ordinary transactions remain local and call neither narration nor correction.

Feedback is bounded to six issues, short messages and a truncated rejected draft. This is exceptional schema repair, not a periodic summary or a second request after every turn. Counts reported by the provider include correction requests that were persisted; unsuccessful initial world creation still has no campaign record.

A synthetic registry with a 600-method chain retains access proof and selects the relevant late approach within the same context limit. Lookups use bounded indexes and keep the saved source unchanged. This is an offline fixture, not 600 real provider requests.

## Scene conversations and physical aftermath — 2026-10-12

Only heard lines enter history/context. Unspoken replies cancelled by intervention cannot become memories. Accepted/rejected proposals have separate durable dialogue_decision events with speaker, source scene/turn and action/proposal IDs, surviving later councils and SQLite reopen. Acceptance requires the actual operation ID. These rules are covered with controlled fixtures.

Physical props and NPC bodies persist separately; context selects relevant nearby objects/conditions/HP/hostility in a bounded block, within the same total 12,000-character packet. The live bar aftermath and inspection selected 4,754 characters. Seven recorded calls cover creation, intent, narration and explicit discussion; Next, rejection and intervention added none. This is not a complete account bill.
