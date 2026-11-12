/* ---------- renderização ---------- */
function render(){
  if(started)achCheck();
  var f=tab==="home"?vHome:tab==="gastos"?vGastos:tab==="sim"?vSim:(goalId?vGoal:vMetas);
  var sx=window.scrollX,sy=window.scrollY;$("#app").innerHTML=f();
  $$(".tabbar [data-act=tab]").forEach(function(b){b.classList.toggle("on",b.dataset.id===tab)});
  if(tab==="sim")simOut();if(tab==="home")bindPace();updDot();
}
function updDot(){var d=$("#dot");if(!d)return;d.className="dotsync "+(sync.st==="off"?"":sync.st==="err"?"err":(sync.dirty||sync.st==="syncing")?"pend":"ok")}
var toastT=null;
function toast(m){var t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},2600)}
function openSheet(h){$("#sheetBody").innerHTML='<div class="grab"></div>'+h;$("#sheet").hidden=false;document.body.classList.add("noscroll")}
function closeSheet(){$("#sheet").hidden=true;document.body.classList.remove("noscroll");draft=null;sheetKind=""}
function fields(){var o={};$$("#sheetBody [data-f]").forEach(function(e){o[e.dataset.f]=e.type==="checkbox"?e.checked:e.value});return o}
function segW(sel,label){return '<label class="f">'+label+'<div class="seg p"><button type="button" data-act="setw" data-id="0" class="a '+(sel===0?'on':'')+'">'+esc(NM(0))+'</button><button type="button" data-act="setw" data-id="1" class="b '+(sel===1?'on':'')+'">'+esc(NM(1))+'</button></div></label>'}
function opts(list,sel){return list.map(function(c){return '<option'+(c===sel?' selected':'')+'>'+esc(c)+'</option>'}).join('')}

