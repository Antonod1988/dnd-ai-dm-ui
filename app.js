let currentView = null;
let busy = false;
let currentSection = 'story';
let currentSheet = 'inventory';
let draftSpell = null;
let pendingTargetCommand = null;
let creatingNew = false;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
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
async function act(payload) {
  if (busy || !currentView?.ready) return false;
  setBusy(true);
  try { render(await request('act', { ...payload, campaignId:currentView.campaign.id, expectedRevision:currentView.campaign.revision, operationId:crypto.randomUUID() })); showSection('story'); return true; }
  catch (error) { toast(error.message); await refreshState(); return false; }
  finally { setBusy(false); }
}
function showSection(section) {
  currentSection = section;
  for (const name of ['story','map','quests','journal','people']) $(`#${name}View`).hidden = name !== section;
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
  const minutes = Math.floor(view.campaign.hours * 60);
  $('#timeBadge').textContent = `День ${view.campaign.day} · ${Math.floor(minutes/60).toString().padStart(2,'0')}:${(minutes%60).toString().padStart(2,'0')}`;
  $('#combatBadge').hidden = !view.combat;
  $('#aiButton').textContent = view.provider.configured ? `AI: ${view.provider.model || view.provider.id}` : 'Подключить AI';
  renderHero(view); renderMessages(view); renderActions(view); renderMap(view); renderQuests(view); renderJournal(view); renderPeople(view); renderCombat(view);
  $('#retryNarration').hidden = !view.pendingNarration; showSection(currentSection); showSheet(currentSheet); localizeUi();
}
function renderHero(view) {
  const hero = view.hero;
  $('#heroName').textContent = hero.name; $('#heroSigil').textContent = hero.name[0]?.toUpperCase() || '✦';
  $('#heroIdentity').textContent = `${T(hero.raceLabel)} · ${T(hero.classLabel)}`; $('#heroLevel').textContent = `${hero.level} ур.`;
  $('#heroHp').textContent = `${hero.hp.current} / ${hero.hp.max}${hero.hp.temp ? ` +${hero.hp.temp}` : ''}`;
  $('#hpFill').style.width = `${Math.max(0,Math.min(100,hero.hp.current/hero.hp.max*100))}%`;
  $('#heroAc').textContent = hero.ac; $('#heroXp').textContent = hero.xp;
  $('#abilityGrid').innerHTML = Object.entries(hero.abilities).map(([id,score]) => { const mod=Math.floor((score-10)/2); return `<div><small>${abilityLabels[id]}</small><strong>${score}</strong><em>${mod>=0?'+':''}${mod}</em></div>`; }).join('');
  $('#heroConditions').innerHTML = hero.conditions.map(c=>`<span>${esc(conditionLabels[c]||c)}</span>`).join('');
  $('#resourceList').innerHTML = [...Object.entries(hero.spellcasting?.slots||{}).map(([level,s])=>`<div class="resource-row"><span>Ячейки ${level} уровня</span><strong>${s.current} / ${s.max}</strong></div>`),...hero.resources.filter(r=>!/^Level \d+ slots$/.test(r.label)).map(r=>`<div class="resource-row"><span>${esc(r.label)}</span><strong>${r.current} / ${r.max}</strong></div>`)].join('') || '<p class="muted">Здоровье, движение и доступные действия.</p>';
  $('#inventoryPanel').innerHTML = hero.inventory.map(item=>`<article class="item-card"><h4>${esc(item.name)} <small>×${item.quantity}</small></h4><p>${esc(item.description)}</p><div class="mini-actions">${item.canUse?`<button data-command="use_item" data-item="${esc(item.itemId)}">Использовать</button>`:''}${item.tags.some(t=>['weapon','armor','shield'].includes(t))?`<button data-command="equip_item" data-item="${esc(item.itemId)}">Надеть / взять</button>`:''}${item.charges?`<small>${item.charges.current}/${item.charges.max} зарядов</small>`:''}</div></article>`).join('') || '<p class="empty">Инвентарь пуст.</p>';
  $('#spellList').innerHTML = [...view.createdSpells.map(s=>`<article class="spell-card"><h4>✦ ${esc(s.name)}</h4><p>${esc(s.description)}</p><p>${s.level?`${s.level} уровень`:'Заговор'} · ${s.rangeFeet} фт.${s.concentration?' · концентрация':''}</p><div class="mini-actions"><button data-created-spell="${esc(s.id)}">Применить</button></div></article>`),...(view.spellbook.spells||[]).map(s=>`<article class="spell-card"><h4>${esc(s.name||s.id)}</h4><p>${esc(s.summary||s.description||'')}</p><div class="mini-actions"><button data-spell="${esc(s.id||s.spellId)}">Применить</button></div></article>`)].join('') || '<p class="empty">Книга магии пока пуста.</p>';
  $('#openSpellWorkshop').disabled = !hero.spellcasting;
  $('#featureList').innerHTML = `<p class="muted">${hero.skillProficiencies.map(s=>uiLanguage==='en'?s.replace(/_/g,' '):skillLabels[s]||s).join(' · ')}</p><ul>${hero.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`;
  $('#rollsPanel').innerHTML = view.rolls.slice().reverse().map(r=>`<article class="item-card"><h4>${esc(skillLabels[r.label]||r.label||r.context||'Бросок')}</h4><p>${esc(r.expression||r.roll?.expression||'')}</p><strong>${esc(r.total??r.roll?.total??'—')}</strong></article>`).join('') || '<p class="empty">Первая проверка ещё впереди.</p>';
  $('#memorySize').textContent = `Контекст мастера: ${view.memory.chars.toLocaleString('ru-RU')} символов`;
  $('#survivalPanel').hidden = !view.survival.enabled;
  $('#survivalPanel').innerHTML = `<h3>Путешествие</h3><p class="muted">Еда: ${view.survival.foodDays} дн. · Вода: ${view.survival.waterDays} дн.</p>`;
}
function renderMessages(view) {
  const feed=$('#storyFeed'); feed.innerHTML=view.messages.map(m=>`<article class="message ${esc(m.role)}"><div class="message-meta"><span>${esc(m.author)}</span><time>ХОД ${m.turn}</time></div>${m.text.split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}</article>`).join(''); feed.scrollTop=feed.scrollHeight;
}
function label(v) { if(uiLanguage==='en')return T(v); return String(v).replace(/^Choose fighting style:/,'Боевой стиль:').replace(/^End turn$/,'Завершить ход').replace(/^Attack with /,'Атака: ').replace(/^Cast /,'Применить ').replace(/^Use /,'Использовать ').replace(/^Move /,'Переместиться '); }
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
  $('#factsList').innerHTML=view.facts.filter(f=>f.text.toLowerCase().includes(query)).slice(-200).reverse().map(f=>`<article class="journal-entry"><small>ПРОВЕРЕННОЕ ОТКРЫТИЕ</small>${esc(f.text)}</article>`).join('') || '<p class="empty">Открытия появятся после исследований.</p>';
  $('#journalList').innerHTML=view.journal.filter(e=>e.text.toLowerCase().includes(query)).slice(0,200).map(e=>`<article class="journal-entry"><small>ХОД ${e.turn}</small>${esc(e.text)}</article>`).join('') || '<p class="empty">Подходящих записей нет.</p>';
}
function renderPeople(view) { $('#peopleList').innerHTML=view.npcs.map(n=>`<article class="world-card"><p class="eyebrow">${n.locationId===view.scene.id?'РЯДОМ':esc(view.locations.find(l=>l.id===n.locationId)?.name||'')}</p><h3>${esc(n.name)}</h3><p>${esc(n.role)}</p><p>${esc(n.personality)}</p><p class="relationship">Знакомство: ${n.familiarity} · Доверие: ${n.trust}</p>${n.locationId===view.scene.id?`<button data-action="talk:${esc(n.id)}" ${view.combat?'disabled':''}>Поговорить</button>`:''}</article>`).join('') || '<p class="empty">Новые лица появятся по мере знакомства с миром.</p>'; }
function renderCombat(view) {
  const bar=$('#combatBar');bar.hidden=!view.combat;if(!view.combat){bar.replaceChildren();return;}
  const current=view.combat.participants[view.combat.turnIndex];
  bar.innerHTML=`<span>Раунд ${view.combat.round}</span>`+view.combat.participants.map(p=>`<span class="combat-token ${p.id===current.id?'current':''}">${esc(p.name)} ${p.hp.current}/${p.hp.max}</span>`).join('')+(view.turnBudget?`<span>Действие ${view.turnBudget.action?'●':'○'} · Бонус ${view.turnBudget.bonusAction?'●':'○'} · ${view.turnBudget.movementFt} фт.</span>`:'');
}
function target(command,title) {
  pendingTargetCommand=command;$('#targetTitle').textContent=title;
  const targets=currentView.combat?currentView.combat.participants.filter(p=>!p.conditions.includes('dead')):currentView.party;
  $('#targetChoices').innerHTML=targets.map(p=>`<button class="target-choice" data-target="${esc(p.id)}"><span>${esc(p.name)}</span><span>${p.hp.current}/${p.hp.max} HP</span></button>`).join('');$('#targetDialog').showModal();
}
function spellPreview(data) {
  if(!data.ok){draftSpell=null;$('#learnSpell').hidden=true;$('#spellDraftCard').innerHTML=`<p>${data.errors.map(esc).join('<br>')}</p>`;return;}
  draftSpell=data.spell;$('#learnSpell').hidden=false;
  $('#spellDraftCard').innerHTML=`<article class="spell-preview"><h3>${esc(data.spell.name)}</h3><p>${esc(data.spell.description)}</p><p>${data.spell.level?`${data.spell.level} уровень`:'Заговор'} · ${data.spell.rangeFeet} фт. · ${data.spell.cost==='action'?'действие':'бонусное действие'}</p>${data.spell.effects.map(e=>`<p>${esc({damage:'Урон',healing:'Лечение',temporary_hp:'Временные HP',condition:'Состояние',armor:'Защита',speed:'Скорость',resistance:'Сопротивление',utility:'Эффект',skill_bonus:'Бонус навыка',remove_condition:'Снятие состояния'}[e.type]||e.type)}: <code>${esc(e.dice||e.condition||e.feature||e.amount||e.feet||e.damageType)}</code></p>`).join('')}</article>`; localizeUi($('#spellWorkshop'));
}
async function init() {
  const languageLink=document.createElement('a');languageLink.className='subtle';languageLink.href=uiLanguage==='en'?'/?lang=ru':'/?lang=en';languageLink.textContent=uiLanguage==='en'?'RU':'EN';languageLink.setAttribute('aria-label','Switch interface language');document.querySelector('.header-actions').prepend(languageLink);
  if(uiLanguage==='en') { $('#createForm [name=location]').value='The threshold of a new world'; $('#createForm [name=heroName]').placeholder='Mira'; $('#worldSubtitle').textContent=T('Мир, который начинается с твоей идеи'); }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.view)));
  document.querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>showSheet(b.dataset.sheet)));
  $('#journalSearch').addEventListener('input',()=>currentView?.ready&&renderJournal(currentView));
  $('#newCampaign').addEventListener('click',()=>{if(busy)return;creatingNew=true;$('#welcome').hidden=false;$('#game').hidden=true;$('#worldSubtitle').textContent='Новое приключение — предыдущие кампании сохранены';});
  $('#campaignPicker').addEventListener('change',async()=>{if(busy)return;try{creatingNew=false;render(await request('select',{campaignId:$('#campaignPicker').value}));}catch(e){toast(e.message);}});
  $('#createForm').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const values=Object.fromEntries(new FormData(event.target));values.survival=Boolean(values.survival);values.language=uiLanguage;setBusy(true,'Рождается новый мир…');$('#creationStatus').textContent=T('Мастер создаёт первую сцену и её обитателей…');try{const view=await request('create',values);creatingNew=false;render(view);showSection('story');}catch(e){$('#creationStatus').textContent=e.message;}finally{setBusy(false);}});
  $('#intentForm').addEventListener('submit',async event=>{event.preventDefault();const input=$('#playerIntent').value.trim();if(input&&await act({input}))$('#playerIntent').value='';});
  document.addEventListener('click',async event=>{
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
