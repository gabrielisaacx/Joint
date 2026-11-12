/* ---------- ações ---------- */
var A={
  tab:function(e){tab=e.dataset.id;goalId=null;render();window.scrollTo(0,0)},
  cfg:function(){openCfg()},
  new:function(){openTx()},
  close:function(){closeSheet()},
  prevm:function(){month=ymAdd(month,-1);render()},
  nextm:function(){month=ymAdd(month,1);render()},
  who:function(e){whoF=+e.dataset.id;render()},
  tx:function(e){var t=find(S.tx,e.dataset.id);if(t)openTx(t)},
  kind:function(e){readTx();draft.k=e.dataset.id;if(draft.k==="t"&&!draft.v){var b=balanceInfo();if(b.debtor>=0){draft.w=b.debtor;draft.v=Math.abs(b.b)}}drawTx()},
  setw:function(e){var w=+e.dataset.id;if(sheetKind==="tx"){readTx();draft.w=w;drawTx()}else if(sheetKind==="rec"){draft.w=w;$$("#sheetBody .seg.p button").forEach(function(b){b.classList.toggle("on",+b.dataset.id===w)})}else if(sheetKind==="cont"){draft.w=w;$$("#sheetBody .seg.p button").forEach(function(b){b.classList.toggle("on",+b.dataset.id===w)})}},
  txsave:function(){saveTx()},
  txdel:function(){del(S.tx,draft.id);save();closeSheet();render();toast("Lançamento excluído.")},
  settle:function(){var b=balanceInfo();openTx(null,{k:"t",w:b.debtor,v:Math.abs(b.b)})},
  fixos:function(){openFixos()},
  recedit:function(e){openRec(e.dataset.id)},
  recsave:function(){var f=fields(),r=draft;r.v=parseMoney(f.v);if(!(r.v>0)){toast("Informe um valor.");return}r.n=f.n;r.c=f.c;r.day=Math.max(1,Math.min(31,parseInt(f.day,10)||1));if(f.s!=null)r.s=+f.s;upsert(S.rec,r);recPropagate(r,false);save();openFixos();render()},
  recdel:function(){del(S.rec,draft.id);recPropagate(draft,true);save();openFixos();render()},
  cat:function(e){if(whoF<0)openBud(e.dataset.id)},
  budsave:function(){var f=fields(),v=parseMoney(f.v),c=draft.cat,now=Date.now();S.bud.t=S.bud.t||{};
    if((S.bud.v[c]||0)!==(v>0?v:0)){S.bud.v[c]=v>0?v:0;S.bud.t[c]=now;S.bud.u=now}   /* 0 = sem limite (fica gravado para a mescla entre aparelhos saber que foi removido) */
    S.cfg.catk=S.cfg.catk||{};if(f.kd&&f.kd!==catKind(c)){S.cfg.catk[c]=f.kd;S.cfg.u=now}
    var nm=(f.nm||"").trim();if(nm&&nm!==c){if(S.cfg.cats.indexOf(nm)>=0){toast("Já existe uma categoria com esse nome.");return}renameCat(c,nm);S.cfg.u=now;S.bud.u=now}
    save();closeSheet();render()},
  goal:function(e){goalId=e.dataset.id;tab="metas";render();window.scrollTo(0,0)},
  goalback:function(){goalId=null;render()},
  goalnew:function(){openGoal()},
  goaledit:function(){openGoal(find(S.goals,goalId))},
  gtype:function(e){readGoal();draft.type=e.dataset.id;if(draft.type==="viagem"&&!draft.items.length)draft.items=TRIP.map(function(n){return {n:n,v:0}});drawGoal()},
  iadd:function(){readGoal();draft.items.push({n:"",v:0});drawGoal()},
  idel:function(e){readGoal();draft.items.splice(+e.dataset.id,1);drawGoal()},
  goalsave:function(){
    readGoal();var g=draft;if(!g.name.trim()){toast("Dê um nome para a meta.");return}
    if(g.type==="viagem"){g.items=g.items.filter(function(i){return i.n.trim()||i.v});g.target=0;if(!g.items.length){toast("Adicione ao menos um item.");return}}
    else if(!(g.target>0)){toast("Informe o valor da meta.");return}
    g.name=g.name.trim();var isNew=!g.id;if(isNew)g.id=uid();upsert(S.goals,g);save();closeSheet();if(isNew)goalId=g.id;tab="metas";render();toast("Meta salva.");
  },
  goaldel:function(){var id=draft.id;del(S.goals,id);S.cont.forEach(function(c){if(c.g===id&&!c.x){c.x=1;c.u=Date.now()}});save();closeSheet();goalId=null;render();toast("Meta excluída.")},
  contnew:function(){openCont()},
  ach:function(){openAch()},
  diag:function(){openDiag()},
  qp:function(e){var t=qpList[+e.dataset.id];if(!t)return;readTx();var d=draft;d.n=t.n;d.c=t.c;if(d.k==="o"){d.s=t.s||0;var cc=t.cd?find(S.cards,t.cd):null;d.cd=cc&&!cc.x?t.cd:""}if(!(d.v>0))d.v=t.v;drawTx();var vi=$('#sheetBody [data-f="v"]');if(vi){vi.focus();vi.select()}},
  wif:function(){openIf()},
  wifx:function(e){var i=$('#sheetBody [data-f="wx"]');if(i){i.value=fin(+e.dataset.id);wifOut()}},
  sug:function(){openSug()},
  sugok:function(){if(!draft||!draft.lim)return;var now=Date.now();S.bud.t=S.bud.t||{};for(var k in draft.lim){S.bud.v[k]=draft.lim[k];S.bud.t[k]=now}S.bud.u=now;save();closeSheet();render();toast("Limites aplicados.")},
  catdel:function(){var c=draft.cat,i=S.cfg.cats.indexOf(c);if(S.cfg.cats.length<=1){toast("Mantenha ao menos uma categoria.");return}if(i>=0)S.cfg.cats.splice(i,1);S.cfg.u=Date.now();S.bud.v[c]=0;S.bud.t=S.bud.t||{};S.bud.t[c]=Date.now();S.bud.u=Date.now();save();closeSheet();render();toast("Categoria removida. Os lançamentos antigos continuam com ela.")},
  cated:function(e){openBud(e.dataset.id)},
  csv:function(){exportCsv()},
  bksnooze:function(){try{localStorage.setItem("joint.bkps",String(Date.now()))}catch(x){}render()},
  e2eoff:function(){syPatch({k:undefined,e:undefined});e2eK=null;sync.block=false;openCfg();push().then(function(){toast("Criptografia removida. A nuvem voltou a guardar os dados abertos.")})},
  trend:function(e){trendSel=e.dataset.id;render()},
  ctab:function(e){chartTab=e.dataset.id;render()},
  repopen:function(){openRep()},
  repall:function(e){$$("#sheetBody [data-rep]").forEach(function(i){i.checked=e.dataset.id==="1"})},
  repgo:function(){repGo()},
  dwho:function(e){diagWho=+e.dataset.id;openDiag()},
  gotom:function(e){month=e.dataset.id;tab="gastos";goalId=null;render();window.scrollTo(0,0)},
  cardnew:function(){openCard()},
  cardedit:function(e){var c=find(S.cards,e.dataset.id);if(c)openCard(c)},
  cardsave:function(){
    var f=fields(),c=draft,nm=(f.name||"").trim(),cl=parseInt(f.close,10),du=parseInt(f.due,10);
    if(!nm){toast("Dê um nome ao cartão.");return}
    if(!(cl>=1&&cl<=28&&du>=1&&du<=28)){toast("Fechamento e vencimento: dia de 1 a 28.");return}
    c.name=nm;c.close=cl;c.due=du;c.w=+f.cw===1?1:0;if(!c.id)c.id=uid();upsert(S.cards,c);save();openCfg();render();toast("Cartão salvo.")
  },
  carddel:function(){del(S.cards,draft.id);save();openCfg();render();toast("Cartão excluído. Os lançamentos antigos continuam como estão.")},
  txdelnext:function(){var d=draft;S.tx.forEach(function(t){if(!t.x&&t.ip===d.ip&&t.in>=d.in){t.x=1;t.u=Date.now()}});save();closeSheet();render();toast("Parcelas excluídas.")},
  noday:function(){upsert(S.day,{id:today()});save();render();toast("Dia registrado como sem gastos.")},
  noundo:function(){del(S.day,today());save();render()},
  contedit:function(e){openCont(find(S.cont,e.dataset.id))},
  contsave:function(){var f=fields(),c=draft;c.v=parseMoney(f.v);if(!(c.v>0)){toast("Informe um valor.");return}c.d=f.d||today();c.n=f.n;if(!c.id)c.id=uid();var gb=find(S.goals,c.g),m0=gb?msCount(gb):0;upsert(S.cont,c);var m1=gb?msCount(gb):0;save();closeSheet();render();toast(gb&&m1>m0?'Marco de '+goalMs(gb)[m1-1].p+'% alcançado: '+gb.name+'.':"Aporte registrado.")},
  contdel:function(){del(S.cont,draft.id);save();closeSheet();render()},
  simgoal:function(e){var g=find(S.goals,e.dataset.id);if(!g)return;var n=goalNeed(g),s=simS();s.goalId=g.id;s.target=n.tg/100;s.p0=n.sv/100;s.months=Math.max(1,Math.min(240,n.n||12));s.pmt=Math.round(n.pmt)||0;s.preset="cdb";s.real=false;s.growth=0;s.u=Date.now();save();tab="sim";goalId=null;render();window.scrollTo(0,0)},
  preset:function(e){var s=simS();s.preset=e.dataset.id;s.u=Date.now();save();render()},
  months:function(e){var s=simS();s.months=+e.dataset.id;s.u=Date.now();save();render()},
  theme:function(e){var t=e.dataset.id;try{localStorage.setItem(THKEY,t)}catch(x){}applyTheme();toast("Tema: "+({auto:"automático",dark:"escuro",light:"claro"}[t]))},
  cfgsave:function(){
    var f=fields(),c=S.cfg,n=function(x,d){var v=parseFloat(String(x).replace(",","."));return isFinite(v)?v:d};
    c.names=[(f.n0||"").trim()||c.names[0],(f.n1||"").trim()||c.names[1]];c.split=Math.max(0,Math.min(100,n(f.split,50)));c.saveTarget=Math.max(0,n(f.save,20));c.cdi=Math.max(0,n(f.cdi,13.65));c.infl=Math.max(0,n(f.infl,4.5));c.spread=Math.max(0,n(f.spread,2));c.goalPct=Math.max(0,n(f.gpct,100));
    var nc=(f.newcat||"").trim();if(nc&&c.cats.indexOf(nc)<0)c.cats.push(nc);c.u=Date.now();
    try{localStorage.setItem(MEKEY,String(+f.me===1?1:0))}catch(e){}
    var api=(f.api||"").trim(),sid=slug(f.sid),pin=(f.pin||"").trim(),old=SY(),epw=f.epw||"";
    var conn=api&&sid&&pin.length>=4,ns=conn?{api:api,id:sid,pin:pin}:{};
    if(conn&&epw){if(epw.length<8){toast("A senha de criptografia precisa de 8 caracteres ou mais.");return}if(!e2eOk()){toast("Este navegador não permite criptografia aqui (precisa de HTTPS).");return}}
    if(conn&&!epw&&old.k&&old.id===sid){ns.k=old.k;if(old.e)ns.e=1}   /* mantém a chave atual */
    function fin(direct){
      try{localStorage.setItem(SYKEY,JSON.stringify(ns))}catch(e){}sync.block=false;sync.logged=false;
      save();closeSheet();render();
      if(conn){sync.st="idle";(direct?push():pull()).then(function(){if(sync.st==="ok")toast(ns.k?"Sincronizado e criptografado.":"Sincronizado.")})}else{sync.st="off";updDot();toast("Ajustes salvos.")}
    }
    if(conn&&epw){toast("Gerando a chave…");e2eDerive(epw,sid).then(function(k){var chg=!!(old.k&&old.id===sid&&old.k!==k);ns.k=k;if(old.k===k&&old.e)ns.e=1;fin(chg)}).catch(function(){toast("Não consegui gerar a chave de criptografia.")})}   /* trocar a senha: regrava direto com a chave nova, porque a nuvem ainda está na antiga */
    else fin(false);
  },
  welcomesave:function(){var f=fields();S.cfg.names=[(f.n0||"").trim()||"Pessoa 1",(f.n1||"").trim()||"Pessoa 2"];S.cfg.u=Date.now();try{localStorage.setItem(MEKEY,String(+f.me===1?1:0))}catch(e){}save();closeSheet();render()},
  lock:function(){lockNow()},
  pinchg:function(){openPin()},
  lockmin:function(e){var a=AU();a.m=+e.dataset.id;auPut(a);$$("[data-act=lockmin]").forEach(function(b){b.classList.toggle("on",b===e)});toast("Bloqueio: "+(a.m===0?"ao sair do app":"após "+a.m+" min fora do app"))},
  pinsave:function(){
    var f=fields(),a=AU();
    if(!/^\d{4}$/.test(f.p1||""))return toast("O novo PIN precisa ter 4 números.");
    if(/^(\d)\1{3}$/.test(f.p1)||f.p1==="1234"||f.p1==="4321")return toast("PIN fácil demais.");
    if(f.p1!==f.p2)return toast("Os dois PINs não são iguais.");
    var wk=String(a.h).charAt(0)==="w";
    hashPin(String(a.n).toLowerCase(),f.p0||"",a.s,wk).then(function(h){
      if(h!==a.h){toast("PIN atual incorreto.");return}
      var salt=rnd(16);return hashPin(String(a.n).toLowerCase(),f.p1,salt).then(function(h2){a.s=salt;a.h=h2;a.f=0;a.t=0;auPut(a);closeSheet();toast("PIN alterado.")});
    });
  },
  export:function(){dl("joint-backup-"+today()+".json","application/json",JSON.stringify(S));try{localStorage.setItem("joint.bkp",String(Date.now()))}catch(x){}toast("Backup exportado. Guarde o arquivo fora do celular.");if(tab==="home"&&$("#sheet").hidden)render()},
  import:function(){$("#file").click()},
  pdf:function(){$("#pdf").click()},
  imppw:function(){var p=fields().ppw||"";if(!p){toast("Digite a senha do PDF.");return}closeSheet();impRead(p)},
  impall:function(e){var on=e.dataset.id==="1";imp.rows.forEach(function(r){if(!r.lock)r.sel=on});var sc=$("#sheetBody").scrollTop;impDraw();$("#sheetBody").scrollTop=sc},
  impgo:function(){impGo()},
  wipe:function(){if(!confirm("Apagar TODOS os dados deste aparelho? Se a sincronização estiver ligada, eles voltam do servidor."))return;try{localStorage.removeItem(KEY)}catch(e){}S=blank();persist();closeSheet();render();toast("Dados apagados.")}
};
function slug(n){return String(n||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"").slice(0,30)}
document.addEventListener("click",function(ev){
  var e=ev.target.closest("[data-act]");
  if(ev.target.id==="sheetBg"){closeSheet();return}
  if(!e)return;var f=A[e.dataset.act];if(f){ev.preventDefault();f(e)}
});
document.addEventListener("input",function(ev){
  var e=ev.target;if(!e.dataset||e.dataset.sim==null)return;
  var s=simS(),k=e.dataset.sim,v=e.value;
  if(k==="p0"||k==="pmt"||k==="target")s[k]=parseMoney(v)/100;
  else if(k==="rate"||k==="growth")s[k]=Math.max(0,parseFloat(String(v).replace(",","."))||0);
  else if(k==="months")s.months=Math.max(1,Math.min(240,parseInt(v,10)||1));
  else if(k==="ir"||k==="real")s[k]=e.checked;
  else if(k==="goalId"){s.goalId=v;var g=find(S.goals,v);if(g&&!g.x){var n=goalNeed(g);s.target=n.tg/100;s.p0=n.sv/100;s.months=Math.max(1,Math.min(240,n.n||12));s.u=Date.now();save();render();return}}
  s.u=Date.now();save();
  if(k==="months"){$$("[data-act=months]").forEach(function(b){b.classList.toggle("on",+b.dataset.id===s.months)})}
  simOut();
});
document.addEventListener("input",function(ev){var e=ev.target;if(sheetKind==="tx"&&e.dataset&&(e.dataset.f==="v"||e.dataset.f==="np"||e.dataset.f==="av"))parcHint();
  if(sheetKind==="tx"&&e.dataset&&e.dataset.f==="n")qpDraw();
  if(sheetKind==="wif"&&e.dataset&&(e.dataset.f==="wm"||e.dataset.f==="wx"))wifOut();
  if(e.id==="txq"){txQ=e.value;var l=$("#txl");if(l)l.innerHTML=txList()}});
document.addEventListener("change",function(ev){
  if(ev.target.id==="pdf"){var pf=ev.target.files[0];ev.target.value="";impFile(pf);return}
  if(sheetKind==="imp"&&ev.target.dataset&&(ev.target.dataset.imp!=null||ev.target.dataset.impc!=null||ev.target.dataset.imps!=null||/^(icd|iw|im|ifut|is)$/.test(ev.target.dataset.f||""))){impChange(ev.target);return}
  if(sheetKind==="tx"&&ev.target.dataset&&(ev.target.dataset.f==="cd"||ev.target.dataset.f==="d"))parcHint();
  if(ev.target.id==="file"){
    var f=ev.target.files[0];if(!f)return;var rd=new FileReader();
    rd.onload=function(){try{var r=JSON.parse(rd.result);if(!r||!r.cfg||!Array.isArray(r.tx))throw 0;S=mergeState(S,r);ensureRec();persist();save();closeSheet();render();toast("Backup importado.")}catch(e){toast("Arquivo inválido. Use um backup exportado pelo Joint.")}};
    rd.readAsText(f);ev.target.value="";
  }
  if(ev.target.dataset&&ev.target.dataset.f==="s"&&sheetKind==="tx"){/* mantém */}
});

