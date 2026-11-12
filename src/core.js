/* ===== NÚCLEO FINANCEIRO (funções puras, testadas em tests/core.test.js) ===== */
var DPM = 365.25 / 12; // dias médios por mês, usado só para a faixa do IR

/* taxa mensal efetiva equivalente a uma taxa anual efetiva: (1+a)^(1/12)-1 (juros compostos, não a/12) */
function mRate(aa) { return Math.pow(1 + aa, 1 / 12) - 1; }

/* IR regressivo da renda fixa sobre o rendimento, pela idade da aplicação em dias */
function irRate(days) { return days <= 180 ? 0.225 : days <= 360 ? 0.20 : days <= 720 ? 0.175 : 0.15; }

/* aporte do mês m (1..n): reajustado uma vez a cada 12 meses */
function pmtAt(p, m) { return p.pmt * Math.pow(1 + (p.growth || 0), Math.floor((m - 1) / 12)); }

/* Simula mês a mês. Cada aporte é um "lote" com a própria idade, porque o IR incide por lote.
   p: {p0, pmt, growth, rate (a.a. efetiva), infl (a.a.), months, ir (bool), begin (bool: aporte no início do mês)}
   Retorna séries t=0..months: inv (investido), gross (bruto), net (líquido de IR se resgatar em t), real (net em valores de hoje) */
function simulate(p) {
  var n = p.months, i = mRate(p.rate), inf = p.infl || 0;
  var lots = [{ s: 0, a: p.p0 || 0 }];
  var inv = [p.p0 || 0], gross = [p.p0 || 0], net = [p.p0 || 0], real = [p.p0 || 0];
  var cum = p.p0 || 0;
  for (var t = 1; t <= n; t++) {
    var amt = pmtAt(p, t);
    lots.push({ s: p.begin ? t - 1 : t, a: amt });
    cum += amt;
    var g = 0, tax = 0;
    for (var k = 0; k < lots.length; k++) {
      var age = t - lots[k].s; if (age < 0) age = 0;
      var v = lots[k].a * Math.pow(1 + i, age);
      g += v;
      if (p.ir && v > lots[k].a) tax += (v - lots[k].a) * irRate(age * DPM);
    }
    inv.push(cum); gross.push(g); net.push(g - tax);
    real.push((g - tax) / Math.pow(1 + inf, t / 12));
  }
  return { inv: inv, gross: gross, net: net, real: real };
}

/* aporte mensal inicial necessário para o saldo líquido chegar a "target" em p.months (bisseção sobre a simulação:
   funciona com IR, reajuste e aporte no início porque o saldo é crescente no aporte) */
function solvePmt(p, target) {
  var q = {}, k; for (k in p) q[k] = p[k];
  q.pmt = 0;
  if (simulate(q).net[p.months] >= target) return 0;
  var lo = 0, hi = Math.max(1, target / p.months);
  q.pmt = hi;
  var guard = 0;
  while (simulate(q).net[p.months] < target && guard++ < 60) { hi *= 2; q.pmt = hi; }
  for (var it = 0; it < 50; it++) {
    var mid = (lo + hi) / 2; q.pmt = mid;
    if (simulate(q).net[p.months] >= target) hi = mid; else lo = mid;
  }
  return hi;
}

/* primeiro mês em que o saldo líquido atinge "target" (até maxM); null se não chega */
function solveMonths(p, target, maxM) {
  var q = {}, k; for (k in p) q[k] = p[k];
  q.months = maxM || 600;
  var s = simulate(q);
  for (var t = 0; t <= q.months; t++) if (s.net[t] >= target) return t;
  return null;
}

/* fórmula fechada (sem IR, aporte no fim do mês, sem reajuste) usada só como prova nos testes */
function fvClosed(p0, pmt, aa, n) {
  var i = mRate(aa);
  return p0 * Math.pow(1 + i, n) + (i === 0 ? pmt * n : pmt * (Math.pow(1 + i, n) - 1) / i);
}

