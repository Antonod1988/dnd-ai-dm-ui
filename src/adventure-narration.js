const measuredAi=require('./adventure-usage');
function feedback(error,report){
  const issues=error.issues?.slice(0,6).map(i=>({path:i.path.join('.'),code:i.code,message:i.message.slice(0,180)}));
  return {reason:issues?undefined:String(error.message).slice(0,300),issues,rejectedText:error.draftText?.slice(0,4000),rejectedNarration:report?.narration?.slice?.(0,900),rejectedDevelopments:report?.developments?JSON.stringify(report.developments).slice(0,3000):undefined};
}
async function generate(adventure,payload,fallback,validate,{task='adventure_narration',resolved=true}={}){
  let first,generated=false;
  try{first=await measuredAi.generate(adventure,task,payload,fallback);generated=true;return validate(first);}catch(error){
    if(!generated&&error.code!=='INVALID_AI_DRAFT')throw error;
    const correction={...feedback(error,first),...(!resolved&&first?{rejectedWorld:JSON.stringify(first).slice(0,4000)}:{})};
    let repaired;
    try{
      repaired=await measuredAi.generate(adventure,`${task}_repair`,{...payload,correction,instruction:`${payload.instruction} Your last report was rejected; correction describes the schema problem. Return a corrected report. ${resolved?'The game operation has ALREADY happened: preserve outcome, do not resolve it again or invent new numbers.':task==='adventure_world'?'No campaign or character has been created yet. Correct the proposed world before creation; use consistent IDs and valid references.':'The intended operation has NOT executed. Correct the command for the player intent and valid supplied IDs; do not choose a different action or narrate success.'} Use only valid fields/references. ${resolved?'Optional developments may be empty; adjust narration to the actual accepted world rather than presenting rejected changes as events.':task==='adventure_world'?'Return the original world seed schema, without a narration/developments wrapper. Preserve the player premise and hero concept.':'Return the exact operation schema from the original instruction, without a narration wrapper or numerical state changes.'} This is the single correction attempt.`},()=>first);
      return validate(repaired);
    }catch(second){second.correction=repaired?feedback(second,repaired):{...correction,repairError:String(second.message).slice(0,200)};throw second;}
  }
}
module.exports={generate,feedback};
