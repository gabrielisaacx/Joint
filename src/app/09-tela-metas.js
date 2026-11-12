/* ---------- METAS ---------- */
function vMetas(){
  var gs=live(S.goals),h='<div class="view">'+top("Metas","Objetivos do casal")+'<div class="grid2"><button class="btn" data-act="goalnew">+ Nova meta</button><button class="btn sec" data-act="wif">E se…</button></div>';
  if(!gs.length)h+='<div class="card"><p class="empty">Crie metas como a viagem dos sonhos, a reserva de emergência ou a entrada de um imóvel. Em metas de viagem você monta o orçamento item a item.</p></div>';
  gs.forEach(function(g){
    var n=goalNeed(g);
    h+='<button class="card tap" data-act="goal" data-id="'+g.id+'"><div class="row sp"><h3>'+esc(g.name)+'</h3><span class="badge">'+(g.type==="viagem"?'Viagem':'Meta')+'</span></div>'
      +'<div class="bar"><i class="g" style="width:'+(n.p*100).toFixed(1)+'%"></i></div>'
      +'<div class="row sp"><span><b>'+brl0(n.sv)+'</b> <span class="note">de '+brl0(n.tg)+'</span></span><b>'+pc(n.p)+'</b></div>'
      +'<p class="note">'+(n.done?'<span class="pos">Meta atingida.</span>':(g.due?'Prazo '+ymShort(g.due)+' · guardar <b>'+brlR0(n.pmt)+'/mês</b>':'Sem prazo definido'))+'</p></button>';
  });
  return h+'</div>';
}
function vGoal(){
  var g=find(S.goals,goalId);if(!g||g.x){goalId=null;return vMetas()}
  var n=goalNeed(g),h='<div class="view"><div class="row"><button class="ghost" data-act="goalback">'+ic("back")+' Metas</button></div>';
  h+='<div class="top"><div><h1>'+esc(g.name)+'</h1><p class="sub">'+(g.type==="viagem"?'Viagem · ':'')+(g.due?'prazo '+ymLabel(g.due):'sem prazo')+'</p></div></div>';
  h+='<div class="card hero"><div class="bigv">'+brl0(n.sv)+'</div><div class="bar"><i class="g" style="width:'+(n.p*100).toFixed(1)+'%"></i></div><p class="note">de <b>'+brl0(n.tg)+'</b> · '+pc(n.p)+' · faltam <b>'+brl0(Math.max(0,n.tg-n.sv))+'</b></p></div>';
  if(n.tg>0)h+=journeyCard(g,n);
  h+='<div class="card"><h4>Quanto guardar por mês</h4>';
  if(n.done)h+='<p style="margin:0" class="pos"><b>Meta atingida.</b></p>';
  else if(!g.due)h+='<p class="note">Defina um prazo para calcular o aporte mensal.</p>';
  else{
    h+='<div class="bigv">'+brlR(n.pmt)+'</div><p class="note">'+(n.n>0?'em '+n.n+(n.n>1?' meses':' mês')+', aplicando a reserva a <b>'+nf(S.cfg.goalPct,0)+'% do CDI</b> ('+nf(goalRate()*100,2)+'% a.a.), com IR regressivo.':'O prazo é este mês: o valor que falta é o próprio aporte.')+(g.infl&&n.n>0?' Alvo corrigido pelo IPCA de '+nf(S.cfg.infl,1)+'% a.a.: <b>'+brl0(n.tn)+'</b> no vencimento.':'')+'</p>';
    var pace=goalPace(g);
    if(pace>0&&!n.done){
      var m=solveMonths({p0:n.sv/100,pmt:pace/100,growth:0,rate:goalRate(),infl:0,months:0,ir:true,begin:false},n.tn/100,600);
      h+='<p class="note">Ritmo dos últimos 3 meses: <b>'+brl0(pace)+'/mês</b> → '+(m==null?'não alcança a meta em 50 anos.':'chega em <b>'+ymShort(ymAdd(today().slice(0,7),m))+'</b>'+(g.due&&ymAdd(today().slice(0,7),m)>g.due?' <span class="neg">(depois do prazo)</span>':'')+'.')+'</p>';
    }
  }
  h+='<div class="grid2"><button class="btn" data-act="contnew">+ Aporte</button><button class="btn sec" data-act="simgoal" data-id="'+g.id+'">Simular</button></div></div>';
  if(g.type==="viagem"){
    var its=g.items||[];h+='<div class="card"><div class="row sp"><h4>Orçamento da viagem</h4><button class="ghost" data-act="goaledit">Editar</button></div>';
    its.forEach(function(i){h+='<div class="row sp"><span>'+esc(i.n)+'</span><b>'+brl(i.v||0)+'</b></div>'});
    var sub=its.reduce(function(a,i){return a+(i.v||0)},0);
    if(g.margin)h+='<div class="row sp note"><span>Margem de segurança ('+nf(g.margin,0)+'%)</span><b>'+brl(Math.round(sub*g.margin/100))+'</b></div>';
    h+='<div class="row sp" style="border-top:1px solid var(--line);padding-top:8px"><b>Total</b><b>'+brl(n.tg)+'</b></div></div>';
  }
  var cs=S.cont.filter(function(c){return !c.x&&c.g===g.id}).sort(function(a,b){return a.d<b.d?1:-1});
  h+='<div class="card"><h4>Aportes</h4>'+(g.base?'<div class="row sp note"><span>Valor inicial já guardado</span><b>'+brl(g.base)+'</b></div>':'');
  if(!cs.length&&!g.base)h+='<p class="empty">Nenhum aporte registrado.</p>';
  cs.forEach(function(c){h+='<button class="tx" data-act="contedit" data-id="'+c.id+'"><span class="ico">+</span><span class="grow"><div class="t1">'+dayLabel(c.d)+'</div><div class="t2"><span class="badge '+(c.w===0?'a':'b')+'">'+esc(NM(c.w))+'</span>'+(c.n?'<span>'+esc(c.n)+'</span>':'')+'</div></span><span class="v pos">+ '+brl(c.v)+'</span></button>'});
  h+='</div><button class="btn sec full" data-act="goaledit">Editar meta</button></div>';
  return h;
}

