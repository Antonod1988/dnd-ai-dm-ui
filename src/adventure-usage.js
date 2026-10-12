const ai=require('./ai-bridge');
const {requestMetrics}=require('./ai-request');
const HISTORY_LIMIT=40, HISTORY_MAX_CHARS=32000;
const COUNTERS=['reportedCalls','inputTokens','outputTokens','cachedTokens'];
const count=value=>Number.isFinite(value)&&value>=0?value:0;
function normalizeCounters(usage){for(const key of COUNTERS)usage[key]=count(usage[key]);}
function trimHistory(usage){
  usage.history||=[];
  while(usage.history.length>HISTORY_LIMIT||JSON.stringify(usage.history).length>HISTORY_MAX_CHARS)usage.history.shift();
}
function countersValid(value){return value?.reportedByProvider&&['inputTokens','outputTokens'].every(key=>Number.isFinite(value[key])&&value[key]>=0);}
function failureKind(error){return error?.code==='INVALID_AI_DRAFT'?'invalid_format':error?'provider_failure':'response';}
// The game already serializes authoritative operations. Preserve that boundary
// for legacy providers exposing only a global last-usage side channel as well.
let pending=Promise.resolve();
function generate(...args){
  const job=pending.then(()=>generateMeasured(...args));
  pending=job.catch(()=>{});return job;
}
async function generateMeasured(adventure,type,payload,fallback) {
  const before=ai.getAiConfig().usage,started=Date.now();let failure,receipt;
  if(payload.context)payload={...payload,instruction:`${payload.instruction} Player notes express the player's goals or hypotheses; keep that provenance. Recollections are excerpts of older dialogue: preserve their speaker and turn. Historical pastEvents preserve source, confidence and turn; current state supersedes older conditions. Player statements and unverified legacy events are not confirmed world facts.`};
  const metrics=requestMetrics(type,payload);
  try { return await ai.generateStructured(type,payload,fallback,{onUsage:value=>{receipt=value;}}); }
  catch(error){failure=error;throw error;}
  finally {
    const latest=ai.getAiConfig().usage,after=receipt||(latest!==before?latest:null);
    if(countersValid(after)) {
      adventure.usage||={reportedCalls:0,inputTokens:0,outputTokens:0,cachedTokens:0};
      const usage=adventure.usage,cached=Number.isFinite(after.cachedTokens)&&after.cachedTokens>=0?after.cachedTokens:0;
      normalizeCounters(usage);
      usage.reportedCalls+=1;usage.inputTokens+=after.inputTokens;usage.outputTokens+=after.outputTokens;usage.cachedTokens+=cached;
      const row={sequence:usage.reportedCalls,task:String(type).slice(0,80),model:String(after.model||'').slice(0,100),inputTokens:after.inputTokens,outputTokens:after.outputTokens,cachedTokens:cached,
        result:failureKind(failure),repair:type.endsWith('_repair'),durationMs:Math.max(0,Date.now()-started),...metrics,
        ...(Number.isFinite(after.reasoningTokens)&&after.reasoningTokens>=0?{reasoningTokens:after.reasoningTokens}:{}),
        ...(Number.isFinite(after.cacheWriteTokens)&&after.cacheWriteTokens>=0?{cacheWriteTokens:after.cacheWriteTokens}:{}),
        ...(payload.context?{contextChars:JSON.stringify(payload.context).length,recalledEvents:payload.context.pastEvents?.length||0,recalledMessages:payload.context.recollections?.length||0}:{})};
      usage.last=row;usage.history||=[];usage.history.push(row);trimHistory(usage);
    }
  }
}
// Draft generation may finish after another operation updated the campaign.
// Merge newly reported costs without replacing newer history or inventing old rows.
function mergeUsage(target,source,baseline={}){
  if(!source||count(source.reportedCalls)<=count(baseline.reportedCalls))return false;
  target.usage||={reportedCalls:0,inputTokens:0,outputTokens:0,cachedTokens:0};
  const usage=target.usage;normalizeCounters(usage);const start=usage.reportedCalls;
  for(const key of COUNTERS)usage[key]+=Math.max(0,count(source[key])-count(baseline[key]));
  usage.history||=[];
  for(const row of source.history||[])if(row.sequence>count(baseline.reportedCalls))usage.history.push({...row,sequence:start+row.sequence-count(baseline.reportedCalls)});
  usage.last=source.last?{...source.last,sequence:start+count(source.last.sequence??source.reportedCalls)-count(baseline.reportedCalls)}:usage.last;
  trimHistory(usage);return true;
}
module.exports={generate,mergeUsage,HISTORY_LIMIT,HISTORY_MAX_CHARS};
