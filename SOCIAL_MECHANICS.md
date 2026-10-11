# Social mechanics and acknowledged restitution

Implemented checkpoint: 2026-10-12. AI interprets the player's words; the server resolves exact NPC identity, target availability, fixed difficulty, dice, resources and consequences. This does not implement every possible favor or relationship.

## Supported actions

Command social selects a local aware NPC, goal deescalate or rapport, approach persuasion/deception/intimidation/restitution, and the player's statement. Restitution requires an explicitly offered coin amount; optional propIds identify specific existing broken objects the player acknowledges compensating. AI cannot choose numerical trust, DC, HP, rewards or overwrite world facts. Combat, dead/hidden/remote/unaware targets and incapable heroes refuse before rolls/time/payments.

Speech uses real CHA checks with skill proficiency and consumed inspiration/effects. Server DC10-22 depends on established attitude, negative trust, real injury and bounded profile. Failure remains failure. Successful deescalation changes both NPC and persistent-body disposition; rapport improves trust modestly. Intimidation can make someone keep their distance, reducing trust rather than creating affection. Neutral deescalation cannot farm trust. No quest completion, HP restoration, automatic discounts/restocking or new item follows from speech.

Attempts are keyed by actual NPC/goal/method/physical episode. Names, phrasing, fresh request IDs, familiarity and own social trust changes cannot reopen the same check. Canonical compact locks on each NPC remain after bounded history rotates. A real new aggression, payment or delivered item can change circumstances; successful rapport cannot be farmed by method cycling in one episode.

## Payments and ownership

Known unpaid broken owned props and actual recorded wounds establish liability. Mundane house values are ceramic/glass/wood2, metal5, stone/cloth1 coin; bodily harm costs5 per actual HP, total capped20. These are original prototype economy rules, not official SRD prices. Serious unsettled bodily harm requires payment before an independent social attempt. Payment does not itself guarantee forgiveness or repair/heal anything.

The player's actual gold inventory is debited; NPC receivedCoins and the same merchant's cash are credited. Each damage/prop is settled once. Monotonic injury history survives healing and charges later real wounds; temporary-HP absorption is not bodily injury.

For a broken local object whose historical owner is unknown, the player can explicitly select propIds and acknowledge compensation to a chosen recipient. This records restitutionClaim (playerAcknowledged), leaves ownerNpcId unchanged and globally marks the object paid. It cannot be paid to another NPC again. Intact, remote, hidden, paid or wrong-known-owner objects refuse atomically. Claimable choices identify actual persisted objects; no invented evidence or loot is accepted.

## Dialogue, memory and UI

Only the mechanical result changes trust/attitude. A lie remains a player_claim even after a successful deception roll, archive retrieval or journal search; it does not become confirmed world truth. Generic social checks cannot use successFact to bypass this path. Journal events retain actor/approach, check, payment and claims separately. Conversation proposals can reference available actual relationship actions; accepting uses the usual one-time command path.

Relationship tools sit inside each nearby eligible NPC's collapsed card. The story stays focused; free text uses the same resolver. Merchant availability is shared between UI, model context and execution. Reconciliation reopens the same offers/cash/stock, not a freshly generated shop. Context selects compact relationship state within the existing12,000-character packet. Duplicate copies of environment/social instructions were removed from the intent instruction; the supplied rules remain in one payload field each.

## Verification and open scope

Pure and controller tests cover successful/failed checks, locks after history rotation, real payments, repeated requests, merchant reopening, immutable wounds/props, claimed ownership, old lies, inspiration and unavailable actors. Temporary deterministic fixtures are separate from live campaigns. Runtime evidence is recorded in VERIFICATION.md.

Generic requests, bargaining over arbitrary offers, recruitment, companion bonds, promises with deadlines, faction/witness reputation, returning NPCs and interpretation quality remain work ahead. No remote co-op or voice playback is implemented.
