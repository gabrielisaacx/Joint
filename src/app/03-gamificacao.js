/* ---------- gamificação: sequências, marcos e conquistas ----------
   Tudo é derivado dos lançamentos. Só se gravam as datas de desbloqueio (S.ach) e os dias marcados "sem gastos" (S.day). */
function dBR(d){return d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):""}
function actDays(){
  var o={};
  S.tx.forEach(function(t){if(!t.x&&!t.r&&t.k!=="t"&&!(t.in>1)&&t.d)o[t.d]=true});   /* fixos automáticos (t.r) e acertos (t) não contam */
  S.cont.forEach(function(c){if(!c.x&&c.d)o[c.d]=true});
  S.day.forEach(function(x){if(!x.x)o[x.id]=true});
  return o;
}
function monthsSeen(){var m={};S.tx.forEach(function(t){if(!t.x&&t.d)m[tm(t)]=1});return Object.keys(m).sort()}
function planInfo(){   /* mês "no plano": houve renda e a poupança do mês >= meta de poupança */
  var ok={},first=null;
  monthsSeen().forEach(function(ym){var sm=summary(ym,-1);if(sm.inc>0){if(first===null)first=ym;ok[ym]=sm.exp<=sm.inc*(1-S.cfg.saveTarget/100)+0.5}});
  return {ok:ok,first:first};
}
function budFaithful(){   /* último mês fechado com orçamento definido e nenhuma categoria orçada estourada */
  var ym=ymAdd(today().slice(0,7),-1),sm=summary(ym,-1),lim=Object.keys(S.bud.v).filter(function(c){return S.bud.v[c]>0});
  return sm.exp>0&&lim.length>0&&lim.every(function(c){return (sm.cat[c]||0)<=S.bud.v[c]});
}
function reserveInfo(){   /* metas (exceto viagens) em meses de gasto médio dos últimos 3 meses fechados */
  var cur=today().slice(0,7),ms=monthsSeen().filter(function(ym){return ym<cur&&summary(ym,-1).exp>0}).slice(-3);
  var avg=ms.length?ms.reduce(function(a,ym){return a+summary(ym,-1).exp},0)/ms.length:0,saved=0;
  live(S.goals).forEach(function(g){if(g.type!=="viagem")saved+=goalSaved(g)});
  return {avg:avg,saved:saved,m:avg>0?saved/avg:0};
}
function duplaAt(){   /* primeiro mês em que os dois aportaram: data em que o segundo aportou */
  var by={},best=null;
  S.cont.forEach(function(c){if(c.x||!c.d)return;var ym=c.d.slice(0,7),w=c.w===1?1:0;by[ym]=by[ym]||{};if(!by[ym][w]||c.d<by[ym][w])by[ym][w]=c.d});
  Object.keys(by).forEach(function(ym){var o=by[ym];if(o[0]&&o[1]){var at=o[0]>o[1]?o[0]:o[1];if(best===null||at<best)best=at}});
  return best;
}
function goalMs(g){return milestones(g.base||0,S.cont.filter(function(c){return !c.x&&c.g===g.id}),goalTarget(g),[25,50,75,100])}
function achCtx(){
  var t=today(),c={},pi=planInfo();
  c.ls=logStreak(actDays(),t);c.ps=pi.first?planStreak(pi.ok,pi.first,t.slice(0,7)):{n:0,best:0};
  c.firstTx=null;S.tx.forEach(function(x){if(!x.x&&!x.r&&x.k!=="t"&&!(x.in>1)&&x.d&&(c.firstTx===null||x.d<c.firstTx))c.firstTx=x.d});
  c.firstCont=null;S.cont.forEach(function(x){if(!x.x&&x.d&&(c.firstCont===null||x.d<c.firstCont))c.firstCont=x.d});
  c.dupla=duplaAt();c.res=reserveInfo();c.bud=budFaithful();c.g50=null;c.g100=null;
  live(S.goals).forEach(function(g){if(goalTarget(g)<=0)return;var m=goalMs(g);
    if(m[1].reached){var a=m[1].date||t;if(c.g50===null||a<c.g50)c.g50=a}
    if(m[3].reached){var b=m[3].date||t;if(c.g100===null||b<c.g100)c.g100=b}});
  return c;
}
var ACH=[
  {id:"first",n:"Primeiro passo",d:"Registrar o primeiro lançamento.",t:function(c){return c.firstTx?{at:c.firstTx}:null}},
  {id:"week",n:"Semana inteira",d:"7 dias seguidos registrando.",t:function(c){return c.ls.best>=7?{}:null}},
  {id:"habit",n:"Mês de hábito",d:"30 dias seguidos registrando.",t:function(c){return c.ls.best>=30?{}:null}},
  {id:"blue",n:"No azul",d:"Fechar um mês poupando ao menos a meta de poupança.",t:function(c){return c.ps.best>=1?{}:null}},
  {id:"tri",n:"Trimestre firme",d:"3 meses seguidos dentro do plano.",t:function(c){return c.ps.best>=3?{}:null}},
  {id:"sem",n:"Meio ano no plano",d:"6 meses seguidos dentro do plano.",t:function(c){return c.ps.best>=6?{}:null}},
  {id:"bud",n:"Orçamento fiel",d:"Fechar um mês sem estourar nenhuma categoria orçada.",t:function(c){return c.bud?{}:null}},
  {id:"cont",n:"Primeiro aporte",d:"Registrar o primeiro aporte em uma meta.",t:function(c){return c.firstCont?{at:c.firstCont}:null}},
  {id:"duo",n:"Dupla",d:"Os dois aportarem em metas no mesmo mês.",t:function(c){return c.dupla?{at:c.dupla}:null}},
  {id:"g50",n:"Meta a 50%",d:"Chegar à metade de uma meta.",t:function(c){return c.g50?{at:c.g50}:null}},
  {id:"g100",n:"Meta cumprida",d:"Atingir 100% de uma meta.",t:function(c){return c.g100?{at:c.g100}:null}},
  {id:"r1",n:"Reserva de 1 mês",d:"Metas (menos viagens) somando 1 mês de gastos.",t:function(c){return c.res.m>=1?{}:null}},
  {id:"r3",n:"Reserva de 3 meses",d:"Metas (menos viagens) somando 3 meses de gastos.",t:function(c){return c.res.m>=3?{}:null}},
  {id:"r6",n:"Reserva de 6 meses",d:"Metas (menos viagens) somando 6 meses de gastos.",t:function(c){return c.res.m>=6?{}:null}}
];
var LEVELS=["Começando","Reserva de 1 mês","Reserva de 3 meses","Reserva de 6 meses"];
function achState(){var c=achCtx();return ACH.map(function(a){var r=a.t(c);return {a:a,ok:!!r,at:r&&r.at||""}})}
function achCheck(){
  var have={};S.ach.forEach(function(x){have[x.id]=1});
  var nw=achState().filter(function(s){return s.ok&&!have[s.a.id]});
  if(!nw.length)return;
  nw.forEach(function(s){S.ach.push({id:s.a.id,d:s.at||today(),u:Date.now()})});
  save();
  setTimeout(function(){toast(nw.length===1?"Conquista: "+nw[0].a.n+".":nw.length+" conquistas novas. Veja em Conquistas, na tela inicial.")},2800);
}
