/* ---------- diagnóstico financeiro (tela) ---------- */
var diagWho=-1;
function diagRun(ym,who){
  var cur=today().slice(0,7),sm=summary(ym,who),exp=sm.exp,partial=false,dn=new Date().getDate();
  var future=ym>cur;if(future||(ym===cur&&dn<dim(ym)))partial=true;   /* mês aberto: usa só o gasto até hoje (extrapolar gera alarme falso quando os gastos são concentrados) */
  var prev=[];monthsSeen().filter(function(m){return m<ym}).slice(-3).forEach(function(m){var p=summary(m,who);if(p.exp>0)prev.push({exp:p.exp,cat:p.cat})});
  var rv=reserveInfo(),nx=summary(ymAdd(ym,1),who);
  var d=diagnose({inc:sm.inc,exp:exp,fixed:sm.fixed,cat:sm.cat,prev:prev,saveTarget:S.cfg.saveTarget,bud:who<0?S.bud.v:null,kind:S.cfg.catk||{},reserveM:who<0&&rv.avg>0?rv.m:null,reserveAvg:rv.avg,nextFixed:nx.fixed,partial:partial});
  d.sm=sm;d.exp=exp;d.dn=dn;d.future=future;return d;
}
function diagCard(){
  var d=diagRun(month,-1);
  if(!d.ok)return '<div class="card"><div class="row sp"><div><h4>Diagnóstico</h4><p class="note">Lance a renda do mês para ver a análise.</p></div><button class="ghost" data-act="diag">Abrir</button></div></div>';
  return '<div class="card"><div class="row sp"><div><h4>Diagnóstico</h4><div class="row" style="gap:8px;margin-top:2px"><span><b class="big">'+d.score+'</b><small class="note">/100</small></span><span class="badge">'+d.level+'</span><small class="note">'+(d.rate<0?'gasto acima da renda':'sobra '+pc(d.rate)+(d.future?' (planejado)':d.partial?' até hoje':''))+'</small></div></div><button class="ghost" data-act="diag">Ver análise</button></div></div>';
}
function openDiag(){
  sheetKind="diag";var ym=month,d=diagRun(ym,diagWho);
  var h='<h3>Diagnóstico · '+ymTitle(ym)+'</h3><div class="seg p"><button data-act="dwho" data-id="-1" class="'+(diagWho<0?'on':'')+'">Casal</button><button data-act="dwho" data-id="0" class="a '+(diagWho===0?'on':'')+'">'+esc(NM(0))+'</button><button data-act="dwho" data-id="1" class="b '+(diagWho===1?'on':'')+'">'+esc(NM(1))+'</button></div>';
  if(!d.ok){h+='<p class="note">Sem receita lançada neste mês'+(diagWho>=0?' para '+esc(NM(diagWho)):'')+'. Lance a renda (tipo Receita) para eu calcular poupança, peso dos fixos e o resto.</p><button class="btn sec full" data-act="close">Fechar</button>';openSheet(h);return}
  var icon={ok:"Ok",warn:"Atenção",bad:"Ruim"};
  h+='<div class="card"><div class="row sp"><div><div class="bigv">'+d.score+'</div><p class="note">de 100</p></div><span class="badge">'+d.level+'</span></div><p class="note">Receita <b>'+brl0(d.sm.inc)+'</b> · Despesa <b>'+brl0(d.exp)+'</b>'+(d.future?' (planejado)':d.partial?' (até hoje)':'')+' · Saldo <b class="'+(d.sm.inc-d.exp<0?'neg':'pos')+'">'+brl0(d.sm.inc-d.exp)+'</b></p>'
    +(d.future?'<p class="note">Mês futuro: considera só receitas, fixos e parcelas já lançados. Gastos variáveis ainda não entram, então a sobra aparece maior do que tende a ser.</p>':d.partial?'<p class="note">Mês em andamento: a análise usa só o que já foi lançado até hoje. Ela fica mais fiel perto do fim do mês, e meses fechados são os mais confiáveis.</p>':'')+'</div>';
  h+='<div class="card"><h4>Nota mês a mês</h4>'+scoreHist(ym,diagWho)+'</div>';
  d.items.forEach(function(i){h+='<div class="card"><div class="row sp"><h4>'+esc(i.title)+'</h4><span class="badge">'+icon[i.sev]+(i.max?' · '+i.pts+'/'+i.max:'')+'</span></div>'+(i.max?'<div class="bar"><i style="width:'+(i.pts/i.max*100).toFixed(1)+'%"></i></div>':'')+'<p class="note">'+esc(i.txt)+'</p></div>'});
  if(d.top.length)h+='<div class="card"><h4>Onde mais pesou</h4><p class="note">'+d.top.map(function(x){return esc(x[0])+' <b>'+brl0(x[1])+'</b>'}).join(' · ')+'</p></div>';
  h+='<div class="card"><h4>Como melhorar</h4>'+(d.actions.length?'<ul class="note" style="margin:6px 0 0;padding-left:18px">'+d.actions.map(function(a){return '<li>'+esc(a)+'</li>'}).join('')+'</ul>':'<p class="note">Nada crítico agora. Mantenha o ritmo e use o excedente para as metas.</p>')+'<button class="ghost" data-act="wif">Simular: e se guardarmos mais?</button></div>';
  h+='<p class="note"><b>Como a nota é feita</b>: soma de critérios com peso. Poupança 30, fixos e parcelas 20, essenciais x desejos (50/30/20) 20, reserva de emergência 20 (só no casal), tendência de gastos 10 (só com o mês fechado). Critérios sem dados saem da conta. Gastar mais que a renda limita a nota a 49. Cada categoria pode ser marcada como essencial, desejo ou outro em Ajustes > Categorias; as criadas por vocês começam como outro. É um guia por regras gerais, não uma recomendação financeira personalizada.</p><button class="btn sec full" data-act="close">Fechar</button>';
  openSheet(h);
}
function gameCard(){
  var t=today(),days=actDays(),ls=logStreak(days,t),pi=planInfo(),ps=pi.first?planStreak(pi.ok,pi.first,t.slice(0,7)):{n:0,best:0,freezeUsed:false};
  var got=achState().filter(function(s){return s.ok}).length,mk=find(S.day,t),marked=!!mk&&!mk.x;
  var wk="";for(var i=6;i>=0;i--){var d=dayAdd(t,-i),q=d.split("-");wk+='<span class="wd'+(days[d]?' on':'')+(i===0?' td':'')+'" title="'+dBR(d)+(days[d]?': registrado':'')+'"><i></i><small>'+"DSTQQSS".charAt(new Date(+q[0],+q[1]-1,+q[2]).getDay())+'</small></span>'}
  var h='<div class="card"><div class="row sp"><h4>Sequências</h4><button class="ghost" data-act="ach">Conquistas '+got+'/'+ACH.length+'</button></div>'
    +'<div class="grid2"><div class="stat"><span>Registro</span><b>'+ls.n+(ls.n===1?' dia':' dias')+'</b><small class="note">melhor '+ls.best+' · '+(ls.freezeUsed?'folga do trimestre usada':'1 folga no trimestre')+'</small></div>'
    +'<div class="stat"><span>No plano</span><b>'+ps.n+(ps.n===1?' mês':' meses')+'</b><small class="note">melhor '+ps.best+' · '+(ps.freezeUsed?'folga do semestre usada':'1 folga no semestre')+'</small></div></div>'
    +'<div class="week" role="img" aria-label="Registros dos últimos 7 dias">'+wk+'</div>';
  if(marked)h+='<div class="row sp"><span class="note">Hoje marcado como <b>sem gastos</b>.</span><button class="ghost" data-act="noundo">Desfazer</button></div>';
  else if(!ls.doneNow)h+='<div class="row sp"><span class="note">'+(ls.n>0?'Registre algo hoje para manter os <b>'+ls.n+'</b> dias.':'Registre um lançamento para começar.')+'</span><button class="ghost" data-act="noday">Hoje sem gastos</button></div>';
  return h+'</div>';
}
function commitCard(){   /* parcelas e faturas já lançadas para meses futuros */
  var cur=today().slice(0,7),by={},tot=0;
  S.tx.forEach(function(t){if(t.x||t.k!=="o"||t.r)return;var m=tm(t);if(m>cur){by[m]=(by[m]||0)+t.v;tot+=t.v}});
  var ms=Object.keys(by).sort();if(!ms.length)return "";
  var top=0;ms.forEach(function(m){top=Math.max(top,by[m])});
  var h='<div class="card"><div class="row sp"><h4>Comprometido</h4><b>'+brl0(tot)+'</b></div><p class="note">Parcelas e faturas já lançadas para os próximos meses.</p>';
  ms.slice(0,6).forEach(function(m){h+='<button class="catrow" data-act="gotom" data-id="'+m+'"><div class="row sp"><span style="font-weight:700">'+ymTitle(m)+'</span><b>'+brl0(by[m])+'</b></div><div class="bar"><i style="width:'+(by[m]/top*100).toFixed(1)+'%"></i></div></button>'});
  if(ms.length>6)h+='<p class="note">e mais '+(ms.length-6)+(ms.length-6===1?' mês.':' meses.')+'</p>';
  return h+'</div>';
}
function openAch(){
  var st=achState(),rv=reserveInfo(),lv=rv.m>=6?3:rv.m>=3?2:rv.m>=1?1:0;sheetKind="ach";
  var h='<h3>Conquistas</h3><div class="card"><h4>Nível do casal</h4><div class="bigv">'+lv+'</div><p class="note"><b>'+LEVELS[lv]+'</b>. '+(rv.avg>0?'Metas (menos viagens): <b>'+brl0(rv.saved)+'</b> = '+nf(rv.m,1)+' mês de gastos (gasto médio mensal dos últimos meses fechados, até 3: '+brl0(rv.avg)+').':'Disponível depois do primeiro mês fechado com gastos.')+'</p></div><div class="achgrid">';
  st.forEach(function(x){var rec=null;S.ach.forEach(function(a){if(a.id===x.a.id)rec=a});
    h+='<div class="ach'+(x.ok?' on':'')+'"><span class="seal">'+(x.ok?'✓':'')+'</span><b>'+esc(x.a.n)+'</b><small>'+esc(x.a.d)+'</small>'+(x.ok&&rec?'<em>'+dBR(rec.d)+'</em>':'')+'</div>'});
  h+='</div><p class="note"><b>Registro</b>: dias seguidos com algum lançamento ou aporte (ou "hoje sem gastos"); uma falha por trimestre é perdoada. <b>No plano</b>: meses fechados em que a poupança atingiu a meta de '+nf(S.cfg.saveTarget,0)+'%; uma falha por semestre é perdoada. Fixos automáticos e acertos não contam.</p><button class="btn sec full" data-act="close">Fechar</button>';
  openSheet(h);
}
function journeyCard(g,n){
  var ms=goalMs(g),ev=g.ev||(g.due?g.due+"-"+pad(dim(g.due)):""),dd=ev?dayDiff(today(),ev):null;
  var h='<div class="card"><h4>Jornada</h4>';
  if(dd!=null)h+='<div><div class="bigv">'+Math.max(0,dd)+'</div><p class="note" style="margin:2px 0 0">'+(dd>1?'dias ':dd===1?'dia ':'')+(dd<0?'prazo encerrado':dd===0?'é hoje':(g.ev?'até '+dBR(g.ev):'até o fim do prazo ('+ymShort(g.due)+')'))+'</p></div>';
  h+='<div class="steps">';
  ms.forEach(function(m,i){var nx=!m.reached&&(i===0||ms[i-1].reached);
    h+='<div class="stp'+(m.reached?' on':'')+(nx?' next':'')+'"><i>'+(m.reached?'✓':'')+'</i><b>'+m.p+'%</b><small>'+brl0(m.amt)+'</small>'+(m.reached&&m.date?'<small>'+m.date.slice(8,10)+'/'+m.date.slice(5,7)+'</small>':'')+'</div>'});
  h+='</div>';
  var nxm=null;ms.forEach(function(m){if(!m.reached&&!nxm)nxm=m});
  h+=nxm?'<p class="note">Próximo marco: <b>'+nxm.p+'%</b> · faltam <b>'+brl0(Math.max(0,nxm.amt-n.sv))+'</b>.</p>':'<p class="note"><b>Todos os marcos alcançados.</b></p>';
  if(!n.done&&g.due&&n.n>0&&n.pmt>0){
    var pace=goalPace(g)/100,r=pace/n.pmt,lab=pace<=0?'Sem aportes recentes':r>=1.05?'▲ À frente do ritmo':r>=.95?'● No ritmo':'▼ Abaixo do ritmo';
    h+='<div class="row sp"><span class="badge">'+lab+'</span><span class="note">média 3 meses: <b>'+brlR0(pace)+'</b> de <b>'+brlR0(n.pmt)+'</b>/mês</span></div>';
  }
  return h+'</div>';
}
function msCount(g){return goalMs(g).filter(function(m){return m.reached}).length}

