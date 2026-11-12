/* ---------- SIMULADOR ---------- */
var PRES={cdb:{l:"CDB / Tesouro Selic",d:"100% do CDI, IR regressivo",rate:function(){return S.cfg.cdi},ir:true},lci:{l:"LCI / LCA",d:"90% do CDI, isento de IR",rate:function(){return S.cfg.cdi*0.9},ir:false},poup:{l:"Poupança",d:"0,5% a.m. (≈ 6,17% a.a.), isenta",rate:function(){return 6.17},ir:false},custom:{l:"Personalizada",d:"você define a taxa e o IR"}};
function simS(){if(!S.sim)S.sim={p0:0,pmt:1000,growth:0,preset:"cdb",rate:12,ir:true,months:24,real:false,target:0,goalId:"",u:0};return S.sim}
function simCalc(){
  var s=simS(),pr=PRES[s.preset]||PRES.cdb,rate=pr.rate?pr.rate():s.rate,ir=pr.rate?pr.ir:!!s.ir,sp=S.cfg.spread;
  var base={p0:s.p0,pmt:s.pmt,growth:s.growth/100,infl:S.cfg.infl/100,months:s.months,ir:ir,begin:false};
  var rates={cons:Math.max(0,rate-sp),base:rate,otim:rate+sp},out={};
  for(var k in rates){var q={};for(var j in base)q[j]=base[j];q.rate=rates[k]/100;out[k]=simulate(q)}
  return {s:s,base:base,rates:rates,out:out,ir:ir,rate:rate};
}
function vSim(){
  var s=simS(),gs=live(S.goals),h='<div class="view">'+top("Simulador","Quanto o dinheiro cresce com o tempo");
  h+='<div class="card"><h4>Aplicação</h4><div class="chips">';
  for(var k in PRES)h+='<button class="chip '+(s.preset===k?'on':'')+'" data-act="preset" data-id="'+k+'">'+PRES[k].l+'</button>';
  h+='</div><p class="note">'+PRES[s.preset].d+(PRES[s.preset].rate?' · taxa de partida <b>'+nf(PRES[s.preset].rate(),2)+'% a.a.</b>':'')+'</p>';
  if(s.preset==="custom")h+='<div class="grid2"><label class="f">Taxa (% a.a. efetiva)<input type="text" inputmode="decimal" data-sim="rate" value="'+fnum(s.rate)+'"></label><label class="f chk" style="align-self:end"><input type="checkbox" data-sim="ir"'+(s.ir?' checked':'')+'> Cobrar IR regressivo</label></div>';
  h+='<div class="grid2"><label class="f">Já guardado (R$)<input type="text" inputmode="decimal" data-sim="p0" value="'+fnum(s.p0)+'" placeholder="0"></label><label class="f">Aporte mensal (R$)<input type="text" inputmode="decimal" data-sim="pmt" value="'+fnum(s.pmt)+'" placeholder="0"></label></div>';
  h+='<label class="f">Reajuste anual do aporte (%)<input type="text" inputmode="decimal" data-sim="growth" value="'+fnum(s.growth)+'" placeholder="0"></label>';
  h+='<h4>Prazo</h4><div class="chips">';
  [[12,"12 meses"],[24,"24 meses"],[60,"5 anos"],[120,"10 anos"],[240,"20 anos"]].forEach(function(p){h+='<button class="chip '+(s.months===p[0]?'on':'')+'" data-act="months" data-id="'+p[0]+'">'+p[1]+'</button>'});
  h+='</div><label class="f">Prazo em meses (1 a 240)<input type="number" inputmode="numeric" min="1" max="240" data-sim="months" value="'+s.months+'"></label>';
  h+='<label class="f chk"><input type="checkbox" data-sim="real"'+(s.real?' checked':'')+'> Mostrar em valores de hoje (descontar o IPCA de '+nf(S.cfg.infl,1)+'% a.a.)</label></div>';
  h+='<div id="simOut"></div>';
  h+='<div class="card"><h4>Tenho uma meta de valor</h4>'+(gs.length?'<label class="f">Usar uma meta do casal<select data-sim="goalId"><option value="">— digitar manualmente —</option>'+gs.map(function(g){return '<option value="'+g.id+'"'+(s.goalId===g.id?' selected':'')+'>'+esc(g.name)+'</option>'}).join('')+'</select></label>':'')
    +'<label class="f">Quanto quero juntar (R$)<input type="text" inputmode="decimal" data-sim="target" value="'+fnum(s.target)+'" placeholder="ex.: 30000"></label><div id="simGoal"></div></div>';
  h+='<details><summary>Como calculamos</summary><p><b>Juros compostos:</b> a taxa anual é convertida em mensal pela equivalência (1 + taxa anual)^(1/12) − 1, e não por taxa ÷ 12, que subestimaria o rendimento.</p><p><b>IR regressivo:</b> incide só sobre o rendimento, por <b>aporte</b> (cada depósito tem a própria idade): 22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% acima. O saldo mostrado é <b>líquido</b>, como se você resgatasse naquele mês.</p><p><b>Cenários:</b> conservador e otimista variam a taxa em ± '+nf(S.cfg.spread,1)+' ponto(s) percentual(is) sobre a taxa base (ajustável em Ajustes).</p><p><b>Valores de hoje:</b> saldo líquido ÷ (1 + IPCA)^(meses ÷ 12). Mostra o poder de compra, não o número nominal.</p><p><b>Aporte necessário:</b> busca, por bisseção sobre a própria simulação (com IR e reajuste), o menor aporte que atinge a meta no prazo. Aportes entram no fim de cada mês.</p><p><b>Limites:</b> taxas e inflação são premissas fixas ao longo de todo o prazo; renda variável não é modelada. Isto é planejamento, não recomendação de investimento.</p></details></div>';
  return h;
}
function niceStep(x){var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)),f=x/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function chartSvg(series,months){
  var W=400,H=300,L=54,R=78,T=14,B=30,pw=W-L-R,ph=H-T-B,mx=0;
  series.forEach(function(s){s.v.forEach(function(v){if(v>mx)mx=v})});
  var st=niceStep((mx||1)/4),top=Math.ceil((mx||1)/st)*st;
  function X(t){return L+pw*t/months}function Y(v){return T+ph*(1-v/top)}
  var g='',v;for(v=0;v<=top+1e-9;v+=st)g+='<line class="gridl" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'"/><text class="axt" x="'+(L-8)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end">'+compact(v)+'</text>';
  var ts=months<=12?2:months<=24?6:months<=60?12:months<=120?24:48,t;
  for(t=0;t<=months;t+=ts)g+='<text class="axt" x="'+X(t).toFixed(1)+'" y="'+(H-10)+'" text-anchor="'+(t===0?'start':'middle')+'">'+(t===0?'0':(t>=24&&t%12===0?t/12+' anos':t+' m'))+'</text>';
  var labs=[];
  series.forEach(function(s){
    var d='';for(var i=0;i<s.v.length;i++)d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(s.v[i]).toFixed(1);
    g+='<path class="lnk" d="'+d+'" stroke="'+s.c+'"'+(s.dash?' stroke-dasharray="6 5"':'')+(s.o?' opacity="'+s.o+'"':'')+'/>';
    labs.push({y:Y(s.v[s.v.length-1]),t:s.l});
  });
  labs.sort(function(a,b){return a.y-b.y});for(var i=1;i<labs.length;i++)if(labs[i].y-labs[i-1].y<13)labs[i].y=labs[i-1].y+13;
  labs.forEach(function(l){g+='<text class="axt" style="fill:var(--fg)" x="'+(W-R+8)+'" y="'+(l.y+4).toFixed(1)+'">'+esc(l.t)+'</text>'});
  g+='<g id="xh" visibility="hidden"><line class="gridl" id="xhl" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--muted)"/>'+series.map(function(s,i){return '<circle id="xhc'+i+'" r="4.5" fill="'+s.c+'" stroke="var(--surface)" stroke-width="2"/>'}).join('')+'</g>';
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Evolução do saldo ao longo do tempo" data-w="'+W+'" data-l="'+L+'" data-pw="'+pw+'" data-t="'+T+'" data-ph="'+ph+'" data-top="'+top+'" data-m="'+months+'">'+g+'<rect id="xhr" x="'+L+'" y="'+T+'" width="'+pw+'" height="'+ph+'" fill="transparent"/></svg><div class="tip" id="tip" hidden></div>';
}
function bindChart(box,series,months){
  var svg=$("svg",box),tip=$("#tip",box),rect=$("#xhr",box);if(!svg)return;
  var L=+svg.dataset.l,pw=+svg.dataset.pw,Tp=+svg.dataset.t,ph=+svg.dataset.ph,top=+svg.dataset.top,W=+svg.dataset.w;
  function mv(ev){
    var r=svg.getBoundingClientRect(),px=(ev.clientX-r.left)*W/r.width,t=Math.round((px-L)/pw*months);t=Math.max(0,Math.min(months,t));
    var x=L+pw*t/months;$("#xh",svg).setAttribute("visibility","visible");$("#xhl",svg).setAttribute("x1",x);$("#xhl",svg).setAttribute("x2",x);
    var rows='';series.forEach(function(s,i){var c=$("#xhc"+i,svg);c.setAttribute("cx",x);c.setAttribute("cy",Tp+ph*(1-s.v[t]/top));rows+='<div><span><i class="dot" style="background:'+s.c+';opacity:'+(s.o||1)+'"></i> '+esc(s.l)+'</span><b>'+brlR0(s.v[t])+'</b></div>'});
    tip.innerHTML='<b>'+(t<24?t+' m':nf(t/12,1)+' anos')+'</b>'+rows;tip.hidden=false;
    var bw=box.getBoundingClientRect().width,left=(ev.clientX-box.getBoundingClientRect().left)+14;if(left+170>bw)left=left-184;tip.style.left=Math.max(0,left)+"px";tip.style.top="6px";
  }
  rect.addEventListener("pointermove",mv);rect.addEventListener("pointerdown",mv);
  rect.addEventListener("pointerleave",function(){$("#xh",svg).setAttribute("visibility","hidden");tip.hidden=true});
}
function simOut(){
  var el=$("#simOut");if(!el)return;
  var c=simCalc(),s=c.s,n=s.months,inf=S.cfg.infl/100,real=!!s.real,key=real?"real":"net";
  var inv=c.out.base.inv.map(function(v,i){return real?v/Math.pow(1+inf,i/12):v});
  var F=c.out.base[key][n],I=inv[n],ser=[{l:"Otimista",v:c.out.otim[key],c:"var(--ser)",o:.45,dash:true},{l:"Base",v:c.out.base[key],c:"var(--ser)",o:1},{l:"Conservador",v:c.out.cons[key],c:"var(--ser)",o:.45,dash:true},{l:"Investido",v:inv,c:"var(--muted)",o:1,dash:true}];
  var h='<div class="card"><h4>Em '+mLabel(n)+' · cenário base ('+nf(c.rates.base,2)+'% a.a.)</h4><div class="bigv">'+brlR0(F)+'</div><p class="note">'+(real?'Em valores de hoje. ':'Saldo líquido'+(c.ir?' de IR':'')+'. ')+'Você aporta <b>'+brlR0(I)+'</b> e o rendimento líquido é <b class="pos">'+brlR0(F-I)+'</b>'+(real?'':' (em valores de hoje: <b>'+brlR0(c.out.base.real[n])+'</b>)')+'.</p>';
  h+='<div class="legendrow"><span><i class="sw"></i>Base</span><span><i class="sw d" style="opacity:.45"></i>Conservador / Otimista</span><span><i class="sw d" style="border-color:var(--muted)"></i>Investido</span></div><div class="chartbox" id="cbox">'+chartSvg(ser,n)+'</div></div>';
  var ms=[12,24,60,120,240].filter(function(m){return m<=n});if(ms.indexOf(n)<0)ms.push(n);ms.sort(function(a,b){return a-b});
  h+='<div class="card"><h4>Marcos, em R$ ('+(real?'valores de hoje':'líquido nominal')+')</h4><div class="tablewrap"><table><thead><tr><th>Prazo</th><th>Investido</th><th>Conserv.</th><th>Base</th><th>Otim.</th></tr></thead><tbody>';
  ms.forEach(function(m){h+='<tr><td>'+mLabel(m)+'</td><td>'+n0(inv[m])+'</td><td>'+n0(c.out.cons[key][m])+'</td><td><b>'+n0(c.out.base[key][m])+'</b></td><td>'+n0(c.out.otim[key][m])+'</td></tr>'});
  h+='</tbody></table></div><p class="note">Taxas: conservador '+nf(c.rates.cons,2)+'% · base '+nf(c.rates.base,2)+'% · otimista '+nf(c.rates.otim,2)+'% a.a.'+(c.ir?' · IR regressivo aplicado.':' · sem IR.')+'</p></div>';
  el.innerHTML=h;bindChart($("#cbox"),ser,n);
  /* meta de valor */
  var g=$("#simGoal");if(!g)return;
  if(!(s.target>0)){g.innerHTML='';return}
  var tn=s.target*(real?Math.pow(1+inf,n/12):1),h2='',k;
  h2+='<p class="note">'+(real?'Meta em valores de hoje: '+brlR0(s.target)+' → <b>'+brlR0(tn)+'</b> nominais daqui a '+mLabel(n)+'.':'')+'</p>';
  var base=c.base,res={};
  ["cons","base","otim"].forEach(function(k){var q={};for(var j in base)q[j]=base[j];q.rate=c.rates[k]/100;res[k]=solvePmt(q,tn)});
  h2+='<p style="margin:0">Para juntar <b>'+brlR0(s.target)+'</b> em <b>'+mLabel(n)+'</b>, guarde por mês (cenário base):</p><div class="bigv">'+brlR(res.base)+'</div><p class="note">Conservador: <b>'+brlR(res.cons)+'</b> · Otimista: <b>'+brlR(res.otim)+'</b>'+(s.growth?' · com reajuste de '+nf(s.growth,1)+'% ao ano no aporte':'')+'.</p>';
  var q2={};for(k in base)q2[k]=base[k];q2.months=600;q2.rate=c.rates.base/100;var ss=simulate(q2),arr=real?ss.real:ss.net,mm=null;
  for(var t=0;t<=600;t++)if(arr[t]>=s.target){mm=t;break}
  h2+='<p class="note">Mantendo o aporte de <b>'+brlR0(s.pmt)+'/mês</b>, você chega lá em '+(mm==null?'<b>mais de 50 anos</b> (aporte insuficiente).':'<b>'+mLabel(mm)+'</b>, em '+ymShort(ymAdd(today().slice(0,7),mm))+'.')+'</p>';
  g.innerHTML=h2;
}

