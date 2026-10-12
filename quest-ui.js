(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.QuestUI=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  const groups=['active','offered','archive'];
  const statusLabels={active:'В пути',offered:'Предложение',completed:'Завершено',failed:'Не выполнено'};
  const clean=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function groupOf(quest){return ['active','offered'].includes(quest.status)?quest.status:'archive';}
  function select(view,prefs={}){
    const quests=view.quests||[],counts=Object.fromEntries(groups.map(group=>[group,quests.filter(q=>groupOf(q)===group).length]));
    const retained=quests.find(q=>q.id===prefs.selectedId),changed=retained&&prefs.selectedStatus&&retained.status!==prefs.selectedStatus;
    const filter=changed?groupOf(retained):groups.includes(prefs.filter)?prefs.filter:counts.active?'active':counts.offered?'offered':'archive';
    const query=String(prefs.query||'').slice(0,200),needle=clean(query.trim());
    const list=quests.filter(q=>groupOf(q)===filter&&(!needle||clean([q.title,q.summary,view.npcs?.find(n=>n.id===q.giverId)?.name,...q.objectives.map(o=>o.text)].join(' ')).includes(needle)));
    const selected=list.find(q=>q.id===prefs.selectedId)||list[0]||null;
    const visibleCount=Math.max(40,Math.floor(Number(prefs.visibleCount)||40)),visibleList=list.slice(0,visibleCount);
    if(selected&&!visibleList.some(q=>q.id===selected.id)){visibleList.pop();visibleList.push(selected);}
    return {filter,query,counts,list,visibleList,visibleCount,hasMore:list.length>visibleCount,selected,selectedId:selected?.id||null,selectedStatus:selected?.status||null};
  }
  function objectiveInfo(view,quest,objective,index){
    const ready=quest.status==='active'&&!objective.completed&&(!quest.sequential||quest.objectives.slice(0,index).every(o=>o.completed));
    const npc=view.npcs?.find(n=>n.id===(objective.kind==='deliver'?objective.recipientId:objective.kind==='talk'?objective.targetId:null));
    const item=view.items?.find(i=>i.id===objective.targetId);
    const ids=new Set([objective.targetId,...(objective.alternativeTargetIds||[])]),checks=view.questChecks||[];
    if(objective.kind==='check')for(let pass=0;pass<checks.length;pass++)for(const check of checks)if(ids.has(check.alternativeFor))ids.add(check.id);
    const methods=objective.kind==='check'?checks.filter(c=>ids.has(c.id)):[];
    const locationId=npc?.locationId||(['visit','victory'].includes(objective.kind)?objective.targetId:item?.locationId||methods[0]?.locationId);
    const place=view.locations?.find(l=>l.id===locationId);
    const directId=objective.kind==='talk'?`talk:${objective.targetId}`:objective.kind==='visit'?`travel:${objective.targetId}`:objective.kind==='acquire'?`pickup:${objective.targetId}`:null;
    const actions=ready?(view.actions||[]).filter(a=>a.questId===quest.id&&a.objectiveId===objective.id||directId&&a.id===directId):[];
    let hint='';
    if(ready&&npc?.canInteract===false)hint='Этот персонаж сейчас не может помочь. Обсуди с мастером другой путь.';
    else if(ready&&objective.kind==='check'&&methods.length&&methods.every(c=>c.attempted&&!c.success))hint='Известные способы уже испробованы. Предложи мастеру другой подход.';
    else if(ready&&objective.kind==='check'&&methods.some(c=>c.attempted&&!c.success)&&methods.some(c=>!c.attempted))hint='Этот подход не помог. Можно попробовать другой способ.';
    else if(ready&&objective.kind==='deliver')hint='Передача заберёт предмет из инвентаря. Разговор сам по себе её не заменяет.';
    return {ready,npc,item,methods,place,actions,hint};
  }
  function render(model,view,{t=value=>value,esc=escape,skillLabels={},busy=false,history=null,historyOpen=false}={}){
    const text=value=>esc(t(value)),quest=model.selected;
    const summary=q=>{
      const progress=q.objectives.filter(o=>o.completed).length,next=q.objectives.find(o=>!o.completed);
      return `<button class="quest-choice ${q.id===model.selectedId?'selected':''}" data-quest-select="${esc(q.id)}" aria-pressed="${q.id===model.selectedId}"><span class="quest-choice-title">${esc(q.title)}</span><span class="quest-choice-progress">${progress} / ${q.objectives.length} · ${text(Object.hasOwn(statusLabels,q.status)?statusLabels[q.status]:'Архив')}</span>${next?`<span class="quest-choice-next">${esc(next.text)}</span>`:''}</button>`;
    };
    const navigation=`<div class="quest-filters" role="group" aria-label="${text('Раздел задач')}">${groups.map(group=>`<button class="subtle ${model.filter===group?'active':''}" data-quest-filter="${group}" aria-pressed="${model.filter===group}">${text({active:'В пути',offered:'Предложения',archive:'Архив'}[group])}<span>${model.counts[group]}</span></button>`).join('')}</div>`;
    const empty=model.query.trim()?'Подходящих задач нет. Измени поиск или выбери другой раздел.':model.filter==='active'?'Сейчас нет принятых задач. Посмотри предложения или продолжи свою историю.':model.filter==='offered'?'Новых предложений пока нет. Поговори с персонажами или расскажи мастеру, что ищет герой.':'Завершённые задачи и неудачи останутся здесь.';
    if(!quest)return navigation+`<div class="quest-empty empty">${text(empty)}</div>`;
    const progress=quest.objectives.filter(o=>o.completed).length;
    const giver=view.npcs?.find(n=>n.id===quest.giverId);
    const objectiveRows=quest.objectives.map((objective,index)=>{
      const info=objectiveInfo(view,quest,objective,index);
      const stage=objective.completed?'Сделано':info.ready?'Сейчас':quest.status==='offered'?'После принятия':quest.status==='active'?'Следом':'Осталось';
      const methods=info.methods.map(c=>`<p class="objective-detail">${esc(c.title)} · ${text(skillLabels[c.skill]||c.skill)} ${c.dc}${c.attempted?` · ${text(c.success?'Успех':'Неудача')} (${c.total}/${c.dc})`:''}</p>`).join('');
      const html=`<li class="${objective.completed?'done':info.ready?'current':''}"><span class="objective-mark" aria-hidden="true">${objective.completed?'✓':info.ready?'◆':'○'}</span><div><small class="objective-stage">${text(stage)}</small><p class="objective-title">${esc(objective.text)}</p>${!objective.completed&&info.npc?`<p class="objective-detail">${text(objective.kind==='deliver'?'Адресат':'Собеседник')}: ${esc(info.npc.name)}</p>`:''}${!objective.completed&&info.place?`<button class="quest-place-link" data-quest-place="${esc(info.place.id)}">◇ ${esc(info.place.name)} · ${text('На карте')}</button>`:''}${!objective.completed?methods:''}${info.hint?`<p class="objective-hint">${text(info.hint)}</p>`:''}${info.actions.length?`<div class="objective-actions">${info.actions.map(a=>`<button data-action="${esc(a.id)}" ${busy?'disabled':''}>${esc(a.label)}</button>`).join('')}</div>`:''}</div></li>`;
      return {html,later:quest.status==='active'&&!objective.completed&&!info.ready||quest.status==='offered'&&index>0};
    });
    const later=objectiveRows.filter(row=>row.later);
    const objectives=objectiveRows.filter(row=>!row.later).map(row=>row.html).join('');
    const future=later.length?`<details class="quest-future"><summary>${text('Следующие этапы')} · ${later.length}</summary><ol class="objectives">${later.map(row=>row.html).join('')}</ol></details>`:'';
    let historyBody=`<p class="muted">${text('Открой, чтобы перечитать связанные события.')}</p>`;
    if(history?.status==='loading')historyBody=`<p role="status">${text('Открываю записи…')}</p>`;
    if(history?.status==='error')historyBody=`<p role="status">${text('Не удалось открыть записи. Попробуй ещё раз.')}</p><button class="subtle" data-quest-history-retry>${text('Повторить')}</button>`;
    if(history?.status==='ready'){
      const entries=history.data.entries||[];
      historyBody=entries.map(entry=>`<article class="quest-history-entry"><small>${text('Ход')} ${esc(entry.turn??'—')}${entry.kind==='player_note'?` · ${text('Запись игрока')}`:entry.source==='player_statement'||entry.confidence==='speaker_claim'?` · ${text('Слова персонажа')}`:''}${entry.textTruncated?` · ${text('Отрывок')}`:''}</small><p>${esc(entry.text)}</p><button class="subtle" data-quest-record="${esc(entry.id)}">${text('В журнале')}</button></article>`).join('')||`<p class="muted">${text('Связанных записей пока нет.')}</p>`;
      if(history.data.missingEvidenceIds?.length)historyBody+=`<p class="objective-hint">${text('Часть подтверждений не найдена в старом сохранении. Новые события их не заменяют.')}</p>`;
      historyBody+=`<button class="subtle" data-quest-journal>${text('Открыть весь журнал')}</button>`;
    }
    const sidebar=(model.visibleList||model.list).map(summary).join('')+(model.hasMore?`<button class="subtle" data-quest-more>${text('Показать ещё задачи')}</button>`:'');
    return navigation+`<div class="quest-workspace"><aside class="quest-sidebar" aria-label="${text('Список задач')}">${sidebar}</aside><article class="quest-detail ${esc(quest.status)}"><header><span class="quest-status">${text(Object.hasOwn(statusLabels,quest.status)?statusLabels[quest.status]:'Архив')}</span><h3>${esc(quest.title)}</h3>${giver?`<p class="quest-giver">${text('От кого')}: ${esc(giver.name)}</p>`:''}<p>${esc(quest.summary)}</p><p class="quest-progress-label">${text('Пройдено этапов')}: ${progress} / ${quest.objectives.length}</p><progress value="${progress}" max="${Math.max(1,quest.objectives.length)}" aria-label="${text('Прогресс задачи')}"></progress></header>${quest.status==='offered'?`<div class="quest-invitation"><p>${text('Это предложение. Решение остаётся за тобой.')}</p><button data-quest="${esc(quest.id)}" ${busy?'disabled':''}>${text('Принять задачу')}</button></div>`:''}<ol class="objectives">${objectives}</ol>${future}${quest.rewardClaimed?`<p class="quest-reward-note">✓ ${text('Награда получена и записана в журнале.')}</p>`:''}<details class="quest-history" data-quest-history="${esc(quest.id)}" ${historyOpen?'open':''}><summary>${text('Из журнала')}</summary>${historyBody}</details></article></div>`;
  }
  return {select,objectiveInfo,render,groupOf};
});
