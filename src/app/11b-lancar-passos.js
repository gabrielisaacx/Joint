/* ---------- lançamento em passos (o "+"): categoria -> valor -> dia ----------
   Uma decisão por tela, com toque grande. No fim monta o formulário completo com o rascunho e usa o mesmo saveTx,
   então parcelas, cartão, fixos e sincronização seguem as mesmas regras. "Mais detalhes" abre o formulário completo. */
var CAT_IC={"Moradia":"🏠","Mercado":"🛒","Restaurantes":"🍽️","Transporte":"🚗","Saúde":"💊","Lazer":"🎬","Viagem":"✈️","Assinaturas":"📺","Educação":"📚","Casa":"🛋️","Pessoal":"👕","Presentes":"🎁","Outros":"📦","Salário":"💼","Extra":"💸","Rendimentos":"📈","Pets":"🐾","Diversão":"🎉"};
function catIc(c){return CAT_IC[c]||"🏷️"}
var wz=null;
function openWiz(){draft={id:"",k:"o",v:0,d:today(),c:"",w:ME(),s:0,n:"",rep:false};wz={st:0,cents:""};sheetKind="wiz";wizDraw()}
function wizLeft(){   /* o que sobra: limite da categoria, ou a renda do mês, já descontando o valor digitado */
  var ym=month,sm=summary(ym,-1),v=draft.v||0;
  if(draft.k==="o"&&S.bud.v[draft.c]>0){var lim=S.bud.v[draft.c],sp=sm.cat[draft.c]||0;return {lbl:"restante em "+draft.c,left:lim-sp-v,tot:lim}}
  if(draft.k==="o"&&sm.inc>0)return {lbl:"restante no mês",left:sm.inc-sm.exp-v,tot:sm.inc};
  return null;
}
function wizRing(){
  var r=wizLeft();if(!r)return "";var p=Math.max(0,Math.min(1,r.left/r.tot)),R=46,C=2*Math.PI*R;
  return '<div class="wring"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="'+R+'" class="wr0"/><circle cx="55" cy="55" r="'+R+'" class="wr1'+(r.left<0?' neg':'')+'" stroke-dasharray="'+(C*p).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 55 55)"/></svg><div><b id="wleft"'+(r.left<0?' class="neg"':'')+'>'+brl0(r.left)+'</b><small>'+esc(r.lbl)+'</small></div></div>';
}
function wizHead(t){
  var dots=[0,1,2].map(function(i){return '<i class="'+(i<=wz.st?'on':'')+'"></i>'}).join('');
  return '<div class="row sp">'+(wz.st||wz.sub?'<button class="ghost" data-act="wback" aria-label="Voltar">‹ Voltar</button>':'<span></span>')+'<span class="wdots">'+dots+'</span><button class="ghost" data-act="wfull">Mais detalhes</button></div><h3 class="wtit">'+t+'</h3>';
}
function wizDraw(){
  var h,d=draft;
  if(wz.st===0&&wz.sub){h=wizSubs()}
  else if(wz.st===0){
    var cats=d.k==="i"?INC:S.cfg.cats;
    h=wizHead(d.k==="i"?"De onde veio?":"Com o que foi?")
      +'<div class="seg"><button data-act="wk2" data-id="o"'+(d.k==="o"?' class="on"':'')+'>Despesa</button><button data-act="wk2" data-id="i"'+(d.k==="i"?' class="on"':'')+'>Receita</button></div>'
      +'<div class="wgrid">'+cats.map(function(c){return '<button class="wcat" data-act="wcat" data-id="'+esc(c)+'"><span>'+catIc(c)+'</span>'+esc(c)+'</button>'}).join('')+'</div>';
    var qp=quickPicks(S.tx.filter(function(t){return !t.x&&t.k===d.k&&!(t.in>1)}),"",4);
    if(qp.length){wz.qp=qp;h+='<p class="note">Repetir um recente</p><div class="chips">'+qp.map(function(t,i){return '<button type="button" class="chip" data-act="wqp" data-id="'+i+'"><b>'+esc(t.n||t.c)+'</b> '+brl0(t.v)+'</button>'}).join('')+'</div>'}
  }else if(wz.st===1){
    var sb=subFind(d.n);h=wizHead((sb?subLogo(sb,false):'<span class="wic">'+catIc(d.c)+'</span>')+' '+esc(sb?sb[0]:d.c))+wizRing()
      +'<div class="wval" id="wval">'+brl(d.v||0)+'</div>'
      +'<input type="text" class="wname" data-f="wn" value="'+esc(d.n)+'" placeholder="Descrição (opcional)" autocomplete="off">'
      +'<div class="wpad">'+["1","2","3","4","5","6","7","8","9","00","0","del"].map(function(k){return '<button data-act="wkey" data-id="'+k+'">'+(k==="del"?"⌫":k)+'</button>'}).join('')+'</div>'
      +'<button class="btn full" data-act="wnext"'+(d.v>0?'':' disabled')+' id="wok">Confirmar valor</button>';
  }else{
    var td=+today().slice(8,10),ym=month,cur=today().slice(0,7),nd=dim(ym),sel=d.d.slice(0,7)===ym?+d.d.slice(8,10):0,g='';
    for(var i=1;i<=nd;i++)g+='<button class="wday'+(i===sel?' on':'')+(ym===cur&&i===td?' td':'')+'" data-act="wday" data-id="'+i+'">'+i+'</button>';
    h=wizHead("Qual dia?")+'<p class="note">'+(subFind(d.n)?'':'<span class="wic">'+catIc(d.c)+'</span> ')+esc(d.n||d.c)+' · <b>'+brl(d.v)+'</b> · '+ymLabel(ym)+(d.rep?' · <b>todo mês</b>':'')+'</p><div class="wdays">'+g+'</div>'
      +'<button class="btn sec full" data-act="wday" data-id="'+(ym===cur?td:sel||1)+'">'+(ym===cur?'Hoje':'Dia '+(sel||1))+'</button>';
  }
  openSheet(h);
}
function wizKey(k){
  var c=wz.cents;if(k==="del")c=c.slice(0,-1);else if(c.length<9)c=(c+k).replace(/^0+/,"");
  wz.cents=c;draft.v=+c||0;
  var e=$("#wval");if(e)e.textContent=brl(draft.v);var ok=$("#wok");if(ok)ok.disabled=!(draft.v>0);
  var r=wizLeft(),l=$("#wleft");if(r&&l){var box=l.closest(".wring");box.outerHTML=wizRing()}
}
function wizFinish(){
  sheetKind="tx";drawTx();
  var dd=$('#sheetBody [data-f="d"]');if(dd)dd.value=draft.d;
  saveTx();
}
