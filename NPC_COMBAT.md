# Persistent scene NPC combat

Implemented checkpoint: 2026-10-12. This is a playable adapter slice, not complete social/party simulation.

## Identity and rules

An explicit npc_combat command selects an exact established nearby NPC id. A legacy combat command naming that NPC routes here instead of generating anonymous monsters. Real initiative runs first; automatic actors act only according to that initiative. Starting combat does not secretly execute the player's requested sword or spell attack. The following normal cost-filtered action applies it when the hero owns the turn. A resolved physical mug attack does not automatically grant a fresh initiative action in the same command.

The permanent body is keyed by NPC id in adventure.environment.npcStates. Existing HP, AC, conditions, attacks and effects remain authoritative across encounters; changing a declared role never heals or restats that body. Missing bodies receive fixed server profiles: civilian (4 HP/AC10), guard (11/13), scout (16/13), brute (22/11), arcanist (12/12). These original bounded profiles do not scale with party level or provide complete profession/class equipment. Their mundane/ranged attack is real; old empty civilian attack lists receive one unarmed attack.

Normal weapons and catalog spells use the ordinary chooseAction/slot/action resolver against the same NPC participant. Environmental plans share the profile factory. Party synchronization captures exact enemy bodies for npc_encounter environments before terminal combat is removed, in a bounded matching combat/environment snapshot. The adapter consumes it after every normal action and finalizes HP/conditions before saving. Wrong/missing snapshots refuse rather than inferring a corpse from a victory flag.

## Ending and persistence

NPC encounters grant no generated XP, treasure or location-only quest victory. They have distinct start/end journal events; they cannot reuse an earlier generated encounter's loot. Actual possessions and explicit NPC-specific quest reward rules remain future work. Retreat records retreat explicitly. Initial automatic turns can end an encounter; actual NPC states persist and pending hero death saves retain combat.

Dead, unconscious, captured, fled, hidden, remote or absent NPCs cannot be revived by starting another encounter. Dead/incapacitated/fled voices do not enter the scene conversation queue. Temporary NPC effects expire through exploration time using the same condition cleanup as party creatures; permanent injuries/conditions stay. Sleep expiring does not restore lost HP. NPCs do not autoheal when the hero rests.

## Verification

Offline controller tests execute real sword/catalog Magic Missile terminal actions, Sleep and subsequent long-rest expiry, retreat with a deliberately stale victory flag, reopening, wrong targets and replay. Explicit temporary fixtures isolate hero turns, known spell preparation and prior injuries; they never modify the live player's campaign. Pure tests cover all fixed profiles, actual opening initiative, ally opening victory and pending death saves. Full checkpoint suite: 199 tests, 70 JavaScript syntax checks and isolated smoke.

## Next work

Mechanical restitution/persuasion, recruitment and NPC movement/return; direct freeform attack staging across initiative; nonlethal intent, inventories/recoverable possessions, broader role profiles, object-target spells/repair/cover and stronger dialogue fact consistency remain open. The public command currently chooses one NPC; the pure starter supports a validated group up to six. Remote multiplayer is still unimplemented.

## Live GPT-6-Luna checkpoint

In the separate bar QA campaign, free input started a real fight with Mara's existing HP4/AC10 body. Hero Rin won initiative; no starting attack was repeated. A UI catalog Magic Missile dealt 9 force damage, spent one slot (2 to1), ended combat and saved Mara at0/4 with dead/hostile and trust-40. Rin kept8 HP and0 XP; the broken mug stayed broken. Final selected context4,944 characters, recorded campaign text calls12 (includes prior scene/dialogue tests and one failed integration attempt). Runtime reload/restart checks are recorded in VERIFICATION.md.

The live check exposed late normalization of an AI-selected fight action; it was fixed before repeating the true fight and covered with the exact action-ID regression. Narration also mentioned an unregistered whistle; no such item existed or was awarded. The outcome/prompt now explicitly provides permanent NPC bodies and rewardsGranted:false with unknown possessions. That clarification is covered as supplied model data, but its future live prose quality is still unproven.
