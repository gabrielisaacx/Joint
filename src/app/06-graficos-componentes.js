/* ---------- ícones ---------- */
var IC={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',plus:'<path d="M12 5v14M5 12h14"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',back:'<path d="M15 18l-6-6 6-6"/>',next:'<path d="M9 18l6-6-6-6"/>'};
function ic(n){return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>'}

/* ---------- gráficos: evolução, ritmo, média por categoria, histórico da nota ---------- */
var trendSel=null;
function kfmt(c){var v=c/100,a=Math.abs(v),sg=v<0?"−":"";return sg+(a>=1000?nf(a/1000,a>=10000?0:1)+"k":nf(a,0))}
function catAvg(ym,who){   /* média por categoria dos até 3 meses anteriores com gasto */
  var ms=monthsSeen().filter(function(m){return m<ym&&summary(m,who).exp>0}).slice(-3),o={};if(!ms.length)return null;
  ms.forEach(function(m){var c=summary(m,who).cat;for(var k in c)o[k]=(o[k]||0)+c[k]});for(var k in o)o[k]=Math.round(o[k]/ms.length);
  o._n=ms.length;return o;
}
function trendCard(){
  var cur=today().slice(0,7),ms=[],i,mx=0,any=0;
  for(i=-3;i<=2;i++){var m=ymAdd(cur,i),sm=summary(m,-1);ms.push({m:m,inc:sm.inc,exp:sm.exp,fut:m>cur});mx=Math.max(mx,sm.inc,sm.exp);if(sm.inc||sm.exp)any++}
  if(!any)return "";
  var W=360,H=170,L=6,R=6,T=10,B=44,pw=W-L-R,ph=H-T-B,gw=pw/6,bw=16,top=mx*1.08||1,sel=trendSel&&ms.some(function(x){return x.m===trendSel})?trendSel:month;
  if(!ms.some(function(x){return x.m===sel}))sel=cur;
  function Y(v){return T+ph*(1-v/top)}
  function bar(x,v,cls,o){if(!(v>0))return "";var y=Y(v),h=T+ph-y,r=Math.min(4,h);return '<path class="'+cls+'"'+(o?' opacity=".45"':'')+' d="M'+x+' '+(T+ph)+'V'+(y+r).toFixed(1)+'q0 -'+r+' '+r+' -'+r+'h'+(bw-2*r)+'q'+r+' 0 '+r+' '+r+'V'+(T+ph)+'z"/>'}
  var g='<line class="gridl" x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'"/>',pick=null;
  ms.forEach(function(x,k){
    var cx=L+gw*k+gw/2,sv=x.inc-x.exp,on=x.m===sel;if(on)pick=x;
    if(on)g+='<rect x="'+(cx-gw/2+2)+'" y="'+(T-6)+'" width="'+(gw-4)+'" height="'+(H-T+2)+'" rx="10" fill="var(--tint3)"/>';
    g+=bar(cx-bw-1,x.inc,"tb-i",x.fut)+bar(cx+1,x.exp,"tb-e",x.fut);
    g+='<text class="axt" x="'+cx+'" y="'+(T+ph+16)+'" text-anchor="middle"'+(on?' style="fill:var(--fg);font-weight:800"':'')+'>'+MESC[+x.m.slice(5,7)-1]+'</text>';
    if(x.inc||x.exp)g+='<text class="axt" x="'+cx+'" y="'+(T+ph+31)+'" text-anchor="middle" style="fill:var(--fg)">'+(sv>=0?"+":"")+kfmt(sv)+'</text>';
    g+='<rect data-act="trend" data-id="'+x.m+'" x="'+(cx-gw/2)+'" y="0" width="'+gw+'" height="'+H+'" fill="transparent" style="cursor:pointer"/>';
  });
  var h='<div class="legendrow"><span><i class="sq i"></i>Receita</span><span><i class="sq e"></i>Despesa</span><span>número = sobra · claro = planejado</span></div>';
  h+='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Receita e despesa por mês, com a sobra abaixo de cada mês">'+g+'</svg>';
  if(pick)h+='<div class="row sp"><p class="note" style="color:var(--fg)"><b>'+ymTitle(pick.m)+(pick.fut?' (planejado)':'')+'</b><br>Receita '+brl0(pick.inc)+' · Despesa '+brl0(pick.exp)+' · Sobra <b class="'+(pick.inc-pick.exp<0?'neg':'pos')+'">'+brl0(pick.inc-pick.exp)+'</b></p><button class="ghost" data-act="gotom" data-id="'+pick.m+'">Abrir</button></div>';
  return h;
}
function cumDays(ym,upto){
  var n=dim(ym),a=[],i;for(i=0;i<=n;i++)a.push(0);
  monthTx(ym).forEach(function(t){if(t.k!=="o")return;var d=t.d.slice(0,7)===ym?+t.d.slice(8,10):1;a[Math.min(n,d)]+=t.v});
  for(i=1;i<=n;i++)a[i]+=a[i-1];return a.slice(0,(upto||n)+1);
}
var paceData=null,chartTab="evo";
function chartsCard(){   /* um cartão só, com alternância, para a Home não ficar comprida */
  var a=trendCard(),b=paceCard();if(!a&&!b)return "";
  var t=chartTab==="pace"&&b?"pace":(a?"evo":"pace");
  return '<div class="card"><div class="row sp"><h4>'+(t==="evo"?"Evolução":"Ritmo do mês")+'</h4>'+(a&&b?'<div class="seg mini"><button data-act="ctab" data-id="evo"'+(t==="evo"?' class="on"':'')+'>Meses</button><button data-act="ctab" data-id="pace"'+(t==="pace"?' class="on"':'')+'>Dias</button></div>':'')+'</div>'+(t==="evo"?a:b)+'</div>';
}
function paceCard(){
  var ym=month,cur=today().slice(0,7);if(ym>cur)return "";
  var a=cumDays(ym,ym===cur?new Date().getDate():0),pm=ymAdd(ym,-1),b=cumDays(pm,0),hasB=b[b.length-1]>0;
  if(!(a[a.length-1]>0))return "";
  var W=360,H=170,L=6,R=44,T=12,B=22,pw=W-L-R,ph=H-T-B,n=31,top=Math.max(a[a.length-1],hasB?b[b.length-1]:0)*1.1;
  function X(d){return L+pw*d/n}function Y(v){return T+ph*(1-v/top)}
  function path(v){var d='';for(var i=0;i<v.length;i++)d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(v[i]).toFixed(1);return d}
  var g='<line class="gridl" x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'"/>';
  [1,10,20,30].forEach(function(d){g+='<text class="axt" x="'+X(d).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+d+'</text>'});
  var la=Y(a[a.length-1]),lb=hasB?Y(b[b.length-1]):-99;if(hasB&&Math.abs(la-lb)<13){if(la<=lb)lb=la+13;else la=lb+13}
  if(hasB)g+='<path class="lnk" d="'+path(b)+'" stroke="var(--muted)" stroke-dasharray="5 5"/><text class="axt" x="'+(X(b.length-1)+6).toFixed(1)+'" y="'+(lb+4).toFixed(1)+'">'+MESC[+pm.slice(5,7)-1]+'</text>';
  g+='<path class="lnk" d="'+path(a)+'" stroke="var(--fg)"/><circle cx="'+X(a.length-1).toFixed(1)+'" cy="'+Y(a[a.length-1]).toFixed(1)+'" r="4" fill="var(--fg)" stroke="var(--surface)" stroke-width="2"/><text class="axt" style="fill:var(--fg);font-weight:800" x="'+(X(a.length-1)+8).toFixed(1)+'" y="'+(la+4).toFixed(1)+'">'+MESC[+ym.slice(5,7)-1]+'</text>';
  g+='<g id="pxh" visibility="hidden"><line class="gridl" id="pxl" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--muted)"/></g><rect id="pxr" x="'+L+'" y="0" width="'+pw+'" height="'+H+'" fill="transparent"/>';
  paceData={a:a,b:hasB?b:null,L:L,pw:pw,W:W,n:n,ym:ym,pm:pm};
  var dA=a.length-1,cmp='';
  if(hasB){var ref=b[Math.min(dA,b.length-1)],df=a[dA]-ref;cmp=Math.abs(df)<100?'No mesmo ritmo de '+ymLabel(pm).split(" ")[0]+'.':'Até o dia '+dA+': <b>'+brl0(Math.abs(df))+(df>0?' a mais':' a menos')+'</b> que em '+ymLabel(pm).split(" ")[0]+' no mesmo dia.'}
  else cmp='Gasto acumulado dia a dia. A comparação com o mês anterior aparece a partir do segundo mês.';
  return '<div class="legendrow"><span><i class="sw"></i>Este mês</span>'+(hasB?'<span><i class="sw dm"></i>Mês anterior</span>':'')+'<span>toque para ver um dia</span></div><div id="pbox" style="position:relative"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gasto acumulado por dia, contra o mês anterior">'+g+'</svg><div class="tip" id="ptip" hidden></div></div><p class="note" id="pnote">'+cmp+'</p>';
}
function bindPace(){
  var box=$("#pbox"),P=paceData;if(!box||!P)return;var svg=$("svg",box),tip=$("#ptip",box),rc=$("#pxr",box);
  function mv(ev){
    var r=svg.getBoundingClientRect(),px=(ev.clientX-r.left)*P.W/r.width,d=Math.max(1,Math.min(P.n,Math.round((px-P.L)/P.pw*P.n))),x=P.L+P.pw*d/P.n;
    $("#pxh",svg).setAttribute("visibility","visible");$("#pxl",svg).setAttribute("x1",x);$("#pxl",svg).setAttribute("x2",x);
    var rows='<div><span>'+MESC[+P.ym.slice(5,7)-1]+'</span><b>'+(d<P.a.length?brl0(P.a[d]):'–')+'</b></div>';
    if(P.b)rows+='<div><span>'+MESC[+P.pm.slice(5,7)-1]+'</span><b>'+brl0(P.b[Math.min(d,P.b.length-1)])+'</b></div>';
    tip.innerHTML='<b>Dia '+d+'</b>'+rows;tip.hidden=false;
    var bw=box.getBoundingClientRect().width,left=(ev.clientX-box.getBoundingClientRect().left)+14;if(left+150>bw)left=left-164;tip.style.left=Math.max(0,left)+"px";tip.style.top="4px";
  }
  rc.addEventListener("pointermove",mv);rc.addEventListener("pointerdown",mv);
  rc.addEventListener("pointerleave",function(){$("#pxh",svg).setAttribute("visibility","hidden");tip.hidden=true});
}
function scoreHist(ym,who){   /* nota dos até 6 meses (com renda) terminando no mês aberto */
  var cur=today().slice(0,7),ms=monthsSeen().filter(function(m){return m<=ym&&m<=cur}).slice(-6),out=[];
  ms.forEach(function(m){var d=diagRun(m,who);if(d.ok)out.push({m:m,s:d.score})});
  if(out.length<2)return '<p class="note">O histórico da nota aparece aqui a partir do segundo mês com renda lançada.</p>';
  var W=360,H=110,T=18,B=20,ph=H-T-B,gw=(W-12)/6,bw=26,g='<line class="gridl" x1="6" x2="'+(W-6)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'"/>';
  out.forEach(function(x,k){var cx=6+gw*k+gw/2,h=Math.max(2,ph*x.s/100),y=T+ph-h,r=Math.min(4,h),on=x.m===ym;
    g+='<path class="'+(on?'tb-e':'tb-i')+'" d="M'+(cx-bw/2)+' '+(T+ph)+'V'+(y+r).toFixed(1)+'q0 -'+r+' '+r+' -'+r+'h'+(bw-2*r)+'q'+r+' 0 '+r+' '+r+'V'+(T+ph)+'z"/><text class="axt" style="fill:var(--fg);font-weight:800" x="'+cx+'" y="'+(y-5).toFixed(1)+'" text-anchor="middle">'+x.s+'</text><text class="axt" x="'+cx+'" y="'+(H-5)+'" text-anchor="middle">'+MESC[+x.m.slice(5,7)-1]+'</text>'});
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Nota do diagnóstico por mês">'+g+'</svg>';
}

/* ---------- componentes ---------- */
function top(title,sub){return '<div class="top"><div><h1>'+title+'</h1>'+(sub?'<p class="sub">'+sub+'</p>':'')+'</div><button class="round" data-act="cfg" aria-label="Ajustes">'+esc(NM(ME()).charAt(0).toUpperCase())+'<span class="dotsync" id="dot"></span></button></div>'}
function ring(r,p,cls){var c=2*Math.PI*r;p=Math.max(0,Math.min(1,p||0));return '<circle class="tr" cx="60" cy="60" r="'+r+'" stroke-width="9"/><circle class="'+cls+'" cx="60" cy="60" r="'+r+'" stroke-width="9" stroke-dasharray="'+(c*p).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 60 60)"/>'}
function catBars(sum,limits,max,avg){
  var cats=Object.keys(sum.cat).sort(function(a,b){return sum.cat[b]-sum.cat[a]});if(max)cats=cats.slice(0,max);
  if(!cats.length)return '<p class="empty">Nenhum gasto neste mês ainda.</p>';
  var top=0;cats.forEach(function(c){top=Math.max(top,sum.cat[c],limits?(S.bud.v[c]||0):0,avg?(avg[c]||0):0)});
  return cats.map(function(c){
    var v=sum.cat[c],lim=limits?(S.bud.v[c]||0):0,over=lim&&v>lim,av=avg?(avg[c]||0):0,df=v-av;
    return '<button class="catrow" data-act="cat" data-id="'+esc(c)+'"'+(limits?'':' disabled')+'><div class="row sp"><span style="font-weight:700">'+esc(c)+'</span><span style="font-variant-numeric:tabular-nums"><b>'+brl(v)+'</b>'+(lim?'<small class="note"> de '+brl0(lim)+'</small>':'')+'</span></div>'
      +'<div class="bar"><i class="'+(over?'over':'')+'" style="width:'+(top?Math.min(100,v/top*100):0).toFixed(1)+'%"></i>'+(av?'<u class="tk" style="left:'+(av/top*100).toFixed(1)+'%"></u>':'')+(lim?'<u class="tk l" style="left:'+Math.min(100,lim/top*100).toFixed(1)+'%"></u>':'')+'</div>'
      +(av?'<small class="note">média '+brl0(av)+(Math.abs(df)>=100?' · '+(df>0?'▲ ':'▼ ')+brl0(Math.abs(df))+(df>0?' acima':' abaixo'):' · igual')+'</small>':(avg?'<small class="note">sem gasto nos meses anteriores</small>':''))
      +(over?'<span class="badge warn" style="align-self:flex-start">▲ estourou '+brl(v-lim)+'</span>':'')+'</button>';
  }).join('');
}
function balanceInfo(){
  var td=today(),b=balance(live(S.tx).filter(function(t){return !(t.k==="o"&&t.d>td)}),S.cfg.split);   /* despesa com data futura (fixo ou parcela a vencer) ainda não foi paga por ninguém */
  if(Math.abs(b)<1)return {b:0,txt:'Vocês estão quites.',debtor:-1};
  return b>0?{b:b,txt:NM(1)+' deve <b>'+brl(b)+'</b> a '+NM(0)+'.',debtor:1}:{b:b,txt:NM(0)+' deve <b>'+brl(-b)+'</b> a '+NM(1)+'.',debtor:0};
}

