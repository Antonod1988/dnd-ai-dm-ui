# Dialogue and cooperative play design

## Evidence from the local classroom prototype

The referenced project is OpenMAIC, currently under `moved-from-DND-2026-09-29/reference/OpenMAIC`. Its `lib/orchestration/director-graph.ts` selects a speaker, runs that role, and returns to a director, with a maximum-turn guard. `components/roundtable/index.tsx` anchors speech bubbles to participants and provides a soft-pause callback. Structured actions and speech are distinct; aborted messages are marked as interrupted in the prompt builder.

The source is AGPL-3.0. This project uses an independently written dialogue queue and interface, rather than importing classroom components, prompts or orchestration code.

## RPG dialogue implementation

- A single selected model can speak for the DM and several companions/NPCs in one short batch. Multiple visible personalities do not require one model request per personality.
- Each line has a validated speaker ID. The game never lets the model speak as the human player.
- Only presented lines enter the journal/chat. Future planned replies remain uncommitted.
- The player can intervene before the next line; unspoken lines and pending proposals are discarded, while already heard dialogue remains in history.
- The player may explicitly address Everyone or a current eligible NPC. An addressed line stores its exact target identity in the queue, player chat and journal. The next explicit response uses the same short batch and must start with that NPC. Invalid ordering gets at most one format repair; absent/dead/hidden/human/DM targets are refused before mutation. Historical speakers remain in heard history but cannot become selectable current addressees. The recipient is rechecked before committing a generated answer.
- A proposal references an available game action, and remains `offered` until accepted or rejected. Accepting uses the ordinary rules path and checks whether the scene has changed. A repeated click cannot execute a proposal after it is closed.
- Ordinary noncombat narration can include up to five short speaker lines in the same model response. DM framing is shown immediately; nearby eligible NPCs and actual allied companions enter a saved queue. Exact actor, scene/turn and available action IDs are validated. Hidden, dead, incapacitated and human-controlled actors cannot become invented voices.
- The conversation window has separate speaker cards, uploaded portraits or initials, role labels and validated interruption markers. Next reveals a saved line without another AI call or world turn. Intervene cancels unspoken replies. Accept executes the ordinary action once; Reject closes the proposal. Heard lines and durable decision events remain searchable after the queue changes and SQLite reopens. Acceptance is recorded only after its operation ID is confirmed.
- Starting another conversation is a collapsed control group; a story button reopens the current scene queue without generation. After interjection, a separate Character response button explicitly requests one bounded response batch. Voice playback, automatic timing and in-flight cancellation remain open. Narrative dialogue and its response currently run outside combat; the historical explicit council can still inspect a combat scene without executing mechanics.
- The next model request includes only the current scene, relevant memory and a short conversation window. No autonomous endless multi-agent loop runs in the background.

## Cooperative play feasibility

The imported core already stores a party of multiple characters. Combat automatic-turn logic stops for participants with `kind: player`, so a second human-controlled combatant does not inherently need a separate combat engine. However, several service methods currently default to `party.heroId`; the app needs explicit actor identity and ownership checks before two-player play is real.

The current app listens only on loopback, and has no room/invite/guest authentication. A friend cannot connect to it from another computer yet. No network exposure was enabled during this investigation.

Proposed first cooperative mode:

1. The host creates a room, with one authoritative campaign state and a serial command queue.
2. A single-use, expiring invite lets a friend join and bind their own character. Room credentials grant gameplay access, never access to ChatGPT credentials or account controls.
3. Use native browser WebSocket clients and a server-side WebSocket implementation for chat, presence, state revisions, rolls and dialogue events. Every client submits an intent/command with an operation ID and expected campaign revision.
4. The server verifies ownership, the current turn and command validity. Duplicate operation IDs return the previous result; stale revisions are rejected or safely re-based.
5. In combat the initiative order determines who can act. Outside combat both players can speak, but conflicting world-changing actions are serialized; important party commitments require an explicit party decision.
6. Reconnection resumes a character session and requests changes after the last seen revision. The server keeps events and snapshots, rather than trusting client state.
7. Host AI credentials stay on the host. Display whose plan funds the DM and set a room-level request budget. Do not copy tokens to the guest browser or reuse another user's OAuth registration.

