/* ---------- fixos recorrentes: viram lançamentos com id determinístico (u=1: qualquer edição ou exclusão vence) ---------- */
function ensureRec(){
  var cur=today().slice(0,7),hz=ymAdd(cur,11),changed=false;   /* gera o mês atual e os 11 seguintes, para dar para acompanhar os próximos meses */
  live(S.rec).forEach(function(r){
    var ym=r.from||cur,n=0;
    while(ym<=hz&&n++<120){
      var id="r"+r.id+"_"+ym;
      if(!find(S.tx,id)){var nt={id:id,k:r.k,v:r.v,d:ym+"-"+pad(Math.min(r.day||1,dim(ym))),c:r.c,w:r.w,s:r.s||0,n:r.n,r:r.id,u:1},cc=r.cd?find(S.cards,r.cd):null;if(cc&&!cc.x){nt.cd=cc.id;nt.m=invoiceOf(nt.d,cc.close,cc.due).m}S.tx.push(nt);changed=true}
      ym=ymAdd(ym,1);
    }
  });
  if(changed)save();
}

function recPropagate(r,stop){   /* mexe só nos meses seguintes ao atual e só nos lançamentos que ninguém editou à mão (u===1) */
  var cur=today().slice(0,7),cc=r.cd?find(S.cards,r.cd):null;
  S.tx.forEach(function(t){
    if(t.r!==r.id||t.x||!(t.u===1||t.a)||t.d.slice(0,7)<=cur)return;   /* a=1: automático, ainda não editado à mão */
    if(stop){t.x=1;t.u=Date.now();return}
    var ym=t.d.slice(0,7);t.v=r.v;t.n=r.n;t.c=r.c;t.s=r.s||0;t.w=r.w;t.d=ym+"-"+pad(Math.min(r.day||1,dim(ym)));
    if(cc&&!cc.x)t.m=invoiceOf(t.d,cc.close,cc.due).m;
    t.a=1;t.u=Date.now();   /* carimbo novo: sem isso o outro aparelho ficava com o valor antigo (empate em u=1 na mescla) */
  });
}

/* ---------- agregados ---------- */
function tm(t){return t.m||t.d.slice(0,7)}   /* mês em que o lançamento pesa: o da fatura (cartão) ou o da data */
function monthTx(ym){return S.tx.filter(function(t){return !t.x&&tm(t)===ym})}
function cardName(id){var c=find(S.cards,id);return c?c.name:"Cartão"}
function summary(ym,who){
  var r={inc:0,exp:0,cat:{},fixed:0,carry:0};   /* carry: compras no cartão feitas em outro mês que caem na fatura deste */
  monthTx(ym).forEach(function(t){
    if(t.k==="i"){if(who<0||t.w===who)r.inc+=t.v}
    else if(t.k==="o"){var v=who<0?t.v:shares(t,S.cfg.split)[who];r.exp+=v;r.cat[t.c]=(r.cat[t.c]||0)+v;if(t.r||t.ip)r.fixed+=v;else if(t.d.slice(0,7)!==ym)r.carry+=v}   /* fixos e parcelas são compromissos conhecidos: não entram na projeção pelo ritmo diário */
  });
  return r;
}
function budTotal(){var s=0;for(var k in S.bud.v)s+=S.bud.v[k]||0;return s}
function goalTarget(g){if(g.type==="viagem"){var s=0;(g.items||[]).forEach(function(i){s+=i.v||0});return Math.round(s*(1+(g.margin||0)/100))}return g.target||0}
function goalSaved(g){var s=g.base||0;S.cont.forEach(function(c){if(!c.x&&c.g===g.id)s+=c.v});return s}
function monthsLeft(due){if(!due)return 0;var n=new Date();return Math.max(0,(+due.slice(0,4))*12+(+due.slice(5,7))-(n.getFullYear()*12+n.getMonth()+1))}
function goalRate(){return S.cfg.cdi*S.cfg.goalPct/100/100}
function goalNeed(g){
  var tg=goalTarget(g),sv=goalSaved(g),n=monthsLeft(g.due),tn=tg;
  if(g.infl&&n>0)tn=Math.round(tg*Math.pow(1+S.cfg.infl/100,n/12));
  var pmt=0;
  if(sv<tn){ if(n<=0)pmt=(tn-sv)/100; else pmt=solvePmt({p0:sv/100,pmt:0,growth:0,rate:goalRate(),infl:0,months:n,ir:true,begin:false},tn/100) }
  return {tg:tg,sv:sv,n:n,tn:tn,pmt:pmt,done:tg>0&&sv>=tg,p:tg>0?Math.min(1,sv/tg):0};
}
function goalPace(g){ /* média mensal dos aportes dos últimos 90 dias, em centavos */
  var lim=new Date();lim.setDate(lim.getDate()-90);var l=iso(lim),s=0;
  S.cont.forEach(function(c){if(!c.x&&c.g===g.id&&c.d>=l)s+=c.v});return s/3;
}


