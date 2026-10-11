# Dialogue and cooperative play design

## Evidence from the local classroom prototype

The referenced project is OpenMAIC, currently under `moved-from-DND-2026-09-29/reference/OpenMAIC`. Its `lib/orchestration/director-graph.ts` selects a speaker, runs that role, and returns to a director, with a maximum-turn guard. `components/roundtable/index.tsx` anchors speech bubbles to participants and provides a soft-pause callback. Structured actions and speech are distinct; aborted messages are marked as interrupted in the prompt builder.

The source is AGPL-3.0. This project uses an independently written dialogue queue and interface, rather than importing classroom components, prompts or orchestration code.

## RPG dialogue implementation

- A single selected model can speak for the DM and several companions/NPCs in one short batch. Multiple visible personalities do not require one model request per personality.
- Each line has a validated speaker ID. The game never lets the model speak as the human player.
- Only presented lines enter the journal/chat. Future planned replies remain uncommitted.
- The player can intervene before the next line; unspoken lines and pending proposals are discarded, while already heard dialogue remains in history.
- A proposal references an available game action, and remains `offered` until accepted or rejected. Accepting uses the ordinary rules path and checks whether the scene has changed. A repeated click cannot execute a proposal after it is closed.
- Ordinary noncombat narration can include up to five short speaker lines in the same model response. DM framing is shown immediately; nearby eligible NPCs and actual allied companions enter a saved queue. Exact actor, scene/turn and available action IDs are validated. Hidden, dead, incapacitated and human-controlled actors cannot become invented voices.
- The conversation window has separate speaker cards, uploaded portraits or initials, role labels and validated interruption markers. Next reveals a saved line without another AI call or world turn. Intervene cancels unspoken replies. Accept executes the ordinary action once; Reject closes the proposal. Heard lines and durable decision events remain searchable after the queue changes and SQLite reopens. Acceptance is recorded only after its operation ID is confirmed.
- Starting another conversation is a collapsed control group; a story button reopens the current scene queue without generation. Voice playback, automatic timing, immediate model response to intervention and in-flight cancellation remain open. Narrative dialogue currently runs outside combat.
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

Full suite: 184 passing tests, syntax checks for 67 JavaScript files and isolated smoke. Scene dialogue tests cover valid voices, stale identities, queued versus heard memory, actual proposals once, durable decisions and reopening, using controlled AI fixtures.

Live GPT-6-Luna generated a bar conversation: Lada interrupted Mara; the player rejected inspection and intervened, cancelling Tovin's unspoken reply. Next/rejection/intervention consumed no world turn or AI call. A later accepted inspection executed the real action, turn 2 to 3. Durable decision journaling was added after those live clicks and verified separately offline; earlier history is not retroactively rewritten. The full bar scenario recorded seven requests, including world creation, freeform intent, narration and explicit councils.
