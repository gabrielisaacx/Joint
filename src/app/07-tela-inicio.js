/* ---------- INÍCIO ---------- */
function vHome(){
  var ym=month,cur=today().slice(0,7),sm=summary(ym,-1),bt=budTotal(),gs=live(S.goals);
  var rate=sm.inc>0?(sm.inc-sm.exp)/sm.inc:0,tgt=S.cfg.saveTarget/100;
  var r1=bt>0?sm.exp/bt:(sm.inc>0?sm.exp/sm.inc:0);
  var gp=0,gn=0;gs.forEach(function(g){if(goalTarget(g)>0){gp+=goalNeed(g).p;gn++}});gp=gn?gp/gn:0;
  var h='<div class="view">'+top("Olá, "+esc(NM(ME())),'Casal · '+ymLabel(ym));
  h+='<div class="monthnav"><button class="ghost" data-act="prevm" aria-label="Mês anterior">'+ic("back")+'</button><b>'+ymTitle(ym)+'</b><button class="ghost" data-act="nextm" aria-label="Próximo mês">'+ic("next")+'</button></div>';
  h+='<div class="card hero"><div class="hero-in"><svg class="dial" viewBox="0 0 120 120" role="img" aria-label="Resumo do mês">'+ring(52,r1,"r1")+ring(39,tgt>0?rate/tgt:0,"r2")+ring(26,gp,"r3")+'<text class="dialk" x="60" y="67" text-anchor="middle">'+MESC[+ym.slice(5,7)-1]+'</text></svg>'
    +'<ul class="legend"><li><span class="lab"><i class="dot" style="background:var(--c1)"></i>Gasto</span><span><b>'+brl0(sm.exp)+'</b><small>'+(bt>0?'de '+brl0(bt)+' orçados':(sm.inc>0?'de '+brl0(sm.inc)+' recebidos':''))+'</small></span></li>'
    +'<li><span class="lab"><i class="dot" style="background:var(--c3)"></i>Poupança</span><span><b>'+(sm.inc>0?pc(rate):'–')+'</b><small>meta '+S.cfg.saveTarget+'%</small></span></li>'
    +'<li><span class="lab"><i class="dot" style="background:var(--pa)"></i>Metas</span><span><b>'+(gn?pc(gp):'–')+'</b><small>'+(gn?gn+(gn>1?' metas':' meta'):'sem metas')+'</small></span></li></ul></div>'
    +'<p class="note">Receitas <b>'+brl0(sm.inc)+'</b> · Despesas <b>'+brl0(sm.exp)+'</b> · Saldo <b class="'+(sm.inc-sm.exp<0?'neg':'pos')+'">'+brl0(sm.inc-sm.exp)+'</b></p>';
  if(ym===cur&&sm.exp>0){
    var dn=new Date().getDate(),dd=dim(ym),varExp=sm.exp-sm.fixed-sm.carry,proj=Math.round(sm.fixed+sm.carry+varExp/Math.max(1,dn)*dd);
    h+='<p class="note">Projeção de fechamento: <b>'+brl0(proj)+'</b>'+(bt>0&&proj>bt?' · <span class="neg">acima do orçamento em '+brl0(proj-bt)+'</span>':'')+'.</p>';
  }
  h+='</div>';
  h+=repNudge();
  h+=backupNudge();
  h+=chartsCard();
  h+=diagCard();
  var bi=balanceInfo();
  h+='<div class="card"><div class="row sp"><div><h4>Entre vocês</h4><p style="margin:2px 0 0">'+bi.txt+'</p></div>'+(bi.debtor>=0?'<button class="ghost" data-act="settle">Acertar</button>':'')+'</div></div>';
  if(!S.tx.length)h+='<div class="card"><h3>Comece por aqui</h3><p class="note">Toque no <b>+</b> para lançar o primeiro gasto ou receita. Em Ajustes você confere os nomes, a divisão e as premissas de juros.</p></div>';
  h+='<div class="card"><div class="row sp"><h4>Onde o dinheiro foi</h4><button class="ghost" data-act="tab" data-id="gastos">Ver tudo</button></div>'+catBars(sm,true,5,catAvg(ym,-1))+'</div>';
  h+=commitCard();
  h+='<div class="card"><div class="row sp"><h4>Metas</h4><button class="ghost" data-act="tab" data-id="metas">Abrir</button></div>';
  if(!gs.length)h+='<p class="empty">Nenhuma meta ainda. Crie uma para a viagem, a reserva ou o que vier.</p>';
  gs.slice(0,3).forEach(function(g){var n=goalNeed(g);h+='<button class="catrow" data-act="goal" data-id="'+g.id+'"><div class="row sp"><span style="font-weight:700">'+esc(g.name)+'</span><span><b>'+pc(n.p)+'</b></span></div><div class="bar"><i class="g" style="width:'+(n.p*100).toFixed(1)+'%"></i></div></button>'});
  h+='</div>'+gameCard();return h+'</div>';
}

