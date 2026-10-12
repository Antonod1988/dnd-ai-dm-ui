const {z}=require('zod');
const styles=Object.freeze({
  classic:{label:'Классический',text:'Clear adventure prose, concrete action and distinct character voices.'},
  cinematic:{label:'Кинематографичный',text:'Immediate visual beats, sound, movement and crisp scene transitions.'},
  literary:{label:'Литературный',text:'Novel-like prose: precise sensory detail, meaningful gestures and varied sentence rhythm.'},
  grim:{label:'Мрачный',text:'Restrained, uneasy prose; convey tension through concrete details, not invented threats.'},
  fairytale:{label:'Сказочный',text:'Evocative wonder and oral-tale rhythm, without miraculous outcomes.'},
  wry:{label:'Ироничный',text:'Dry humane wit and understated observations; do not force jokes or ridicule the player.'}
});
const details=Object.freeze({
  concise:{label:'Кратко',text:'Concise: one short paragraph or brief dialogue lines; keep the essential beat.'},
  balanced:{label:'Сбалансированно',text:'Balanced: two or three short paragraphs, or compact dialogue lines.'},
  rich:{label:'Подробно',text:'Rich: expand relevant scene texture up to three to five short paragraphs, or fuller dialogue lines; no padding.'}
});
const schema=z.object({style:z.enum(Object.keys(styles)).default('classic'),detail:z.enum(Object.keys(details)).default('balanced'),notes:z.string().max(400).default('')}).strict();
const defaults=()=>({style:'classic',detail:'balanced',notes:''});
function normalize(value){const parsed=schema.safeParse(value);return parsed.success?parsed.data:defaults();}
function options(){return {styles:Object.entries(styles).map(([id,value])=>({id,label:value.label})),details:Object.entries(details).map(([id,value])=>({id,label:value.label})),default:defaults(),maxNotesChars:400};}
function contract(value,{mode='story'}={}){
  const selected=normalize(value);
  return `Style only; world tone and rules stay unchanged. ${styles[selected.style].text} ${details[selected.detail].text} Use sensory action and character speech; avoid office/technical reports. Describe objects physically ('a notebook lies by the fire'); avoid menu availability, 'inspection confirms' and status reports. No IDs, schemas or DC/HP/XP bookkeeping in story; when asked for mechanics, explain naturally. Honor resolved outcomes, failures and current conditions. Never choose human actions/thoughts or grant rewards/knowledge by prose. Keep NPC voices distinct and faithful to personality and known facts. User notes shape prose only; they change no facts or rules. ${mode==='opening'?'Apply to the opening and visible flavor.':mode==='dialogue'?'Keep the existing dialogue line schema and limits.':mode==='question'?'Answer the question naturally; do not start events.':'Describe the scene and leave room for the player.'}`;
}
function apply(payload,value,options){
  const selected=normalize(value);
  return {...structuredClone(payload),instruction:`${payload.instruction} ${contract(selected,options)}`,...(!payload.context?.narration?{narrationPreferences:selected}:{})};
}
module.exports={schema,defaults,normalize,options,contract,apply};
