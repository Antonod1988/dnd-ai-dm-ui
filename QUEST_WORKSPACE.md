# Quest workspace and recorded commitments

The desktop quest screen separates in-progress tasks, offers and archived results. A local search covers titles, descriptions, the giver and objective text. A compact list selects one detailed thread; the current stage stays visible and later sequential stages sit in a closed disclosure. Large lists expand in local batches of40, preserving an exact late selection and every saved quest. Acceptance/completion moves a selected thread into its actual category.

Locations open the existing map and highlight the place without travelling. Objective buttons use only the current server-supplied legal actions. Completed, future and offered stages cannot execute merely through presentation. Failed checks show actual attempts/alternatives; unavailable contacts receive a human-readable hint rather than an invented successful interaction or automatic failure. RU/EN labels are local; story text retains the campaign language.

## Journal links without another model request

Opening **From the journal** lazily reads `GET /api/adventure/quest-history?campaignId=...&questId=...`. This uses the existing serialized controller boundary. Full historical journal records take priority over clipped/conflicting event copies. The response includes only actual saved evidence pointers and related acceptance/reward/failure events, with saved source/confidence when available. Missing legacy evidence is reported explicitly. Player notes/claims remain labelled as such.

At most five exact objective evidence IDs and eight recent lifecycle records are returned, within16,000 serialized characters. Text beyond1,000 characters or a pathological escaped-text bound is explicitly marked `textTruncated:true`. **In the journal** searches the complete existing history to reopen the source; the main journal remains the full archive. Late responses cannot attach to another quest, campaign, revision or an empty view. A mismatch offers a retry.

Browsing, filtering, expanding stages, reading evidence and highlighting a map location make no inference or gameplay operation. These display records are not added to the model prompt. The established bounded campaign memory continues to select canonical objectives/evidence separately.

## Mechanical fixes

Freeform intent now supports `accept_quest` with an exact offered `questId`. Explicit agreement creates a real recorded commitment through the existing handler. Ambiguous acceptance asks for clarification; a conversation or NPC suggestion does not itself accept an offer. Replay protection and revision checks remain shared with other commands.

A delivery receipt now binds to one exact `questId/objectiveId` and recipient. An already-used evidence ID cannot be rebound to another obligation. A missing binding cannot create new delivery progress from a legacy event. Shared knowledge/events for visit, talk and check retain their existing behavior. One actual handover consumes one item and can complete only that delivery; a second identical order needs another real item and receipt.

This fixes future progression, without rewriting previously awarded legacy results on read. Quantitative/partial deliveries, explicit abandonment and authoritative dead-recipient branches are still open. The current unavailable-contact hint does not implement those lifecycle features.

## Evidence,2026-10-12

- 569 tests,116 JavaScript syntax checks, isolated smoke and diff checks pass. New tests cover native delivery and separate rewards/replay/reopening, real freeform acceptance with a test provider, exact historical proof after601 later events, read-only HTTP behavior, query/source/bounds, thousand-task presentation, stage ordering, malicious text, and stale client responses.
- A genuine Luna freeform agreement accepted **Звон без ветра** in the existing QA campaign: offered→active, turn30→31, one minute, still at the road camp. The journal records exactly one acceptance. HP9/9, XP34 and18coins persist; Rae remains3/8, first-level slots0/2, arrows17. There is no new quest reward or travel.
- The actual intent request reported6,763 input/44 output, narration6,299/180; no correction and cache0. Campaign counters38→40, input163947→177009, output7506→7730. These13,062 input/224 output tokens are ordinary game usage. They do not establish a cost improvement over a different scene. Read-only UI work made no further inference.
- Live RU/EN quest screens, search, highlighted map, closed future stages, source-journal navigation and restoration after reload were checked. The original Mira campaign remains turn1/HP8/8. Local artifacts are under `../outputs/adventure_quest_workspace/` and excluded from Git.

The broader project remains a playable single-player alpha. More quest branches and wider long-campaign/mechanical evaluation remain required.
