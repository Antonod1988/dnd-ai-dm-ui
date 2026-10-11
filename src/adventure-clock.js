// Fictional exploration uses minutes/hours; combat uses six-second rounds.
function elapsedSeconds(command, beforeCombat, afterCombat, outcome = {}) {
  if(['trade','service','market_choice'].includes(command.type))return outcome.elapsedSeconds;
  if (command.type === 'recover_stable') return outcome.recoveryHours * 3600;
  if (beforeCombat) {
    return afterCombat ? Math.max(0, afterCombat.round - beforeCombat.round) * 6 : 6;
  }
  if (command.type === 'combat') return 0;
  if (command.type === 'travel') return 3600;
  if (command.type === 'rest') return command.kind === 'long' ? 28800 : 3600;
  if(['attune_item','unattune_item'].includes(command.type))return 3600;
  if (['cast_spell','cast_created_spell','use_item','equip_item','death_save'].includes(command.type)) return 6;
  if (['accept_quest','pickup','supplies'].includes(command.type)) return 60;
  if (command.type === 'save') return 0;
  return 600;
}

async function expireExplorationEffects(state, previousEffects, seconds) {
  const ticks = Math.floor(seconds / 6);
  if (!ticks || state.combat) return [];
  const core = await import('../vendor/dnd-core/dist/engine.mjs');
  const removedLabels=[];
  state.party.members = state.party.members.map(member => {
    const removed=[];
    const activeEffects=(member.activeEffects || []).flatMap(effect => {
      if (!previousEffects.has(effect.id)) return [effect];
      const updated={...effect};
      for(const field of ['remainingSourceTurnStarts','remainingSourceTurnEnds']) {
        if(updated[field]!==undefined)updated[field]-=ticks;
      }
      if(['remainingSourceTurnStarts','remainingSourceTurnEnds'].some(field=>updated[field]!==undefined&&updated[field]<=0)) {
        removed.push(effect);removedLabels.push(effect.label);return [];
      }
      return [updated];
    });
    return core.cleanRemovedEffectConditions({...member,activeEffects:activeEffects.length?activeEffects:undefined},removed);
  });
  // Reuse the core's condition cleanup rather than dropping applied conditions by hand.
  return [...new Set(removedLabels)];
}

module.exports = { elapsedSeconds, expireExplorationEffects };
