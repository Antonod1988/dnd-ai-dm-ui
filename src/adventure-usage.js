const ai=require('./ai-bridge');
async function generate(adventure,type,payload,fallback) {
  const before=ai.getAiConfig().usage;
  if(payload.context)payload={...payload,instruction:`${payload.instruction} Player notes express the player's goals or hypotheses; keep that provenance. Recollections are excerpts of older dialogue: preserve their speaker and turn.`};
  try { return await ai.generateStructured(type,payload,fallback); }
  finally {
    const after=ai.getAiConfig().usage;
    if(after&&after!==before&&after.reportedByProvider&&Number.isFinite(after.inputTokens)&&Number.isFinite(after.outputTokens)) {
      adventure.usage||={reportedCalls:0,inputTokens:0,outputTokens:0,cachedTokens:0};
      adventure.usage.reportedCalls+=1;adventure.usage.inputTokens+=after.inputTokens;adventure.usage.outputTokens+=after.outputTokens;
      adventure.usage.cachedTokens+=after.cachedTokens||0;
      adventure.usage.last={task:type,model:after.model,inputTokens:after.inputTokens,outputTokens:after.outputTokens,cachedTokens:after.cachedTokens||0};
    }
  }
}
module.exports={generate};
