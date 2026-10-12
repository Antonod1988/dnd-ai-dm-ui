# Quest workspace and recorded commitments

The desktop quest screen separates in-progress tasks, offers and archived results. A local search covers titles, descriptions, the giver and objective text. A compact list selects one detailed thread; the current stage stays visible and later sequential stages sit in a closed disclosure. Large lists expand in local batches of40, preserving an exact late selection and every saved quest. Acceptance/completion moves a selected thread into its actual category.

Locations open the existing map and highlight the place without travelling. Objective buttons use only the current server-supplied legal actions. Completed, future and offered stages cannot execute merely through presentation. Failed checks show actual attempts/alternatives; unavailable contacts receive a human-readable hint rather than an invented successful interaction or automatic failure. RU/EN labels are local; story text retains the campaign language.

## Journal links without another model request

Opening **From the journal** lazily reads `GET /api/adventure/quest-history?campaignId=...&questId=...`. This uses the existing serialized controller boundary. Full historical journal records take priority over clipped/conflicting event copies. The response includes only actual saved evidence pointers and related acceptance/reward/failure events, with saved source/confidence when available. Missing legacy evidence is reported explicitly. Player notes/claims remain labelled as such.

History is paginated using `offset` and `limit` (default13, maximum13), within16,000 serialized characters per page. All saved objective evidence IDs and lifecycle records remain reachable; `total` and `nextOffset` describe the next page. Missing evidence IDs remain explicit. Text beyond1,000 characters or a pathological escaped-text bound is explicitly marked `textTruncated:true`. **In the journal** searches the complete existing history to reopen the source; the main journal remains the full archive. Late responses cannot attach to another quest, campaign, revision, offset or an empty view. A mismatch offers a retry without erasing already loaded rows.

Browsing, filtering, expanding stages, reading evidence and highlighting a map location make no inference or gameplay operation. These display records are not added to the model prompt. The established bounded campaign memory continues to select canonical objectives/evidence separately.

## Mechanical fixes

Freeform intent now supports `accept_quest` with an exact offered `questId`. Explicit agreement creates a real recorded commitment through the existing handler. Ambiguous acceptance asks for clarification; a conversation or NPC suggestion does not itself accept an offer. Replay protection and revision checks remain shared with other commands.

A delivery receipt now binds to one exact `questId/objectiveId` and recipient. An already-used evidence ID cannot be rebound to another obligation. A missing binding cannot create new delivery progress from a legacy event. Shared knowledge/events for visit, talk and check retain their existing behavior. One actual handover consumes one item and can complete only that delivery; a second identical order needs another real item and receipt.

This fixes future progression, without rewriting previously awarded legacy results on read. Quantitative pickup/delivery and explicit refusal are now implemented below. Authoritative impossible-target branches, negotiated obligations and timed failure remain open.

## Quantities and player decisions,2026-10-12

World finds carry a finite original quantity1–8 and persistent remaining stock. Explicit pickup chooses an integer amount, creates distinct native item instances and cannot duplicate or refill weapons, consumables or charged items. Old saves retain their single-item meaning. Acquire/deliver objectives support quantities1–20; each actual receipt advances only its real amount. Known source capacity is checked before a world is accepted. Competing offers are not combined into a promise the player never made.

The current quest stage offers server-backed quantity selectors for acquisition and handover, including acquisition during a delivery-only stage. Partial progress is visible and survives reopening. Only full completion grants the existing reward and delivery relationship increase, once. Legacy charged pools transfer whole; the selector exposes only feasible amounts, never fictional split charges.

Offered tasks can be declined and accepted ones abandoned. A compact dialog preserves an optional player reason and warns that already given items remain with their recipient. A private decision consumes no world time, turn, resources or narration request. It remains explicitly private in recent dialogue and historical recollection. Choosing **Tell the giver** requires that exact available local NPC, records actual notification and uses an ordinary speech turn and narration. Reasons retain player-statement confidence; no automatic forgiveness, punishment, refund or reward is invented. Neither branch is available during combat or incapacitation.

Canonical model context retains numeric progress and the latest exact receipt, rather than repeating the full evidence-ID array. The complete receipts remain in the journal and paginated read-only UI. Current held inventory can be confirmed at acceptance with a new present-time, scoped `inventory_confirmation` record; it is never backdated into an invented historical pickup.

An isolated actual browser campaign exercised pickup1+2, delivery1+2, a second delivery1, private abandonment and addressed decline. From six finite packs, four stayed with the NPC and two remained in the world. The completed task granted100XP and one item; the partially abandoned task granted nothing. Private abandonment kept turn9/time08:08, HP12/12,10coins and trust1; notifying the giver advanced one turn and ten minutes. This fixture used fallback narration, not a live-model world.

Two separate GPT-6-Luna prose diagnostics used the actual partial-transfer state without applying their output to a campaign. The first correctly said one of three but misplaced the two owed packs near the NPC. The ownership/debt instruction was corrected; the second named the actual transfer and remaining obligation without that spatial invention. Both diagnostic requests together used9,788 input/171 output tokens,cache0, outside campaign counters. Broader prose consistency remains an evaluation task.

## Evidence,2026-10-12

- 569 tests,116 JavaScript syntax checks, isolated smoke and diff checks pass. New tests cover native delivery and separate rewards/replay/reopening, real freeform acceptance with a test provider, exact historical proof after601 later events, read-only HTTP behavior, query/source/bounds, thousand-task presentation, stage ordering, malicious text, and stale client responses.
- A genuine Luna freeform agreement accepted **Звон без ветра** in the existing QA campaign: offered→active, turn30→31, one minute, still at the road camp. The journal records exactly one acceptance. HP9/9, XP34 and18coins persist; Rae remains3/8, first-level slots0/2, arrows17. There is no new quest reward or travel.
- The actual intent request reported6,763 input/44 output, narration6,299/180; no correction and cache0. Campaign counters38→40, input163947→177009, output7506→7730. These13,062 input/224 output tokens are ordinary game usage. They do not establish a cost improvement over a different scene. Read-only UI work made no further inference.
- Live RU/EN quest screens, search, highlighted map, closed future stages, source-journal navigation and restoration after reload were checked. The original Mira campaign remains turn1/HP8/8. Local artifacts are under `../outputs/adventure_quest_workspace/` and excluded from Git.

The broader project remains a playable single-player alpha. More quest branches and wider long-campaign/mechanical evaluation remain required.
