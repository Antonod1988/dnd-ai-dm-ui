let currentView = null;
let busy = false;
let currentSection = 'story';
let currentSheet = 'inventory';
let inventoryFilter='all';
let draftSpell = null;
let imageTarget=null;
let pendingTargetCommand = null;
let creatingNew = false;
let intentMode='action';
let historyPage=null,historyVersion='',historyRequest=0,historyTimer;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const storyText=value=>esc(value).replace(/\*\*([^*\n]{1,300})\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]{1,300})\*/g,'<em>$1</em>').replace(/\n/g,'<br>');
const abilityLabels = { str:'СИЛ', dex:'ЛОВ', con:'ТЕЛ', int:'ИНТ', wis:'МДР', cha:'ХАР' };
const skillLabels = { acrobatics:'Акробатика', animal_handling:'Уход за животными', arcana:'Магия', athletics:'Атлетика', deception:'Обман', history:'История', insight:'Проницательность', intimidation:'Запугивание', investigation:'Расследование', medicine:'Медицина', nature:'Природа', perception:'Восприятие', performance:'Выступление', persuasion:'Убеждение', religion:'Религия', sleight_of_hand:'Ловкость рук', stealth:'Скрытность', survival:'Выживание' };
const conditionLabels = { blinded:'Ослеплён', charmed:'Очарован', frightened:'Испуган', poisoned:'Отравлен', prone:'Сбит с ног', restrained:'Опутан', stunned:'Оглушён', paralyzed:'Парализован', unconscious:'Без сознания', dying:'При смерти', dead:'Мёртв', exhaustion:'Истощение' };
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; setTimeout(() => { $('#toast').hidden = true; }, 5500); }
async function request(route, body) {
  const response = await fetch(`/api/adventure/${route}`, body === undefined ? {} : { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`); return data;
}
async function refreshState() { try { render(await request('state')); } catch (error) { toast(error.message); } }
function setBusy(value, message = 'Мастер готовит ответ…') {
  busy = value; $('#turnStatus').textContent = value ? T(message) : '';
  $('#createButton').disabled = value; $('#playerIntent').disabled = value; $('#intentForm button').disabled = value;
  document.body.classList.toggle('is-busy', value);
  document.querySelectorAll('[data-party-share]').forEach(form=>refreshPartyShare(form));
}
async function act(payload,{stay=false}={}) {
  if (busy || !currentView?.ready) return false;
  setBusy(true);
  const section=currentSection;
  try { const result=await request('act', { ...payload, campaignId:currentView.campaign.id, expectedRevision:currentView.campaign.revision, operationId:crypto.randomUUID() });render(result);showSection(stay?section:'story');if(result.refusal)toast(result.refusal.reason);return true; }
  catch (error) { toast(error.message); await refreshState(); return false; }
  finally { setBusy(false); }
}
async function askMaster(input) {
  if(busy||!currentView?.ready)return false;setBusy(true);
  try{render(await request('question',{input,campaignId:currentView.campaign.id,expectedRevision:currentView.campaign.revision,operationId:crypto.randomUUID()}));showSection('story');return true;}
  catch(error){toast(error.message);return false;}finally{setBusy(false);}
}
function showSection(section) {
  currentSection = section;
  for (const name of ['story','map','quests','journal','people','town','character']) $(`#${name}View`).hidden = name !== section;
  const story=section==='story';$('.scene-heading').hidden=!story;$('.scene-art-toolbar').hidden=true;$('#sceneArt').hidden=!story||!artAsset(currentView,'scene',currentView.scene.id);$('#combatBar').hidden=!story||!currentView.combat;
  $('#sectionMenu').open=false;
  document.querySelector('.compact-hero a').textContent=T(section==='character'?'Вернуться к истории →':'Лист персонажа →');
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === section));
}
function showSheet(name) {
  currentSheet = name;
  for (const panel of ['inventory','spells','rolls']) $(`#${panel}Panel`).hidden = panel !== name;
  document.querySelectorAll('[data-sheet]').forEach(button => button.classList.toggle('active', button.dataset.sheet === name));
}
function render(view) {
  currentView = view; $('#welcome').hidden = Boolean(view.ready) && !creatingNew; $('#game').hidden = !view.ready || creatingNew;
  $('#openDiscussion').disabled=!view.ready;
  $('#aiButton').textContent=view.provider?.configured?`AI: ${view.provider.model||view.provider.id}`:'Подключить AI';
  const picker = $('#campaignPicker'); picker.hidden = !view.campaigns?.length;
  picker.replaceChildren(...(view.campaigns || []).map(c => new Option(c.title,c.id)));
  if (!view.ready) { localizeUi(); return; }
  picker.value = view.campaign.id; $('#worldSubtitle').textContent = view.campaign.title;
  $('#sceneTitle').textContent = view.scene.name; $('#sceneDescription').textContent = view.scene.description;
  const minutes = Math.floor(view.campaign.hours * 60 + 1e-6);
  $('#timeBadge').textContent = `День ${view.campaign.day} · ${Math.floor(minutes/60).toString().padStart(2,'0')}:${(minutes%60).toString().padStart(2,'0')}`;
  $('#combatBadge').hidden = !view.combat;
  $('#aiButton').textContent = view.provider.configured ? `AI: ${view.provider.model || view.provider.id}` : 'Подключить AI';
  renderHero(view); renderMessages(view); renderActions(view);renderSceneObjects(view);renderPhysicalProps(view); renderMap(view); renderQuests(view); renderJournal(view); renderPeople(view);renderParty(view); renderCombat(view);renderTown(view);renderArt(view);
  const conversation=view.dialogueSummary;$('#openSceneDialogue').hidden=!(conversation?.source==='scene'&&conversation.status!=='stale'&&conversation.sceneId===view.scene.id&&(conversation.remaining||conversation.spokenCount));
  $('#openSceneDialogue').textContent=T('Разговор в сцене')+(conversation?.remaining?` · ${conversation.remaining}`:'');
  $('#retryNarration').hidden = !view.pendingNarration; showSection(currentSection); showSheet(currentSheet); localizeUi();
}
function renderHero(view) {
  const hero = view.hero;
  $('#heroName').textContent = hero.name; $('#heroSigil').textContent = hero.name[0]?.toUpperCase() || '✦';
  $('#heroIdentity').textContent = `${T(hero.raceLabel)} · ${T(hero.classLabel)}`; $('#heroLevel').textContent = `${hero.level} ур.`;
  $('#heroHp').textContent = `${hero.hp.current} / ${hero.hp.max}${hero.hp.temp ? ` +${hero.hp.temp}` : ''}`;
  $('#compactHeroContent').textContent=`${hero.name} · HP ${hero.hp.current}/${hero.hp.max} · ${T('Защита')} ${hero.ac}`;
  $('#hpFill').style.width = `${Math.max(0,Math.min(100,hero.hp.current/hero.hp.max*100))}%`;
  $('#heroAc').textContent = hero.ac; $('#heroXp').textContent = hero.xp;
  const progression=view.progression||{},remaining=progression.nextLevelXp===null?null:Math.max(0,(progression.nextLevelXp||300)-hero.xp);
  const percent=remaining===null?100:Math.max(0,Math.min(100,(hero.xp-(progression.levelStartXp||0))/((progression.nextLevelXp||300)-(progression.levelStartXp||0))*100));
  $('#xpCaption').textContent=remaining===null?T('Достигнут максимальный уровень'):`${T('До следующего уровня')}: ${remaining} XP`;
  $('#xpFill').style.width=`${percent}%`;$('#xpTrack').setAttribute('aria-valuenow',String(Math.round(percent)));
  $('#heroAc').title=hero.ac!==hero.baseAc?`Базовая защита: ${hero.baseAc}`:'';
  const recovery=$('#recoveryStatus');recovery.hidden=hero.hp.current>0;
  recovery.textContent=hero.conditions.includes('dead')||hero.deathSaves?.dead?'Герой погиб. История и журнал сохранены.':hero.deathSaves?.stable?'Герой стабилен, но без сознания. Можно дождаться восстановления.':`При смерти · успехи ${hero.deathSaves?.successes||0}/3 · неудачи ${hero.deathSaves?.failures||0}/3`;
  $('#abilityGrid').innerHTML = Object.entries(hero.abilities).map(([id,score]) => { const mod=Math.floor((score-10)/2); return `<div><small>${abilityLabels[id]}</small><strong>${score}</strong><em>${mod>=0?'+':''}${mod}</em></div>`; }).join('');
  $('#heroConditions').innerHTML = hero.conditions.map(c=>`<span>${esc(conditionLabels[c]||c)}</span>`).join('')+(hero.activeEffects||[]).map(e=>`<span class="active-effect">✦ ${esc(e.label)}</span>`).join('');
  $('#resourceList').innerHTML = [...Object.entries(hero.spellcasting?.slots||{}).map(([level,s])=>`<div class="resource-row"><span>Ячейки ${level} уровня</span><strong>${s.current} / ${s.max}</strong></div>`),...hero.resources.filter(r=>!/^spell_slots_\d+$/.test(r.id)&&!/^Level \d+ slots$/.test(r.label)).map(r=>`<div class="resource-row"><span>${esc(label(r.label))}</span><strong>${r.current} / ${r.max}</strong></div>`)].join('') || '<p class="muted">Здоровье, движение и доступные действия.</p>';
  const inventory=inventoryFilter==='loot'?hero.inventory.filter(i=>i.origin).slice().sort((a,b)=>b.origin.turn-a.origin.turn):hero.inventory;
  $('#inventoryPanel').innerHTML=`<div class="inventory-filters" role="group" aria-label="Фильтр вещей"><button data-inventory-filter="all" aria-pressed="${inventoryFilter==='all'}">${T('Все вещи')}</button><button data-inventory-filter="loot" aria-pressed="${inventoryFilter==='loot'}">${T('Добыча')}</button></div>`+(inventory.map(item=>inventoryCard(item,view)).join('')||`<p class="empty">${T(inventoryFilter==='loot'?'Новые находки появятся после исследования и выполнения задач.':'Инвентарь пуст.')}</p>`);
  $('#spellList').innerHTML = [...view.createdSpells.map(s=>`<article class="spell-card"><h4>✦ ${esc(s.name)}</h4><p>${esc(s.description)}</p><p>${esc(spellCaption(s))}</p><div class="mini-actions"><button data-created-spell="${esc(s.id)}">Применить</button></div></article>`),...(view.spellbook.spells||[]).map(s=>{const available=!view.combat||spellActions(view,s.id||s.spellId).length;return `<article class="spell-card"><h4>${esc(s.name||s.id)}</h4><p>${esc(s.summary||s.description||'')}</p><p>${esc(spellCaption(s))}</p>${!available?`<p class="muted">${T('Нет доступной цели или ресурса для этого заклинания.')}</p>`:''}<div class="mini-actions"><button data-spell="${esc(s.id||s.spellId)}" ${available?'':'disabled'}>Применить</button></div></article>`;})].join('') || '<p class="empty">Книга магии пока пуста.</p>';
  $('#openSpellWorkshop').disabled = !hero.spellcasting;
  $('#featureList').innerHTML = `${hero.concept?`<p class="hero-concept">${esc(hero.concept)}</p>`:''}<p class="muted">${hero.skillProficiencies.map(s=>uiLanguage==='en'?s.replace(/_/g,' '):skillLabels[s]||s).join(' · ')}</p><ul>${hero.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`;
  $('#rollsPanel').innerHTML = view.rolls.slice().reverse().map(r=>`<article class="item-card"><h4>${esc(({death_save:'Спасбросок от смерти',stable_recovery:'Возвращение в сознание'})[r.label]||skillLabels[r.label]||r.label||r.context||'Бросок')}</h4><p>${esc(r.result?.expression||r.expression||r.roll?.expression||'')}</p><strong>${esc(r.result?.total??r.total??r.roll?.total??'—')}</strong></article>`).join('') || '<p class="empty">Первая проверка ещё впереди.</p>';
  $('#memorySize').textContent = `Контекст мастера: ${view.memory.chars.toLocaleString('ru-RU')} символов`;
  $('#memoryDetails').innerHTML=`<p>${T('Полная история хранится локально. Мастер получает компактную подборку состояния, задач и воспоминаний.')}</p><p>${T('Записей в журнале')}: ${view.memory.journalEntries} · ${T('Сообщений в архиве')}: ${view.memory.archivedMessages}</p><p>${T('Текущий контекст')}: ${view.memory.chars} / ${view.memory.maxChars} ${T('символов')}</p>`;
  if(view.inferenceUsage?.reportedCalls)$('#memoryDetails').innerHTML+=`<p>${T('Учтённые AI-запросы')}: ${view.inferenceUsage.reportedCalls}<br>${T('Входные токены')}: ${view.inferenceUsage.inputTokens}<br>${T('Выходные токены')}: ${view.inferenceUsage.outputTokens}<br>${T('Из входных в кэше')}: ${view.inferenceUsage.cachedTokens}</p><p>${T('Счётчики ответов провайдера для этой кампании. Это не остаток лимита аккаунта.')}</p>`;
  const selection=view.inferenceUsage?.last;if(selection?.contextChars)$('#memoryDetails').innerHTML+=`<p>${T('Выборка для последнего AI-запроса')}: ${selection.contextChars} ${T('символов')}<br>${T('Найдено событий хроники')}: ${selection.recalledEvents||0} · ${T('Отрывков прошлых разговоров')}: ${selection.recalledMessages||0}</p><p>${T('Это размер выбранных данных; инструкции и ответ учитываются отдельно.')}</p>`;
  $('#survivalPanel').hidden = !view.survival.enabled;
  $('#survivalPanel').innerHTML = `<h3>Путешествие</h3><p class="muted">Еда: ${view.survival.foodDays} дн. · Вода: ${view.survival.waterDays} дн.</p>`;
}
function inventoryCard(item,view){
  const effect=item.mechanics?.use,attack=item.mechanics?.equip?.attack;
  const effectNames={healing:'Лечение',temporary_hp:'Временные HP',remove_condition:'Снятие состояния',armor_class_bonus:'Защита',attack_roll_bonus:'Бонус атаки',ability_check_bonus:'Бонус проверки',saving_throw_bonus:'Бонус спасброска'};
  const property=effect?`${T(effectNames[effect.type]||effect.type)}: ${effect.dice||effect.amount||T(conditionLabels[effect.condition]||effect.condition)}${effect.durationTurns?` · ${effect.durationTurns} ${T('раундов')}`:''}`:attack?`${T('Урон')}: ${attack.damageDice}${attack.damageBonus?` +${attack.damageBonus}`:''}${attack.weaponBonus?` · +${attack.weaponBonus} ${T('к атаке')}`:''}`:'';
  const origin=item.origin,originName=origin?.kind==='quest'?view.quests.find(q=>q.id===origin.questId)?.title:origin?.kind==='purchase'?origin.marketName:view.locations.find(l=>l.id===origin?.locationId)?.name;
  const equipped=Object.values(view.hero.equipment||{}).includes(item.itemId),blocked=(item.requiresAttunement&&!item.attuned)||(item.charges&&item.charges.current<item.charges.costPerUse)||(view.combat&&!view.actions.some(a=>a.id===`core:combat.action.use_item.${item.itemId}`||a.id===`core:combat.bonus.class_feature.feature_fast_hands_use_item.${item.itemId}`));
  return `<article class="item-card"><div class="item-heading"><h4>${esc(label(item.name))} <small>×${item.quantity}</small></h4>${item.rarity?`<span class="rarity rarity-${esc(item.rarity)}">${T(({common:'Обычный',uncommon:'Необычный',rare:'Редкий',very_rare:'Очень редкий',legendary:'Легендарный'})[item.rarity]||item.rarity)}</span>`:''}</div><p>${esc(item.description)}</p>${property?`<p class="item-mechanics">${esc(property)}</p>`:''}${origin?`<p class="item-origin">${T(origin.kind==='quest'?'Награда за задачу':origin.kind==='combat'?'Добыча после боя':origin.kind==='purchase'?'Покупка':'Находка')}: ${esc(originName||'')} · ${T('Ход')} ${origin.turn}</p>`:''}${equipped?`<p class="item-equipped">${T('Экипировано')}</p>`:''}<div class="mini-actions">${item.canUse?`<button data-command="use_item" data-item="${esc(item.itemId)}" ${blocked?'disabled':''}>Использовать</button>`:''}${item.tags.some(t=>['weapon','armor','shield','focus'].includes(t))?`<button data-command="equip_item" data-item="${esc(item.itemId)}" ${blocked?'disabled':''}>Надеть / взять</button>`:''}${item.requiresAttunement?`<button data-command="${item.attuned?'unattune_item':'attune_item'}" data-item="${esc(item.itemId)}" ${view.combat?'disabled':''}>${T(item.attuned?'Прекратить настройку':'Настроиться · 1 ч.')}</button>`:''}${item.charges?`<small>${item.charges.current}/${item.charges.max} ${T('зарядов')}</small>`:''}</div></article>`;
}
function spellCaption(spell) {
  const level=Number(spell.level||0);
  return `${level?`${T('Уровень')} ${level}`:T('Заговор')}${spell.rangeFeet!==undefined?` · ${spell.rangeFeet} ${T('фт.')}`:''}${spell.concentration?` · ${T('Концентрация')}`:''}`;
}
function renderMessages(view) {
  const feed=$('#storyFeed'),previous=feed.lastElementChild?.dataset.messageId,scroll=feed.scrollTop; feed.innerHTML=view.messages.map(m=>`<article class="message ${esc(m.role)}" data-message-id="${esc(m.id)}"><div class="message-meta"><span>${esc(m.author)}</span><time>ХОД ${m.turn}</time></div>${m.text.split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${storyText(p)}</p>`).join('')}</article>`).join(''); if(previous!==view.messages.at(-1)?.id)requestAnimationFrame(()=>{if(currentSection==='story')feed.scrollTop=feed.scrollHeight;});else feed.scrollTop=scroll;
}
function label(v) {
  if(uiLanguage==='en')return T(v);
  const names={'End Turn':'Завершить ход',Retreat:'Отступить',Dash:'Рывок',Dodge:'Уклонение',Disengage:'Отход',Hide:'Спрятаться',Search:'Поиск','Ready action':'Подготовить действие','Use Object':'Взаимодействовать с предметом','Demand surrender':'Потребовать сдачи',
    Archery:'Стрельба',Defense:'Защита',Dueling:'Дуэль','Great Weapon Fighting':'Двуручное оружие',Protection:'Прикрытие','Second Wind':'Второе дыхание','Action Surge':'Всплеск действий','Arcane Recovery':'Восстановление магии',
    Longsword:'Длинный меч',Shortbow:'Короткий лук',Dagger:'Кинжал',Chainmail:'Кольчуга','Healing Potion':'Лечебное зелье',Torch:'Факел','Gold piece':'Монеты',Arrow:'Стрелы','Rope 15m':'Верёвка 15 м','Arcane Focus':'Магический фокус','Scholar notes':'Записки учёного'};
  if(names[v])return names[v];
  return String(v).replace(/^Choose fighting style: (.+)$/,(_,style)=>`Боевой стиль: ${names[style]||style}`).replace(/^(Longsword|Shortbow|Dagger): /,(_,weapon)=>`${names[weapon]}: `)
    .replace(/^Search opening: /,'Найти уязвимость: ').replace(/^Help against /,'Помочь против: ').replace(/^Grapple: /,'Захватить: ').replace(/^Shove Prone: /,'Сбить с ног: ').replace(/^Shove Away: /,'Оттолкнуть: ').replace(/^Withdraw (\d+) ft$/,'Отойти на $1 фт.')
    .replace(/^Cast /,'Применить ').replace(/^Use (.+)$/,(_,item)=>`Использовать ${names[item]||item}`).replace(/^Move /,'Переместиться ');
}
function renderSceneObjects(view){
  const objects=view.items.filter(i=>!i.collected&&i.locationId===view.scene.id),panel=$('#sceneObjects');panel.hidden=!objects.length;
  const blocked=view.combat||view.hero.hp.current<=0||view.hero.conditions.some(c=>['dead','unconscious','incapacitated','paralyzed','stunned'].includes(c));
  panel.innerHTML=`<summary>${T('ПРЕДМЕТЫ РЯДОМ')} · ${objects.length}${objects.length===1?` · ${esc(objects[0].name)}`:''}</summary>`+objects.map(i=>{
    const state=i.accessState||{available:true,conditions:[]};
    return `<article class="scene-object ${state.available?'available':'locked'}"><div><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p>${!state.available?`<p class="object-rule">${T(state.mode==='all'?'Нужны все условия':'Достаточно одного способа')}</p><ul>${state.conditions.map(c=>{const target=c.kind==='check'?view.questChecks?.find(d=>d.id===c.targetId)||view.loreChecks.find(d=>d.definitionId===c.targetId):c.kind==='victory'?view.locations.find(l=>l.id===c.targetId):view.items.find(item=>item.id===c.targetId);return `<li>${c.fulfilled?'✓':'○'} ${T(c.kind==='check'?'Проверка':c.kind==='victory'?'Победа':'Ключ')}: ${esc(target?.title||target?.name||c.label||T(c.kind==='check'?'Нужная подсказка':c.kind==='item'?'Нужный предмет':'Препятствие'))}</li>`;}).join('')}</ul>`:''}</div>${state.available?`<button data-action="pickup:${esc(i.id)}" ${blocked?'disabled':''}>${T('Взять')}: ${esc(i.name)}</button>`:`<span class="object-status">${T('Пока недоступно')}</span>`}</article>`;
  }).join('');
}
function renderActions(view) {
  const dock=$('#actionDock'),magicOpen=dock.querySelector('.combat-magic')?.open,extraOpen=dock.querySelector('.optional-actions')?.open;
  const actions=view.actions.filter(a=>!a.id.startsWith('pickup:')),magic=view.combat?actions.filter(a=>a.id.includes('.cast_spell.')||a.id.includes('.metamagic.')):[];
  const extra=view.combat?[]:actions.filter(a=>!['exploration','social','travel'].includes(a.kind));
  const secondaryIds=new Set([...magic,...extra].map(a=>a.id)),button=a=>`<button data-action="${esc(a.id)}" title="${esc(label(a.label))}">${esc(label(a.label))}</button>`;
  dock.innerHTML=actions.filter(a=>!secondaryIds.has(a.id)).map(button).join('')+(magic.length?`<details class="combat-magic" ${magicOpen?'open':''}><summary>${T('Магия этого хода')} · ${magic.length}</summary><div>${magic.map(button).join('')}</div></details>`:'')+(extra.length?`<details class="optional-actions" ${extraOpen?'open':''}><summary>${T('Другие действия')} · ${extra.length}</summary><div>${extra.map(button).join('')}</div></details>`:'');
}
function renderMap(view) {
  const seen=new Set(),edges=[],places=new Map(view.locations.map(l=>[l.id,l]));
  for(const node of view.locations) for(const id of node.connectsTo) { const key=[node.id,id].sort().join(':'); if(seen.has(key))continue;seen.add(key);const other=places.get(id);if(other)edges.push(`<line x1="${node.x}%" y1="${node.y}%" x2="${other.x}%" y2="${other.y}%" stroke="#695b43" stroke-width="1.5" stroke-dasharray="4 5"/>`); }
  $('#worldMap').innerHTML=`<svg aria-hidden="true">${edges.join('')}</svg>`+view.locations.map(n=>`<button class="map-node ${n.id===view.scene.id?'current':n.visited?'visited':''}" style="left:${n.x}%;top:${n.y}%" data-place="${esc(n.id)}" ${!view.scene.connectsTo.includes(n.id)||view.combat?'disabled':''}>${n.visited?'◆':'◇'} ${esc(n.name)}</button>`).join('');
  $('#placeCards').innerHTML=view.locations.map(n=>`<article class="world-card"><p class="eyebrow">${n.id===view.scene.id?'ТЫ ЗДЕСЬ':n.visited?'ИССЛЕДОВАНО':'ИЗВЕСТНОЕ МЕСТО'}</p><h3>${esc(n.name)}</h3><p>${esc(n.description)}</p>${view.scene.connectsTo.includes(n.id)?`<button data-action="travel:${esc(n.id)}" ${view.combat?'disabled':''}>Отправиться →</button>`:''}</article>`).join('');
}
function renderQuests(view) {
  $('#questList').innerHTML=view.quests.map(q=>`<article class="quest-card ${esc(q.status)}"><span class="quest-status">${T({offered:'ПРЕДЛОЖЕНИЕ',active:'В ПУТИ',completed:'ЗАВЕРШЕНО',failed:'НЕ ВЫПОЛНЕНО'}[q.status])}</span><h3>${esc(q.title)}</h3><p>${esc(q.summary)}</p><ul class="objectives">${q.objectives.map(o=>{
    const next=q.status==='active'&&!o.completed&&(!q.sequential||q.objectives.slice(0,q.objectives.indexOf(o)).every(p=>p.completed));
    const npc=o.recipientId&&view.npcs.find(n=>n.id===o.recipientId),place=npc&&view.locations.find(l=>l.id===npc.locationId);
    const ids=new Set([o.targetId,...(o.alternativeTargetIds||[])]);for(let pass=0;pass<(view.questChecks||[]).length;pass++)for(const c of view.questChecks||[])if(ids.has(c.alternativeFor))ids.add(c.id);
    const methods=(view.questChecks||[]).filter(c=>ids.has(c.id));
    const attempts=methods.filter(c=>c.attempted);
    const actions=view.actions.filter(a=>a.questId===q.id&&a.objectiveId===o.id);
    return `<li class="${o.completed?'done':next?'current':''}"><span>${o.completed?'✓':next?'◆':'○'}</span><div>${esc(o.text)}${!o.completed&&npc?`<p class="objective-detail">${T('Адресат')}: ${esc(npc.name)} · ${esc(place?.name||'')}</p>`:''}${!o.completed&&o.kind==='check'?methods.map(c=>`<p class="objective-detail">${esc(c.title)} · ${T(skillLabels[c.skill]||c.skill)} ${c.dc} · ${esc(view.locations.find(l=>l.id===c.locationId)?.name||'')}${c.attempted?` · ${T(c.success?'Успех':'Неудача')} (${c.total}/${c.dc})`:''}</p>`).join(''):''}${next&&attempts.some(c=>!c.success)&&methods.some(c=>!c.attempted)?`<p class="objective-hint">${T('Этот подход не помог. Можно попробовать другой способ.')}</p>`:''}${next&&o.kind==='deliver'?`<p class="objective-hint">${T('Передача заберёт предмет из инвентаря. Разговор сам по себе её не заменяет.')}</p>`:''}${actions.length?`<div class="objective-actions">${actions.map(a=>`<button data-action="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div>`:''}</div></li>`;
  }).join('')}</ul>${q.status==='offered'?`<button data-quest="${esc(q.id)}">${T('Принять задачу')}</button>`:''}${q.rewardClaimed?`<p class="muted">${T('Награда получена и записана в журнале.')}</p>`:''}</article>`).join('')||`<div class="empty">${T('Задач пока нет. Поговори с персонажами или расскажи мастеру, что ищет герой.')}</div>`;
}
function renderJournal(view) {
  const query=$('#journalSearch').value.trim().toLowerCase();
  const category=$('#journalCategory').value,categoryName=$('#journalCategory').selectedOptions[0].textContent;
  const version=`${view.campaign.id}:${view.campaign.revision}`;
  if(historyVersion!==version){historyVersion=version;historyRequest++;historyPage=null;}
  $('#notesList').innerHTML=(view.notes||[]).filter(n=>n.text.toLowerCase().includes(query)).slice().reverse().map(n=>`<article class="journal-entry"><small>${T('Запись игрока')}${n.pinned?' · ★':''}</small><p>${esc(n.text)}</p><button class="subtle" data-memory-pin="${esc(n.id)}" data-memory-kind="note" data-pinned="${n.pinned?'false':'true'}">${T(n.pinned?'Открепить':'Закрепить')}</button></article>`).join('')||`<p class="empty">${T('Здесь можно хранить цели, обещания и свои догадки.')}</p>`;
  $('#factsList').innerHTML=view.facts.filter(f=>f.text.toLowerCase().includes(query)).slice(-200).reverse().map(f=>`<article class="journal-entry"><small>${T(f.tags?.includes('rumor')?'СВЕДЕНИЯ ОТ СОБЕСЕДНИКА':'ПРОВЕРЕННОЕ ОТКРЫТИЕ')}${f.pinned?' · ★':''}</small><p>${esc(f.text)}</p><button class="subtle" data-memory-pin="${esc(f.id)}" data-memory-kind="fact" data-pinned="${f.pinned?'false':'true'}">${T(f.pinned?'Открепить':'Закрепить')}</button></article>`).join('') || '<p class="empty">Открытия появятся после исследований.</p>';
  const hasFacts=view.facts.some(f=>f.text.toLowerCase().includes(query));$('#factsList').closest('section').hidden=!hasFacts;$('#journalView .journal-columns').classList.toggle('has-facts',hasFacts);
  const entries=historyPage?.entries||view.journal.filter(e=>(category==='all'||e.category===category)&&e.text.toLowerCase().includes(query));
  $('#journalList').innerHTML=entries.map(e=>`<article class="journal-entry"><small>${T('ХОД')} ${e.turn}${category!=='all'?` · ${esc(categoryName)}`:''}</small>${esc(e.text)}</article>`).join('') || `<p class="empty">${T('Подходящих записей нет.')}</p>`;
  $('#journalCount').textContent=!historyPage&&(query||category!=='all')?T('Ищу во всей хронике…'):`${T('Показано записей')}: ${entries.length} / ${historyPage?.total??view.journalTotal}`;
  $('#moreJournal').hidden=historyPage?historyPage.nextOffset===null:Boolean(query)||category!=='all'||entries.length>=view.journalTotal;
  localizeUi($('#journalView'));
}
async function loadJournal(reset=true) {
  if(!currentView?.ready)return;
  const campaignId=currentView.campaign.id,query=$('#journalSearch').value.trim(),category=$('#journalCategory').value,version=historyVersion,sequence=++historyRequest;
  $('#moreJournal').disabled=true;
  try {
    const offset=reset?0:historyPage?.nextOffset??currentView.journal.length;
    const page=await request(`history?campaignId=${encodeURIComponent(campaignId)}&query=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&offset=${offset}&limit=50`);
    if(sequence!==historyRequest||campaignId!==currentView.campaign.id||version!==historyVersion||query!==$('#journalSearch').value.trim()||category!==$('#journalCategory').value)return;
    historyPage={...page,entries:reset?page.entries:[...(historyPage?.entries||currentView.journal),...page.entries]};renderJournal(currentView);
  }catch(error){toast(error.message);}finally{$('#moreJournal').disabled=false;}
}
async function memoryChange(route,data) {
  if(busy||!currentView?.ready)return;setBusy(true,T('Сохраняю запись…'));
  try{render(await request(`memory/${route}`,{...data,campaignId:currentView.campaign.id,expectedRevision:currentView.campaign.revision,operationId:crypto.randomUUID()}));await loadJournal(true);return true;}
  catch(error){toast(error.message);return false;}finally{setBusy(false);}
}
function socialCard(n,view,openIds){
  if(n.locationId!==view.scene.id||n.canInteract===false||n.relationship?.available===false||view.combat)return '';
  const relation=n.relationship||{},hostile=(n.disposition||relation.disposition)==='hostile',disabled=view.hero.hp.current<=0||view.hero.conditions.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified'].includes(c));
  return `<details class="npc-social" data-social-details="${esc(n.id)}" ${openIds.has(n.id)?'open':''}><summary>${T('Отношения и разговор')}</summary>${relation.lastOutcome?`<p class="social-result">${esc(relation.lastOutcome.text)}</p>${relation.lastOutcome.check?`<p class="social-check ${relation.lastOutcome.success?'success':'failure'}">${T(skillLabels[relation.lastOutcome.approach]||relation.lastOutcome.approach)}: ${relation.lastOutcome.check.roll.total} / ${T('Сложность')} ${relation.lastOutcome.check.dc} · ${T(relation.lastOutcome.success?'Успех':'Неудача')}</p>`:''}`:''}${relation.dueCoins?`<p>${T('Возмещение ущерба')}: ${relation.dueCoins} ${T('монет')}</p>`:''}<form class="npc-social-form" data-social-npc="${esc(n.id)}"><label>${T('Цель разговора')}<select name="goal"><option value="deescalate" ${hostile?'selected':''}>${T('Уладить конфликт')}</option><option value="rapport" ${hostile?'':'selected'}>${T('Наладить контакт')}</option></select></label><label>${T('Подход')}<select name="approach"><option value="persuasion">${T('Убеждение')}</option><option value="deception">${T('Обман')}</option><option value="intimidation">${T('Запугивание')}</option>${relation.dueCoins||relation.claimableDamage?.length?`<option value="restitution">${T('Возмещение ущерба')}</option>`:''}</select></label><label>${T('Твоя реплика')}<textarea name="statement" maxlength="600" rows="2" placeholder="${T('Что ты хочешь сказать персонажу?')}"></textarea></label><label class="social-payment" hidden>${T('Передать монеты')}<input name="coins" type="number" min="1" max="20" value="${Math.min(20,Math.max(1,relation.dueCoins||relation.claimableDamage?.[0]?.coins||1))}" disabled></label><fieldset class="social-claims" hidden><legend>${T('Возмещаю выбранному персонажу')}</legend>${(relation.claimableDamage||[]).map(p=>`<label><input type="checkbox" name="propIds" value="${esc(p.propId)}" data-claim-coins="${p.coins}" disabled>${esc(p.name)} · ${p.coins} ${T('монет')}</label>`).join('')}</fieldset><p class="social-hint">${T('Исход разговора зависит от проверки. Возмещение передаёт настоящие монеты и само по себе не гарантирует прощения.')}</p><button type="submit" ${disabled?'disabled':''}>${T('Попробовать этот подход')}</button></form></details>`;
}
function renderPeople(view) {
  const openIds=new Set([...$('#peopleList').querySelectorAll('[data-social-details][open]')].map(d=>d.dataset.socialDetails));
  $('#peopleList').innerHTML=view.npcs.filter(n=>!n.companion?.joined).map(n=>{
    const art=artAsset(view,'npc',n.id),body=n.body,disposition=n.disposition||view.environment?.npcs.find(p=>p.id===n.id)?.disposition;
    const condition=body?.conditions.includes('dead')?'Нет в живых':body&&body.hp.current<=0?'Без сознания':null;
    return `<article class="world-card">${art?`<img class="npc-portrait" src="${esc(art.url)}" alt="${esc(n.name)}" loading="lazy">`:''}<p class="eyebrow">${n.locationId===view.scene.id?'РЯДОМ':esc(view.locations.find(l=>l.id===n.locationId)?.name||'')}</p><h3>${esc(n.name)}</h3><p>${esc(n.role)}</p><p>${esc(n.personality)}</p>${body?`<p class="npc-state">${body.hp.current}/${body.hp.max} HP${condition?` · ${T(condition)}`:''}${disposition==='hostile'?` · ${T('Враждебен')}`:''}</p>`:''}<p class="relationship">Знакомство: ${n.familiarity} · Доверие: ${n.trust}</p><button class="subtle" data-npc-art="${esc(n.id)}">${T('Портрет')}</button>${n.locationId===view.scene.id?`<button data-action="talk:${esc(n.id)}" ${view.combat||n.canInteract===false?'disabled':''}>Поговорить</button>`:''}${n.companion?.canRecruit?`<details class="npc-companion-offer"><summary>${T('Возможный спутник')}</summary><p>${esc(n.companion.reason)}</p>${n.companion.lastOutcome?.check?`<p>${T('Убеждение')}: ${n.companion.lastOutcome.check.roll.total} / ${n.companion.lastOutcome.check.dc}</p>`:''}<button data-action="recruit:${esc(n.id)}">${T('Пригласить в отряд')}</button></details>`:''}${socialCard(n,view,openIds)}${medicalCard(n,view)}</article>`;
  }).join('')||'<p class="empty">Новые лица появятся по мере знакомства с миром.</p>';
}
function artAsset(view,target,id){return view.images?.assets.find(a=>a.id===view.images.bindings[`${target}:${id}`]);}
function renderPhysicalProps(view){const props=view.environment?.props||[],panel=$('#physicalProps');panel.hidden=!props.length;panel.innerHTML=`<summary>${T('Обстановка')} · ${props.length}</summary><p class="muted">${T('Опиши, что хочешь сделать с предметом.')}</p>`+props.map(p=>`<article class="scene-object"><div><h3>${esc(p.name)}</h3><p>${T(p.condition==='broken'?'Разбит':p.holderId===view.hero.id?'У героя':'В сцене')}</p></div></article>`).join('');}
function renderParty(view){
  const controlOpenIds=new Set([...document.querySelectorAll('[data-party-control][open]')].map(details=>details.dataset.partyControl));
  const socialOpenIds=new Set([...$('#partyRoster').querySelectorAll('[data-social-details][open]')].map(d=>d.dataset.socialDetails));
  const openIds=new Set([...$('#partyRoster').querySelectorAll('[data-party-details][open]')].map(d=>d.dataset.partyDetails));
  $('#partyRoster').innerHTML=view.party.map(p=>{const npc=view.npcs.find(n=>n.id===p.id),art=p.id===view.hero.id?artAsset(view,'hero',p.id):artAsset(view,'npc',p.id);
    return `<article class="world-card">${art?`<img class="npc-portrait" src="${esc(art.url)}" alt="${esc(p.name)}" loading="lazy">`:''}<p class="eyebrow">${p.id===view.hero.id?T('Герой'):T('Спутник')}</p><h3>${esc(p.name)}</h3><p>${T(p.classLabel||p.className)} · ${T('Уровень')} ${p.level}</p><p>${p.hp.current}/${p.hp.max} HP · ${T('Защита')} ${p.ac}${p.conditions.includes('dead')||p.deathSaves?.dead?` · ${T('Нет в живых')}`:p.hp.current===0?` · ${T('Без сознания')}`:''}</p>${npc?`<p>${esc(npc.role)}</p>`:''}${p.id===view.hero.id?`<button data-view="character" data-open-character>${T('Герой и снаряжение')}</button>`:`<details data-party-details="${esc(p.id)}" ${openIds.has(p.id)?'open':''}><summary>${T('Снаряжение и ресурсы')}</summary><div class="companion-sheet"><p>${T('Боевые действия спутника выполняются по правилам; слова в диалоге не расходуют ресурсы.')}</p><h4>${T('Ресурсы')}</h4>${p.resources.filter(r=>!r.id.startsWith('spell_slots_')).map(r=>`<p>${esc(T(r.label))}: ${r.current}/${r.max}</p>`).join('')}${Object.entries(p.spellcasting?.slots||{}).map(([level,slots])=>`<p>${T('Ячейки заклинаний')} · ${T('Уровень')} ${level}: ${slots.current}/${slots.max}</p>`).join('')}${p.spells?.length?`<h4>${T('Доступная магия')}</h4><p>${[...p.spells].sort((a,b)=>Number(b.prepared)-Number(a.prepared)||Number(b.level)-Number(a.level)).slice(0,10).map(s=>esc(s.name)).join(' · ')}</p>`:''}<h4>${T('Инвентарь')}</h4><ul>${p.inventory.map(i=>`<li>${esc(label(i.name))} ×${i.quantity}</li>`).join('')}</ul></div></details>${npc?`<button class="subtle" data-npc-art="${esc(p.id)}">${T('Портрет')}</button>${socialCard(npc,view,socialOpenIds)}`:''}${npc?.companion?.canDismiss?`<button class="subtle" data-action="dismiss:${esc(p.id)}">${T('Отпустить спутника')}</button>`:''}`}${medicalCard(p,view)}${partyControls(p,view)}</article>`;
  }).join('');
  document.querySelectorAll('[data-party-control]').forEach(details=>{details.open=controlOpenIds.has(details.dataset.partyControl);});
  document.querySelectorAll('[data-party-share]').forEach(form=>refreshPartyShare(form,true));
}
function medicalCard(person,view){
  const status=person.medical;if(!status)return '';
  const actions=view.actions.filter(action=>action.kind==='support'&&action.id.endsWith(`:${person.id}`));
  const critical=['dying','stable'].includes(status.phase);
  if(!critical&&!actions.length)return '';
  const text=status.phase==='dying'?`${T('При смерти')} · ${T('Успехи')}: ${status.deathSaves?.successes||0}/3 · ${T('Неудачи')}: ${status.deathSaves?.failures||0}/3`:status.phase==='stable'?`${T('Стабилен, без сознания')}${status.remainingSeconds!==null&&status.remainingSeconds!==undefined?` · ${T('Восстановление через')} ${Math.ceil(status.remainingSeconds/60)} ${T('мин.')}`:''}`:T('Ранен');
  const buttons=actions.map(action=>{const item=view.hero.inventory.find(item=>action.id===`aid:item:${item.itemId}:${person.id}`);return `<button class="subtle" data-action="${esc(action.id)}">${esc(action.id.startsWith('aid:stabilize:')?`${T('Первая помощь')} · ${T('Медицина')} DC10`:`${T('Применить лечение')}: ${label(item?.name||action.label)}`)}</button>`;}).join('');
  const recovery=person.id===view.hero.id?view.actions.find(action=>action.kind==='recovery'):null;
  const recoveryButton=recovery?`<button class="subtle" data-action="${esc(recovery.id)}">${T(recovery.id==='death:save'?'Спасбросок от смерти':'Дождаться срока восстановления')}</button>`:'';
  return `<details class="medical-details" ${critical?'open':''}><summary>${T('Помощь персонажу')}</summary><p class="${status.phase==='dying'?'medical-warning':status.phase==='stable'?'medical-stable':'muted'}">${text}</p>${status.phase==='dying'?`<p>${T(status.manualDeathSaves?'Используй спасбросок от смерти: герой пока не может действовать.':'Прошедшее время вызывает спасброски. Помощь важнее долгого отдыха.')}</p>`:''}${buttons}${recoveryButton}${!buttons&&!recoveryButton?`<p>${T('Используй подходящее заклинание или дождись восстановления после стабилизации.')}</p>`:''}</details>`;
}
const orderNames={auto:'Действовать самостоятельно',conserve:'Беречь ячейки',defend:'Обороняться',support:'Поддерживать союзников',focus:'Выбранная цель'};
function partyControls(person,view){
  const order=person.order,inventory=view.partyInventory,owner=inventory?.participants.find(member=>member.id===person.id);
  const controls=[];
  if(order){const targets=order.mode==='focus'?(view.combat?.participants.filter(member=>member.kind==='enemy'&&member.hp.current>0&&!member.conditions.some(c=>['dead','fled','captured'].includes(c)))||[]):view.party.filter(member=>member.id!==person.id&&!member.conditions.includes('dead')&&!member.deathSaves?.dead);
    controls.push(`<details data-party-control="order:${esc(person.id)}"><summary>${T('Боевое поручение')} · ${T(orderNames[order.mode])}</summary><form data-party-order="${esc(person.id)}"><label>${T('Режим')}<select name="mode">${Object.entries(orderNames).filter(([mode])=>mode!=='support'||order.canSupport).filter(([mode])=>mode!=='focus'||order.canFocus).map(([mode,name])=>`<option value="${mode}" ${mode===order.mode?'selected':''}>${T(name)}</option>`).join('')}</select></label><label data-order-target ${['support','focus'].includes(order.mode)?'':'hidden'}>${T('Цель')}<select name="targetId"><option value="">${T('Выбрать автоматически')}</option>${targets.map(target=>`<option value="${esc(target.id)}" ${target.id===order.targetId?'selected':''}>${esc(target.name)}</option>`).join('')}</select></label><p class="muted">${T('Поручение не выполняет действие немедленно. Спутник действует своим ходом и тратит свои ресурсы.')}</p><button type="submit" ${order.canOrder?'':'disabled'}>${T('Задать поручение')}</button>${!order.canOrder?`<p>${T('Нужны действующий спутник и собственный ход героя.')}</p>`:''}</form></details>`);
  }
  if(owner){const sources=inventory.participants,initial=owner.retrieval?owner:sources.find(member=>member.id===view.hero.id)||sources[0],recipient=person.id===view.hero.id?sources.find(member=>member.id!==person.id&&member.canReceive):owner.canReceive?owner:sources.find(member=>member.id===view.hero.id);
    if(inventory.available)controls.push(`<details data-party-control="share:${esc(person.id)}"><summary>${T('Распределить вещи')}</summary><form data-party-share><label>${T('От кого')}<select name="fromId">${sources.map(member=>`<option value="${esc(member.id)}" ${member.id===initial.id?'selected':''}>${esc(member.name)}</option>`).join('')}</select></label><label>${T('Кому')}<select name="toId">${sources.filter(member=>member.canReceive).map(member=>`<option value="${esc(member.id)}" ${member.id===recipient?.id?'selected':''}>${esc(member.name)}</option>`).join('')}</select></label><label>${T('Вещь')}<select name="itemId"></select></label><label>${T('Количество')}<input name="quantity" type="number" min="1" max="1000" value="1" required></label><p class="party-share-hint muted"></p><button type="submit">${T('Передать вещь')}</button></form></details>`);
    controls.push(`<details data-party-control="gear:${esc(person.id)}"><summary>${T('Сменить экипировку')}</summary><form data-party-gear="${esc(person.id)}"><label>${T('Вещь')}<select name="itemId">${owner.items.filter(item=>item.canEquip||item.canUnequip).map(item=>`<option value="${esc(item.itemId)}" data-worn="${item.equipped}">${esc(label(item.name))}${item.equipped?` · ${T('Экипировано')}`:''}</option>`).join('')}</select></label><button type="submit" ${owner.items.some(item=>item.canEquip||item.canUnequip)?'':'disabled'}>${T('Надеть или снять')}</button><p class="muted">${T('Смена экипировки доступна вне боя и не расходует сам предмет.')}</p></form></details>`);
  }
  return controls.length?`<div class="party-controls">${controls.join('')}</div>`:'';
}
function refreshPartyShare(form,reset=false){
  const owner=currentView.partyInventory?.participants.find(member=>member.id===form.elements.fromId.value),items=owner?.items||[];
  const selected=form.elements.itemId.value;
  if(reset||!items.some(item=>item.itemId===selected)){form.elements.itemId.innerHTML=items.map(item=>`<option value="${esc(item.itemId)}">${esc(label(item.name))} ×${item.quantity}${item.blocked?` · ${T('Недоступно')}`:''}</option>`).join('');form.elements.itemId.value=items.find(item=>item.maxQuantity>0)?.itemId||items[0]?.itemId||'';}
  const item=items.find(item=>item.itemId===form.elements.itemId.value),same=owner?.id===form.elements.toId.value;
  form.elements.quantity.max=String(item?.maxQuantity||1);if(Number(form.elements.quantity.value)>Number(form.elements.quantity.max))form.elements.quantity.value=form.elements.quantity.max;
  form.querySelector('button').disabled=busy||!item||!item.maxQuantity||same;
  form.querySelector('.party-share-hint').textContent=same?T('Вещь уже у этого владельца.'):item?.blocked||T(currentView.combat?'В бою нужен соседний спутник; используется взаимодействие с предметом или действие.':'Вещь меняет владельца; количество и свойства сохраняются.');
}
function renderArt(view){
  const scene=artAsset(view,'scene',view.scene.id),hero=artAsset(view,'hero',view.hero.id);
  $('#sceneArt').hidden=!scene;$('#sceneArt').innerHTML=scene?`<img src="${esc(scene.url)}" alt="${esc(view.scene.name)}"><figcaption>${esc(view.scene.name)}</figcaption>`:'';
  if(hero)$('#heroSigil').innerHTML=`<img src="${esc(hero.url)}" alt="${esc(view.hero.name)}">`;
  if($('#imageWorkshop').open)renderImageGallery();
}
function renderImageGallery(){
  if(!imageTarget||!currentView?.images)return;
  const art=currentView.images,selected=artAsset(currentView,imageTarget.target,imageTarget.targetId);
  $('#imageStorage').textContent=`${art.assets.length} / ${art.limits.count} · ${(art.bytes/1048576).toFixed(1)} / ${art.limits.campaignBytes/1048576} MB · ${T('До 5 МБ на картинку')}`;
  $('#unlinkImage').disabled=!selected||busy;
  $('#imageGallery').innerHTML=art.assets.map(a=>`<button class="gallery-image ${selected?.id===a.id?'selected':''}" data-image-bind="${esc(a.id)}" ${busy?'disabled':''}><img src="${esc(a.url)}" alt="" loading="lazy"><span>${esc(a.name)}</span>${selected?.id===a.id?`<small>${T('Выбрано')}</small>`:''}</button>`).join('')||`<p class="muted">${T('Картинок пока нет. Загрузи первую.')}</p>`;
  $('#imageProviderStatus').textContent=art.provider.configured?`${art.provider.billing} · ${art.provider.model}. ${T('Отдельный запрос к провайдеру картинок; возможна оплата по его тарифам.')}`:T('Генератор не настроен. Свои картинки доступны без него.');
  $('#generateImage').disabled=busy||!art.provider.configured;
  $('#imageUpload').disabled=busy;
  localizeUi($('#imageWorkshop'));
}
function openArt(target,targetId,title,description){if(busy||!currentView?.ready)return;$('#sectionMenu').open=false;imageTarget={target,targetId};$('#imageTargetTitle').textContent=title;$('#imagePrompt').value=description||title;$('#imageStatus').textContent='';$('#imageUpload').value='';$('#imageWorkshop').showModal();renderImageGallery();}
async function imageMutation(route,extra){if(busy||!imageTarget)return;setBusy(true);renderImageGallery();$('#imageStatus').textContent=T(route==='generate'?'Генератор рисует…':'Сохраняется картинка…');try{render(await request(`images/${route}`,{...extra,...imageTarget,campaignId:currentView.campaign.id,expectedRevision:currentView.campaign.revision,operationId:crypto.randomUUID()}));$('#imageStatus').textContent=T('Картинка сохранена.');}catch(error){$('#imageStatus').textContent=error.message;}finally{setBusy(false);renderImageGallery();}}
function initArt(){
  $('#openSceneArt').addEventListener('click',()=>openArt('scene',currentView.scene.id,currentView.scene.name,currentView.scene.description));
  $('#heroSigil').addEventListener('click',()=>openArt('hero',currentView.hero.id,currentView.hero.name,currentView.hero.concept));
  for(const container of ['#peopleList','#partyRoster'])$(container).addEventListener('click',event=>{const button=event.target.closest('[data-npc-art]');if(button){const npc=currentView.npcs.find(n=>n.id===button.dataset.npcArt);openArt('npc',npc.id,npc.name,`${npc.role}. ${npc.personality}`);}});
  $('#closeImageWorkshop').addEventListener('click',()=>{if(!busy)$('#imageWorkshop').close();});
  $('#imageWorkshop').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('#imageGallery').addEventListener('click',event=>{const button=event.target.closest('[data-image-bind]');if(button)imageMutation('bind',{imageId:button.dataset.imageBind});});
  $('#unlinkImage').addEventListener('click',()=>imageMutation('bind',{imageId:null}));
  $('#generateImage').addEventListener('click',()=>imageMutation('generate',{prompt:$('#imagePrompt').value,confirmedBilling:true}));
  $('#imageUpload').addEventListener('change',async event=>{
    const selected=event.target.files[0];if(!selected||busy)return;const uploadTarget=imageTarget,uploadCampaign=currentView.campaign.id;
    if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>5*1048576){$('#imageStatus').textContent=T('Нужна PNG, JPEG или WebP до 5 МБ.');return;}
    try{const bitmap=await createImageBitmap(selected);const pixels=bitmap.width*bitmap.height;bitmap.close();if(pixels>32e6)throw new Error(T('Слишком большое разрешение картинки.'));const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error(T('Не удалось прочитать картинку.')));reader.readAsDataURL(selected);});if(imageTarget!==uploadTarget||currentView.campaign.id!==uploadCampaign)return;await imageMutation('upload',{name:selected.name.slice(0,120),mime:selected.type,data});}catch(error){$('#imageStatus').textContent=error.message;}finally{event.target.value='';}
  });
}
function renderTown(view){
  const economy=view.economy||{coins:0,markets:[],ledger:[],sellable:[]};$('#townCoins').textContent=economy.coins;
  $('#townStatus').textContent=T(view.combat?'Во время боя сделки недоступны.':'Цены и доступные запасы указаны ниже.');
  const descriptions={supplies:'Еда и вода на три дня',lodging:'8 часов отдыха · +1d4 к следующей проверке',healing:'Восстановить до 8 HP',rumor:'Получить и записать сведения',transport:'Перемещение за 15 минут'};
  $('#marketList').innerHTML=economy.markets.map(m=>`<article class="market-card"><header><div><p class="eyebrow">${esc(view.npcs.find(n=>n.id===m.merchantId)?.name||T('Местные торговцы'))}</p><h3>${esc(m.name)}</h3></div>${m.discount?`<span class="market-benefit">${T('Доверие')} · ${T('Льготные цены')}</span>`:''}</header><p>${esc(m.livelihood)}</p>${m.shortage?`<p class="market-shortage"><strong>${T('Дефицит')}:</strong> ${esc(m.shortage)}</p>`:''}<div class="market-offers">${m.offers.map(o=>{
    const use=o.mechanics,type={healing:'Лечение',temporary_hp:'Временные HP',armor_class_bonus:'Защита',ability_check_bonus:'Бонус проверки',attack_roll_bonus:'Бонус атаки',saving_throw_bonus:'Бонус спасброска',remove_condition:'Снятие состояния'}[use?.type];
    const effect=type?`${T(type)}: ${use.dice||use.amount||T(conditionLabels[use.condition]||use.condition)}${use.durationTurns?` · ${use.durationTurns} ${T('раундов')}`:''}${use.consume?` · ${T('Расходуется')}`:''}`:use?.damageDice?`${T('Урон')}: ${use.damageDice}`:o.kind==='transport'?`${T('Перемещение')}: ${o.travelMinutes} ${T('мин.')}`:T(descriptions[o.kind]||'Свойства предмета указаны в инвентаре');
    const unavailable=view.combat?'Во время боя сделки недоступны.':view.hero.hp.current<=0?'Герой не может совершить сделку':o.stock<=0?'Запасы закончились':economy.coins<o.price?'Недостаточно монет':o.kind==='healing'&&view.hero.hp.current>=view.hero.hp.max?'Здоровье уже восстановлено':'';
    const disabled=Boolean(unavailable);
    return `<section class="market-offer"><div><h4>${esc(o.name)}</h4><p>${esc(o.description)}</p><p class="offer-effect">${esc(effect)}</p>${o.arrivalMinutes?`<p class="offer-effect">${T('Путь к ночлегу')}: ${o.arrivalMinutes} ${T('мин.')} · ${esc(view.locations.find(l=>l.id===o.targetId)?.name||'')}</p>`:''}${o.requiresAttunement?`<p class="offer-effect">${T('Требует настройки')}</p>`:''}${o.charges?`<p class="offer-effect">${o.charges.current}/${o.charges.max} ${T('зарядов')}</p>`:''}<small>${T('Осталось')}: ${o.stock}</small>${unavailable?`<p class="muted">${T(unavailable)}</p>`:''}</div><button data-market="${esc(m.id)}" data-offer="${esc(o.id)}" data-commerce="${['goods','supplies'].includes(o.kind)?'buy':'service'}" ${disabled?'disabled':''}>${T(['goods','supplies'].includes(o.kind)?'Купить':'Выбрать')} · ${o.price}</button></section>`;
  }).join('')}</div><details class="sell-panel"><summary>${T('Продать вещи')} · ${T('У торговца')}: ${m.cash} ${T('монет')}</summary>${economy.sellable.filter(i=>!i.blocked).map(i=>`<div class="sell-row"><span>${esc(label(i.name))} <small>×${i.quantity}</small></span><button data-commerce="sell" data-market="${esc(m.id)}" data-sell-item="${esc(i.itemId)}" ${view.combat||view.hero.hp.current<=0||m.cash<i.price?'disabled':''}>${T('Продать одну')} · +${i.price}</button></div>`).join('')||`<p class="muted">${T('Нет свободных вещей для продажи. Экипировка и предметы задач защищены.')}</p>`}</details>${m.encounter?`<section class="market-encounter"><p class="eyebrow">${T(m.encounter.resolved?'ПОМОЩЬ ЗАСЧИТАНА':'МЕСТНАЯ ВСТРЕЧА')}</p><h4>${esc(m.encounter.title)}</h4><p>${esc(m.encounter.description)}</p>${m.encounter.resolved?`<p class="market-benefit">${T('Доверие выросло. Условия торговли улучшены.')}</p>`:m.encounter.choices.map(c=>{const attempted=m.encounter.attempts.find(a=>a.choiceId===c.id);return `<button data-commerce="choice" data-market="${esc(m.id)}" data-choice="${esc(c.id)}" ${view.combat||view.hero.hp.current<=0||attempted||(c.kind==='donate'&&economy.coins<2)?'disabled':''}>${esc(c.label)}${c.kind==='check'?` · ${T(uiLanguage==='en'?c.skill:skillLabels[c.skill])} ${c.dc}`:' · 2'}${attempted?` · ${T(attempted.success?'Успех':'Неудача')}`:''}</button>`;}).join('')}</section>`:''}</article>`).join('')||`<p class="empty">${T('Здесь пока нет торговцев и услуг. Ищи поселения или знакомься с местными.')}</p>`;
  $('#transactionList').innerHTML=economy.ledger.map(row=>`<article class="transaction-row"><span>${esc(row.text)}<small>${T('Ход')} ${row.turn} · ${esc(row.marketName)}</small></span><strong class="${row.amount>0?'income':'expense'}">${row.amount>0?'+':''}${row.amount}</strong></article>`).join('')||`<p class="muted">${T('Сделок пока нет.')}</p>`;
}
function renderCombat(view) {
  const bar=$('#combatBar');bar.hidden=!view.combat;if(!view.combat){bar.replaceChildren();return;}
  const current=view.combat.participants[view.combat.turnIndex];
  bar.innerHTML=`<span>Раунд ${view.combat.round}</span>`+view.combat.participants.map(p=>`<span class="combat-token ${p.id===current.id?'current':''}">${esc(p.name)} ${p.hp.current}/${p.hp.max}</span>`).join('')+(view.turnBudget?`<span>Действие ${view.turnBudget.action?'●':'○'} · Бонус ${view.turnBudget.bonusAction?'●':'○'} · ${view.turnBudget.movementFt} фт.</span>`:'');
}
function spellActions(view,id){if(view.combat){const actor=view.combat.participants[view.combat.turnIndex];if((actor.sourceCharacterId||actor.id)!==view.hero.id)return [];}return view.actions.filter(a=>{const parts=a.id.match(/^core:combat\.(action|bonus|reaction)\.cast_spell\.([^.]+)\.(.+)$/);return parts&&parts[2]===id;});}
function target(command,title) {
  pendingTargetCommand=command;$('#targetTitle').textContent=title;
  if(command.type==='cast_spell'&&currentView.combat){const options=spellActions(currentView,command.spellId);$('#targetChoices').innerHTML=options.map(a=>`<button class="target-choice" data-target-action="${esc(a.id)}"><span>${esc(label(a.label))}</span><small>${T(a.id.includes('combat.bonus.')?'бонусное действие':a.id.includes('combat.reaction.')?'реакция':'действие')}</small></button>`).join('')||`<p class="muted">${T('Нет доступной цели или ресурса для этого заклинания.')}</p>`;$('#targetDialog').showModal();return;}
  const spell=command.type==='cast_created_spell'?currentView.createdSpells.find(s=>s.id===command.spellId):null;
  const targets=(currentView.combat?currentView.combat.participants.filter(p=>!p.conditions.includes('dead')):currentView.party).filter(p=>spell?.target!=='self'||p.id===currentView.hero.id||p.sourceCharacterId===currentView.hero.id);
  $('#targetChoices').innerHTML=targets.map(p=>`<button class="target-choice" data-target="${esc(p.id)}"><span>${esc(p.name)}</span><span>${p.hp.current}/${p.hp.max} HP</span></button>`).join('');$('#targetDialog').showModal();
}
function spellPreview(data) {
  if(!data.ok){draftSpell=null;$('#learnSpell').hidden=true;$('#spellDraftCard').innerHTML=`<p>${data.errors.map(esc).join('<br>')}</p>`;return;}
  draftSpell=data.spell;$('#learnSpell').hidden=false;
  $('#spellDraftCard').innerHTML=`<article class="spell-preview"><h3>${esc(data.spell.name)}</h3><p>${esc(data.spell.description)}</p><p>${esc(spellCaption(data.spell))} · ${T(data.spell.cost==='action'?'действие':'бонусное действие')}</p><p>${T('Цель')}: ${T(data.spell.target==='self'?'Только герой':'Существо')} · ${T('Длительность')}: ${data.spell.durationTurns?`${data.spell.durationTurns} ${T('раундов')}`:T('Мгновенно')}${data.spell.concentration?` · ${T('Концентрация')}`:''}</p>${data.spell.saveAbility?`<p>${T('Спасбросок')}: ${esc(uiLanguage==='en'?data.spell.saveAbility.toUpperCase():abilityLabels[data.spell.saveAbility])}</p>`:''}${data.spell.effects.map(e=>`<p>${esc({damage:'Урон',healing:'Лечение',temporary_hp:'Временные HP',condition:'Состояние',armor:'Защита',speed:'Скорость',resistance:'Сопротивление',utility:'Эффект',skill_bonus:'Бонус навыка',remove_condition:'Снятие состояния'}[e.type]||e.type)}: <code>${esc(e.dice||e.condition||e.feature||e.amount||e.feet||e.damageType)}</code></p>`).join('')}</article>`; localizeUi($('#spellWorkshop'));
}
async function init() {
  const sceneDialogueButton=document.createElement('button');sceneDialogueButton.id='openSceneDialogue';sceneDialogueButton.className='subtle scene-dialogue-launcher';sceneDialogueButton.hidden=true;sceneDialogueButton.textContent=T('Разговор в сцене');$('#storyFeed').after(sceneDialogueButton);
  const physicalProps=document.createElement('details');physicalProps.id='physicalProps';physicalProps.className='scene-objects physical-props';physicalProps.hidden=true;$('#sceneObjects').after(physicalProps);
  $('#characterView').append($('#characterSheet'));
  $('#sectionMenu>div').append($('#openSceneArt'));
  document.querySelector('.compact-hero a').addEventListener('click',event=>{event.preventDefault();showSection(currentSection==='character'?'story':'character');});
  document.addEventListener('click',event=>{if(!event.target.closest('#sectionMenu'))$('#sectionMenu').open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')$('#sectionMenu').open=false;});
  initArt();
  const languageLink=document.createElement('a');languageLink.className='subtle';languageLink.href=uiLanguage==='en'?'/?lang=ru':'/?lang=en';languageLink.textContent=uiLanguage==='en'?'RU':'EN';languageLink.setAttribute('aria-label','Switch interface language');document.querySelector('.header-actions').prepend(languageLink);
  if(uiLanguage==='en') { $('#createForm [name=location]').value='The threshold of a new world'; $('#createForm [name=heroName]').placeholder='Mira'; $('#worldSubtitle').textContent=T('Мир, который начинается с твоей идеи'); }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.view)));
  document.querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>showSheet(b.dataset.sheet)));
  $('#journalSearch').addEventListener('input',()=>{if(!currentView?.ready)return;historyRequest++;historyPage=null;renderJournal(currentView);clearTimeout(historyTimer);historyTimer=setTimeout(()=>loadJournal(true),250);});
  $('#journalCategory').addEventListener('change',()=>{if(!currentView?.ready)return;clearTimeout(historyTimer);historyPage=null;renderJournal(currentView);loadJournal(true);});
  $('#moreJournal').addEventListener('click',()=>loadJournal(false));
  $('#journalNoteForm').addEventListener('submit',async event=>{event.preventDefault();if(await memoryChange('note',{text:$('#journalNote').value,pinned:$('#pinNewNote').checked})){$('#journalNote').value='';$('#noteStatus').textContent=T('Запись сохранена.');}});
  $('#newCampaign').addEventListener('click',()=>{if(busy)return;creatingNew=true;$('#welcome').hidden=false;$('#game').hidden=true;$('#worldSubtitle').textContent='Новое приключение — предыдущие кампании сохранены';});
  $('#campaignPicker').addEventListener('change',async()=>{if(busy)return;try{creatingNew=false;render(await request('select',{campaignId:$('#campaignPicker').value}));}catch(e){toast(e.message);}});
  $('#createForm').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const values=Object.fromEntries(new FormData(event.target));values.survival=Boolean(values.survival);values.language=uiLanguage;setBusy(true,'Рождается новый мир…');$('#creationStatus').textContent=T('Мастер создаёт первую сцену и её обитателей…');try{const view=await request('create',values);creatingNew=false;render(view);showSection('story');}catch(e){$('#creationStatus').textContent=e.message;}finally{setBusy(false);}});
  document.querySelectorAll('[data-intent-mode]').forEach(button=>button.addEventListener('click',()=>{intentMode=button.dataset.intentMode;document.querySelectorAll('[data-intent-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.intentMode===intentMode)));$('#playerIntent').placeholder=T(intentMode==='question'?'Спроси о мире, правилах или прошлых событиях…':'Что делает твой герой?');$('#playerIntent').setAttribute('aria-label',T(intentMode==='question'?'Вопрос мастеру':'Действие героя'));$('#intentForm button').setAttribute('aria-label',T(intentMode==='question'?'Отправить вопрос':'Отправить действие'));}));
  for(const container of ['#peopleList','#partyRoster'])$(container).addEventListener('change',event=>{const form=event.target.closest('[data-social-npc]');if(!form)return;if(event.target.name==='propIds'){const npc=currentView.npcs.find(n=>n.id===form.dataset.socialNpc);form.elements.coins.value=Math.min(20,(npc.relationship.dueCoins||0)+[...form.querySelectorAll('[name=propIds]:checked')].reduce((n,p)=>n+Number(p.dataset.claimCoins),0));return;}if(event.target.name!=='approach')return;const paying=event.target.value==='restitution';form.querySelector('.social-payment').hidden=!paying;form.querySelector('.social-claims').hidden=!paying||!form.querySelectorAll('[name=propIds]').length;form.elements.coins.disabled=!paying;form.querySelectorAll('[name=propIds]').forEach(input=>input.disabled=!paying);});
  for(const container of ['#peopleList','#partyRoster'])$(container).addEventListener('submit',async event=>{const form=event.target.closest('[data-social-npc]');if(!form)return;event.preventDefault();if(busy)return;const formData=new FormData(form),values=Object.fromEntries(formData),npc=currentView.npcs.find(n=>n.id===form.dataset.socialNpc);const command={type:'social',npcId:npc.id,goal:values.goal,approach:values.approach,statement:values.statement.trim(),...(values.approach==='restitution'?{coins:Number(values.coins),...(formData.getAll('propIds').length?{propIds:formData.getAll('propIds')}:{})}:{})};await act({command,input:command.statement||[T('Подход'),npc.name,T(({persuasion:'Убеждение',deception:'Обман',intimidation:'Запугивание',restitution:'Возмещение ущерба'})[command.approach])].join(': ')},{stay:true});});
  $('#intentForm').addEventListener('submit',async event=>{event.preventDefault();const input=$('#playerIntent').value.trim();if(input&&await(intentMode==='question'?askMaster(input):act({input})))$('#playerIntent').value='';});
  document.addEventListener('change',event=>{
    const share=event.target.closest('[data-party-share]');if(share){refreshPartyShare(share,event.target.name==='fromId');return;}
    const order=event.target.closest('[data-party-order]');if(order&&event.target.name==='mode'){const mode=order.elements.mode.value,targets=mode==='focus'?(currentView.combat?.participants.filter(p=>p.kind==='enemy'&&p.hp.current>0&&!p.conditions.some(c=>['dead','fled','captured'].includes(c)))||[]):currentView.party.filter(p=>p.id!==order.dataset.partyOrder&&!p.conditions.includes('dead')&&!p.deathSaves?.dead);order.querySelector('[data-order-target]').hidden=!['focus','support'].includes(mode);order.elements.targetId.innerHTML=`<option value="">${T('Выбрать автоматически')}</option>`+targets.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');}
  });
  document.addEventListener('submit',async event=>{
    const share=event.target.closest('[data-party-share]'),order=event.target.closest('[data-party-order]'),gear=event.target.closest('[data-party-gear]');if(!share&&!order&&!gear)return;event.preventDefault();if(busy)return;
    let command;if(share){const values=Object.fromEntries(new FormData(share));command={type:'party_item',fromId:values.fromId,toId:values.toId,itemId:values.itemId,quantity:Number(values.quantity)};}else if(order){const mode=order.elements.mode.value,targetId=order.elements.targetId.value;command={type:'party_order',npcId:order.dataset.partyOrder,mode,...(['support','focus'].includes(mode)&&targetId?{targetId}:{})};}else{const option=gear.elements.itemId.selectedOptions[0];if(!option)return;command={type:'party_gear',characterId:gear.dataset.partyGear,itemId:option.value,mode:option.dataset.worn==='true'?'unequip':'equip'};}
    await act({command},{stay:true});
  });
  document.addEventListener('click',async event=>{
    if(event.target.closest('[data-open-character]')){showSection('character');return;}
    const commerce=event.target.closest('[data-commerce]');if(commerce&&!commerce.disabled){
      const kind=commerce.dataset.commerce;const command=kind==='choice'?{type:'market_choice',marketId:commerce.dataset.market,choiceId:commerce.dataset.choice}:kind==='service'?{type:'service',marketId:commerce.dataset.market,offerId:commerce.dataset.offer}:{type:'trade',direction:kind,marketId:commerce.dataset.market,...(kind==='sell'?{itemId:commerce.dataset.sellItem}:{offerId:commerce.dataset.offer}),quantity:1};
      if(await act({command},{stay:true}))toast(currentView.messages.at(-1)?.text||T('Сделка сохранена.'));return;
    }
    const filter=event.target.closest('[data-inventory-filter]');if(filter){inventoryFilter=filter.dataset.inventoryFilter;renderHero(currentView);localizeUi($('#characterSheet'));return;}
    const pin=event.target.closest('[data-memory-pin]');if(pin){await memoryChange('pin',{recordId:pin.dataset.memoryPin,kind:pin.dataset.memoryKind,pinned:pin.dataset.pinned==='true'});return;}
    const a=event.target.closest('[data-action]');if(a){await act({actionId:a.dataset.action,input:a.textContent.trim()},{stay:currentSection==='people'&&/^(recruit|dismiss|aid):/.test(a.dataset.action)});return;}
    const spellAction=event.target.closest('[data-target-action]');if(spellAction){$('#targetDialog').close();const action=currentView.actions.find(a=>a.id===spellAction.dataset.targetAction);await act({actionId:spellAction.dataset.targetAction,input:label(action?.label||spellAction.textContent.trim())});return;}
    const p=event.target.closest('[data-place]');if(p&&!p.disabled){await act({actionId:`travel:${p.dataset.place}`,input:p.textContent.trim()});return;}
    const q=event.target.closest('[data-quest]');if(q){await act({command:{type:'accept_quest',questId:q.dataset.quest},input:`Принимаю задачу: ${currentView.quests.find(quest=>quest.id===q.dataset.quest).title}`});return;}
    const i=event.target.closest('[data-command]');if(i){await act({command:{type:i.dataset.command,itemId:i.dataset.item}});return;}
    const c=event.target.closest('[data-created-spell]');if(c){target({type:'cast_created_spell',spellId:c.dataset.createdSpell},currentView.createdSpells.find(s=>s.id===c.dataset.createdSpell).name);return;}
    const s=event.target.closest('[data-spell]');if(s){target({type:'cast_spell',spellId:s.dataset.spell},'Кому адресовать заклинание?');return;}
    const t=event.target.closest('[data-target]');if(t){$('#targetDialog').close();await act({command:{...pendingTargetCommand,targetId:t.dataset.target}});}
  });
  $('#retryNarration').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{render(await request('narration',{campaignId:currentView.campaign.id}));}catch(e){toast(e.message);}finally{setBusy(false);}});
  $('#closeTargetDialog').addEventListener('click',()=>$('#targetDialog').close());
  $('#openSpellWorkshop').addEventListener('click',()=>$('#spellWorkshop').showModal());
  $('#closeSpellWorkshop').addEventListener('click',()=>$('#spellWorkshop').close());
  $('#spellDraftForm').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;setBusy(true);$('#spellDraftStatus').textContent='Мастер подбирает эффект и цену заклинания…';try{spellPreview(await request('spell/draft',{campaignId:currentView.campaign.id,idea:$('#spellIdea').value}));$('#spellDraftStatus').textContent='Предложение готово. Проверь эффект перед добавлением.';}catch(e){$('#spellDraftStatus').textContent=e.message;}finally{setBusy(false);}});
  $('#learnSpell').addEventListener('click',async()=>{if(busy||!draftSpell)return;setBusy(true);try{const result=await request('spell/learn',{campaignId:currentView.campaign.id,draft:draftSpell});if(result.ready){render(result);$('#spellWorkshop').close();showSheet('spells');toast('Заклинание добавлено в книгу героя.');}else spellPreview(result);}catch(e){toast(e.message);}finally{setBusy(false);}});
  const storyFeed=$('#storyFeed');let followStoryEnd=true;
  storyFeed.addEventListener('scroll',()=>{followStoryEnd=storyFeed.scrollHeight-storyFeed.clientHeight-storyFeed.scrollTop<32;},{passive:true});
  new ResizeObserver(()=>{if(followStoryEnd)requestAnimationFrame(()=>{storyFeed.scrollTop=storyFeed.scrollHeight;});}).observe(storyFeed);
  try{const options=await request('setup');for(const [selector,key]of[['#classSelect','classes'],['#raceSelect','races'],['#backgroundSelect','backgrounds']])$(selector).replaceChildren(...options[key].map(o=>new Option(T(o.label),o.id)));$('#classSelect').value='wizard';$('#raceSelect').value='human';$('#backgroundSelect').value='sage';}catch(e){$('#creationStatus').textContent=e.message;}
  await refreshState(); localizeUi();
}
init();
