const crypto = require('node:crypto');
const { z } = require('zod');
const array=value=>Array.isArray(value)?value:[];
const lineSchema = z.object({ speakerId: z.string().min(1).max(120), text: z.string().trim().min(1).max(650), interruptsSpeakerId: z.string().min(1).max(120).optional(), proposal: z.object({ actionId: z.string().min(1).max(120), label: z.string().trim().min(1).max(100) }).strict().optional() }).strict();
const batchSchema = z.object({ lines: z.array(lineSchema).min(1).max(5) }).strict();
function createDialogue(batch, actors, allowedActionIds, baseTurn, { sceneId, source = 'council' } = {}) {
  const parsed = batchSchema.parse(batch);
  const actorIds = new Set(actors.map(a => a.id));
  for (const line of parsed.lines) {
    if (line.speakerId === 'player' || !actorIds.has(line.speakerId)) throw new Error('Unknown dialogue speaker');
    if (line.interruptsSpeakerId && (!actorIds.has(line.interruptsSpeakerId) || line.interruptsSpeakerId === line.speakerId)) throw new Error('Unknown dialogue interruption target');
    if (line.proposal && !allowedActionIds.includes(line.proposal.actionId)) throw new Error('Dialogue proposed an unavailable action');
  }
  return { id: `dialogue-${crypto.randomUUID()}`, baseTurn, sceneId, source, actors, planned: parsed.lines, spoken: [], cursor: 0, status: 'active', proposals: [], revision: 1 };
}
function nextLine(dialogue) {
  if (!dialogue || dialogue.status !== 'active') return null;
  const planned = array(dialogue.planned)[dialogue.cursor];
  if (!planned) { dialogue.status = 'finished'; return null; }
  const speaker = array(dialogue.actors).find(a => a.id === planned.speakerId);
  if(!speaker){invalidate(dialogue);return null;}
  const line = { id: `line-${crypto.randomUUID()}`, speakerId: speaker.id, speakerName: speaker.name, text: planned.text };
  if (planned.interruptsSpeakerId) line.interruptsSpeakerId = planned.interruptsSpeakerId;
  if (planned.proposal) {
    const proposal = { ...planned.proposal, id: `proposal-${crypto.randomUUID()}`, speakerId: speaker.id, status: 'offered' };
    dialogue.proposals=array(dialogue.proposals);dialogue.proposals.push(proposal); line.proposalId = proposal.id;
  }
  dialogue.spoken=array(dialogue.spoken);dialogue.spoken.push(line); dialogue.cursor += 1; dialogue.revision += 1;
  if (dialogue.cursor >= dialogue.planned.length) dialogue.status = 'finished';
  return line;
}
function addressedActor(dialogue,targetSpeakerId){
  if(targetSpeakerId===undefined)return null;
  const id=z.string().min(1).max(120).parse(targetSpeakerId);
  const actor=array(dialogue?.actors).find(actor=>actor.id===id);
  if(!actor||['dm','player'].includes(id)||['dm','player'].includes(actor.kind))throw Object.assign(new Error('Choose a current NPC dialogue speaker'),{status:400});
  return actor;
}
function intervene(dialogue, text, playerName, targetSpeakerId) {
  if (!dialogue) throw new Error('No discussion to interrupt');
  const clean = z.string().trim().min(1).max(1200).parse(text);
  const target=addressedActor(dialogue,targetSpeakerId);
  const line = { id: `line-${crypto.randomUUID()}`, speakerId: 'player', speakerName: playerName, text: clean };
  if(target){line.targetSpeakerId=target.id;line.targetSpeakerName=target.name;}
  dialogue.spoken=array(dialogue.spoken);dialogue.spoken.push(line); dialogue.planned = []; dialogue.cursor = 0; dialogue.status = 'interrupted'; dialogue.revision += 1;
  dialogue.proposals = array(dialogue.proposals).map(p => p.status === 'offered' ? { ...p, status: 'withdrawn' } : p);
  return line;
}
function isCurrent(dialogue, turn, sceneId) {
  return Boolean(dialogue && dialogue.baseTurn === turn && (!dialogue.sceneId || dialogue.sceneId === sceneId) && dialogue.status !== 'stale');
}
function invalidate(dialogue) {
  if (!dialogue || dialogue.status === 'stale') return;
  dialogue.planned = []; dialogue.cursor = 0; dialogue.status = 'stale'; dialogue.revision += 1;
  dialogue.proposals = array(dialogue.proposals).map(p => p.status === 'offered' ? { ...p, status: 'withdrawn' } : p);
}
function publicDialogue(dialogue, turn, sceneId) {
  if (!dialogue) return null;
  const stale = turn !== undefined && !isCurrent(dialogue, turn, sceneId);
  return { id: dialogue.id, sceneId: dialogue.sceneId, source: dialogue.source || 'council', actors: array(dialogue.actors), spoken: array(dialogue.spoken), proposals: stale ? array(dialogue.proposals).map(p => p.status === 'offered' ? { ...p, status: 'withdrawn' } : p) : array(dialogue.proposals), status: stale ? 'stale' : dialogue.status, remaining: !stale && dialogue.status === 'active' ? Math.max(0,array(dialogue.planned).length-(dialogue.cursor||0)) : 0, revision: dialogue.revision };
}
function summary(dialogue, turn, sceneId) {
  const view = publicDialogue(dialogue, turn, sceneId);
  return view ? { id: view.id, status: view.status, remaining: view.remaining, spokenCount: view.spoken.length, sceneId: view.sceneId, source: view.source } : null;
}
module.exports = { createDialogue, nextLine, intervene, publicDialogue, isCurrent, invalidate, summary, addressedActor };
