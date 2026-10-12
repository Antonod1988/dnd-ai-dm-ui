# Game token usage audit — 2026-10-12

## Bounded genuine adventure evaluation

A genuine Luna-created dwarf-cleric world, delivery, free inspection, NPC speech and a separately declared native encounter used18 reported requests:76,353 input/3,288 output,cache0. World creation cost2,259/1,761. Through completed delivery, nine requests cost38,680/2,645. The free inspection used ordinary intent plus narration without repair. Queued speech and reopening made no request. Raw drafts and correction issues are captured only in this private declared test workflow, not in production usage records.

Combat consumed separate requests for player casting and End Turn/NPC resolution. Bless used a real slot; save failures were not rerolled to force victory. At the declared18-request cap combat remained ongoing, so this is not a completed combat/loot/economy/rest benchmark. The campaign is saved for further verification. This is a measured request count and cost, not a quota conversion or average across adventures.

Intent now includes compact exact new-check fields/18 skill names/bounds, because its earlier permission to add checks lacked full schema guidance. This source gap is proven; it is not asserted to be the exact cause of the previous isolated repair without its initial rejected draft. New NPC preflight avoids orphaned registration and a later error.651 tests/126JS syntax and isolated smoke pass. The next cost work should evaluate lower-frequency combat prose against preserved mechanics/chronology, rather than adding unrelated subsystems.

## Current obstacle evaluation

Ready-goal availability is bounded to three reasons/routes and uses the unchanged12k campaign context cap. Hidden NPCs/checks and remote life details are removed from current packets; source world/history is not deleted. Questions discuss hypothetical alternatives without a second intent stage or game mutation. Opening the advice dialog and reading obstacles/history makes no model request.

Three isolated actual GPT-6-Luna questions on the same declared fallen/dead-NPC fixture reported2298/130,2313/146 and2332/163 input/output,cache0 (6943/439 combined). Hard rounded timing and a technical state phrase were quality failures retained in local artifacts; the final reply kept timing approximate and suggestions hypothetical. These drafts were not applied to gameplay.

A normal native freeform turn on an isolated copy of the actual fixture added and rolled a new rune-reading method without the dead NPC. The Investigation4/DC12 failure remained a failure, with no discovery/reward. Intent4771/247 needed one bounded intent repair5106/209; narration4678/137 followed. Total14555 input/593 output over3 reported calls,cache0. The correction is real overhead, not hidden in a claimed two-call average. All six inference requests in this checkpoint used21498 input/1032 output; clone play has its own usage ledger, while diagnostic questions are separate. Main campaigns were untouched.

This proves one grounded alternative and its cost, not average campaign economics. The next cost constraint is format reliability and duplicated two-stage instructions; broader fixed-scene evaluation should determine whether removing a repeat or reducing data preserves intent quality.636 tests/124JS syntax and isolated smoke pass. See [QUEST_WORKSPACE.md](QUEST_WORKSPACE.md) for state/provenance limits.

## Quantified quests follow-up

Partial obligations add numeric progress, eligible possession and source stock to the selected context. Full receipt arrays stay in the archive/read-only paginated UI; context uses only the latest exact receipt. The12,000-character global context cap is unchanged. Private decline/abandon through the explicit UI makes no model call; optional notification uses ordinary speech narration. A freeform private decision still needs intent interpretation. Inventory confirmation is current-time evidence, not an invented historical pickup.

Two separate GPT-6-Luna prose diagnostics on the same actual partial-delivery fixture used4,881/89 and4,907/82 input/output tokens (9,788/171 combined),cache0, without repair or state application. The first misplaced an owed quantity near the recipient; a general ownership/debt guard corrected that in the second reply. This is a bounded quality check, not an average cost improvement. Diagnostic costs remain outside campaign counters and are preserved locally under `../outputs/adventure_quest_quantity/`.

The earlier25.2% contract-string reduction below describes its original checkpoint. New quantitative/lifecycle guidance changes those strings; current coverage checks a fixed7,000-character contract budget rather than claiming the identical percentage for expanded mechanics.614 tests and120JS syntax checks pass. Broader varied-scene quality and full long-play economics remain open.

Initial snapshot verdict: long-history selection was bounded, but repeated input dominated usage and no prompt-cache savings were reported. That snapshot was read-only. The implemented follow-ups and their separately measured inference costs are recorded below.

