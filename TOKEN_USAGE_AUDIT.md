# Game token usage audit — 2026-10-12

Verdict: long-history selection is bounded, but the current request design is not yet economical. Repeated input dominates usage; no prompt-cache savings have been reported. This audit makes no new inference requests and does not change prompts or game mechanics.

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