/* ---- divisão de despesas do casal (centavos inteiros) ---- */
/* tx: {k:"o"|"i"|"t", v:centavos, w:0|1 (quem pagou), s:0|1|2 (0=divide, 1=só de quem pagou, 2=só do outro)}; split = % da pessoa 0 */
function shares(tx, split) {
  var a;
  if (tx.s === 1) a = tx.w === 0 ? tx.v : 0;
  else if (tx.s === 2) a = tx.w === 0 ? 0 : tx.v;
  else a = Math.round(tx.v * split / 100);
  return [a, tx.v - a];
}
/* saldo entre os dois: positivo = pessoa 1 deve à pessoa 0; negativo = pessoa 0 deve à pessoa 1.
   acerto (k:"t") entra como pagamento de w para o outro */
function balance(list, split) {
  var net0 = 0;
  list.forEach(function (tx) {
    if (tx.x) return;
    if (tx.k === "o") { var sh = shares(tx, split); net0 += (tx.w === 0 ? tx.v : 0) - sh[0]; }
    else if (tx.k === "t") { net0 += tx.w === 0 ? tx.v : -tx.v; } // quem repassa dinheiro quita (ou cria crédito) com o outro
  });
  return net0;
}
/* parse de dinheiro brasileiro ("1.234,56", "R$ 50", "12.5") para centavos */
function parseMoney(s) {
  s = String(s == null ? "" : s).replace(/[^\d,.\-]/g, "");
  if (!s) return 0;
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(".", "");
  var n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 100) : 0;
}

/* ===== GAMIFICAÇÃO (funções puras) ===== */
function p2(n) { return ("0" + n).slice(-2); }
/* datas ISO "AAAA-MM-DD" em UTC (sem efeito de fuso/horário de verão) */
function dayAdd(iso, k) {
  var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + k));
  return d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate());
}
function dayDiff(a, b) {
  var f = function (x) { return Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10)); };
  return Math.round((f(b) - f(a)) / 864e5);
}
function nextYm(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + "-" + p2(m); }
function quarterKey(iso) { return iso.slice(0, 4) + "T" + Math.floor((+iso.slice(5, 7) - 1) / 3); }
function halfKey(ym) { return ym.slice(0, 4) + "S" + (+ym.slice(5, 7) <= 6 ? 0 : 1); }
/* Sequência com "folga": a primeira unidade sem registro de cada período é perdoada (a sequência segue, sem contar o dia);
   a segunda no mesmo período zera. A unidade atual em aberto (graceLast) não conta como falha. */
