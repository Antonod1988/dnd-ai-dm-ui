# Persistent companions

Companions are actual saved characters in the rules-backed party. The selected text model gives them personalities and dialogue; a finite rules controller resolves their automatic combat turns. Speaking does not cast spells, spend resources or add someone to the party.

## Joining and leaving

- An NPC may have a validated `companionOffer` with a class, ancestry, background and fictional reason. It establishes willingness to discuss joining, not membership or a guaranteed successful invitation.
- An explicit invitation requires a local, visible, conscious, living, nonhostile NPC, a capable hero, no active combat and room in the party. The current cap is four members including the hero.
- The initial invitation uses a real Charisma/Persuasion check, with DC12–18 derived from the existing relationship. A failed attempt is saved by canonical NPC/scene/body/relationship identity. Rewording or renaming cannot reroll it; genuinely changed circumstances can support another attempt.
- First success creates a level-one foundation once using one of the twelve supported classes. Existing physical HP/max HP, AC, abilities, attacks, conditions, effects and spent resources take precedence over defaults. Existing numerical bodies are never regenerated to suit the story.
- Class starter equipment is created once; template gold is removed. For an older stat block without modeled worn equipment, starter gear is carried and its original base AC is retained. Explicitly modeled equipment follows normal equipment rules.
- Joined characters follow actual travel and retain the same NPC ID and personality. Dismissal leaves the character at the current location and caches its complete body, inventory, XP, resources and spell slots. Rejoining the same eligible cached person preserves them and needs no new first-invitation roll.
- Real item/coin receipts are imported once by stable receipt markers. A former merchant transfers only actual remaining received cash out of its shop reserve; historical spent cash is never minted again. A following companion does not simultaneously operate an unattended shop.

## Combat

Only explicitly registered NPC allies use automatic companion control. A human player, unrelated ally or malformed registration cannot be assigned an automatic turn.

The controller uses actual accessible catalog spells, class resources, preparation/known lists, slots, action/bonus budgets, range, cover and conditions. It first tries supported healing for a dying or seriously injured ally, then a supported single-target attack. A bonus Healing Word permits only an action cantrip afterward. If no legal spell fits, ordinary weapon AI remains available. Readied attacks and Counterspell use the normal reaction path before a cast can spend resources.

Registered dying NPC allies roll real death saves during initiative, once per turn, without a human click. Stable and dead characters do not roll. Natural20 restores1 HP and permits the remaining turn budget. Human death saves remain player-controlled. Death persists, and ordinary rest cannot revive a corpse or recharge its spell/class/item resources.

Automatic actions enter the durable journal from actual combat logs, including terminal actions before combat deletion. The terminal snapshot is bounded to twelve recent entries. Narration receives exact changed bodies/slots and explicit target identity; current state takes precedence over old narrated injuries.

## Interface and model cost

The separate Party section shows class, level, HP and armor. Equipment, available spells and resources are collapsed; portraits and social controls are shared with the same NPC identity. Joined characters are not duplicated in the acquaintance list. Recruiting/dismissing from this section keeps it open.

The normal context packet includes at most three other party members, within the existing12,000-character total. It contains compact exact HP/conditions/abilities/resources/slots rather than complete spell books or character sheets. Automatic NPC combat turns make no extra model call. Multiple dialogue voices use one short batch; advancing, rejecting or interjecting does not generate another response. See [DIALOGUE_AND_COOP.md](DIALOGUE_AND_COOP.md).

## Evidence and limits

The subsequent medical checkpoint adds actual recipient-specific aid, outside-combat death saves, one saved stable recovery deadline and shared rest eligibility. See [MEDICINE_AND_REST.md](MEDICINE_AND_REST.md). Autonomous companion medical decisions remain open; the historical limits below describe the initial companion release.

The live GPT-6-Luna campaign «Колокол над старой башней» used an unmodified bard and wizard NPC. Initial invitation11/DC14 failed; after a real relationship improvement,16/DC14 succeeded. Travel moved the same NPC. In combat, an enemy reduced her8 HP to0; her natural1 death save recorded two failures. The hero's Healing Word restored7 HP using his bonus action and slot. On her next turn she spent one of her own two slots and dealt12 force damage with Magic Missile. Victory awarded17 XP each. Dismissal and rejoining preserved7/8 HP,1/2 slots,17 XP and the same possessions; a server restart preserved them too.

Early live narration misidentified the healing recipient and one spell target while actual numbers remained correct. Exact party/combat changes and target names/IDs were added to the narration contract and regression coverage. This does not prove all future prose is accurate; presentation quality remains under observation.

Offline tests use isolated saves and explicitly declared numerical/initiative fixtures to cover first-join foundations, anti-reroll behavior, receipt conservation, travel/rejoin/reopening, resource spending, range/cover, readied interruption, Counterspell, death saves and posthumous rest/reward protection. Fixtures are not live paid gameplay.

Party item sharing, equipment and five combat preferences now use actual possessions/actions; NPCs can spend their own finite healing items. See [PARTY_ITEMS_AND_ORDERS.md](PARTY_ITEMS_AND_ORDERS.md). Outside-combat medicine is described in [MEDICINE_AND_REST.md](MEDICINE_AND_REST.md).

Remaining work: exact named-spell orders, broader class features and original spells under companion AI, contracts/wages/promises, departure decisions and betrayal, higher-level scenarios and remote cooperative ownership. Automatic area spells are deliberately not selected until safe targeting is implemented. Enemy NPC casters are not all controlled by the companion spell hook. This is an alpha slice, not complete D&D coverage.