LAN/private hosting can be implemented first. Internet rooms need an HTTPS/WSS access path, guest sessions, lifecycle controls and a deployment choice. This is a separate delivery gate; merely showing two tabs does not prove remote cooperative play.

Primary references: [WebSocket server/broadcast documentation](https://github.com/websockets/ws/blob/master/README.md), [ChatGPT-plan self-hosted runtime guidance](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms).

## Optional external agents

An external agent can be another DM/helper/companion controller, but all agents share the same role/actor ownership and validated command boundary. Give an agent a bounded context packet and permitted action schemas, not direct database access or host credentials. Capture request usage, permit cancellation, and require human approval for party commitments. The default remains one model handling several roles; distinct external agents are opt-in.

## Verified checkpoint, 2026-10-12

Addressed live follow-up: at turn19 of «Колокол над старой башней», Olen began a new council. The player interrupted before another queued line, chose Rэй and asked her directly. She answered first; cancelled replies did not return. One response call reported3,155 input/97 output tokens. Turn/time, HP and slots remained unchanged. The chosen identity is stored as player-statement provenance in the journal. Responsive1440/425 layouts were verified. This does not prove voice playback or combat conversation.

A later addressed response proposed the actual `talk:olen` action and waited. Acceptance ran that ordinary action once, advancing turn19 to20; the resulting DM/Olen/Rэй queue, acceptance journal and prior addressed records survived server restart. Next revealed the two NPC lines without another request. Final provider counters were21 calls/83,229 input/4,944 output tokens across the entire QA campaign, not an account-limit measurement. Scene voices also exclude hidden/remote joined companions and both death markers.

Latest:359 passing tests,91 JS syntax checks and isolated smoke across the project. Response-specific tests and the real HTTP path verify retained heard/input/proposal history, addressed actor eligibility/order/provenance, one batch plus at most one repair, failure/retry, stale/duplicate/overlapping protection, current eligible speakers, absence of cancelled lines, bounded memory and SQLite reopening. The earlier checkpoints below describe initial implementation and live checks.

Live Luna in «Колокол над старой башней»: the player heard Rэй, interrupted before the next planned reply, and requested Character response. Mara answered the question; Rэй proposed `talk:olen` and awaited approval. The response used one reported call,3,054 input/140 output tokens. Advancing and rejecting added no calls, no turn/time or resource changes. Turn13 and10:05, hero9/9, Rэй7/8 with1/2 slots remained. The rejection has a durable event with exact dialogue/proposal/action/speaker IDs. Wide and narrow layouts had no horizontal overflow. This verifies explicit continuation, not autonomous voices or voice audio.

Continuation submits only up to eight already heard lines/4,000 characters, current eligible actors/actions and selected context. A pre-wrapper18,000-character cap also bounds the combined response payload. It stores the first new reply and queues up to four more. An intervention discards unspoken replies; a later response never restores them. A failed provider/schema reply retains the intervention and offers a deliberate retry. These are selected character bounds rather than exact billed-token guarantees.

Full suite: 184 passing tests, syntax checks for 67 JavaScript files and isolated smoke. Scene dialogue tests cover valid voices, stale identities, queued versus heard memory, actual proposals once, durable decisions and reopening, using controlled AI fixtures.

Live GPT-6-Luna generated a bar conversation: Lada interrupted Mara; the player rejected inspection and intervened, cancelling Tovin's unspoken reply. Next/rejection/intervention consumed no world turn or AI call. A later accepted inspection executed the real action, turn 2 to 3. Durable decision journaling was added after those live clicks and verified separately offline; earlier history is not retroactively rewritten. The full bar scenario recorded seven requests, including world creation, freeform intent, narration and explicit councils.
