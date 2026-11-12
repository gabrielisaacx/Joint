/* ---------- importar fatura em PDF ----------
   O PDF é lido no próprio aparelho (pdf.js, servido junto com o app em vendor/); nada da fatura é enviado para fora.
   Fluxo: arquivo -> linhas de texto -> parseFatura (core) -> tela de revisão -> lançamentos.
   Ids são derivados do conteúdo (cartão, data, nome, valor), então importar a mesma fatura duas vezes não duplica. */
var imp=null,impBuf=null;
function loadPdfLib(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  return new Promise(function(ok,no){var s=document.createElement("script");s.src="vendor/pdf.min.js";
    s.onload=function(){if(!window.pdfjsLib){no(new Error("LIB"));return}window.pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.js";ok(window.pdfjsLib)};
    s.onerror=function(){no(new Error("LIB"))};document.head.appendChild(s)});
}
function pdfPageLines(items){   /* junta os trechos de texto da mesma linha (mesma altura) e ordena da esquerda para a direita */
  var rows=[];
  items.forEach(function(it){if(!it.str||!it.str.trim())return;var x=it.transform[4],y=it.transform[5],r=null;
    for(var i=0;i<rows.length;i++)if(Math.abs(rows[i].y-y)<3){r=rows[i];break}
    if(!r){r={y:y,p:[]};rows.push(r)}r.p.push({x:x,s:it.str})});
  rows.sort(function(a,b){return b.y-a.y});
  return rows.map(function(r){return r.p.sort(function(a,b){return a.x-b.x}).map(function(p){return p.s}).join(" ").replace(/\s+/g," ").trim()});
}
function pdfLines(buf,pw){
  return loadPdfLib().then(function(lib){return lib.getDocument({data:new Uint8Array(buf.slice(0)),password:pw||undefined}).promise}).then(function(doc){
    var out=[],i=1;
    function next(){if(i>doc.numPages)return out;return doc.getPage(i++).then(function(pg){return pg.getTextContent()}).then(function(tc){out=out.concat(pdfPageLines(tc.items));return next()})}
    return next();
  });
}
function impFile(file){
  if(!file)return;if(file.size>15e6){toast("Arquivo grande demais para uma fatura.");return}
  var rd=new FileReader();rd.onload=function(){impBuf=rd.result;impRead("")};rd.onerror=function(){toast("Não consegui abrir o arquivo.")};rd.readAsArrayBuffer(file);
}
function impRead(pw){
  toast("Lendo a fatura…");
  pdfLines(impBuf,pw).then(function(lines){
    var inv=parseFatura(lines,today());
    if(!inv.items.length){impBuf=null;sheetKind="imp0";openSheet('<h3>Não encontrei lançamentos</h3><p class="note">O arquivo abriu, mas não reconheci linhas de compra. Isso acontece com fatura escaneada (imagem) ou com um formato de banco que ainda não conheço. Hoje o leitor está ajustado para o Nubank e tenta um formato genérico (dd/mm, descrição, valor) para os demais.</p><button class="btn sec full" data-act="close">Fechar</button>');return}
    impOpen(inv);
  }).catch(function(e){
    var nm=e&&e.name,msg=String(e&&e.message||e);
    if(nm==="PasswordException"){sheetKind="imppw";openSheet('<h3>PDF protegido</h3><p class="note">'+(pw?'Senha incorreta. ':'')+'Esta fatura abre com senha (alguns bancos usam dígitos do CPF). A senha é usada só aqui, para abrir o arquivo, e não fica guardada.</p><label class="f">Senha do PDF<input type="password" data-f="ppw" autocomplete="off"></label><button class="btn full" data-act="imppw">Abrir</button><button class="btn sec full" data-act="close">Cancelar</button>');return}
    impBuf=null;toast(msg==="LIB"?"Não consegui carregar o leitor de PDF. Confira a conexão e tente de novo.":"Não consegui ler este PDF.");
  });
}
function impCat(n){   /* primeiro o histórico do casal com o mesmo nome; depois palavras-chave */
  var k=normTxt(n),best=null;S.tx.forEach(function(t){if(!t.x&&t.k==="o"&&normTxt(t.n)===k&&(!best||t.d>best.d))best=t});
  return best&&S.cfg.cats.indexOf(best.c)>=0?best.c:guessCat(n,S.cfg.cats);
}
function impOpen(inv){
  var cur=today().slice(0,7),m=inv.due?inv.due.slice(0,7):cur,occ={},cards=live(S.cards),cd="";
  cards.forEach(function(c){if(!cd&&inv.bank&&normTxt(c.name).indexOf(normTxt(inv.bank))>=0)cd=c.id});
  if(!cd)cd=inv.bank&&inv.close&&inv.dueDay?"new":(cards[0]?cards[0].id:"");
  var rows=[];
  inv.items.forEach(function(it){
    if(it.kind==="can")return;
    var r={d:it.d,n:it.n,v:it.v,kind:it.kind,card4:it.card4,sel:true,s:1,c:impCat(it.n),tag:""};
    if(it["in"]){r["in"]=it["in"];r.it=it.it;var st=ymAdd(m,-(it["in"]-1)),gk=[normTxt(it.n),it.it,st].join("|"),go=occ[gk+"#"+it["in"]]=(occ[gk+"#"+it["in"]]||0)+1;r.gid="f"+hash32(gk+"|"+go);r.id="p"+r.gid+"_"+it["in"]}
    else{var key=[it.kind,it.card4,it.d,normTxt(it.n),it.v].join("|"),o=occ[key]=(occ[key]||0)+1;r.id="i"+hash32(key+"|"+o)}
    if(it.kind==="ref"){r.n="Estorno: "+(it.ref||it.n);r.sel=false;r.tag="estorno, entra como receita"}
    if(it.kind==="fin")r.tag="Pix ou financiamento no crédito";
    var ex=find(S.tx,r.id);
    if(ex&&!ex.x){r.sel=false;r.lock=true;r.tag="já lançado"}
    else if(ex&&ex.x){r.sel=false;r.tag="excluído antes"}
    else if(it.kind!=="ref"&&S.tx.some(function(t){return !t.x&&t.k==="o"&&t.v===it.v&&(it["in"]?(t["in"]===it["in"]&&t.it===it.it&&tm(t)===m):Math.abs(dayDiff(t.d,it.d))<=1)})){r.sel=false;r.tag="possível duplicado"}
    rows.push(r);
  });
  imp={inv:inv,rows:rows,m:m,cd:cd,w:ME(),fut:true,can:inv.items.filter(function(i){return i.kind==="can"}).length/2};
  sheetKind="imp";impDraw();
}
function impSum(){var n=0,s=0;imp.rows.forEach(function(r){if(r.sel){n++;s+=r.kind==="ref"?-r.v:r.v}});return {n:n,s:s}}
function impDraw(){
  var I=imp,inv=I.inv,cards=live(S.cards),sm=impSum();
  var h='<h3>Importar fatura'+(inv.bank?' · '+esc(inv.bank):'')+'</h3><p class="note">'+(inv.due?'Vence em <b>'+dBR(inv.due)+'</b>. ':'')+'Li <b>'+I.rows.length+'</b> lançamentos'+'. Confira antes de lançar: nada entra sem você confirmar.</p>';
  if(inv.generic)h+='<p class="note"><b>Leitura genérica.</b> Não reconheci o banco, então usei o formato dd/mm, descrição e valor. Confira com mais atenção.</p>';
  h+='<div class="grid2"><label class="f">Cartão<select data-f="icd">'+(inv.bank&&inv.close&&inv.dueDay?'<option value="new"'+(I.cd==="new"?' selected':'')+'>Novo: '+esc(inv.bank)+' (fecha '+inv.close+', vence '+inv.dueDay+')</option>':'')+cards.map(function(c){return '<option value="'+c.id+'"'+(I.cd===c.id?' selected':'')+'>'+esc(c.name)+'</option>'}).join('')+'<option value=""'+(I.cd===""?' selected':'')+'>Sem cartão</option></select></label>'
    +'<label class="f">Fatura de (mês)<input type="month" data-f="im" value="'+esc(I.m)+'"></label></div>'
    +'<div class="grid2"><label class="f">Quem pagou<select data-f="iw"><option value="0"'+(I.w===0?' selected':'')+'>'+esc(NM(0))+'</option><option value="1"'+(I.w===1?' selected':'')+'>'+esc(NM(1))+'</option></select></label>'
    +'<label class="f">Divisão de todos<select data-f="is"><option value="">manter</option><option value="1">Só de quem pagou</option><option value="0">Dividir entre o casal</option></select></label></div>'
    +'<label class="f chk"><input type="checkbox" data-f="ifut"'+(I.fut?' checked':'')+'> Lançar também as parcelas que ainda vão vencer</label>'
    +'<div class="row sp"><p class="note" id="impsum"></p><span class="row" style="gap:6px"><button class="ghost" data-act="impall" data-id="1">Todos</button><button class="ghost" data-act="impall" data-id="0">Nenhum</button></span></div>';
  I.rows.forEach(function(r,i){
    h+='<div class="improw'+(r.lock?' off':'')+'"><label class="f chk"><input type="checkbox" data-imp="'+i+'"'+(r.sel?' checked':'')+(r.lock?' disabled':'')+'><span class="grow"><b>'+esc(r.n)+'</b><small>'+r.d.slice(8,10)+'/'+r.d.slice(5,7)+(r["in"]?' · parcela '+r["in"]+'/'+r.it:'')+(r.card4?' · final '+esc(r.card4):'')+(r.tag?' · <u>'+esc(r.tag)+'</u>':'')+'</small></span><b class="v">'+(r.kind==="ref"?'+ ':'')+brl(r.v)+'</b></label>'
      +(r.lock||r.kind==="ref"?'':'<div class="grid2"><select data-impc="'+i+'" aria-label="Categoria">'+opts(S.cfg.cats,r.c)+'</select><select data-imps="'+i+'" aria-label="Divisão"><option value="1"'+(r.s===1?' selected':'')+'>Só de quem pagou</option><option value="0"'+(r.s===0?' selected':'')+'>Dividir no casal</option><option value="2"'+(r.s===2?' selected':'')+'>Só do outro</option></select></div>')+'</div>';
  });
  h+='<p class="note">Ficaram de fora: '+inv.pay+' pagamentos da própria fatura'+(I.can?' e '+I.can+(I.can===1?' compra estornada':' compras estornadas')+' na mesma fatura':'')+'. Itens marcados como "possível duplicado" têm um lançamento de mesmo valor em data próxima.</p>'
    +'<button class="btn full" data-act="impgo">Lançar selecionados</button><button class="btn sec full" data-act="close">Cancelar</button>';
  openSheet(h);impUpd();
}
function impUpd(){var s=impSum(),e=$("#impsum");if(e)e.innerHTML='<b>'+s.n+'</b> selecionados · <b>'+brl(s.s)+'</b>'}
function impChange(e){
  var d=e.dataset,I=imp;if(!I)return;
  if(d.imp!=null){I.rows[+d.imp].sel=e.checked;impUpd()}
  else if(d.impc!=null){var r=I.rows[+d.impc],k=normTxt(r.n);r.c=e.value;I.rows.forEach(function(o,i){if(o!==r&&normTxt(o.n)===k&&!o.lock){o.c=e.value;var s=$('#sheetBody [data-impc="'+i+'"]');if(s)s.value=e.value}})}   /* mesma loja: mesma categoria */
  else if(d.imps!=null)I.rows[+d.imps].s=+e.value;
  else if(d.f==="icd")I.cd=e.value;
  else if(d.f==="iw")I.w=+e.value;
  else if(d.f==="im"){if(/^\d{4}-\d{2}$/.test(e.value))I.m=e.value}
  else if(d.f==="ifut")I.fut=e.checked;
  else if(d.f==="is"&&e.value!==""){var v=+e.value;I.rows.forEach(function(o){if(!o.lock)o.s=v});var sc=$("#sheetBody").scrollTop;impDraw();$("#sheetBody").scrollTop=sc}
}
function impGo(){
  var I=imp,inv=I.inv,sel=I.rows.filter(function(r){return r.sel&&!r.lock});
  if(!sel.length){toast("Marque ao menos um lançamento.");return}
  var card=null;
  if(I.cd==="new"){card={id:uid(),name:inv.bank||"Cartão",close:Math.min(28,inv.close||1),due:Math.min(28,inv.dueDay||10),w:I.w};upsert(S.cards,card)}
  else if(I.cd)card=find(S.cards,I.cd);
  var n=0,fut=0,incCat=INC.indexOf("Outros")>=0?"Outros":INC[0];
  sel.forEach(function(r){
    var o={id:r.id,k:r.kind==="ref"?"i":"o",v:r.v,d:r.d,c:r.kind==="ref"?incCat:r.c,w:I.w,s:r.kind==="ref"?0:r.s,n:r.n,m:I.m};
    if(card&&o.k==="o")o.cd=card.id;
    if(r["in"]){o.ip=r.gid;o["in"]=r["in"];o.it=r.it}
    upsert(S.tx,o);n++;
    if(r["in"]&&I.fut)for(var k=r["in"]+1;k<=r.it;k++){var id="p"+r.gid+"_"+k;if(find(S.tx,id))continue;
      var f={id:id,k:"o",v:r.v,d:addMonths(r.d,k-r["in"]),c:r.c,w:I.w,s:r.s,n:r.n,m:ymAdd(I.m,k-r["in"]),ip:r.gid,it:r.it};f["in"]=k;if(card)f.cd=card.id;upsert(S.tx,f);fut++}
  });
  imp=null;impBuf=null;month=I.m;tab="gastos";goalId=null;txQ="";save();closeSheet();render();window.scrollTo(0,0);
  toast(n+(n===1?" lançamento importado":" lançamentos importados")+(fut?" e "+fut+(fut===1?" parcela futura":" parcelas futuras"):"")+".");
}