## Measured provider reports

A read-only in-memory SQL.js snapshot of the ten local adventure campaigns found nine with persisted usage. The game database checksum was identical before and after this snapshot audit. Detailed local measurements are saved separately in `../outputs/adventure_token_audit/usage-audit.json`; they are not published campaign data.

| Counter | Recorded value |
| --- | ---: |
| Reported inference requests | 119 |
| Input tokens | 368,908 |
| Output tokens | 35,417 |
| Cached input tokens | 0 |
| Average input per reported request | 3,100 |
| Average output per reported request | 298 |

Input accounts for approximately 91% of the recorded total. Cached input is a subset of input and must not be added again. These totals include creation, freeform intent, narration, dialogue, spell drafts, questions and reported corrections across successive development versions. They are not a steady-state benchmark or the account's complete bill.

Latest saved examples, all reported as `gpt-6-luna`:

| Campaign / task | Input | Output | Selected context chars |
| --- | ---: | ---: | ---: |
| Колокол над старой башней / narration | 5,920 | 274 | 10,244 |
| Кружка, мост и последствия / dialogue response | 3,518 | 100 | 8,385 |
| Кружка, мост и пропавшая книга / narration | 3,280 | 349 | Not recorded by that older version |
| Шкаф под парусами / narration | 2,507 | 169 | Not recorded by that older version |
| The Sky the Map Forgot / master question | 1,830 | 42 | Not recorded by that older version |

The latest larger narration consumed 6,194 total tokens for one short reply. Repeating precisely that request size 100 times would mean 619,400 tokens; this is arithmetic, not a prediction of a session or a quota conversion. Only cumulative counters and the most recent reported request are saved, so p95, an exact request-by-request trend and correction frequency cannot be reconstructed from this ledger.

## What is already controlled

- The active adventure context is limited to 12,000 serialized characters. Current selection across the ten saved campaigns is 5,268–8,740 characters. The actual last request can select different records using the player's query.
- Local history remains intact. Relevant quests, facts and older records are selected locally; there is no paid AI summary on every turn.
- Current dialogue response payloads have a separate 18,000-character pre-wrapper limit and include at most eight heard lines / 4,000 characters.
- Ordinary valid action-button narration normally uses one request. A valid freeform action normally uses an intent request followed by narration. A master question uses one request without action resolution. A council/character response generates a batch of voices rather than one inference per NPC.
- Next, rejection, intervention, notes and pins use local state. Accepting a proposal invokes its actual game operation and can therefore require narration. NPC automatic combat decisions and normal trade operations do not make per-NPC inference requests.
- Invalid structured intent/narration can receive one correction per stage. This can make a freeform operation require up to four requests. Transport/quota failures do not automatically loop through corrections. An explicit narration retry is a new request without repeating mechanics.
- Images are outside the text prompt. Explicit image generation uses its separately configured provider and is outside these text counters.

## Remaining overhead and next work

The 12,000-character context cap is not a cap on the full request. Narration and intent add instructions, several domain contracts, action candidates and outcomes. A source-level audit measured these instruction/contract characters, before context, dynamic outcome/candidates and transport wrapping:

| Request | Static instruction/contract chars |
| --- | ---: |
| Freeform intent | 14,357 |
| Ordinary noncombat narration with dialogue contract | 8,540 |
| Ongoing combat narration | 8,090 |
| Master question | 993 |

Five domain contracts (loot, quests, access, economy, companions) alone occupy 4,876 characters and are repeated in both intent and narration. First-aid, party-inventory and exact spell-order instructions are also present in intent even when the action is unrelated. Some selected hero items appear in both owner-labelled `partyInventory` and `inventory`; any deduplication must preserve ownership and the mechanics available in the detailed inventory entry. Counts above are characters, not tokenizer measurements or a demonstrated saving. Conditional party changes and exact spell outcomes can add further narration instructions.

The JSON payload is placed in a changing user message by the ChatGPT transport. Static instructions are not separately exposed as a reusable developer-message boundary. This is a plausible obstacle to cache reuse, not proof that caching is unavailable for the model or grant.

Prioritize these changes against fixed mechanical and memory regressions:

