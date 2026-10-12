const BASIC_INSTRUCTIONS='You are an AI Dungeon Master helper. Follow JSON contracts exactly when asked.';
const STRUCTURED_INSTRUCTION='Return JSON only. Draft flavour is allowed, but mechanics will be validated and clamped by the engine.';
const RULE_FIELDS=Object.freeze(['lootRules','questRules','accessRules','economyRules','companionRules','environmentRules','socialRules']);
const SECTION_FIELDS=Object.freeze(['instruction',...RULE_FIELDS,'context','input','outcome','correction','idea','rejectedDraft','errors','knownSpells','availableActions','companionSpellOrders','dialogue','heard','topic','actors','actions','responseTarget','world','hero','tone','startingPlace','caster','maxSpellLevel','questionOnly']);
const CONTEXT_FIELDS=Object.freeze(['version','language','world','hero','time','scene','survival','combat','party','partyInventory','bookmarks','quests','checks','objects','sceneProps','questIndex','questHistory','activeFacts','recollections','pastEvents','npcs','inventory','createdSpells','nearbyPlaces','recentDialogue','recentEvents','markets','transactions','omitted']);
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const jsonChars=value=>{const rendered=JSON.stringify(value);return rendered===undefined?0:rendered.length;};
const wireClone=value=>JSON.parse(JSON.stringify(value));

function structuredPrompt(type,payload){
  return {task:`generate_${type}`,instruction:STRUCTURED_INSTRUCTION,payload:structuredClone(payload)};
}

/** Only application-owned field names at the two established contract levels are instructions.
 * Nested context, claims, correction feedback and arbitrary *Rules keys always remain user data.
 * JSON normalization matches the old wire serialization, without mutating or retaining input references.
 */
function requestLayout(prompt){
  const original=wireClone(prompt);
  if(!isObject(original)){
    const input=[{role:'developer',content:'{}'},{role:'user',content:JSON.stringify(original)}];
    return {input,static:{},dynamic:original};
  }
  const staticEntries=[],dynamicEntries=[],staticPayload=[],dynamicPayload=[];
  if(typeof original.instruction==='string')staticEntries.push(['instruction',original.instruction]);
  for(const key of RULE_FIELDS)if(typeof original[key]==='string')staticEntries.push([key,original[key]]);
  const payloadObject=isObject(original.payload);
  if(payloadObject){
    // Shared rule blocks precede task-specific contracts and changing task names.
    for(const key of RULE_FIELDS)if(typeof original.payload[key]==='string')staticPayload.push([key,original.payload[key]]);
    if(typeof original.payload.instruction==='string')staticPayload.push(['instruction',original.payload.instruction]);
    for(const [key,value] of Object.entries(original.payload))if(!(key==='instruction'||RULE_FIELDS.includes(key))||typeof value!=='string')dynamicPayload.push([key,value]);
    if(staticPayload.length)staticEntries.push(['payload',Object.fromEntries(staticPayload)]);
  }
  if(typeof original.task==='string')staticEntries.push(['task',original.task]);
  for(const [key,value] of Object.entries(original)){
    if(payloadObject&&key==='payload')dynamicEntries.push(['payload',Object.fromEntries(dynamicPayload)]);
    else if(!(key==='task'||key==='instruction'||RULE_FIELDS.includes(key))||typeof value!=='string')dynamicEntries.push([key,value]);
  }
  const staticPart=Object.fromEntries(staticEntries),dynamic=Object.fromEntries(dynamicEntries);
  return {input:[{role:'developer',content:JSON.stringify(staticPart)},{role:'user',content:JSON.stringify(dynamic)}],static:staticPart,dynamic};
}
function responseInput(prompt,{cacheBreakpoint=false}={}){
  const input=requestLayout(prompt).input;
  if(cacheBreakpoint===true)input[0].content=[{type:'input_text',text:input[0].content,prompt_cache_breakpoint:{mode:'explicit'}}];
  return input;
}

/** Character counts describe app-supplied text, not protocol bytes, tokenizer counts or hidden input.
 * Section sizes are separate views (payload overlaps its children); do not add them together.
 */
function requestMetrics(type,payload){
  const prompt=structuredPrompt(type,payload),layout=requestLayout(prompt);
  const normalized=wireClone(prompt),primary=isObject(normalized.payload)?normalized.payload:normalized;
  const sections=Object.fromEntries(SECTION_FIELDS.map(key=>[key,jsonChars(primary[key])]));
  sections.other=jsonChars(Object.fromEntries(Object.entries(primary).filter(([key])=>!SECTION_FIELDS.includes(key))));
  if(isObject(primary.context))for(const key of CONTEXT_FIELDS)sections[`context.${key}`]=jsonChars(primary.context[key]);
  sections.basicInstructions=BASIC_INSTRUCTIONS.length;
  sections.wrapperInstruction=jsonChars(normalized.instruction);
  sections.task=jsonChars(normalized.task);
  if(Object.prototype.hasOwnProperty.call(normalized,'payload'))sections.payload=jsonChars(normalized.payload);
  const staticChars=BASIC_INSTRUCTIONS.length+layout.input[0].content.length,dynamicChars=layout.input[1].content.length;
  return {inputChars:staticChars+dynamicChars,staticChars,dynamicChars,sections};
}
module.exports={BASIC_INSTRUCTIONS,structuredPrompt,requestLayout,responseInput,requestMetrics};