function streakScan(seq, ok, keyOf, graceLast) {
  var run = 0, best = 0, used = {}, last = seq.length - 1;
  for (var i = 0; i <= last; i++) {
    var u = seq[i];
    if (ok[u]) { run++; if (run > best) best = run; }
    else if (i === last && graceLast) { /* em aberto */ }
    else if (run > 0) { var k = keyOf(u); if (!used[k]) used[k] = 1; else run = 0; }
  }
  return { n: run, best: best, doneNow: last >= 0 && !!ok[seq[last]], freezeUsed: last >= 0 ? !!used[keyOf(seq[last])] : false };
}
/* dias seguidos com registro (days = {"AAAA-MM-DD": true}); folga: 1 por trimestre */
function logStreak(days, today) {
  var first = null, k;
  for (k in days) if (days[k] && k <= today && (first === null || k < first)) first = k;
  if (first === null) return { n: 0, best: 0, doneNow: false, freezeUsed: false };
  var seq = [], d = first;
  while (d <= today) { seq.push(d); d = dayAdd(d, 1); }
  return streakScan(seq, days, quarterKey, true);
}
/* meses fechados seguidos dentro do plano (okMonths = {"AAAA-MM": true}); folga: 1 por semestre. O mês atual não entra. */
function planStreak(okMonths, firstYm, curYm) {
  var seq = [], m = firstYm;
  while (m < curYm) { seq.push(m); m = nextYm(m); }
  if (!seq.length) return { n: 0, best: 0, doneNow: false, freezeUsed: false };
  return streakScan(seq, okMonths, halfKey, false);
}
/* marcos da meta (ex.: 25/50/75/100%): reached e a data do aporte que cruzou o marco (null se já vinha do valor inicial) */
function milestones(base, conts, target, pcts) {
  var list = (conts || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  return pcts.map(function (p) {
    var amt = Math.round(target * p / 100), cum = base || 0, date = null, reached = target > 0 && cum >= amt;
    if (!reached && target > 0) for (var i = 0; i < list.length; i++) { cum += list[i].v; if (cum >= amt) { reached = true; date = list[i].d; break; } }
    return { p: p, amt: amt, reached: reached, date: date };
  });
}

/* ===== PARCELAS E CARTÃO (funções puras) ===== */
/* soma k meses a uma data ISO, sem estourar o fim do mês (31/01 + 1 mês = 28/02) */
function addMonths(iso, k) {
  var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + k, d = +iso.slice(8, 10);
  var t = new Date(Date.UTC(y, m, 1)); y = t.getUTCFullYear(); m = t.getUTCMonth();
  var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return y + "-" + p2(m + 1) + "-" + p2(Math.min(d, last));
}
/* fatura de uma compra: até o dia de fechamento entra na fatura do mês; depois, na do mês seguinte.
   O vencimento é o primeiro dia "due" depois do fechamento. m = mês do vencimento (quando o dinheiro sai). */
function invoiceOf(dateIso, close, due) {
  var ym = dateIso.slice(0, 7), cm = +dateIso.slice(8, 10) <= close ? ym : nextYm(ym);
  var dm = due > close ? cm : nextYm(cm);
  var last = new Date(Date.UTC(+dm.slice(0, 4), +dm.slice(5, 7), 0)).getUTCDate();
  return { m: dm, due: dm + "-" + p2(Math.min(due, last)) };
}
/* divide o total (centavos) em n parcelas; os centavos que sobram vão para a primeira */
function splitParcelas(total, n) {
  var base = Math.floor(total / n), out = [];
  for (var i = 0; i < n; i++) out.push(base);
  out[0] += total - base * n;
  return out;
}
/* valor presente do parcelado (1ª parcela em 30 dias) se o dinheiro ficasse aplicado a aa (a.a.), com IR regressivo:
   quanto seria preciso ter hoje, aplicado, para pagar cada parcela. Pagar à vista por menos que isso compensa. */
function parcelPV(total, n, aa) {
  var P = splitParcelas(total, n), pv = 0;
  for (var k = 1; k <= n; k++) {
    var g = Math.pow(1 + aa, k / 12) - 1, ir = irRate(Math.round(k * 365.25 / 12));
    pv += P[k - 1] / (1 + g * (1 - ir));
  }
  return pv;
}
/* taxa mensal implícita no parcelado frente ao preço à vista (soma das parcelas descontadas = à vista); null se à vista >= total */
function parcelRate(avista, total, n) {
  if (!(avista > 0) || avista >= total) return null;
  var P = splitParcelas(total, n), f = function (i) { var s = 0; for (var k = 1; k <= n; k++) s += P[k - 1] / Math.pow(1 + i, k); return s - avista; };
  var lo = 0, hi = 5;
  for (var it = 0; it < 200; it++) { var mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/* ---------- diagnóstico financeiro (regras, sem IA, tudo no aparelho) ----------
   Entrada em centavos. Cada critério tem peso (max) e nota (pts); a nota final é a soma de pts / soma de max dos critérios aplicáveis.
   Referências: poupança = meta do casal (padrão 20%, regra 50/30/20); compromissos fixos <= 35% da renda é folga, > 50% é aperto
   (limite usual de endividamento/comprometimento); reserva de emergência 3 a 6 meses de gastos; tendência vs. média dos meses anteriores. */
var DIAG_NEEDS=["Moradia","Mercado","Transporte","Saúde","Educação","Casa"];
var DIAG_WANTS=["Restaurantes","Lazer","Viagem","Assinaturas","Pessoal","Presentes"];
function diagnose(o){
  var items=[],act=[],inc=o.inc||0,exp=o.exp||0,t=(o.saveTarget==null?20:o.saveTarget)/100;
  var R=function(c){return "R$ "+Math.round(Math.abs(c)/100).toLocaleString("pt-BR")},P=function(x){return Math.round(x*100)+"%"};
  function add(id,sev,pts,max,title,txt){items.push({id:id,sev:sev,pts:pts,max:max,title:title,txt:txt})}
  if(inc<=0)return {ok:false,reason:"sem-renda"};
  var rate=(inc-exp)/inc,cl=function(x,a,b){return Math.max(a,Math.min(b,x))};
  /* 1. poupança */
  var s1=rate>=t?"ok":rate>=t/2?"warn":"bad";
  add("save",s1,rate>=0?Math.round(30*cl(rate/t,0,1)):0,30,"Poupança do mês",
    rate<0?"Você gastou "+R(exp-inc)+" a mais do que ganhou ("+P(exp/inc)+" da renda). Gastar mais que a renda consome reserva ou gera dívida."
    :"Sobrou "+P(rate)+" da renda ("+R(inc-exp)+"). A meta é "+P(t)+" (regra 50/30/20: 20% para o futuro)."+(rate>=t?" Meta batida.":""));
  if(rate<t){var gap=exp-inc*(1-t);act.push("Para chegar à meta de "+P(t)+" de poupança faltam "+R(gap)+" por mês: corte de despesas, aumento de renda ou os dois.")}
  /* 2. compromissos fixos */
  var f=o.fixed/inc,s2=f<=.35?"ok":f<=.5?"warn":"bad";
  add("fixed",s2,Math.round(20*cl((0.7-f)/0.35,0,1)),20,"Compromissos fixos",
    "Fixos e parcelas somam "+R(o.fixed)+" ("+P(f)+" da renda). Até 35% dá folga; acima de 50% sobra pouco para imprevistos e para poupar, porque esse valor já está comprometido antes do mês começar.");
  if(f>.35)act.push("Reduza o peso dos fixos ("+P(f)+" da renda): renegocie contratos, evite novas parcelas e antecipe a quitação das maiores. Meta: abaixo de 35%.");
  if(o.nextFixed>0&&o.nextFixed/inc>.5)act.push("O mês seguinte já tem "+R(o.nextFixed)+" comprometidos ("+P(o.nextFixed/inc)+" da renda deste mês). Evite novas parcelas até aliviar.");
  /* 3. 50/30/20 */
  var nd=0,wn=0,un=0;for(var c in o.cat){var v=o.cat[c];var kd=(o.kind||{})[c]||(DIAG_NEEDS.indexOf(c)>=0?"n":DIAG_WANTS.indexOf(c)>=0?"w":"o");if(kd==="n")nd+=v;else if(kd==="w")wn+=v;else un+=v}
  if(nd+wn>0){
    var en=Math.max(0,nd/inc-.5),ew=Math.max(0,wn/inc-.3),s3=en+ew===0?"ok":en+ew<=.1?"warn":"bad";
    add("rule",s3,Math.round(20*cl(1-(en+ew)/0.3,0,1)),20,"Essenciais x desejos",
      "Essenciais: "+P(nd/inc)+" da renda (ideal até 50%). Desejos (restaurantes, lazer, viagem, assinaturas, pessoal, presentes): "+P(wn/inc)+" (ideal até 30%)."+(un>0?" Fora dessa conta: "+R(un)+" em categorias marcadas como Outro.":""));
    if(ew>0){var cut=wn-.3*inc;act.push("Desejos estão "+R(cut)+" acima de 30% da renda. Um corte de 20% nessa faixa libera "+R(wn*.2)+" por mês.")}
    if(en>0)act.push("Essenciais passaram de 50% da renda ("+P(nd/inc)+"). Veja moradia, mercado e transporte: são onde há mais efeito.");
  }
  /* 4. reserva */
  if(o.reserveM!=null&&o.reserveAvg>0){
    var m=o.reserveM,s4=m>=6?"ok":m>=3?"warn":"bad";
    add("reserve",s4,Math.round(20*(m>=6?1:m>=3?(.5+.5*(m-3)/3):.5*cl(m/3,0,1))),20,"Reserva de emergência",
      "As metas (sem viagens) cobrem "+(Math.round(m*10)/10).toLocaleString("pt-BR")+(m>=2||m<1?" meses":" mês")+" de gastos (média "+R(o.reserveAvg)+"/mês). O recomendado é de 3 a 6 meses, para aguentar perda de renda ou imprevisto.");
    if(m<3){var need=3*o.reserveAvg-m*o.reserveAvg;act.push("Monte a reserva até 3 meses de gastos: faltam "+R(need)+". Em 12 meses, são "+R(need/12)+" por mês.")}
  }
  /* 5. tendência */
  var pv=(o.prev||[]).filter(function(p){return p.exp>0});
  if(pv.length){
    var avg=pv.reduce(function(a,p){return a+p.exp},0)/pv.length,r=exp/avg,s5=r<=1.05?"ok":r<=1.15?"warn":"bad";
    /* mês em aberto: gasto parcial contra média de meses inteiros sempre parece bom, então não pontua */
    add("trend",o.partial?"ok":s5,o.partial?0:Math.round(10*cl((1.3-r)/0.25,0,1)),o.partial?0:10,"Tendência de gastos",(o.partial?"Só pontua com o mês fechado. Até agora: ":"")+
      "Gasto de "+R(exp)+" contra média de "+R(avg)+" dos "+pv.length+" mês(es) anteriores ("+(r>=1?"+":"−")+P(Math.abs(r-1))+").");
    var up=[];for(var k in o.cat){var pa=pv.reduce(function(a,p){return a+((p.cat||{})[k]||0)},0)/pv.length,d=o.cat[k]-pa;if(d>=15000&&(pa===0||o.cat[k]/pa>=1.3))up.push([k,d])}
    up.sort(function(a,b){return b[1]-a[1]});
    if(up.length)add("up","warn",0,0,"Categorias que subiram",up.slice(0,3).map(function(x){return x[0]+" (+"+R(x[1])+")"}).join(", ")+" acima da média anterior.");
    if(s5!=="ok"&&up.length)act.push("Os maiores aumentos vieram de "+up.slice(0,2).map(function(x){return x[0]}).join(" e ")+". Comece por aí.");
  }
  /* 6. orçamento */
  var ov=[];for(var b in (o.bud||{})){if(o.bud[b]>0&&(o.cat[b]||0)>o.bud[b])ov.push([b,o.cat[b]-o.bud[b]])}
  if(ov.length){ov.sort(function(a,b){return b[1]-a[1]});add("bud","warn",0,0,"Limites estourados",ov.map(function(x){return x[0]+" (+"+R(x[1])+")"}).join(", ")+".")}
  /* nota */
  var sp=0,sm=0;items.forEach(function(i){sp+=i.pts;sm+=i.max});
  var score=sm?Math.round(sp/sm*100):0;if(rate<0)score=Math.min(score,49);
  var lvl=score>=75?"Boa":score>=50?"Atenção":"Crítica";
  var top=[];for(var q in o.cat)top.push([q,o.cat[q]]);top.sort(function(a,b){return b[1]-a[1]});
  return {ok:true,score:score,level:lvl,rate:rate,items:items,actions:act,top:top.slice(0,3),partial:!!o.partial};
}


/* ---------- orçamento sugerido ----------
   avgCat: média de gasto por categoria; fixedCat: quanto dessa média é fixo ou parcela (não dá para cortar no curto prazo);
   income: renda média; targetPct: meta de poupança. Se a média total cabe em renda x (1 - meta), o limite é a própria média
   (arredondada para cima em R$ 10). Se não cabe, só a parte variável é reduzida, na mesma proporção em todas as categorias. */
function suggestBudget(avgCat, fixedCat, income, targetPct) {
  var allowed = Math.round(income * (1 - targetPct / 100)), tot = 0, fx = 0, k, out = {}, sum = 0;
  for (k in avgCat) { var f0 = Math.min(avgCat[k], (fixedCat || {})[k] || 0); tot += avgCat[k]; fx += f0; }
  var vt = tot - fx, f = 1;
  if (income > 0 && tot > allowed && vt > 0) f = Math.max(0, (allowed - fx) / vt);
  for (k in avgCat) {
    var fk = Math.min(avgCat[k], (fixedCat || {})[k] || 0), v = fk + (avgCat[k] - fk) * f;
    out[k] = f < 1 ? Math.round(v / 1000) * 1000 : Math.ceil(v / 1000) * 1000; sum += out[k];
  }
  return { lim: out, total: sum, avg: tot, allowed: allowed, factor: f, feasible: income <= 0 || fx <= allowed };
}

/* ---------- cenário "e se": meses até cada meta guardando "monthly" e guardando "monthly + extra" (centavos) ----------
   Cada linha supõe todo o valor mensal indo para aquela meta; a linha total junta todas. Rende a rateAA, com IR regressivo. */
function whatIf(goals, monthly, extra, rateAA) {
  function mo(saved, target, pm) {
    if (saved >= target) return 0;
    if (!(pm > 0) && !(saved > 0)) return null;
    return solveMonths({ p0: saved / 100, pmt: pm / 100, growth: 0, rate: rateAA, infl: 0, ir: true, begin: false }, target / 100, 600);
  }
  var rows = [], ts = 0, tt = 0;
  goals.forEach(function (g) {
    if (!(g.target > 0)) return; ts += Math.min(g.saved, g.target); tt += g.target;
    rows.push({ name: g.name, left: Math.max(0, g.target - g.saved), m0: mo(g.saved, g.target, monthly), m1: mo(g.saved, g.target, monthly + extra) });
  });
  return { rows: rows, total: rows.length > 1 ? { left: tt - ts, m0: mo(ts, tt, monthly), m1: mo(ts, tt, monthly + extra) } : null };
}

/* ---------- sugestões de lançamento: nomes já usados, o mais frequente primeiro (empate: o mais recente) ---------- */
function normTxt(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }
function quickPicks(list, q, n) {
  var by = {}, nq = normTxt(q);
  list.forEach(function (t) {
    var key = normTxt(t.n); if (!key || t.x) return;
    if (nq && key.indexOf(nq) < 0) return;
    var o = by[key]; if (!o) o = by[key] = { cnt: 0, t: t, pre: nq && key.indexOf(nq) === 0 ? 1 : 0 };
    o.cnt++; if (t.d > o.t.d || (t.d === o.t.d && (t.u || 0) > (o.t.u || 0))) o.t = t;
  });
  var a = Object.keys(by).map(function (k) { return by[k]; });
  a.sort(function (x, y) { return y.pre - x.pre || y.cnt - x.cnt || (x.t.d < y.t.d ? 1 : x.t.d > y.t.d ? -1 : 0); });
  return a.slice(0, n || 4).map(function (o) { return o.t; });
}


/* ---------- leitor de fatura (linhas de texto extraídas do PDF) ----------
   Formato Nubank: "05 DEZ •••• 1111 Nome da loja - Parcela 2/5 R$ 100,00"; estorno e pagamento vêm com "−R$".
   Vencimento em "FATURA 22 OUT 2026"; fechamento em "Período vigente: 15 SET a 15 OUT".
   Ano de cada lançamento: o do vencimento, ou o anterior se o mês do lançamento for maior que o do vencimento (dez em fatura de jan).
   Reserva genérica para outros bancos: linhas "dd/mm descrição 1.234,56". */
var MES3 = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };
function hash32(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function parseFatura(lines, todayIso) {
  var inv = { bank: "", due: "", close: 0, dueDay: 0, total: null, items: [], pay: 0, generic: false }, m, i, l;
  for (i = 0; i < lines.length; i++) {
    l = lines[i];
    if (!inv.due && (m = /(?:^FATURA|vencimento:?)\s+(\d{2}) ([A-Z]{3}) (\d{4})/i.exec(l)) && MES3[m[2].toUpperCase()]) { inv.due = m[3] + "-" + p2(MES3[m[2].toUpperCase()]) + "-" + m[1]; inv.dueDay = +m[1]; }
    if (!inv.close && (m = /Per[ií]odo vigente: \d{2} [A-Z]{3} a (\d{2}) [A-Z]{3}/i.exec(l))) inv.close = +m[1];
    if (!inv.bank && /Nu Pagamentos|Nubank/i.test(l)) inv.bank = "Nubank";
    if (inv.total === null && (m = /^Total a pagar R\$ ([\d.]+,\d{2})$/.exec(l))) inv.total = parseMoney(m[1]);
  }
  var dy = inv.due ? +inv.due.slice(0, 4) : 0, dm = inv.due ? +inv.due.slice(5, 7) : 0;
  var re = /^(\d{2}) (JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ) (?:•••• (\d{4}) )?(.+?) ([−\-]?)R\$ ([\d.]+,\d{2})$/, fin = false;
  for (i = 0; i < lines.length; i++) {
    l = lines[i];
    if (/^Pagamentos e Financiamentos\b/.test(l)) { fin = true; continue; }
    if (!(m = re.exec(l)) || !dy) continue;
    var mon = MES3[m[2]], name = m[4].trim(), neg = !!m[5], v = parseMoney(m[6]), it = { d: (mon > dm ? dy - 1 : dy) + "-" + p2(mon) + "-" + m[1], n: name, v: v, kind: fin ? "fin" : "buy", card4: m[3] || "" };
    if (neg && /^Pagamento em \d{2} [A-Z]{3}$/.test(name)) { inv.pay++; continue; }
    var pm = /^(.*?) - Parcela (\d+)\/(\d+)$/.exec(name);
    if (pm && +pm[3] >= 1 && +pm[2] >= 1 && +pm[2] <= +pm[3]) { it.n = pm[1].trim(); it["in"] = +pm[2]; it.it = +pm[3]; }
    if (neg) { it.kind = "ref"; var rm = /^Estorno de "(.+)"$/.exec(name); if (rm) it.ref = rm[1]; }
    if (v > 0) inv.items.push(it);
  }
  if (!inv.items.length) {   /* genérico */
    var rg = /^(\d{2})\/(\d{2})(?:\/(\d{2,4}))? (.+?) (-?) ?(?:R\$ ?)?([\d.]+,\d{2})$/, t = todayIso || "9999-12-31";
    for (i = 0; i < lines.length; i++) {
      if (!(m = rg.exec(lines[i]))) continue;
      var d = +m[1], mo = +m[2]; if (d < 1 || d > 31 || mo < 1 || mo > 12) continue;
      var y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : +t.slice(0, 4), iso = y + "-" + p2(mo) + "-" + p2(d);
      if (!m[3] && iso > t) iso = (y - 1) + iso.slice(4);
      var g = { d: iso, n: m[4].trim(), v: parseMoney(m[6]), kind: m[5] ? "ref" : "buy", card4: "" };
      var gp = /^(.*?)[ \-]+(?:Parcela )?(\d{1,2})\/(\d{1,2})$/.exec(g.n);
      if (gp && +gp[3] >= 2 && +gp[2] >= 1 && +gp[2] <= +gp[3]) { g.n = gp[1].trim(); g["in"] = +gp[2]; g.it = +gp[3]; }
      if (g.v > 0 && g.n) inv.items.push(g);
    }
    inv.generic = inv.items.length > 0;
  }
  /* estorno de compra que está na mesma fatura: os dois se anulam */
  inv.items.forEach(function (r) {
    if (r.kind !== "ref" || !r.ref) return;
    for (var k = 0; k < inv.items.length; k++) { var b = inv.items[k]; if (b.kind === "buy" && !b["in"] && b.v === r.v && normTxt(b.n) === normTxt(r.ref)) { b.kind = "can"; r.kind = "can"; break; } }
  });
  return inv;
}
/* categoria provável pelo nome do estabelecimento (só quando não há histórico com o mesmo nome) */
var CAT_HINT = [
  ["Transporte", /\buber\b|^99|99app|\bposto\b|autopass|estaciona|pedagio|sem parar|metro|combust/],
  ["Restaurantes", /ifood|restaur|lanch|pizza|burger|foods?\b|padaria|\bbar\b|cafe|sushi|rappi/],
  ["Mercado", /mercado(?!li)|atacad|supermerc|carrefour|assai|hortifruti|sacolao|pao de acucar/],
  ["Assinaturas", /apple\.com|spotify|netflix|amazon prime|disney|youtube|wellhub|gympass|nucel|recarga de celular|google \*/],
  ["Viagem", /gol linhas|latam|azul linhas|booking|airbnb|decolar|hotel|pousada/],
  ["Saúde", /drog|farm|clinica|hospital|laborat|odonto/],
  ["Educação", /curso|escola|faculd|estudos|udemy|alura|livraria/],
  ["Pessoal", /shopee|renner|riachuelo|c&a|tiktok|mercadoli|amazon|magalu|shein|zara|variedades/]
];
function guessCat(name, cats) {
  var n = normTxt(name);
  for (var i = 0; i < CAT_HINT.length; i++) if (CAT_HINT[i][1].test(n) && cats.indexOf(CAT_HINT[i][0]) >= 0) return CAT_HINT[i][0];
  return cats.indexOf("Outros") >= 0 ? "Outros" : cats[cats.length - 1];
}

/* ===== FIM DO NÚCLEO ===== */