1. Record a bounded per-request diagnostic ledger: task, input/output/cache, full payload size, section sizes and correction outcome. Preserve the distinction between actual provider reports and character estimates, and do not log credentials or whole prompts.
2. Separate stable instructions from changing state. Verify caching support for this exact sign-in route/model and then measure `cached_tokens` on completed requests. Do not promise a quota discount from API price examples.
3. Measure whether context and contracts unrelated to the current task can be omitted safely. Preserve authoritative actor/target/resource identities, history provenance, quest evidence and physical/environment rules; shortening them blindly can increase repair calls or break gameplay.
4. Compare one-request structured freeform resolution designs with the current two-stage process before changing it. Player intent must still be resolved by the server before numerical outcomes are narrated.

No exact cost, remaining subscription allowance or percentage of an account quota can be derived from the recorded tokens alone. Requests without provider usage, unpersisted creation failures and separately billed images are not fully covered.

## Verification

31 focused tests passed: actual adventure memory/recollections (25), legacy memory and provider counter accounting (6). These include a 600-turn history fixture, 200 actual controller turns with SQLite reopening, old quest evidence, dialogue provenance, non-mutating context selection and avoiding stale usage double counting. They make no live inference requests. The simulated long histories prove bounded selection; they do not prove the quality or cost of 600 live model turns.

