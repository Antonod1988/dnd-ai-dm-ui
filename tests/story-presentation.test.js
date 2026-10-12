const {test}=require('node:test');
const assert=require('node:assert/strict');
const {renderMessage,noticeTitle}=require('../story-presentation');
const message=(role='system',extra={})=>({id:'message-1',role,author:'Поручение',turn:0,text:'Первый абзац.\nСтрока внутри него.\n\nВторой абзац.',...extra});
const summary=html=>html.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]||'';
const articleIds=html=>[...html.matchAll(/<article\b[^>]*\bdata-message-id="([^"]*)"/g)].map(match=>match[1]);
const hasOpenDetails=html=>/<details\b[^>]*\sopen(?:\s|>)/.test(html);
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}

test('only exact system role is a collapsed notice; narrative, heard speech, human, roll and unknown roles remain ordinary records',()=>{
  for(const role of ['dm','companion','player','roll','npc','legacy_role','System','system ',undefined,null]){
    const record=message(role,{role}),html=renderMessage(record);assert.equal(articleIds(html).length,1,String(role));assert.ok(!html.includes('<details'),String(role));assert.ok(!html.includes('<summary'),String(role));assert.ok(html.includes('Первый абзац.'),String(role));assert.ok(html.includes('Второй абзац.'),String(role));assert.ok(html.includes('Строка внутри него.'),String(role));
  }
  const html=renderMessage(message());assert.equal(articleIds(html).length,1);assert.ok(html.includes('<details'));assert.ok(!hasOpenDetails(html));assert.ok(html.includes('<p>Второй абзац.</p>'));assert.ok(html.includes('Поручение спутнику'));
});
test('mixed chronological history preserves every record, author, turn, body and last message ID without source mutation',()=>{
  const roles=['dm','system','companion','player','roll','unknown-old-role','system'],messages=roles.map((role,index)=>message(role,{id:`event-${index}`,author:`Автор ${index}`,turn:index,text:`Начало записи ${index}.\n\nКонец записи ${index}.`})),before=structuredClone(messages);freeze(messages);
  const rendered=messages.map(record=>renderMessage(record)).join('');assert.deepEqual(articleIds(rendered),messages.map(record=>record.id));assert.equal(articleIds(rendered).at(-1),messages.at(-1).id);assert.equal((rendered.match(/<details\b/g)||[]).length,2);let previous=-1;
  for(const record of messages){const position=rendered.indexOf(`data-message-id="${record.id}"`);assert.ok(position>previous);previous=position;const own=renderMessage(record);assert.ok(own.includes(`<span>${record.author}</span>`));assert.ok(own.includes(`<time>ХОД ${record.turn}</time>`));assert.ok(own.includes(record.text.split('\n\n')[0]));assert.ok(own.includes(record.text.split('\n\n')[1]));}
  assert.deepEqual(messages,before);
});
test('repeated authors/system notices are never merged, discarded or moved past intervening heard dialogue',()=>{
  const records=[message('system',{id:'queued',text:'Поручение поставлено в очередь.'}),message('companion',{id:'heard',author:'Рэй',text:'Дай мне закончить.'}),message('system',{id:'refused',text:'Цель ушла. Поручение не выполнено.'})],html=records.map(record=>renderMessage(record)).join('');assert.deepEqual(articleIds(html),['queued','heard','refused']);assert.equal((html.match(/<details\b/g)||[]).length,2);assert.ok(html.indexOf('Поручение поставлено')<html.indexOf('Дай мне закончить'));assert.ok(html.indexOf('Дай мне закончить')<html.indexOf('Поручение не выполнено'));
});
test('default formatter escapes unsafe IDs, roles, authors, turns and complete paragraph text',()=>{
  const record=message('system',{id:'id"><img src=x onerror="bad">',author:'<script>author\'s & "name"</script>',turn:'0<svg onload="bad">',text:'<svg onload="bad">Me & you</svg>\n\n<strong>Last sentence.</strong>'}),before=structuredClone(record),html=renderMessage(record);
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('<svg'));assert.ok(!html.includes('<strong>Last sentence.'));assert.ok(html.includes('id&quot;&gt;&lt;img'));assert.ok(html.includes('&lt;script&gt;author&#39;s &amp; &quot;name&quot;&lt;/script&gt;'));assert.ok(html.includes('0&lt;svg onload=&quot;bad&quot;&gt;'));assert.ok(html.includes('&lt;svg onload=&quot;bad&quot;&gt;Me &amp; you&lt;/svg&gt;'));assert.ok(html.includes('&lt;strong&gt;Last sentence.&lt;/strong&gt;'));assert.equal(articleIds(html).length,1);assert.deepEqual(record,before);
  const unknown=renderMessage(message('legacy" onclick="bad'));assert.ok(!unknown.includes('class="message legacy" onclick='));assert.ok(unknown.includes('legacy&quot; onclick=&quot;bad'));assert.ok(!unknown.includes('<details'));
});
test('expansion is a presentation option only and stored message fields do not silently open a notice',()=>{
  const record=message('system',{expanded:true,open:true}),before=structuredClone(record);assert.ok(!hasOpenDetails(renderMessage(record)));assert.ok(!hasOpenDetails(renderMessage(record,{expanded:false})));assert.ok(hasOpenDetails(renderMessage(record,{expanded:true})));assert.ok(!renderMessage(message('dm'),{expanded:true}).includes('<details'));assert.deepEqual(record,before);
});
test('pending companion instruction header does not claim the spell was cast or completed',()=>{
  const record=message('system',{author:'Party order',turn:7,text:'Luma is asked to cast Glass Light on her next turn. The order is not executed yet.'}),translate=value=>({'Поручение спутнику':'Companion order','ХОД':'TURN'})[value]||value,html=renderMessage(record,{translate}),heading=summary(html);assert.ok(heading.includes('Companion order'));assert.ok(heading.includes('TURN 7'));assert.ok(!/cast|completed|resolved|исполнен|применил|сработал/i.test(heading));assert.ok(html.includes(record.text));assert.ok(html.includes('<span>Party order</span>'));
});
test('travel and reward summaries describe their own subjects while keeping original author and full mechanical evidence',()=>{
  for(const author of ['Путешествие','Travel'])assert.equal(noticeTitle(author),'Припасы и дорога');for(const author of ['Награда','Reward'])assert.equal(noticeTitle(author),'Находки и награды');assert.equal(noticeTitle('Unknown old status'),'Детали хода');
  const travel=renderMessage(message('system',{author:'Путешествие',text:'Нехватка воды усиливает истощение. Нужны вода, еда и отдых.'}));assert.ok(summary(travel).includes('Припасы и дорога'));assert.ok(travel.includes('Нехватка воды усиливает истощение.'));assert.ok(travel.includes('<span>Путешествие</span>'));
  const reward=renderMessage(message('system',{author:'Reward',text:'The bridge quest is complete. Received 50 XP and a key.'}),{translate:value=>value==='Находки и награды'?'Finds and rewards':value});assert.ok(summary(reward).includes('Finds and rewards'));assert.ok(reward.includes('Received 50 XP and a key.'));assert.ok(reward.includes('<span>Reward</span>'));
});
test('unknown legacy authors matching prototype names still receive the generic notice title without native implementation text',()=>{
  for(const author of ['constructor','toString','__proto__']){assert.equal(noticeTitle(author),'Детали хода');const html=renderMessage(message('system',{author}));assert.ok(summary(html).includes('Детали хода'));assert.ok(html.includes(`<span>${author}</span>`));assert.ok(!summary(html).includes('[native code]'));assert.ok(!summary(html).includes('[object Object]'));}
});
test('full long historical text and empty legacy records remain present, including the last ID used for scroll tracking',()=>{
  const text='Начало. '+('Длинная сохранённая фраза. '.repeat(240))+'ПОСЛЕДНЯЯ_ФРАЗА',records=[message('dm',{id:'long',text}),message('unknown-role',{id:'empty-legacy',text:''}),message('system',{id:'final-notice',text:'Действие сохранено. Можно продолжить рассказ без нового броска.'})],html=records.map(record=>renderMessage(record)).join('');assert.ok(html.includes(text));assert.ok(html.includes('ПОСЛЕДНЯЯ_ФРАЗА'));assert.deepEqual(articleIds(html),['long','empty-legacy','final-notice']);assert.ok(html.includes('Можно продолжить рассказ без нового броска.'));assert.equal(articleIds(html).at(-1),'final-notice');
});
test('trusted formatting callback receives every paragraph and translated labels remain escaped',()=>{
  const record=message('system',{text:'Первый.\nВнутренняя строка.\n\nПоследний.'}),seen=[],before=structuredClone(record),html=renderMessage(record,{formatText:paragraph=>{seen.push(paragraph);return `<em>${paragraph}</em>`;},translate:value=>`<img>${value}</img>`});assert.deepEqual(seen,['Первый.\nВнутренняя строка.','Последний.']);assert.ok(html.includes('<em>Первый.\nВнутренняя строка.</em>'));assert.ok(html.includes('<em>Последний.</em>'));assert.ok(!html.includes('<img>'));assert.ok(html.includes('&lt;img&gt;Поручение спутнику&lt;/img&gt;'));assert.deepEqual(record,before);
});
