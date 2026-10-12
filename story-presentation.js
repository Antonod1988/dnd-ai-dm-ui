const StoryPresentation=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function noticeTitle(author){
    const labels={'Связь с мастером':'Рассказ и связь',Connection:'Рассказ и связь','Поручение':'Поручение спутнику','Party order':'Поручение спутнику','Путешествие':'Припасы и дорога',Travel:'Припасы и дорога','Сделка':'Покупки и обмен',Transaction:'Покупки и обмен','Отряд':'Дела отряда',Party:'Дела отряда','Награда':'Находки и награды',Reward:'Находки и награды'};
    return Object.hasOwn(labels,author)?labels[author]:'Детали хода';
  }
  function renderMessage(message,{translate=value=>value,formatText=escape,expanded=false}={}){
    const id=escape(message.id),meta=`<div class="message-meta"><span>${escape(message.author)}</span><time>${escape(translate('ХОД'))} ${escape(message.turn)}</time></div>`;
    const body=String(message.text??'').split(/\n\s*\n/).filter(Boolean).map(paragraph=>`<p>${formatText(paragraph)}</p>`).join('');
    if(message.role!=='system')return `<article class="message ${escape(message.role)}" data-message-id="${id}">${meta}${body}</article>`;
    // Presentation only: do not discard, rewrite, merge or reinterpret records.
    return `<article class="message system system-notice" data-message-id="${id}"><details data-system-note="${id}" ${expanded?'open':''}><summary>${escape(translate(noticeTitle(message.author)))} <small>${escape(translate('ХОД'))} ${escape(message.turn)}</small></summary><div>${meta}${body}</div></details></article>`;
  }
  return {renderMessage,noticeTitle};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=StoryPresentation;
