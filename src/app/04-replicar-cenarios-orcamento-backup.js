/* ---------- replicar o mês nos próximos ---------- */
function repCands(ym){return monthTx(ym).filter(function(t){return (t.k==="i"||t.k==="o")&&!t.r&&!t.ip})}
function repNudge(){
  var cur=today().slice(0,7),nx=ymAdd(cur,1);
  if(month!==cur||!repCands(cur).length||monthTx(nx).length)return "";
  return '<div class="card"><h4>'+ymTitle(nx)+' está vazio</h4><p class="note">Quer repetir nos próximos meses as receitas e contas que você lançou em '+ymLabel(cur)+'? Você escolhe quais.</p><button class="btn full" data-act="repopen">Replicar '+ymLabel(cur)+'</button></div>';
}
function openRep(){
  var ym=month,ls=repCands(ym).sort(function(a,b){return a.d<b.d?-1:1});sheetKind="rep";
  var h='<h3>Replicar '+ymLabel(ym)+'</h3><p class="note">Marque o que se repete todo mês. Cada item vira um <b>fixo</b> e passa a aparecer nos próximos 12 meses, no mesmo dia. Desmarque gastos que variam (mercado, lazer, transporte). Parcelas já se repetem sozinhas e não aparecem aqui.</p>';
  if(!ls.length){openSheet(h+'<p class="empty">Nada para replicar neste mês.</p><button class="btn sec full" data-act="close">Fechar</button>');return}
  ls.forEach(function(t){h+='<label class="f chk"><input type="checkbox" data-rep="'+t.id+'" checked> <span>'+(+t.d.slice(8,10))+' · '+esc(t.n||t.c)+' · '+esc(t.c)+' · <b>'+(t.k==="i"?'+':'−')+' '+brl(t.v)+'</b></span></label>'});
  openSheet(h+'<div class="grid2"><button class="btn sec" data-act="repall" data-id="1">Marcar todos</button><button class="btn sec" data-act="repall" data-id="0">Desmarcar todos</button></div><button class="btn full" data-act="repgo">Replicar selecionados</button><button class="btn sec full" data-act="close">Cancelar</button>');
}
function repGo(){
  var ym=month,ids=$$("#sheetBody [data-rep]").filter(function(i){return i.checked}).map(function(i){return i.dataset.rep}),n=0,sk=0;
  ids.forEach(function(id){
    var t=find(S.tx,id);if(!t||t.x)return;
    var dup=live(S.rec).some(function(r){return r.k===t.k&&r.c===t.c&&(r.n||"")===(t.n||"")&&r.v===t.v&&r.w===t.w});
    if(dup){sk++;return}
    var rr={id:"x"+t.id,k:t.k,v:t.v,c:t.c,w:t.w,s:t.s||0,n:t.n||"",day:+t.d.slice(8,10),from:ymAdd(ym,1)};   /* id derivado do lançamento: se os dois replicarem o mesmo item, vira um fixo só */if(t.cd)rr.cd=t.cd;
    upsert(S.rec,rr);t.r=rr.id;t.u=Date.now();n++;   /* o lançamento original passa a contar como fixo (projeção e diagnóstico) */
  });
  if(!ids.length){toast("Marque ao menos um item.");return}
  ensureRec();save();closeSheet();render();toast(n+(n===1?" fixo criado":" fixos criados")+(sk?" ("+sk+" já existia"+(sk>1?"m":"")+")":"")+".");
}