/* ---------- folha: lançamento ---------- */
function openTx(t,pre){
  draft=t?clone(t):{id:"",k:"o",v:0,d:today(),c:S.cfg.cats[0],w:ME(),s:0,n:"",rep:false};
  if(pre)for(var k in pre)draft[k]=pre[k];
  sheetKind="tx";drawTx();
}
function readTx(){var f=fields();draft.v=parseMoney(f.v);draft.n=f.n!=null?f.n:draft.n;if(f.c!=null)draft.c=f.c;if(f.d)draft.d=f.d;if(f.s!=null)draft.s=+f.s;if(f.rep!=null)draft.rep=f.rep;if(f.cd!=null)draft.cd=f.cd;if(f.np!=null)draft.np=Math.max(1,Math.min(48,parseInt(f.np,10)||1));if(f.av!=null)draft.av=parseMoney(f.av)}
function drawTx(){
  var d=draft,isNew=!d.id,k=d.k,other=1-d.w;
  var h='<h3>'+(isNew?'Novo lançamento':'Editar lançamento')+'</h3><div class="seg">'+[["o","Despesa"],["i","Receita"],["t","Acerto"]].map(function(x){return '<button type="button" data-act="kind" data-id="'+x[0]+'" class="'+(k===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</div>';
  h+='<label class="f">Valor (R$)<input class="big" type="text" inputmode="decimal" data-f="v" value="'+fin(d.v)+'" placeholder="0,00" autocomplete="off"></label>';
  if(k==="t")h+='<p class="note">Registra que <b>'+esc(NM(d.w))+'</b> repassou o valor a <b>'+esc(NM(other))+'</b>. Isso quita (ou reduz) o saldo entre vocês e não entra em receitas nem despesas.</p>';
  else{
    h+='<label class="f">Descrição<input type="text" data-f="n" value="'+esc(d.n)+'" placeholder="ex.: Mercado da semana" autocomplete="off"></label>'+(isNew?'<div class="chips" id="qp"></div>':'');
    var cl=k==="i"?INC:S.cfg.cats;if(cl.indexOf(d.c)<0){d.c=cl[0]}
    h+='<label class="f">Categoria<select data-f="c">'+opts(cl,d.c)+'</select></label>';
  }
  h+='<label class="f">Data<input type="date" data-f="d" value="'+esc(d.d)+'"></label>'+segW(d.w,k==="i"?"Quem recebeu":k==="t"?"Quem repassou":"Quem pagou");
  if(k==="o")h+='<label class="f">Divisão<select data-f="s"><option value="0"'+(d.s===0?' selected':'')+'>Dividir entre o casal ('+S.cfg.split+'/'+(100-S.cfg.split)+')</option><option value="1"'+(d.s===1?' selected':'')+'>Só de '+esc(NM(d.w))+'</option><option value="2"'+(d.s===2?' selected':'')+'>Só de '+esc(NM(other))+'</option></select></label>';
  if(k==="o"){
    var cs=live(S.cards);
    if(cs.length)h+='<label class="f">Pagamento<select data-f="cd"><option value="">Pix, débito ou dinheiro</option>'+cs.map(function(c){return '<option value="'+c.id+'"'+(d.cd===c.id?' selected':'')+'>Cartão '+esc(c.name)+'</option>'}).join('')+'</select></label>';
    if(isNew)h+='<label class="f">Parcelas<input type="text" inputmode="numeric" data-f="np" value="'+(d.np>1?d.np:1)+'" autocomplete="off"></label><details class="cmp"><summary>Comparar com pagar à vista</summary><label class="f">Preço à vista (R$)<input type="text" inputmode="decimal" data-f="av" value="'+fin(d.av||0)+'" placeholder="0,00" autocomplete="off"></label></details>';
    if(isNew||cs.length)h+='<p class="note" id="parcHint"></p>';
    if(d.ip)h+='<p class="note">Parcela <b>'+d.in+'/'+d.it+'</b> de uma compra parcelada. Editar aqui altera só esta parcela.</p>';
  }
  if(isNew&&k!=="t")h+='<label class="f chk"><input type="checkbox" data-f="rep"'+(d.rep?' checked':'')+'> Repetir todo mês (dia '+(+d.d.slice(8,10))+')</label>';
  if(d.r)h+='<p class="note">Lançamento gerado por um fixo. Editar aqui altera só este mês; para mudar os próximos, use <b>Fixos</b> em Gastos.</p>';
  h+='<button class="btn full" data-act="txsave">Salvar</button>'+(isNew?'':'<button class="btn danger full" data-act="txdel">'+(d.ip?'Excluir só esta parcela':'Excluir')+'</button>'+(d.ip?'<button class="btn danger full" data-act="txdelnext">Excluir esta e as seguintes</button>':''))+'<button class="btn sec full" data-act="close">Cancelar</button>';
  openSheet(h);parcHint();qpDraw();
}
function parcHint(){
  var el=$("#parcHint");if(!el||sheetKind!=="tx")return;
  var f=fields(),v=parseMoney(f.v),np=Math.max(1,Math.min(48,parseInt(f.np,10)||1)),cd=f.cd?find(S.cards,f.cd):null,av=parseMoney(f.av),h=[];
  if(v>0&&np>1){var P=splitParcelas(v,np);h.push('<b>'+np+'× de '+brl(P[P.length-1])+'</b>'+(P[0]!==P[np-1]?' (a 1ª de '+brl(P[0])+')':'')+'.')}
  if(cd&&f.d&&/^\d{4}-\d{2}-\d{2}$/.test(f.d)){var iv=invoiceOf(f.d,cd.close,cd.due);h.push('Entra na fatura que vence em <b>'+dBR(iv.due)+'</b>'+(np>1?' e segue mês a mês':'')+'.')}
  if(v>0&&np>1){
    var pv=parcelPV(v,np,goalRate());
    h.push('Pagar à vista compensa se o desconto passar de <b>'+pc(1-pv/v,1)+'</b> (preço abaixo de <b>'+brl(Math.round(pv))+'</b>), contra aplicar a <b>'+nf(S.cfg.goalPct,0)+'% do CDI</b> com IR regressivo e 1ª parcela em 30 dias.');
    if(av>0&&av<v){var yr=Math.pow(1+parcelRate(av,v,np),12)-1;h.push(av<=pv?'Com o preço à vista informado, <b>pagar à vista é melhor</b> (economiza '+brl(Math.round(pv-av))+' em valor presente). Juros implícitos do parcelado: <b>'+pc(yr,1)+' a.a.</b>':'Com o preço à vista informado, <b>parcelar e aplicar a diferença é melhor</b> ('+brl(Math.round(av-pv))+' a favor). Juros implícitos do parcelado: <b>'+pc(yr,1)+' a.a.</b>')}
    else if(av>0)h.push('O preço à vista informado não é menor que o parcelado.');
  }
  el.innerHTML=h.join(' ');
}
/* sugestões: lançamentos já feitos com nome parecido (ou os mais usados, com o campo vazio) */
var qpList=[];
function qpDraw(){
  var box=$("#qp");if(!box||!draft)return;var k=draft.k,inp=$('#sheetBody [data-f="n"]'),q=inp?inp.value:"";
  qpList=quickPicks(S.tx.filter(function(t){return !t.x&&t.k===k&&!(t.in>1)}),q,4).filter(function(t){return normTxt(t.n)!==normTxt(q)||!draft.v});
  box.innerHTML=qpList.map(function(t,i){return '<button type="button" class="chip" data-act="qp" data-id="'+i+'"><b>'+esc(t.n)+'</b> '+esc(t.c)+' · '+brl0(t.v)+'</button>'}).join('');
}
function saveTx(){
  readTx();var d=draft;
  if(!(d.v>0)){toast("Informe um valor maior que zero.");return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.d)){toast("Informe a data.");return}
  var card=d.k==="o"&&d.cd?find(S.cards,d.cd):null;if(card&&card.x)card=null;
  var np=(!d.id&&d.k==="o")?Math.max(1,Math.min(48,parseInt(d.np,10)||1)):1,name=d.k==="t"?"":d.n.trim();
  if(np>1&&d.rep){toast("Escolha entre parcelar e repetir todo mês.");return}
  function mk(id,v,date){var o={id:id,k:d.k,v:v,d:date,c:d.k==="t"?"Acerto":d.c,w:d.w,s:d.k==="o"?d.s:0,n:name};if(d.r)o.r=d.r;if(card){o.cd=card.id;o.m=invoiceOf(date,card.close,card.due).m}return o}
  if(np>1){var gid=uid(),P=splitParcelas(d.v,np);for(var i=0;i<np;i++){var o=mk("p"+gid+"_"+(i+1),P[i],addMonths(d.d,i));o.ip=gid;o.in=i+1;o.it=np;upsert(S.tx,o)}}
  else if(!d.id&&d.rep&&d.k!=="t"){
    var o2=mk(uid(),d.v,d.d),rr={id:uid(),k:o2.k,v:o2.v,c:o2.c,w:o2.w,s:o2.s,n:o2.n,day:+d.d.slice(8,10),from:d.d.slice(0,7)};if(card)rr.cd=card.id;
    upsert(S.rec,rr);ensureRec();
  }else{var o3=mk(d.id||uid(),d.v,d.d);if(d.ip){o3.ip=d.ip;o3.in=d.in;o3.it=d.it}upsert(S.tx,o3)}
  save();closeSheet();render();toast(np>1?np+" parcelas lançadas.":"Salvo.");
}

/* ---------- folha: fixos, orçamento ---------- */
function openFixos(){
  var rs=live(S.rec),h='<h3>Lançamentos fixos</h3><p class="note">Entram sozinhos todo mês, já com os próximos 11 meses preenchidos (aluguel, assinaturas, salário). Mudar o valor aqui vale para os meses seguintes ao atual; o que já foi lançado ou editado à mão não muda.</p>';
  if(!rs.length)h+='<p class="empty">Nenhum fixo ainda. Ao lançar algo, marque <b>Repetir todo mês</b>.</p>';
  rs.forEach(function(r){h+='<button class="tx" data-act="recedit" data-id="'+r.id+'"><span class="ico">'+esc((r.c||"?").slice(0,2).toUpperCase())+'</span><span class="grow"><div class="t1">'+esc(r.n||r.c)+'</div><div class="t2"><span>todo dia '+r.day+'</span><span class="badge '+(r.w===0?'a':'b')+'">'+esc(NM(r.w))+'</span></div></span><span class="v '+(r.k==="i"?'pos':'')+'">'+(r.k==="i"?'+':'−')+' '+brl(r.v)+'</span></button>'});
  openSheet(h+'<button class="btn full" data-act="repopen">Replicar lançamentos de '+ymLabel(month)+' nos próximos meses</button><button class="btn sec full" data-act="close">Fechar</button>');sheetKind="fixos";
}
function openCard(c){
  draft=c?clone(c):{id:"",name:"",close:5,due:12,w:ME()};sheetKind="card";
  openSheet('<h3>'+(c?'Editar cartão':'Novo cartão')+'</h3><label class="f">Nome<input type="text" data-f="name" value="'+esc(draft.name)+'" placeholder="ex.: Nubank" autocomplete="off"></label><div class="grid2"><label class="f">Dia do fechamento<input type="text" inputmode="numeric" data-f="close" value="'+draft.close+'"></label><label class="f">Dia do vencimento<input type="text" inputmode="numeric" data-f="due" value="'+draft.due+'"></label></div><label class="f">De quem é<select data-f="cw"><option value="0"'+(draft.w===0?' selected':'')+'>'+esc(NM(0))+'</option><option value="1"'+(draft.w===1?' selected':'')+'>'+esc(NM(1))+'</option></select></label><p class="note">Compras até o dia do fechamento entram na fatura do mês; as seguintes, na próxima. Mudar os dias vale só para novos lançamentos.</p><button class="btn full" data-act="cardsave">Salvar cartão</button>'+(c?'<button class="btn danger full" data-act="carddel">Excluir cartão</button>':'')+'<button class="btn sec full" data-act="cfg">Voltar aos ajustes</button>');
}
function openRec(id){
  var r=find(S.rec,id);if(!r)return;draft=clone(r);sheetKind="rec";
  var cl=r.k==="i"?INC:S.cfg.cats;
  openSheet('<h3>Editar fixo</h3><label class="f">Valor (R$)<input class="big" type="text" inputmode="decimal" data-f="v" value="'+fin(r.v)+'"></label><label class="f">Descrição<input type="text" data-f="n" value="'+esc(r.n)+'"></label><label class="f">Categoria<select data-f="c">'+opts(cl,r.c)+'</select></label><label class="f">Dia do mês<input type="number" min="1" max="31" data-f="day" value="'+r.day+'"></label>'+segW(r.w,r.k==="i"?"Quem recebe":"Quem paga")
    +(r.k==="o"?'<label class="f">Divisão<select data-f="s"><option value="0"'+(r.s===0?' selected':'')+'>Dividir entre o casal</option><option value="1"'+(r.s===1?' selected':'')+'>Só de '+esc(NM(r.w))+'</option><option value="2"'+(r.s===2?' selected':'')+'>Só de '+esc(NM(1-r.w))+'</option></select></label>':'')
    +'<button class="btn full" data-act="recsave">Salvar</button><button class="btn danger full" data-act="recdel">Parar este fixo</button><button class="btn sec full" data-act="fixos">Voltar</button>');
}
function catKind(c){return (S.cfg.catk||{})[c]||(DIAG_NEEDS.indexOf(c)>=0?"n":DIAG_WANTS.indexOf(c)>=0?"w":"o")}
function openBud(cat){
  draft={cat:cat};sheetKind="bud";var kd=catKind(cat),own=S.cfg.cats.indexOf(cat)>=0;
  openSheet('<h3>Categoria · '+esc(cat)+'</h3><label class="f">Limite do casal (R$ por mês)<input class="big" type="text" inputmode="decimal" data-f="v" value="'+fin(S.bud.v[cat]||0)+'" placeholder="sem limite"></label>'
    +'<label class="f">Tipo no diagnóstico<select data-f="kd"><option value="n"'+(kd==="n"?' selected':'')+'>Essencial (conta nos 50%)</option><option value="w"'+(kd==="w"?' selected':'')+'>Desejo (conta nos 30%)</option><option value="o"'+(kd==="o"?' selected':'')+'>Outro (fora da conta)</option></select></label>'
    +(own?'<label class="f">Nome<input type="text" data-f="nm" value="'+esc(cat)+'" autocomplete="off"></label><p class="note">Renomear troca o nome em todos os lançamentos, fixos e no limite.</p>':'')
    +'<button class="btn full" data-act="budsave">Salvar</button>'+(own?'<button class="btn danger full" data-act="catdel">Excluir categoria</button>':'')+'<button class="btn sec full" data-act="close">Cancelar</button>');
}
function renameCat(a,b){
  var now=Date.now(),i=S.cfg.cats.indexOf(a);if(i>=0)S.cfg.cats[i]=b;
  S.tx.forEach(function(t){if(t.k==="o"&&t.c===a){if(t.r&&t.u===1)t.a=1;t.c=b;t.u=now}});S.rec.forEach(function(r){if(r.k==="o"&&r.c===a){r.c=b;r.u=now}});
  S.bud.t=S.bud.t||{};if(S.bud.v[a]){S.bud.v[b]=S.bud.v[a];S.bud.t[b]=now}S.bud.v[a]=0;S.bud.t[a]=now;
  S.cfg.catk=S.cfg.catk||{};if(S.cfg.catk[a]){S.cfg.catk[b]=S.cfg.catk[a];delete S.cfg.catk[a]}
}


/* ---------- folha: metas ---------- */
function openGoal(g){
  draft=g?clone(g):{id:"",name:"",type:"geral",target:0,base:0,due:ymAdd(today().slice(0,7),12),items:[],margin:10,infl:false};
  if(!draft.items)draft.items=[];sheetKind="goal";drawGoal();
}
function readGoal(){
  var f=fields();draft.name=f.name!=null?f.name:draft.name;if(f.target!=null)draft.target=parseMoney(f.target);draft.base=parseMoney(f.base);draft.due=f.due||"";draft.ev=f.ev||"";
  if(f.margin!=null)draft.margin=parseFloat(String(f.margin).replace(",","."))||0;if(f.infl!=null)draft.infl=f.infl;
  var its=[];$$("#sheetBody [data-it]").forEach(function(r){its.push({n:$("[data-in]",r).value,v:parseMoney($("[data-iv]",r).value)})});if(draft.type==="viagem")draft.items=its;
}
function drawGoal(){
  var d=draft,v=d.type==="viagem",h='<h3>'+(d.id?'Editar meta':'Nova meta')+'</h3><div class="seg"><button type="button" data-act="gtype" data-id="geral" class="'+(!v?'on':'')+'">Meta</button><button type="button" data-act="gtype" data-id="viagem" class="'+(v?'on':'')+'">Viagem</button></div>';
  h+='<label class="f">Nome<input type="text" data-f="name" value="'+esc(d.name)+'" placeholder="'+(v?'ex.: Lua de mel':'ex.: Reserva de emergência')+'" autocomplete="off"></label>';
  if(v){
    h+='<h4>Orçamento da viagem</h4>';
    d.items.forEach(function(i,ix){h+='<div class="row" data-it><input type="text" data-in value="'+esc(i.n)+'" placeholder="Item" style="flex:1.3"><input type="text" inputmode="decimal" data-iv value="'+fin(i.v)+'" placeholder="0,00"><button type="button" class="ghost" data-act="idel" data-id="'+ix+'" aria-label="Remover item">×</button></div>'});
    h+='<button type="button" class="ghost" data-act="iadd">+ Adicionar item</button><label class="f">Margem de segurança (%)<input type="text" inputmode="decimal" data-f="margin" value="'+fnum(d.margin)+'"></label>';
    var sub=d.items.reduce(function(a,i){return a+(i.v||0)},0);h+='<p class="note">Total com margem: <b>'+brl(Math.round(sub*(1+(d.margin||0)/100)))+'</b></p>';
  }else h+='<label class="f">Valor da meta (R$)<input class="big" type="text" inputmode="decimal" data-f="target" value="'+fin(d.target)+'" placeholder="0,00"></label>';
  h+='<label class="f">Prazo (mês)<input type="month" data-f="due" value="'+esc(d.due||"")+'"></label><label class="f">Data do evento ou da viagem (opcional)<input type="date" data-f="ev" value="'+esc(d.ev||"")+'"></label><label class="f">Já guardado hoje (R$)<input type="text" inputmode="decimal" data-f="base" value="'+fin(d.base)+'" placeholder="0,00"></label>';
  h+='<label class="f chk"><input type="checkbox" data-f="infl"'+(d.infl?' checked':'')+'> Corrigir o valor da meta pelo IPCA até o prazo</label>';
  h+='<button class="btn full" data-act="goalsave">Salvar meta</button>'+(d.id?'<button class="btn danger full" data-act="goaldel">Excluir meta</button>':'')+'<button class="btn sec full" data-act="close">Cancelar</button>';
  openSheet(h);
}
function openCont(c){
  var g=find(S.goals,goalId);if(!g)return;
  draft=c?clone(c):{id:"",g:g.id,v:0,d:today(),w:ME(),n:""};sheetKind="cont";
  openSheet('<h3>'+(c?'Editar aporte':'Novo aporte')+' · '+esc(g.name)+'</h3><label class="f">Valor (R$)<input class="big" type="text" inputmode="decimal" data-f="v" value="'+fin(draft.v)+'" placeholder="0,00"></label><label class="f">Data<input type="date" data-f="d" value="'+draft.d+'"></label>'+segW(draft.w,"Quem guardou")+'<label class="f">Observação<input type="text" data-f="n" value="'+esc(draft.n||"")+'"></label><button class="btn full" data-act="contsave">Salvar</button>'+(c?'<button class="btn danger full" data-act="contdel">Excluir aporte</button>':'')+'<button class="btn sec full" data-act="close">Cancelar</button>');
}

/* ---------- folha: ajustes e primeiro uso ---------- */
function openCfg(){
  var c=S.cfg,sy=SY(),st={off:"desligada",idle:"conectada",syncing:"sincronizando…",ok:"sincronizada",err:"com erro"}[sync.st]||"";
  sheetKind="cfg";
  openSheet('<h3>Ajustes</h3><h4>Casal</h4><div class="grid2"><label class="f">Nome 1<input type="text" data-f="n0" value="'+esc(c.names[0])+'"></label><label class="f">Nome 2<input type="text" data-f="n1" value="'+esc(c.names[1])+'"></label></div>'
    +'<label class="f">Quem usa este aparelho<select data-f="me"><option value="0"'+(ME()===0?' selected':'')+'>'+esc(c.names[0])+'</option><option value="1"'+(ME()===1?' selected':'')+'>'+esc(c.names[1])+'</option></select></label>'
    +'<div class="grid2"><label class="f">Divisão: '+esc(c.names[0])+' paga (%)<input type="text" inputmode="decimal" data-f="split" value="'+fnum(c.split)+'"></label><label class="f">Meta de poupança (% da renda)<input type="text" inputmode="decimal" data-f="save" value="'+fnum(c.saveTarget)+'"></label></div>'
    +'<p class="note">A divisão pode ser 50/50 ou proporcional à renda de cada um. Vale para despesas marcadas como "dividir entre o casal".</p>'
    +'<h4>Premissas de juros</h4><div class="grid2"><label class="f">CDI (% a.a.)<input type="text" inputmode="decimal" data-f="cdi" value="'+fnum(c.cdi)+'"></label><label class="f">IPCA (% a.a.)<input type="text" inputmode="decimal" data-f="infl" value="'+fnum(c.infl)+'"></label><label class="f">Cenários ± (p.p.)<input type="text" inputmode="decimal" data-f="spread" value="'+fnum(c.spread)+'"></label><label class="f">Metas: % do CDI<input type="text" inputmode="decimal" data-f="gpct" value="'+fnum(c.goalPct)+'"></label></div>'
    +'<p class="note">Referência em nov/2026: Selic meta de 13,75% a.a. (set/2026; confira a decisão mais recente do Copom), CDI ≈ Selic − 0,10 p.p. e IPCA 12 meses em torno de 4,5%. Atualize quando mudar.</p>'
    +'<h4>Categorias</h4><div class="chips">'+S.cfg.cats.map(function(c){return '<button type="button" class="chip" data-act="cated" data-id="'+esc(c)+'">'+esc(c)+' <small>'+({n:"essencial",w:"desejo",o:"outro"})[catKind(c)]+'</small></button>'}).join('')+'</div><p class="note">Toque para renomear, excluir, definir o limite ou marcar como essencial ou desejo.</p>'
    +'<label class="f">Nova categoria de gasto<input type="text" data-f="newcat" placeholder="ex.: Pets"></label>'
    +'<h4>Aparência</h4><div class="seg"><button type="button" data-act="theme" data-id="auto">Auto</button><button type="button" data-act="theme" data-id="dark">Escuro</button><button type="button" data-act="theme" data-id="light">Claro</button></div>'
    +'<h4>Acesso</h4><p class="note">Usuário: <b>'+esc(AU().n||"")+'</b>. Bloquear o app depois de ficar fora dele por:</p><div class="seg">'+[[0,"Ao sair"],[1,"1 min"],[5,"5 min"],[15,"15 min"]].map(function(o){var m=AU().m==null?5:AU().m;return '<button type="button" data-act="lockmin" data-id="'+o[0]+'"'+(m===o[0]?' class="on"':'')+'>'+o[1]+'</button>'}).join('')+'</div><div class="grid2"><button class="btn sec" data-act="lock">Bloquear agora</button><button class="btn sec" data-act="pinchg">Alterar PIN</button></div>'
    +'<h4>Cartões de crédito</h4>'+(live(S.cards).map(function(c){return '<button class="tx" data-act="cardedit" data-id="'+c.id+'"><span class="ico">CC</span><span class="grow"><div class="t1">'+esc(c.name)+'</div><div class="t2"><span>fecha dia '+c.close+' · vence dia '+c.due+'</span><span class="badge '+(c.w===0?'a':'b')+'">'+esc(NM(c.w))+'</span></div></span></button>'}).join('')||'<p class="note">Nenhum cartão. Cadastre para lançar compras na fatura certa.</p>')+'<button type="button" class="ghost" data-act="cardnew">+ Novo cartão</button>'
    +'<h4>Sincronização entre aparelhos ('+st+')</h4><label class="f">Link do Google Apps Script<input type="text" data-f="api" value="'+esc(sy.api||"")+'" placeholder="https://script.google.com/macros/s/.../exec"></label><div class="grid2"><label class="f">Código do casal<input type="text" data-f="sid" value="'+esc(sy.id||"")+'" placeholder="ex.: nossocasal"></label><label class="f">PIN (4+)<input type="password" data-f="pin" value="'+esc(sy.pin||"")+'"></label></div>'
    +(sync.block&&sync.err?'<p class="note" style="color:var(--fg)"><b>Sincronização pausada.</b> '+esc(sync.err)+'</p>':'')+'<label class="f">Senha de criptografia (8+ caracteres)<input type="password" data-f="epw" autocomplete="new-password" placeholder="'+(sy.k?'ativa · em branco mantém a atual':'recomendada')+'"></label>'
    +'<p class="note">'+(sy.k?'<b>Criptografia ativa.</b> ':'')+'Com essa senha os dados saem do aparelho já embaralhados (AES-256) e a planilha guarda só texto ilegível. Use a mesma senha nos dois celulares. Ela não é o PIN e não tem recuperação: se esquecer, os dados continuam nos aparelhos e basta definir uma senha nova nos dois.'+(sy.k?' <button type="button" class="ghost" data-act="e2eoff">Remover criptografia</button>':'')+'</p>'
    +'<p class="note">Sem o link, tudo fica só neste aparelho. Passo a passo no README do repositório.</p>'
    +'<button class="btn full" data-act="cfgsave">Salvar ajustes</button><div class="grid2"><button class="btn sec" data-act="export">Exportar backup</button><button class="btn sec" data-act="import">Importar backup</button></div><button class="btn sec full" data-act="csv">Exportar planilha (CSV)</button><button class="btn danger full" data-act="wipe">Apagar dados deste aparelho</button><button class="btn sec full" data-act="close">Fechar</button>');
}
function openWelcome(){
  sheetKind="welcome";
  openSheet('<h3>Bem-vindos ao Joint</h3><p class="note">Controle de gastos, metas e simulador de investimento para o casal. Confirme os nomes e quem está neste aparelho.</p><div class="grid2"><label class="f">Nome 1<input type="text" data-f="n0" value="'+(S.cfg.names[0]==="Pessoa 1"?"":esc(S.cfg.names[0]))+'" placeholder="Pessoa 1"></label><label class="f">Nome 2<input type="text" data-f="n1" value="'+(S.cfg.names[1]==="Pessoa 2"?"":esc(S.cfg.names[1]))+'" placeholder="Pessoa 2"></label></div><label class="f">Quem usa este aparelho<select data-f="me"><option value="0">Nome 1</option><option value="1">Nome 2</option></select></label><button class="btn full" data-act="welcomesave">Começar</button>');
}

