const DAY=86400;
function now(adventure){return Math.round(((adventure.day||1)-1)*DAY+(adventure.hours||0)*3600);}
function dead(member){return member.conditions.includes('dead')||member.deathSaves?.dead;}
function status(member,adventure,kind='long',seconds=kind==='long'?28800:3600){
  if(dead(member))return {eligible:false,reason:'dead'};
  if(member.hp.current<=0)return {eligible:false,reason:member.deathSaves?.stable?'stable':'dying'};
  const last=adventure.restBenefits?.find(record=>record.characterId===member.id);
  const completion=now(adventure)+seconds;
  if(kind==='long'&&Number.isFinite(last?.endedAt)&&completion<last.endedAt+DAY)return {eligible:false,reason:'too_soon',nextStartAt:last.endedAt+DAY-28800,remainingSeconds:last.endedAt+DAY-completion};
  return {eligible:true};
}
// The core calculates actual benefits; this adapter decides who can receive them.
// before must be captured immediately before rest, including paid lodging's payment.
function apply(before,after,adventure,{kind,seconds=kind==='long'?28800:3600}={}){
  const beneficiaries=[],ineligible=[];
  after.party.members=after.party.members.map(member=>{
    const old=before.party.members.find(previous=>previous.id===member.id);if(!old)return member;
    const eligibility=status(old,adventure,kind,seconds);
    if(!eligibility.eligible){ineligible.push({id:old.id,name:old.name,...eligibility});return structuredClone(old);}
    beneficiaries.push({id:member.id,name:member.name});
    // A persistent healing-prevention effect does not permit rest healing.
    // Timed/rest-end prevention expires before this rest's completion.
    if((old.activeEffects||[]).some(effect=>effect.healingPrevented&&!effect.expiresAtRestEnd&&[effect.remainingSourceTurnStarts,effect.remainingSourceTurnEnds].filter(Number.isFinite).every(ticks=>ticks*6>seconds)))member.hp.current=Math.min(member.hp.current,old.hp.current);
    return member;
  });
  if(kind==='long'){
    adventure.restBenefits||=[];
    for(const member of beneficiaries){const previous=adventure.restBenefits.find(record=>record.characterId===member.id);if(previous)previous.endedAt=now(adventure)+seconds;else adventure.restBenefits.push({characterId:member.id,endedAt:now(adventure)+seconds});}
  }
  return {kind,seconds,beneficiaries,ineligible};
}
function describe(outcome,language='ru'){
  const en=language==='en',names=outcome.beneficiaries.map(member=>member.name).join(', ');
  const benefits=names?(en?`Rest benefits: ${names}.`:`Восстановление после отдыха: ${names}.`):(en?'Time passes without rest recovery.':'Время прошло без восстановления от отдыха.');
  const reasons={dead:en?'dead':'не в живых',stable:en?'stable at0 HP; needs time or healing':'стабилен при0 HP: нужны время или лечение',dying:en?'at0 HP; needs urgent help':'при0 HP: нужна срочная помощь',too_soon:en?'already benefited from a long rest within24 hours':'долгий отдых уже восстанавливал силы за последние24 часа'};
  return `${benefits}${outcome.ineligible.length?' '+outcome.ineligible.map(member=>`${member.name}: ${reasons[member.reason]}.`).join(' '):''}`;
}
module.exports={apply,status,describe,now,DAY};