/* ---------- cenário "e se" ---------- */
function closedAvg(){   /* médias dos até 3 últimos meses fechados com gasto (casal) */
  var cur=today().slice(0,7),ms=monthsSeen().filter(function(m){return m<cur&&summary(m,-1).exp>0}).slice(-3),base=ms.length?ms:[cur];
  var o={n:ms.length,inc:0,exp:0,cat:{},fix:{}};
  base.forEach(function(m){var sm=summary(m,-1);o.inc+=sm.inc;o.exp+=sm.exp;for(var k in sm.cat)o.cat[k]=(o.cat[k]||0)+sm.cat[k];
    monthTx(m).forEach(function(t){if(t.k==="o"&&(t.r||t.ip))o.fix[t.c]=(o.fix[t.c]||0)+t.v})});
  var d=base.length;o.inc=Math.round(o.inc/d);o.exp=Math.round(o.exp/d);for(var k in o.cat)o.cat[k]=Math.round(o.cat[k]/d);for(k in o.fix)o.fix[k]=Math.round(o.fix[k]/d);
  return o;
}
function openIf(){
  var a=closedAvg(),sv=Math.max(0,a.inc-a.exp),wants=0;for(var k in a.cat)if(catKind(k)==="w")wants+=a.cat[k];
  sheetKind="wif";
  var h='<h3>E se…</h3><p class="note">Veja em quantos meses cada meta fecha se vocês guardarem mais por mês.</p>'
    +'<div class="grid2"><label class="f">Guardam hoje (R$/mês)<input type="text" inputmode="decimal" data-f="wm" value="'+fin(sv)+'" placeholder="0,00" autocomplete="off"></label><label class="f">A mais por mês (R$)<input type="text" inputmode="decimal" data-f="wx" value="" placeholder="0,00" autocomplete="off"></label></div>'
    +'<p class="note">"Guardam hoje" veio da sobra média '+(a.n?'dos '+a.n+(a.n>1?' últimos meses fechados':' último mês fechado'):'do mês atual (ainda sem mês fechado)')+'. Pode ajustar.</p>';
  if(wants>0)h+='<div class="chips"><button type="button" class="chip" data-act="wifx" data-id="'+Math.round(wants*.1)+'">Cortar 10% dos desejos · '+brl0(wants*.1)+'</button><button type="button" class="chip" data-act="wifx" data-id="'+Math.round(wants*.2)+'">Cortar 20% · '+brl0(wants*.2)+'</button></div>';
  h+='<div id="wifo"></div><p class="note">Cada linha supõe todo o valor mensal indo para aquela meta, rendendo '+pc(goalRate(),2)+' ao ano com IR regressivo (mesma premissa das metas). "Todas" junta as metas numa conta só.</p><button class="btn sec full" data-act="close">Fechar</button>';
  openSheet(h);wifOut();
}
function wifOut(){
  var box=$("#wifo");if(!box)return;var f=fields(),m=parseMoney(f.wm),x=parseMoney(f.wx);
  var gs=live(S.goals).map(function(g){var n=goalNeed(g);return {name:g.name,target:n.tn,saved:n.sv}}).filter(function(g){return g.target>0});
  if(!gs.length){box.innerHTML='<p class="empty">Crie uma meta na aba Metas para simular aqui.</p>';return}
  var r=whatIf(gs,m,x,goalRate()),ml=function(v){return v===null?'não chega':v===0?'pronta':mLabel(v)};
  function row(nm,o){var gain=o.m0!==null&&o.m1!==null?o.m0-o.m1:0;return '<div class="card" style="gap:4px"><div class="row sp"><b>'+esc(nm)+'</b><span class="note">faltam '+brl0(o.left)+'</span></div><div class="row sp"><span class="note">Hoje: <b>'+ml(o.m0)+'</b></span>'+(x>0?'<span class="note">Com mais '+brl0(x)+': <b>'+ml(o.m1)+'</b>'+(gain>0?' <span class="badge">−'+mLabel(gain)+'</span>':o.m0===null&&o.m1!==null?' <span class="badge">passa a fechar</span>':'')+'</span>':'')+'</div></div>'}
  box.innerHTML=r.rows.map(function(o){return row(o.name,o)}).join('')+(r.total?row("Todas as metas",r.total):'');
}
/* ---------- orçamento sugerido ---------- */
function openSug(){
  var a=closedAvg(),r=suggestBudget(a.cat,a.fix,a.inc,S.cfg.saveTarget),cats=Object.keys(r.lim).sort(function(x,y){return r.lim[y]-r.lim[x]});
  sheetKind="sug";draft={lim:r.lim};
  var h='<h3>Limites sugeridos</h3>';
  if(!cats.length){openSheet(h+'<p class="empty">Ainda não há gastos para basear a sugestão.</p><button class="btn sec full" data-act="close">Fechar</button>');return}
  h+='<p class="note">Base: média por categoria '+(a.n?'dos '+a.n+(a.n>1?' últimos meses fechados':' último mês fechado'):'do mês atual (ainda sem mês fechado)')+'. Renda média '+brl0(a.inc)+', meta de poupança '+S.cfg.saveTarget+'%, então o teto de gastos é <b>'+brl0(r.allowed)+'</b>.</p>';
  h+='<p class="note">'+(a.inc<=0?'Sem renda lançada: usei a média de cada categoria como limite.':r.factor>=1?'A média de vocês ('+brl0(r.avg)+') já cabe no teto: cada limite é a própria média, arredondada para cima.':r.feasible?'A média ('+brl0(r.avg)+') passa do teto. Mantive fixos e parcelas e reduzi a parte variável de cada categoria em <b>'+pc(1-r.factor)+'</b>.':'Só os fixos e parcelas já passam do teto. Os limites abaixo zeram a parte variável; o caminho é rever os fixos ou a meta de poupança.')+'</p>';
  cats.forEach(function(c){h+='<div class="row sp"><span>'+esc(c)+' <small class="note">média '+brl0(a.cat[c])+'</small></span><b>'+brl0(r.lim[c])+'</b></div>'});
  h+='<div class="row sp"><span><b>Total</b></span><b>'+brl0(r.total)+'</b></div><p class="note">Aplicar substitui os limites dessas categorias. Dá para ajustar cada um depois.</p><button class="btn full" data-act="sugok">Aplicar limites</button><button class="btn sec full" data-act="close">Cancelar</button>';
  openSheet(h);
}
/* ---------- exportar CSV e lembrete de backup ---------- */
function dl(name,type,txt){var b=new Blob([txt],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function csvText(){
  var q=function(v){v=String(v==null?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'},rows=[["Data","Tipo","Descrição","Categoria","Valor","Quem","Divisão","Cartão","Parcela","Fixo","Mês de competência"].map(q).join(";")];
  live(S.tx).slice().sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0}).forEach(function(t){
    rows.push([dBR(t.d),t.k==="i"?"Receita":t.k==="o"?"Despesa":"Acerto",t.n||"",t.k==="t"?"":t.c,(t.v/100).toFixed(2).replace(".",","),NM(t.w),t.k==="o"?(t.s===0?"Casal":"Só "+NM(t.s===1?t.w:1-t.w)):"",t.cd?cardName(t.cd):"",t.ip?t.in+"/"+t.it:"",t.r?"Sim":"",tm(t)].map(q).join(";"))});
  return "\ufeff"+rows.join("\r\n");   /* BOM + ponto e vírgula + vírgula decimal: abre direto no Excel e no Google Sheets em português */
}
function exportCsv(){dl("joint-lancamentos-"+today()+".csv","text/csv;charset=utf-8",csvText());toast("Planilha exportada.")}
function backupNudge(){
  if(sync.st!=="off"||month!==today().slice(0,7))return "";
  var n=0;S.tx.forEach(function(t){if(!t.x&&!(t.r&&t.u===1))n++});if(n<10)return "";
  var g=function(k){return +localStorage.getItem(k)||0},last=g("joint.bkp"),D=86400000;
  if(Date.now()-last<30*D||Date.now()-g("joint.bkps")<7*D)return "";
  return '<div class="card"><h4>Backup</h4><p class="note">'+(last?'Último backup há '+Math.floor((Date.now()-last)/D)+' dias.':'Vocês ainda não fizeram backup.')+' Os dados ficam só neste aparelho: se ele quebrar ou o navegador limpar os dados, perde tudo.</p><div class="grid2"><button class="btn" data-act="export">Fazer backup</button><button class="btn sec" data-act="bksnooze">Agora não</button></div></div>';
}

