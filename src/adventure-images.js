const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {z}=require('zod');
const MAX_BYTES=5*1024*1024,MAX_CAMPAIGN_BYTES=50*1024*1024,MAX_IMAGES=20;
const base={campaignId:z.string().min(1).max(120),expectedRevision:z.number().int(),operationId:z.string().min(1).max(100),target:z.enum(['scene','hero','npc']),targetId:z.string().min(1).max(120)};
const uploadSchema=z.object({...base,name:z.string().trim().min(1).max(120),mime:z.enum(['image/png','image/jpeg','image/webp']),data:z.string().min(1).max(Math.ceil(MAX_BYTES/3)*4)}).strict();
const bindSchema=z.object({...base,imageId:z.string().uuid().nullable()}).strict();
const generateSchema=z.object({...base,prompt:z.string().trim().min(5).max(1500),confirmedBilling:z.literal(true)}).strict();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function parse(schema,input){const result=schema.safeParse(input);if(!result.success)fail('Проверьте цель, формат и размер изображения.');return result.data;}
function directory(){return path.join(path.resolve(process.env.DND_DATA_DIR||path.join(__dirname,'..','data')),'images');}
function file(id){if(!z.string().uuid().safeParse(id).success)fail('Изображение не найдено.',404);return path.join(directory(),id);}
function decode(data,mime){
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||data.length%4)fail('Некорректные данные изображения.');
  const bytes=Buffer.from(data,'base64');if(bytes.length>MAX_BYTES)fail('Изображение больше 5 МБ.',413);
  let width=0,height=0;
  if(mime==='image/png'&&bytes.length>=45&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'&&bytes.toString('ascii',bytes.length-8,bytes.length-4)==='IEND'){width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);}
  if(mime==='image/jpeg'&&bytes.length>12&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
    let offset=2;while(offset+4<bytes.length){if(bytes[offset++]!==255)break;while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===218||marker===217)break;const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)break;if([192,193,194].includes(marker)&&length>=8){height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);break;}offset+=length;}
  }
  if(mime==='image/webp'&&bytes.length>=30&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length){
    const type=bytes.toString('ascii',12,16);
    if(type==='VP8X'){width=1+bytes.readUIntLE(24,3);height=1+bytes.readUIntLE(27,3);}
    if(type==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=bytes.readUInt16LE(26)&16383;height=bytes.readUInt16LE(28)&16383;}
    if(type==='VP8L'&&bytes[20]===47){const bits=bytes.readUInt32LE(21);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
  }
  if(!width||!height||width>16384||height>16384||width*height>32e6)fail('Нужна корректная картинка PNG, JPEG или WebP до 32 миллионов пикселей.');
  return {bytes,width,height};
}
function provider(){
  const kind=process.env.IMAGE_PROVIDER||'none',model=process.env.IMAGE_MODEL||'';
  const endpoint=kind==='openai'?'https://api.openai.com/v1/images/generations':process.env.IMAGE_BASE_URL?`${process.env.IMAGE_BASE_URL.replace(/\/$/,'')}/images/generations`:'';
  let allowed=false,local=false;try{const u=new URL(endpoint);local=['127.0.0.1','localhost','[::1]'].includes(u.hostname);allowed=!u.username&&!u.password&&(u.protocol==='https:'||(local&&u.protocol==='http:'));}catch{}
  return {kind,model,endpoint,configured:['openai','openai_compatible'].includes(kind)&&Boolean(model)&&allowed&&Boolean(process.env.IMAGE_API_KEY||local),billing:kind==='openai'?'OpenAI API':kind==='openai_compatible'?'Configured image provider':'None'};
}
function publicImages(state,adventure){const p=provider();return {assets:(adventure.images||[]).map(({hash,...asset})=>({...asset,url:`/api/adventure/images/file?campaignId=${encodeURIComponent(state.campaign.id)}&imageId=${asset.id}`})),bindings:adventure.imageBindings||{},bytes:(adventure.images||[]).reduce((n,a)=>n+a.bytes,0),limits:{imageBytes:MAX_BYTES,campaignBytes:MAX_CAMPAIGN_BYTES,count:MAX_IMAGES},provider:{kind:p.kind,model:p.model,configured:p.configured,billing:p.billing}};}
async function checked(data){
  const engine=require('./adventure-engine'),loaded=await engine.loaded(data.campaignId),{state,adventure}=loaded;if(!state)fail('Сначала создайте приключение.');
  const valid=data.target==='scene'?adventure.locations.some(n=>n.id===data.targetId):data.target==='hero'?state.party.heroId===data.targetId:adventure.npcs.some(n=>n.id===data.targetId);if(!valid)fail('Цель изображения не найдена.');
  if(adventure.appliedOperations.some(op=>op.id===data.operationId))return {...loaded,replayed:true};
  if(adventure.revision!==data.expectedRevision)fail('Кампания уже изменилась. Обновите сцену.',409);
  return loaded;
}
async function commit(loaded,data){const engine=require('./adventure-engine'),{service,state,adventure}=loaded;adventure.revision++;adventure.appliedOperations.push({id:data.operationId,revision:adventure.revision});adventure.appliedOperations=adventure.appliedOperations.slice(-500);await engine.save(service,state,adventure,'image_binding');loaded.imageSaved=true;return engine.publicView(service,state,adventure);}
async function capacity(adventure,size){
  if((adventure.images||[]).length>=MAX_IMAGES||(adventure.images||[]).reduce((n,a)=>n+a.bytes,0)+size>MAX_CAMPAIGN_BYTES)fail('Галерея заполнена: до 20 картинок и 50 МБ на кампанию.',413);
  await fs.mkdir(directory(),{recursive:true});const files=await fs.readdir(directory());let total=0;for(const id of files){if(z.string().uuid().safeParse(id).success)total+=(await fs.stat(file(id))).size;}
  if(total+size>250*1024*1024)fail('Локальная галерея достигла 250 МБ.',413);
}
async function attach(loaded,data,decoded,source){
  const {adventure}=loaded;adventure.images||=[];adventure.imageBindings||={};
  const hash=crypto.createHash('sha256').update(decoded.bytes).digest('hex');let asset=adventure.images.find(a=>a.hash===hash),created=false;
  if(!asset){
    await capacity(adventure,decoded.bytes.length);
    asset={id:crypto.randomUUID(),name:data.name,mime:data.mime,bytes:decoded.bytes.length,width:decoded.width,height:decoded.height,hash,source,createdAt:new Date().toISOString()};
    await fs.writeFile(file(asset.id),decoded.bytes,{flag:'wx'});adventure.images.push(asset);created=true;
  }
  adventure.imageBindings[`${data.target}:${data.targetId}`]=asset.id;
  try{return await commit(loaded,data);}catch(error){if(created&&!loaded.imageSaved)await fs.unlink(file(asset.id)).catch(()=>{});throw error;}
}
async function upload(input){const data=parse(uploadSchema,input),loaded=await checked(data);if(loaded.replayed)return {...await require('./adventure-engine').publicView(loaded.service,loaded.state,loaded.adventure),replayed:true};return attach(loaded,data,decode(data.data,data.mime),'upload');}
async function bind(input){const data=parse(bindSchema,input),loaded=await checked(data);if(loaded.replayed)return {...await require('./adventure-engine').publicView(loaded.service,loaded.state,loaded.adventure),replayed:true};if(data.imageId&&!(loaded.adventure.images||[]).some(a=>a.id===data.imageId))fail('Картинка отсутствует в этой кампании.');loaded.adventure.imageBindings||={};const key=`${data.target}:${data.targetId}`;if(data.imageId)loaded.adventure.imageBindings[key]=data.imageId;else delete loaded.adventure.imageBindings[key];return commit(loaded,data);}
async function read(campaignId,id){const {adventure}=await require('./adventure-engine').loaded(campaignId);const asset=adventure?.images?.find(a=>a.id===id);if(!asset)fail('Изображение не найдено.',404);try{return {bytes:await fs.readFile(file(id)),mime:asset.mime};}catch(error){if(error.code==='ENOENT')fail('Файл изображения отсутствует.',404);throw error;}}
async function generate(input){
  const data=parse(generateSchema,input),loaded=await checked(data);if(loaded.replayed)return {...await require('./adventure-engine').publicView(loaded.service,loaded.state,loaded.adventure),replayed:true};const p=provider();if(!p.configured)fail('Генератор картинок не настроен. Можно загрузить свою.',503);
  await capacity(loaded.adventure,MAX_BYTES);
  let response;try{response=await fetch(p.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers:{'content-type':'application/json',...(process.env.IMAGE_API_KEY?{authorization:`Bearer ${process.env.IMAGE_API_KEY}`}:{})},body:JSON.stringify({model:p.model,prompt:data.prompt,n:1,size:data.target==='scene'?'1536x1024':'1024x1024',quality:'low',output_format:'png'})});}catch{fail('Генератор не ответил. Повторная отправка может создать новый расход.',502);}
  if(!response.ok){await response.body?.cancel();fail(`Генератор отклонил запрос (${response.status}).`,502);}
  let length=0,chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>8*1024*1024)fail('Ответ генератора слишком большой.',502);chunks.push(chunk);}
  let result;try{result=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('Генератор вернул некорректный ответ.',502);}
  const encoded=result.data?.[0]?.b64_json;if(typeof encoded!=='string')fail('Генератор не вернул картинку.',502);
  return attach(loaded,{...data,name:data.prompt.slice(0,120),mime:'image/png'},decode(encoded,'image/png'),`generated:${p.kind}:${p.model}`);
}
module.exports={upload,bind,read,generate,publicImages,decode,provider,MAX_BYTES};
