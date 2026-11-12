/* ---------- GASTOS ---------- */
function vGastos(){
  var ym=month,sm=summary(ym,whoF),list=monthTx(ym).filter(function(t){return whoF<0||t.k==="t"?true:(t.k==="i"?t.w===whoF:shares(t,S.cfg.split)[whoF]>0)});
  list.sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:(b.u||0)-(a.u||0)});
  var h='<div class="view">'+top("Gastos",ymLabel(ym));
  h+='<div class="monthnav"><button class="ghost" data-act="prevm" aria-label="Mês anterior">'+ic("back")+'</button><b>'+ymTitle(ym)+'</b><button class="ghost" data-act="nextm" aria-label="Próximo mês">'+ic("next")+'</button></div>';
  h+='<div class="seg p"><button data-act="who" data-id="-1" class="'+(whoF<0?'on':'')+'">Casal</button><button data-act="who" data-id="0" class="a '+(whoF===0?'on':'')+'">'+esc(NM(0))+'</button><button data-act="who" data-id="1" class="b '+(whoF===1?'on':'')+'">'+esc(NM(1))+'</button></div>';
  var sav=sm.inc>0?(sm.inc-sm.exp)/sm.inc:null,cav=catAvg(ym,whoF);
  h+='<div class="grid2"><div class="stat"><span>Receitas</span><b class="pos">'+brl0(sm.inc)+'</b></div><div class="stat"><span>Despesas</span><b>'+brl0(sm.exp)+'</b></div><div class="stat"><span>Saldo</span><b class="'+(sm.inc-sm.exp<0?'neg':'')+'">'+brl0(sm.inc-sm.exp)+'</b></div><div class="stat"><span>Taxa de poupança</span><b>'+(sav==null?'–':pc(sav))+'</b></div></div>';
  h+='<div class="card"><div class="row sp"><h4>Por categoria</h4><button class="ghost" data-act="fixos">Fixos</button></div>'+catBars(sm,whoF<0,0,cav)+(cav?'<div class="legendrow"><span><u class="tk s"></u>Média dos '+cav._n+(cav._n>1?' meses anteriores':' mês anterior')+'</span>'+(whoF<0?'<span><u class="tk l s"></u>Limite</span>':'')+'</div>':'')+(whoF<0?'<div class="row sp"><p class="note">Toque em uma categoria para definir o limite.</p><button class="ghost" data-act="sug">Sugerir limites</button></div>':'')+'</div>';
  var cds=live(S.cards);
  if(cds.length){h+='<div class="card"><h4>Faturas</h4>';cds.forEach(function(c){var its=monthTx(ym).filter(function(t){return t.cd===c.id&&t.k==="o"}),tot=its.reduce(function(a,t){return a+t.v},0);h+='<div class="row sp"><span><b>'+esc(c.name)+'</b> <span class="note">vence '+pad(Math.min(c.due,dim(ym)))+'/'+ym.slice(5,7)+' · '+its.length+(its.length===1?' item':' itens')+'</span></span><b>'+brl(tot)+'</b></div>'});h+='<p class="note">Compras no cartão entram no mês em que a fatura vence. A data de cada item é a da compra.</p></div>'}
  h+='<button class="btn sec full" data-act="pdf">Importar fatura do cartão (PDF)</button>';
  h+='<div class="card"><h4>Lançamentos</h4><input type="search" id="txq" value="'+esc(txQ)+'" placeholder="Buscar nome, categoria ou cartão (todos os meses)" autocomplete="off" enterkeyhint="search"><div id="txl">'+txList()+'</div></div>';
  return h+'</div>';
}
var txQ="";
function txList(){
  var q=normTxt(txQ),list,h='';
  if(q){list=S.tx.filter(function(t){return !t.x&&normTxt((t.n||"")+" "+(t.k==="t"?"acerto":t.c)+" "+(t.cd?cardName(t.cd):"")+(t.r?" fixo":"")).indexOf(q)>=0});
    list.sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:0});var tot=list.length,sum=0;list.forEach(function(t){if(t.k==="o")sum+=t.v});list=list.slice(0,80);
    h+='<p class="note">'+tot+(tot===1?' resultado':' resultados')+' em todos os meses'+(sum?' · despesas somam <b>'+brl(sum)+'</b>':'')+(tot>80?' · mostrando os 80 mais recentes':'')+'.</p>';
    if(!tot)return h;
  }else{
    list=monthTx(month).filter(function(t){return whoF<0||t.k==="t"?true:(t.k==="i"?t.w===whoF:shares(t,S.cfg.split)[whoF]>0)});
    list.sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:(b.u||0)-(a.u||0)});
    if(!list.length)return '<p class="empty">Sem lançamentos neste mês. Use o <b>+</b> para adicionar.</p>';
  }
  var last="";
  list.forEach(function(t){
    if(t.d!==last){last=t.d;h+='<div class="dayh">'+(q?dBR(t.d):dayLabel(t.d))+'</div>'}
    var sg=t.k==="i"?"+":t.k==="o"?"−":"↔";
    var tag=t.k==="o"?(t.s===0?'<span class="badge">÷ casal</span>':'<span class="badge">só '+esc(NM(t.s===1?t.w:1-t.w))+'</span>'):'';
    h+='<button class="tx" data-act="tx" data-id="'+t.id+'"><span class="ico">'+esc((t.k==="t"?"AC":t.c||"?").slice(0,2).toUpperCase())+'</span><span class="grow"><div class="t1">'+esc(t.n||(t.k==="t"?"Acerto entre o casal":t.c))+'</div><div class="t2"><span class="badge '+(t.w===0?'a':'b')+'">'+esc(NM(t.w))+'</span>'+(t.k==="t"?'<span>acerto</span>':'<span>'+esc(t.c)+'</span>')+tag+(t.ip?'<span class="badge">'+t.in+'/'+t.it+'</span>':'')+(t.cd?'<span class="badge">'+esc(cardName(t.cd))+'</span>':'')+(t.r?'<span class="badge">fixo</span>':'')+'</div></span><span class="v '+(t.k==="i"?'pos':'')+'">'+sg+' '+brl(t.v)+'</span></button>';
  });
  return h;
}

