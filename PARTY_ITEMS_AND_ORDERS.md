# Party possessions and combat preferences

The Party section keeps sharing, equipment and combat preferences in collapsed controls. The story remains the main view. These controls use exact character/item IDs and the existing authoritative command path; they do not ask a narrator to change inventory or execute an attack.

## Possessions

Only the actual hero and joined, local, visible NPC companions participate. Another human's possessions and arbitrary NPC inventories are private. A transfer conserves quantity, money, charges and item provenance. A compatible ordinary stack may merge; differing metadata or charged instances with the same ID are refused instead of overwritten. Coins move between party wallets and are recorded as internal transfers, never new earnings or a merchant payment.

An equipped item's last worn copy, attuned/bound items, active quest deliveries, world keys and scene props cannot be handed over. Spare ordinary copies may be shared while one worn copy stays equipped. Equipment changes operate on genuinely held items and recalculate the actual armor/attacks; unequipping retains the item rather than dropping or duplicating it. Changing a weapon removes its obsolete inventory attack, preserving innate abilities.

Known loose possessions of a fallen joined NPC can be retrieved by the hero. A corpse may be unequipped outside combat, but cannot receive equipment or money. Retrieval preserves death, wounds, spent resources and charges; it cannot import fictional loot or restore the item to the corpse on synchronization/reopening.

Outside combat a handover takes one minute and an equipment change six seconds. In combat the hero must have the actual turn and be in reach of each participating NPC. A handover spends the first object interaction, then the main use-object action if the interaction is already spent. It does not heal or activate the transferred item. Combat equipment swaps are not supported yet.

## Preferences

Preferences are instructions for the companion's next real automatic turn. Setting one spends no turn, time, dice, slot, money or model request. The NPC keeps responsibility for its own legal action and resources.

| Preference | Implemented behavior |
| --- | --- |
| Auto | Existing legal spell/weapon behavior; a critical wounded NPC may use its own finite healing item. |
| Conserve | Avoid leveled offensive spells; emergency slot healing remains possible at zero HP. |
| Defend | Standard Dodge for the NPC itself. |
| Support | Actual known/prepared Healing Word or Cure Wounds for an eligible party target, otherwise Dodge. No invented healing or unexpected offensive fallback. |
| Focus | A valid exact enemy in the current fight, using legal attacks/range/ammunition. It clears when that target/fight ceases to be valid. |

Nonfocus preferences survive travel and dismissal/rejoining. Only explicitly registered NPC allies receive them; another human's turn is never automated. Weapon attacks require real equipment and consume real ammunition. A healing potion uses the NPC's own action, quantity/charge and roll, with no extra attack afterward. None of these automatic actions requires a separate model call.

## Memory and remaining scope

Exact one-shot known-spell orders are now a separate Party control, with current target/resource preview and saved resolved/refused/cancelled outcomes. See [EXACT_COMPANION_ORDERS.md](EXACT_COMPANION_ORDERS.md). The five preferences above remain ongoing modes.

Full transfer provenance is local. The selected model packet receives compact current ownership and preferences; a query may select relevant party items within a 1,600-character ownership slice and the existing 12,000-character total packet. This is a character bound, not an exact billed-token guarantee.

Original NPC spell ownership and selection under AI, higher-level class tactics, wages/promises/betrayal, unknown NPC possessions and party custody of protected quest objects remain open. Defend does not create a shield around another character. Support is not arbitrary healing. Targeted administration of a potion in combat is not implemented by item handover. Offline numerical fixtures and actual model/UI evidence are distinguished in VERIFICATION.md.
