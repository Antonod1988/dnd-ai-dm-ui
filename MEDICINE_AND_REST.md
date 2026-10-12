# Medicine, injuries and rest

The player can give a real healing item to a particular nearby character or attempt first aid. Game time continues to matter after combat: dying NPC companions make actual death saves, and stable characters have one saved recovery deadline. This is a numerical system, not a healing claim in model prose.

## Actual aid

`first_aid` has exact `targetId` and method `stabilize` or `item`. Stabilization uses the hero's real Wisdom/Medicine check against DC10, including proficiency, inspiration and expiring check bonuses. A success leaves the patient stable and unconscious at0 HP. A failure consumes the six-second attempt; an unattended dying companion can make its next save during those seconds.

Item aid takes the chosen modeled healing item from the hero, heals the chosen recipient through the shared core helper and spends the real quantity/charge once. The recipient's own potion is not consumed. Missing/distant/hidden targets, corpses, prohibited healing, absent charges, unprepared attunement and unsupported/protected items refuse before changes. A cached dismissed NPC can receive aid locally without rejoining the party. Combat uses its normal action paths; this medical command does not bypass them.

Healing recognizes both `conditions.dead` and `deathSaves.dead`. Nonpositive/no-effect healing does not clear unconsciousness, and genuine positive healing clears old death-save failures. Catalog spells, ordinary potions, generated healing and companion synchronization share that life-state rule. A reward/level-up can increase XP/max HP after death, but cannot restore currentHP or fresh spendable resources to that corpse.

## Medical time

- Dying NPC allies roll every six elapsed seconds, until an actual terminal result. Partial seconds persist, and each interval has a finite roll cap. New injury or a healed-and-fallen episode cannot inherit a stopped old timer.
- Human death saves remain explicit player actions. A stable human hero uses the same saved recovery deadline as a stable NPC.
- Stabilization records one real `1d4` hour delay. Reads, reopening and later actions do not reroll it. At the deadline the character regains exactly1 HP; slots, items and class resources remain spent.
- A timed healing prohibition is evaluated at the actual event time, rather than incorrectly expiring at the start of a long interval. A persistent prohibition retains the overdue deadline until healing becomes possible. A corpse never enters this recovery path.
- Medical time starts after actual stabilization. Combat already resolves its own rounds/saves, so leaving combat initializes recovery without duplicating its last save. Party, cached character and same-ID NPC body remain synchronized.

The baseline follows the SRD5.1 treatment of death saves/stabilization and delayed stable recovery. Long-rest recovery requires positive HP at its start and completion no more often than once per24 hours. [Official SRD5.1, Resting and Dropping to0 Hit Points](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf).

For this application's short rest, a0HP character also waits for medical recovery or treatment rather than automatically spending its unconscious character's hit dice. This is an explicit game policy. Ordinary rest and paid lodging share a durable benefit ledger; lodging still charges for time/accommodation when recovery is unavailable, and its response lists who actually recovered. Comfortable-rest bonuses are given only to a hero who received eligible rest benefits. The timer uses fictional days/hours, not the real computer clock.

## Interface, journal and context

The separate Party/NPC cards have collapsed aid controls for a wounded character; a dying/stable character opens the urgent status with actual save counters and remaining recovery time. Healing options reference the hero's current inventory. These controls use the normal revision/operation boundary and keep the Party section open.

Aid, saves, stabilization timing and recovery have durable journal/roll records. The model receives exact life status, chosen target, changed HP/resources and at most twelve compact medical event summaries. Full dice ASTs/history are not repeated in the narrative prompt. Medical state stays inside the existing12,000-character context bound. Automatic medical ticks make no separate model request.

## Evidence

Pure tests exercise real dice seeds in isolated fixtures; controller tests reopen SQLite, cross six-second/hour boundaries, combine free/paid rest, retain spent resources and protect a posthumous quest level-up. These fixtures do not change the live game.

Live Luna in «Колокол над старой башней»: the player clicked treatment in Rэй's Party card. Hero potion1→0, recipient potion remained1, Rэй7/8→8/8, hero9/9 unchanged and both spell slots remained1/2. Actual `2d4+2` rolled4, capped to the one missing HP. One action/six seconds and one normal narrative request; no invented HP or resources. Turn14 and the exact dose/recipient were saved. Unconscious stabilization/death/recovery branches were verified offline, not claimed as live successes.

Remaining work includes autonomous companion help outside combat, specialized healer kits/bleeding/disease, more player orders and medical NPC services for selected patients, elaborate resurrection costs/consent and expanded interruption/rest conditions. This does not prove complete SRD coverage or all narrative medical descriptions.
