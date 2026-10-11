let currentView = null;
let busy = false;
let currentSection = 'story';
let currentSheet = 'inventory';
let inventoryFilter='all';
let draftSpell = null;
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
}
async function act(payload,{stay=false}={}) {
  if (busy || !currentView?.ready) return false;
  setBusy(true);
  const section=currentSection;
  try { render(await request('act', { ...payload, campaignId:currentView.campaign.id, expectedRevision:currentView.campaign.revision, operationId:crypto.randomUUID() })); showSection(stay?section:'story'); return true; }
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
  for (const name of ['story','map','quests','journal','people','town']) $(`#${name}View`).hidden = name !== section;
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
  renderHero(view); renderMessages(view); renderActions(view); renderMap(view); renderQuests(view); renderJournal(view); renderPeople(view); renderCombat(view);renderTown(view);
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
  $('#resourceList').innerHTML = [...Object.entries(hero.spellcasting?.slots||{}).map(([level,s])=>`<div class="resource-row"><span>Ячейки ${level} уровня</span><strong>${s.current} / ${s.max}</strong></div>`),...hero.resources.filter(r=>!/^Level \d+ slots$/.test(r.label)).map(r=>`<div class="resource-row"><span>${esc(label(r.label))}</span><strong>${r.current} / ${r.max}</strong></div>`)].join('') || '<p class="muted">Здоровье, движение и доступные действия.</p>';
  const inventory=inventoryFilter==='loot'?hero.inventory.filter(i=>i.origin).slice().sort((a,b)=>b.origin.turn-a.origin.turn):hero.inventory;
  $('#inventoryPanel').innerHTML=`<div class="inventory-filters" role="group" aria-label="Фильтр вещей"><button data-inventory-filter="all" aria-pressed="${inventoryFilter==='all'}">${T('Все вещи')}</button><button data-inventory-filter="loot" aria-pressed="${inventoryFilter==='loot'}">${T('Добыча')}</button></div>`+(inventory.map(item=>inventoryCard(item,view)).join('')||`<p class="empty">${T(inventoryFilter==='loot'?'Новые находки появятся после исследования и выполнения задач.':'Инвентарь пуст.')}</p>`);
  $('#spellList').innerHTML = [...view.createdSpells.map(s=>`<article class="spell-card"><h4>✦ ${esc(s.name)}</h4><p>${esc(s.description)}</p><p>${esc(spellCaption(s))}</p><div class="mini-actions"><button data-created-spell="${esc(s.id)}">Применить</button></div></article>`),...(view.spellbook.spells||[]).map(s=>`<article class="spell-card"><h4>${esc(s.name||s.id)}</h4><p>${esc(s.summary||s.description||'')}</p><div class="mini-actions"><button data-spell="${esc(s.id||s.spellId)}">Применить</button></div></article>`)].join('') || '<p class="empty">Книга магии пока пуста.</p>';
  $('#openSpellWorkshop').disabled = !hero.spellcasting;
  $('#featureList').innerHTML = `${hero.concept?`<p class="hero-concept">${esc(hero.concept)}</p>`:''}<p class="muted">${hero.skillProficiencies.map(s=>uiLanguage==='en'?s.replace(/_/g,' '):skillLabels[s]||s).join(' · ')}</p><ul>${hero.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`;
  $('#rollsPanel').innerHTML = view.rolls.slice().reverse().map(r=>`<article class="item-card"><h4>${esc(({death_save:'Спасбросок от смерти',stable_recovery:'Возвращение в сознание'})[r.label]||skillLabels[r.label]||r.label||r.context||'Бросок')}</h4><p>${esc(r.result?.expression||r.expression||r.roll?.expression||'')}</p><strong>${esc(r.result?.total??r.total??r.roll?.total??'—')}</strong></article>`).join('') || '<p class="empty">Первая проверка ещё впереди.</p>';
  $('#memorySize').textContent = `Контекст мастера: ${view.memory.chars.toLocaleString('ru-RU')} символов`;
  $('#memoryDetails').innerHTML=`<p>${T('Полная история хранится локально. Мастер получает компактную подборку состояния, задач и воспоминаний.')}</p><p>${T('Записей в журнале')}: ${view.memory.journalEntries} · ${T('Сообщений в архиве')}: ${view.memory.archivedMessages}</p><p>${T('Текущий контекст')}: ${view.memory.chars} / ${view.memory.maxChars} ${T('символов')}</p>`;
  if(view.inferenceUsage?.reportedCalls)$('#memoryDetails').innerHTML+=`<p>${T('Учтённые AI-запросы')}: ${view.inferenceUsage.reportedCalls}<br>${T('Входные токены')}: ${view.inferenceUsage.inputTokens}<br>${T('Выходные токены')}: ${view.inferenceUsage.outputTokens}<br>${T('Из входных в кэше')}: ${view.inferenceUsage.cachedTokens}</p><p>${T('Счётчики ответов провайдера для этой кампании. Это не остаток лимита аккаунта.')}</p>`;
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
function renderActions(view) { $('#actionDock').innerHTML=view.actions.map(a=>`<button data-action="${esc(a.id)}" title="${esc(label(a.label))}">${esc(label(a.label))}</button>`).join(''); }
function renderMap(view) {
  const seen=new Set(),edges=[],places=new Map(view.locations.map(l=>[l.id,l]));
  for(const node of view.locations) for(const id of node.connectsTo) { const key=[node.id,id].sort().join(':'); if(seen.has(key))continue;seen.add(key);const other=places.get(id);if(other)edges.push(`<line x1="${node.x}%" y1="${node.y}%" x2="${other.x}%" y2="${other.y}%" stroke="#695b43" stroke-width="1.5" stroke-dasharray="4 5"/>`); }
  $('#worldMap').innerHTML=`<svg aria-hidden="true">${edges.join('')}</svg>`+view.locations.map(n=>`<button class="map-node ${n.id===view.scene.id?'current':n.visited?'visited':''}" style="left:${n.x}%;top:${n.y}%" data-place="${esc(n.id)}" ${!view.scene.connectsTo.includes(n.id)||view.combat?'disabled':''}>${n.visited?'◆':'◇'} ${esc(n.name)}</button>`).join('');
  $('#placeCards').innerHTML=view.locations.map(n=>`<article class="world-card"><p class="eyebrow">${n.id===view.scene.id?'ТЫ ЗДЕСЬ':n.visited?'ИССЛЕДОВАНО':'ИЗВЕСТНОЕ МЕСТО'}</p><h3>${esc(n.name)}</h3><p>${esc(n.description)}</p>${view.scene.connectsTo.includes(n.id)?`<button data-action="travel:${esc(n.id)}" ${view.combat?'disabled':''}>Отправиться →</button>`:''}</article>`).join('');
}
function renderQuests(view) { $('#questList').innerHTML=view.quests.map(q=>`<article class="quest-card ${esc(q.status)}"><span class="quest-status">${{offered:'ПРЕДЛОЖЕНИЕ',active:'В ПУТИ',completed:'ЗАВЕРШЕНО',failed:'НЕ ВЫПОЛНЕНО'}[q.status]}</span><h3>${esc(q.title)}</h3><p>${esc(q.summary)}</p><ul class="objectives">${q.objectives.map(o=>`<li class="${o.completed?'done':''}"><span>${o.completed?'✓':'○'}</span>${esc(o.text)}</li>`).join('')}</ul>${q.status==='offered'?`<button data-quest="${esc(q.id)}">Принять задачу</button>`:''}${q.rewardClaimed?'<p class="muted">Награда получена и записана в журнале.</p>':''}</article>`).join('') || '<div class="empty">Задач пока нет. Поговори с персонажами или расскажи мастеру, что ищет герой.</div>'; }
function renderJournal(view) {
  const query=$('#journalSearch').value.trim().toLowerCase();
  const version=`${view.campaign.id}:${view.campaign.revision}`;
  if(historyVersion!==version){historyVersion=version;historyRequest++;historyPage=null;}
  $('#notesList').innerHTML=(view.notes||[]).filter(n=>n.text.toLowerCase().includes(query)).slice().reverse().map(n=>`<article class="journal-entry"><small>${T('Запись игрока')}${n.pinned?' · ★':''}</small><p>${esc(n.text)}</p><button class="subtle" data-memory-pin="${esc(n.id)}" data-memory-kind="note" data-pinned="${n.pinned?'false':'true'}">${T(n.pinned?'Открепить':'Закрепить')}</button></article>`).join('')||`<p class="empty">${T('Здесь можно хранить цели, обещания и свои догадки.')}</p>`;
  $('#factsList').innerHTML=view.facts.filter(f=>f.text.toLowerCase().includes(query)).slice(-200).reverse().map(f=>`<article class="journal-entry"><small>${T(f.tags?.includes('rumor')?'СВЕДЕНИЯ ОТ СОБЕСЕДНИКА':'ПРОВЕРЕННОЕ ОТКРЫТИЕ')}${f.pinned?' · ★':''}</small><p>${esc(f.text)}</p><button class="subtle" data-memory-pin="${esc(f.id)}" data-memory-kind="fact" data-pinned="${f.pinned?'false':'true'}">${T(f.pinned?'Открепить':'Закрепить')}</button></article>`).join('') || '<p class="empty">Открытия появятся после исследований.</p>';
  const entries=historyPage?.entries||view.journal.filter(e=>e.text.toLowerCase().includes(query));
  $('#journalList').innerHTML=entries.map(e=>`<article class="journal-entry"><small>ХОД ${e.turn}</small>${esc(e.text)}</article>`).join('') || '<p class="empty">Подходящих записей нет.</p>';
  $('#journalCount').textContent=`${T('Показано записей')}: ${entries.length} / ${historyPage?.total??view.journalTotal}`;
  $('#moreJournal').hidden=historyPage?historyPage.nextOffset===null:Boolean(query)||entries.length>=view.journalTotal;
  localizeUi($('#journalView'));
}
async function loadJournal(reset=true) {
  if(!currentView?.ready)return;
  const campaignId=currentView.campaign.id,query=$('#journalSearch').value.trim(),version=historyVersion,sequence=++historyRequest;
  $('#moreJournal').disabled=true;
  try {
    const offset=reset?0:historyPage?.nextOffset??currentView.journal.length;
    const page=await request(`history?campaignId=${encodeURIComponent(campaignId)}&query=${encodeURIComponent(query)}&offset=${offset}&limit=50`);
    if(sequence!==historyRequest||campaignId!==currentView.campaign.id||version!==historyVersion)return;
    historyPage={...page,entries:reset?page.entries:[...(historyPage?.entries||currentView.journal),...page.entries]};renderJournal(currentView);
  }catch(error){toast(error.message);}finally{$('#moreJournal').disabled=false;}
}
async function memoryChange(route,data) {
  if(busy||!currentView?.ready)return;setBusy(true,T('Сохраняю запись…'));
  try{render(await request(`memory/${route}`,{...data,campaignId:currentView.campaign.id,expectedRevision:currentView.campaign.revision,operationId:crypto.randomUUID()}));await loadJournal(true);return true;}
  catch(error){toast(error.message);return false;}finally{setBusy(false);}
}
function renderPeople(view) { $('#peopleList').innerHTML=view.npcs.map(n=>`<article class="world-card"><p class="eyebrow">${n.locationId===view.scene.id?'РЯДОМ':esc(view.locations.find(l=>l.id===n.locationId)?.name||'')}</p><h3>${esc(n.name)}</h3><p>${esc(n.role)}</p><p>${esc(n.personality)}</p><p class="relationship">Знакомство: ${n.familiarity} · Доверие: ${n.trust}</p>${n.locationId===view.scene.id?`<button data-action="talk:${esc(n.id)}" ${view.combat?'disabled':''}>Поговорить</button>`:''}</article>`).join('') || '<p class="empty">Новые лица появятся по мере знакомства с миром.</p>'; }
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
function target(command,title) {
  pendingTargetCommand=command;$('#targetTitle').textContent=title;
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
  const languageLink=document.createElement('a');languageLink.className='subtle';languageLink.href=uiLanguage==='en'?'/?lang=ru':'/?lang=en';languageLink.textContent=uiLanguage==='en'?'RU':'EN';languageLink.setAttribute('aria-label','Switch interface language');document.querySelector('.header-actions').prepend(languageLink);
  if(uiLanguage==='en') { $('#createForm [name=location]').value='The threshold of a new world'; $('#createForm [name=heroName]').placeholder='Mira'; $('#worldSubtitle').textContent=T('Мир, который начинается с твоей идеи'); }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.view)));
  document.querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>showSheet(b.dataset.sheet)));
  $('#journalSearch').addEventListener('input',()=>{if(!currentView?.ready)return;historyPage=null;renderJournal(currentView);clearTimeout(historyTimer);historyTimer=setTimeout(()=>loadJournal(true),250);});
  $('#moreJournal').addEventListener('click',()=>loadJournal(false));
  $('#journalNoteForm').addEventListener('submit',async event=>{event.preventDefault();if(await memoryChange('note',{text:$('#journalNote').value,pinned:$('#pinNewNote').checked})){$('#journalNote').value='';$('#noteStatus').textContent=T('Запись сохранена.');}});
  $('#newCampaign').addEventListener('click',()=>{if(busy)return;creatingNew=true;$('#welcome').hidden=false;$('#game').hidden=true;$('#worldSubtitle').textContent='Новое приключение — предыдущие кампании сохранены';});
  $('#campaignPicker').addEventListener('change',async()=>{if(busy)return;try{creatingNew=false;render(await request('select',{campaignId:$('#campaignPicker').value}));}catch(e){toast(e.message);}});
  $('#createForm').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const values=Object.fromEntries(new FormData(event.target));values.survival=Boolean(values.survival);values.language=uiLanguage;setBusy(true,'Рождается новый мир…');$('#creationStatus').textContent=T('Мастер создаёт первую сцену и её обитателей…');try{const view=await request('create',values);creatingNew=false;render(view);showSection('story');}catch(e){$('#creationStatus').textContent=e.message;}finally{setBusy(false);}});
  document.querySelectorAll('[data-intent-mode]').forEach(button=>button.addEventListener('click',()=>{intentMode=button.dataset.intentMode;document.querySelectorAll('[data-intent-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.intentMode===intentMode)));$('#playerIntent').placeholder=T(intentMode==='question'?'Спроси о мире, правилах или прошлых событиях…':'Что делает твой герой?');}));
  $('#intentForm').addEventListener('submit',async event=>{event.preventDefault();const input=$('#playerIntent').value.trim();if(input&&await(intentMode==='question'?askMaster(input):act({input})))$('#playerIntent').value='';});
  document.addEventListener('click',async event=>{
    const commerce=event.target.closest('[data-commerce]');if(commerce&&!commerce.disabled){
      const kind=commerce.dataset.commerce;const command=kind==='choice'?{type:'market_choice',marketId:commerce.dataset.market,choiceId:commerce.dataset.choice}:kind==='service'?{type:'service',marketId:commerce.dataset.market,offerId:commerce.dataset.offer}:{type:'trade',direction:kind,marketId:commerce.dataset.market,...(kind==='sell'?{itemId:commerce.dataset.sellItem}:{offerId:commerce.dataset.offer}),quantity:1};
      if(await act({command},{stay:true}))toast(currentView.messages.at(-1)?.text||T('Сделка сохранена.'));return;
    }
    const filter=event.target.closest('[data-inventory-filter]');if(filter){inventoryFilter=filter.dataset.inventoryFilter;renderHero(currentView);localizeUi($('#characterSheet'));return;}
    const pin=event.target.closest('[data-memory-pin]');if(pin){await memoryChange('pin',{recordId:pin.dataset.memoryPin,kind:pin.dataset.memoryKind,pinned:pin.dataset.pinned==='true'});return;}
    const a=event.target.closest('[data-action]');if(a){await act({actionId:a.dataset.action,input:a.textContent.trim()});return;}
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
  try{const options=await request('setup');for(const [selector,key]of[['#classSelect','classes'],['#raceSelect','races'],['#backgroundSelect','backgrounds']])$(selector).replaceChildren(...options[key].map(o=>new Option(T(o.label),o.id)));$('#classSelect').value='wizard';$('#raceSelect').value='human';$('#backgroundSelect').value='sage';}catch(e){$('#creationStatus').textContent=e.message;}
  await refreshState(); localizeUi();
}
init();