Sources: [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [Sign in with ChatGPT usage tracking](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions).

## Implemented request accounting and live transport check

The follow-up implementation separates the existing application instructions/rule contracts into a developer message and leaves player input, world/character data, outcomes, correction feedback and rejected drafts in the user message. The JSON contracts remain lossless; no scene, quest, memory or mechanical rule is dropped. Local/compatible chat and CLI formats remain unchanged.

The game now keeps at most 40 reported request records and 32,000 serialized history characters. Lifetime totals remain intact when rows rotate. Records contain numeric text/section sizes, provider token counters, task/model, elapsed time, response/failure category and a correction-task marker. They contain no whole prompts, player speech, historical excerpts, error messages or credentials. Old saves gain only new records, without fabricated earlier rows. Usage callbacks bind counters to the exact request; a serialized compatibility boundary protects providers that only expose a global last report. Concurrent draft-cost merging preserves existing records and exact totals.

App-supplied text character counts include the basic helper instruction and both rendered message contents. They exclude protocol overhead and hidden provider instructions, and are not token estimates. The detailed numeric sections overlap their parent payload/context and must not be summed. Reported reasoning/cache-write counters, when present, are subsets/details of provider usage, not extra tokens to add again.

The character sheet's **Game master memory → Recent request usage** section displays these diagnostics behind an additional disclosure. The main story remains uncluttered. Russian and English labels and number formatting were verified in the actual desktop UI, without new inference during language switching.

Actual GPT-6-Luna testing found that this sign-in route rejects `prompt_cache_options` with HTTP 400. The attempted explicit cache configuration was removed from **all actual transport defaults**, including its input breakpoint. No automatic parameter fallback, request retry, model switch or alternative billable provider was introduced. The optional pure breakpoint-layout helper is not called by production transports. General API documentation is not evidence of support for this particular active grant.

The first QA inspection had already advanced the real game from turn 27 to 28 before that rejection. A diagnostic narration retry also failed without reported usage; neither error fabricated a zero-cost ledger record or repeated the inspection. After the transport fix, an explicit retry finished the original description on turn 28, then a second ordinary inspection advanced to turn 29:

| Completed request | Input / output tokens | Cache read / write | App text / stable / dynamic chars |
| --- | ---: | ---: | ---: |
| Saved inspection description retry | 4,990 / 202 | 0 / 0 | 19,860 / 8,891 / 10,969 |
| Next ordinary inspection | 4,895 / 140 | 0 / 0 | 19,480 / 8,891 / 10,589 |

Both completed without format corrections. Hero HP stayed 9/9, Rae HP 3/8, arrows 17, coins 18 and both first-level slot counts 0/2. The retry did not advance time/turn or award resources. Two actual inspections each advanced ten minutes normally. Recorded calls went 33 → 35, input totals 140,926 → 150,811 and output 6,784 → 7,126. The UI showed the same exact rows and lifetime totals. The original Mira campaign remained turn 1, HP 8/8.

**No cache saving has been demonstrated.** The newer inputs differ from the earlier 5,920-token battle description and therefore do not establish a percentage improvement. This checkpoint supplies accurate measurement and a working request boundary; selective contract/context reduction and quality comparisons remain next work.

503 tests, 102 JavaScript syntax checks, isolated smoke and diff checks passed after the transport correction. New regressions cover lossless message reconstruction, dynamic-data provenance, numeric-only diagnostics, unsupported cache parameters, stream-error usage, per-request model/counter binding, overlapping completions, migration/bounds and actual controller persistence. Local live artifacts are under `../outputs/adventure_token_audit/`; private campaign data is excluded from Git.

## Compact contracts and bounded scene voices

Seven reusable domain contracts now occupy 6,547 rather than 8,747 characters, a 25.2% reduction in those strings. Creation, intent and narration are pure payload builders; player data, exact IDs, state, resources, outcomes, provenance, consent and chronology remain intact. A separate semantic review restored settlement markets, promised-item delivery, manual alternatives and typed item focus instead of relying on server rejection to excuse missing prompt guidance. World/development schemas remain explicit. More schema guidance makes the narration saving smaller than the contract-string reduction.

Freeform intent receives the same affordable/preflight-filtered action menu as the UI, while a known spell remains knowledge rather than permission to cast. Physical plans distinguish new prop definitions from existing IDs and require taking an unheld prop before throwing/striking it. Exact spell outcomes identify the actual caster and recipient in prose. No model switch, classifier, extra narration rewrite or production inference stage was added.

Scene voice packets include at most 12 actors, including the master. Exact targets, joined companions, recently heard voices and relevant names receive priority. All world NPCs and archived dialogue remain saved. Old large conversations retain eligible addressees; a reply explicitly addressed to a late actor includes that actor first. Available proposal actions remain supplied exact IDs. An offline 500-NPC fixture proves bounds, targeting, body eligibility and unchanged world records; it is not a 500-NPC live-play benchmark.

### Controlled live comparison on GPT-6-Luna

The final comparisons used identical dynamic data and the same model/prose preferences within each pair. These are declared test scenes; their outcomes were never applied to a campaign. Responses were generated through the normal authenticated transport, without cache options or automatic repairs.

| Case | Original input / output | Final compact input / output | Input reduction |
| --- | ---: | ---: | ---: |
| Take an existing mug, then throw at the actual bartender | 3,537 / 101 | 3,051 / 139 | 13.7% |
| Ongoing battle, earlier retreat, distinct healer/patient and caster/target | 3,044 / 106 | 2,975 / 79 | 2.3% |

Combined input is 6,581 → 6,026 (8.4%); combined input plus output is 6,788 → 6,244 (8.0%). Cached input is zero in every report. This small comparison demonstrates the cost of these two requests, not an average campaign saving or an account-quota discount.

Exploratory compact replies exposed a duplicate definition of an existing prop, a missing prerequisite take step and an unnamed caster. Those are preserved as failed quality findings in the local artifacts; they were not counted as final successes. The intent fixture was also corrected to use the actual `holderId`/`accessible` context fields. The corrected intent was paired again against the original prompt using identical corrected data. The final intent uses only the saved mug ID, take then throw, exact bartender ID and no new prop definition. Its plan passes the native schema. The final battle prose names Luma healing Quill and Ray casting, keeps the second enemy in the ongoing battle and invents no numerical reward or extra healing. Broader semantic/prose reliability still needs gameplay evaluation.

Eight completed diagnostic requests, including exploratory and follow-up calls, consumed **25,149 input and 1,000 output tokens**, with no reported cache use. These diagnostic calls are recorded separately in `../outputs/contract_compaction/paired-live*.json`, not presented as ordinary campaign usage. No game turn, clock, HP, slots, money or story was altered by the fixture evaluation. Mira remains turn 1 / HP 8/8; the main QA campaign remains turn 30 / HP 9/9. The server was restarted normally and the existing UI reopened without further inference.

541 tests, 111 JavaScript syntax checks, isolated smoke and diff checks pass. The 18 new tests cover contract budgets/boundaries, immutable payload data, live-state authority, valid world enums and a real offline controller response to an old 501-actor queue. No raw prompts, campaign data or auth material from the local evaluation are published. Larger varied-case quality evaluation, safer context deduplication and the two-stage freeform design remain future work.
