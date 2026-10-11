const crypto = require('node:crypto');
const { z } = require('zod');
const lineSchema = z.object({ speakerId: z.string().min(1).max(120), text: z.string().trim().min(1).max(650), proposal: z.object({ actionId: z.string().min(1).max(120), label: z.string().min(1).max(100) }).strict().optional() }).strict();
const batchSchema = z.object({ lines: z.array(lineSchema).min(1).max(6) }).strict();
function createDialogue(batch, actors, allowedActionIds, baseTurn) {
  const parsed = batchSchema.parse(batch);
  const actorIds = new Set(actors.map(a => a.id));
  for (const line of parsed.lines) {
    if (!actorIds.has(line.speakerId)) throw new Error('Unknown dialogue speaker');
    if (line.proposal && !allowedActionIds.includes(line.proposal.actionId)) throw new Error('Dialogue proposed an unavailable action');
  }
  return { id: `dialogue-${crypto.randomUUID()}`, baseTurn, actors, planned: parsed.lines, spoken: [], cursor: 0, status: 'active', proposals: [], revision: 1 };
}
function nextLine(dialogue) {
  if (!dialogue || dialogue.status !== 'active') return null;
  const planned = dialogue.planned[dialogue.cursor];
  if (!planned) { dialogue.status = 'finished'; return null; }
  const speaker = dialogue.actors.find(a => a.id === planned.speakerId);
  const line = { id: `line-${crypto.randomUUID()}`, speakerId: speaker.id, speakerName: speaker.name, text: planned.text };
  if (planned.proposal) {
    const proposal = { ...planned.proposal, id: `proposal-${crypto.randomUUID()}`, speakerId: speaker.id, status: 'offered' };
    dialogue.proposals.push(proposal); line.proposalId = proposal.id;
  }
  dialogue.spoken.push(line); dialogue.cursor += 1; dialogue.revision += 1;
  if (dialogue.cursor >= dialogue.planned.length) dialogue.status = 'finished';
  return line;
}
function intervene(dialogue, text, playerName) {
  if (!dialogue) throw new Error('No discussion to interrupt');
  const clean = z.string().trim().min(1).max(1200).parse(text);
  const line = { id: `line-${crypto.randomUUID()}`, speakerId: 'player', speakerName: playerName, text: clean };
  dialogue.spoken.push(line); dialogue.planned = []; dialogue.cursor = 0; dialogue.status = 'interrupted'; dialogue.revision += 1;
  dialogue.proposals = dialogue.proposals.map(p => p.status === 'offered' ? { ...p, status: 'withdrawn' } : p);
  return line;
}
function publicDialogue(dialogue) {
  return dialogue ? { id: dialogue.id, actors: dialogue.actors, spoken: dialogue.spoken, proposals: dialogue.proposals, status: dialogue.status, remaining: dialogue.status === 'active' ? dialogue.planned.length - dialogue.cursor : 0, revision: dialogue.revision } : null;
}
module.exports = { createDialogue, nextLine, intervene, publicDialogue };
