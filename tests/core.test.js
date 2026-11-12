const fs=require("fs"),vm=require("vm"),assert=require("assert");
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+"/../src/core.js","utf8"),ctx);
const {simulate,solvePmt,solveMonths,fvClosed,mRate,irRate,shares,balance,parseMoney,dayAdd,dayDiff,logStreak,planStreak,milestones,streakScan,addMonths,invoiceOf,splitParcelas,parcelPV,parcelRate,diagnose,suggestBudget,whatIf,quickPicks,normTxt}=ctx;
let n=0;function ok(name,f){f();n++;console.log("ok -",name)}
const near=(a,b,t,m)=>assert(Math.abs(a-b)<=t,(m||"")+" "+a+" vs "+b);

ok("taxa mensal equivalente: (1+i)^12 = 1+a",()=>near(Math.pow(1+mRate(.1365),12),1.1365,1e-12));
ok("sem IR, fim do mês, sem reajuste = fórmula fechada (12, 24, 240 meses)",()=>{
  [12,24,240].forEach(m=>{const s=simulate({p0:1000,pmt:500,growth:0,rate:.12,infl:0,months:m,ir:false,begin:false});
    near(s.gross[m],fvClosed(1000,500,.12,m),1e-6,"m="+m); near(s.inv[m],1000+500*m,1e-9)})});
ok("taxa zero: saldo = total investido",()=>{const s=simulate({p0:0,pmt:100,rate:0,months:36,ir:true});near(s.net[36],3600,1e-9)});
ok("IR: lote único 24 meses (730 dias => 15%)",()=>{
  const s=simulate({p0:10000,pmt:0,rate:.12,months:24,ir:true});const g=10000*Math.pow(1.12,2)-10000;near(s.net[24],10000+g*(1-.15),1e-6)});
ok("IR: faixas por dias",()=>{assert.equal(irRate(180),.225);assert.equal(irRate(181),.2);assert.equal(irRate(360),.2);assert.equal(irRate(361),.175);assert.equal(irRate(720),.175);assert.equal(irRate(721),.15)});
ok("IR: 12 meses (365 dias) cai na faixa de 17,5%",()=>{
  const s=simulate({p0:10000,pmt:0,rate:.10,months:12,ir:true});near(s.net[12],10000+1000*(1-.175),1e-6)});
ok("aporte no início rende um mês a mais",()=>{
  const a=simulate({p0:0,pmt:100,rate:.12,months:12,begin:true}).gross[12],b=simulate({p0:0,pmt:100,rate:.12,months:12,begin:false}).gross[12];near(a,b*(1+mRate(.12)),1e-9)});
ok("reajuste anual do aporte (mês 13 = aporte*(1+g))",()=>{
  const s=simulate({p0:0,pmt:100,growth:.1,rate:0,months:24});near(s.inv[24],1200+1320,1e-9)});
ok("valor real = líquido deflacionado",()=>{
  const s=simulate({p0:1000,pmt:0,rate:.1,infl:.05,months:12,ir:false});near(s.real[12],1100/1.05,1e-9)});
ok("solvePmt devolve o aporte que atinge a meta (com IR e reajuste)",()=>{
  const p={p0:2000,growth:.05,rate:.1365,infl:.045,months:30,ir:true,begin:false};const pm=solvePmt(p,30000);
  near(simulate(Object.assign({},p,{pmt:pm})).net[30],30000,0.01);assert(simulate(Object.assign({},p,{pmt:pm*0.99})).net[30]<30000)});
ok("solvePmt = 0 quando o saldo inicial já basta",()=>assert.equal(solvePmt({p0:50000,rate:.1,months:12,ir:false},1000),0));
ok("solveMonths coerente com simulate",()=>{
  const p={p0:0,pmt:1000,rate:.12,months:0,ir:false};const m=solveMonths(p,50000,600);
  const s=simulate(Object.assign({},p,{months:600}));assert(s.net[m]>=50000&&s.net[m-1]<50000)});
ok("solveMonths = null quando não chega",()=>assert.strictEqual(solveMonths({p0:0,pmt:1,rate:0,months:0},1e9,100),null));
ok("divisão 50/50 e acerto",()=>{
  const L=[{k:"o",v:10000,w:0,s:0}];assert.equal(balance(L,50),5000); // B deve 50,00 a A
  L.push({k:"t",v:5000,w:1});assert.equal(balance(L,50),0)});
ok("divisão: só de quem pagou, só do outro e 60/40",()=>{
  assert.equal(balance([{k:"o",v:10000,w:0,s:1}],50),0);
  assert.equal(balance([{k:"o",v:10000,w:0,s:2}],50),10000);
  assert.equal(balance([{k:"o",v:10001,w:1,s:0}],60),-Math.round(10001*.6));
  assert.deepEqual(shares({v:10001,w:0,s:0},60),[6001,4000])});
ok("receitas e tombstones não entram no saldo",()=>assert.equal(balance([{k:"i",v:9999,w:0},{k:"o",v:100,w:0,s:0,x:1}],50),0));
ok("parseMoney",()=>{[["1.234,56",123456],["R$ 50",5000],["12,5",1250],["12.5",1250],["1.234",123400],["2.500.000",250000000],["",0],["abc",0],["0,99",99]].forEach(([i,o])=>assert.equal(parseMoney(i),o,i))});

/* ---------- gamificação ---------- */
const D=(...a)=>{const o={};a.forEach(d=>o[d]=true);return o};
ok("datas: virada de mês/ano, ano bissexto e diferença em dias",()=>{
  assert.equal(dayAdd("2026-02-28",1),"2026-03-01");assert.equal(dayAdd("2028-02-28",1),"2028-02-29");assert.equal(dayAdd("2026-12-31",1),"2027-01-01");assert.equal(dayAdd("2026-03-01",-1),"2026-02-28");
  assert.equal(dayDiff("2026-11-10","2027-01-23"),74);assert.equal(dayDiff("2026-11-10","2026-11-10"),0);assert.equal(dayDiff("2026-11-10","2026-11-09"),-1)});
ok("sequência de registro: dias seguidos até hoje",()=>{
  const r=logStreak(D("2026-11-03","2026-11-04","2026-11-05"),"2026-11-05");assert.deepEqual([r.n,r.best,r.doneNow],[3,3,true])});
ok("sequência: hoje ainda em aberto não quebra (ontem vale)",()=>{
  const r=logStreak(D("2026-11-03","2026-11-04"),"2026-11-05");assert.deepEqual([r.n,r.best,r.doneNow],[2,2,false])});
ok("sequência: uma falha isolada no trimestre é perdoada e não conta como dia",()=>{
  const r=logStreak(D("2026-11-03","2026-11-04","2026-11-06","2026-11-07"),"2026-11-07");assert.deepEqual([r.n,r.best,r.freezeUsed],[4,4,true])});
ok("sequência: segunda falha no mesmo trimestre zera",()=>{
  const r=logStreak(D("2026-11-01","2026-11-02","2026-11-04","2026-11-06","2026-11-07"),"2026-11-07");assert.deepEqual([r.n,r.best],[2,3])});
ok("sequência: duas falhas seguidas zeram",()=>{
  const r=logStreak(D("2026-11-01","2026-11-02","2026-11-05"),"2026-11-05");assert.deepEqual([r.n,r.best],[1,2])});
ok("sequência: a folga renova a cada trimestre (31/12 e 03/01 perdoados)",()=>{
  const r=logStreak(D("2026-12-30","2027-01-01","2027-01-02","2027-01-04"),"2027-01-04");assert.deepEqual([r.n,r.best],[4,4])});
ok("sequência: sem registros = zero",()=>{const r=logStreak({},"2026-11-05");assert.deepEqual([r.n,r.best,r.doneNow],[0,0,false])});
ok("sequência: dias futuros são ignorados",()=>{const r=logStreak(D("2026-11-05","2026-11-20"),"2026-11-05");assert.equal(r.n,1)});
ok("meses no plano: o mês atual não entra e a folga é semestral",()=>{
  let r=planStreak({"2026-01":true,"2026-02":true,"2026-03":true,"2026-04":true,"2026-05":true},"2026-01","2026-05");assert.deepEqual([r.n,r.best],[4,4]);
  r=planStreak({"2026-01":true,"2026-02":true,"2026-04":true},"2026-01","2026-05");assert.deepEqual([r.n,r.best,r.freezeUsed],[3,3,true]);
  r=planStreak({"2026-01":true,"2026-02":true,"2026-04":true},"2026-01","2026-07");assert.deepEqual([r.n,r.best],[0,3],"mar perdoado; mai é a 2ª falha do semestre e zera");
  r=planStreak({},"2026-01","2026-01");assert.deepEqual([r.n,r.best],[0,0])});
ok("marcos da meta: data do aporte que cruzou, valor inicial e meta zero",()=>{
  const c=[{d:"2026-02-10",v:3000},{d:"2026-01-10",v:3000}];
  let m=milestones(0,c,10000,[25,50,75,100]);
  assert.deepEqual(m.map(x=>x.reached),[true,true,false,false]);assert.equal(m[0].date,"2026-01-10");assert.equal(m[1].date,"2026-02-10");assert.equal(m[1].amt,5000);
  m=milestones(8000,c,10000,[25,50,75,100]);assert.deepEqual(m.map(x=>x.reached),[true,true,true,true]);assert.equal(m[2].date,null);
  assert.equal(milestones(0,c,0,[25]).every(x=>!x.reached),true)});

/* ---------- parcelas e cartão ---------- */
ok("addMonths: não estoura o fim do mês e vira o ano",()=>{
  assert.equal(addMonths("2026-01-31",1),"2026-02-28");assert.equal(addMonths("2028-01-31",1),"2028-02-29");assert.equal(addMonths("2026-11-10",3),"2027-02-10");assert.equal(addMonths("2026-03-31",-1),"2026-02-28");assert.equal(addMonths("2026-11-10",0),"2026-11-10")});
ok("fatura: dia do fechamento fica na fatura do mês; o dia seguinte vai para a próxima",()=>{
  let r=invoiceOf("2026-11-05",5,12);assert.deepEqual([r.m,r.due],["2026-11","2026-11-12"]);
  r=invoiceOf("2026-11-06",5,12);assert.deepEqual([r.m,r.due],["2026-12","2026-12-12"])});
ok("fatura: vencimento antes do fechamento cai no mês seguinte (fecha 25, vence 5)",()=>{
  let r=invoiceOf("2026-11-20",25,5);assert.deepEqual([r.m,r.due],["2026-12","2026-12-05"]);
  r=invoiceOf("2026-11-28",25,5);assert.deepEqual([r.m,r.due],["2027-01","2027-01-05"]);
  r=invoiceOf("2026-12-28",25,5);assert.deepEqual([r.m,r.due],["2027-02","2027-02-05"])});
ok("fatura: vencimento 28 em fevereiro usa o último dia",()=>{const r=invoiceOf("2027-02-01",1,28);assert.equal(r.due,"2027-02-28")});
ok("parcelas: soma exata e centavos que sobram na primeira",()=>{
  assert.deepEqual(splitParcelas(10001,3),[3335,3333,3333]);assert.deepEqual(splitParcelas(10000,4),[2500,2500,2500,2500]);
  [[99999,7],[1,3],[300000,10],[12345,48]].forEach(([t,n])=>assert.equal(splitParcelas(t,n).reduce((a,b)=>a+b,0),t))});
ok("valor presente do parcelado: taxa zero = total; maior taxa = menor valor; n=1 fecha em fórmula",()=>{
  near(parcelPV(120000,12,0),120000,1e-6);
  assert(parcelPV(120000,12,.1365)<parcelPV(120000,12,.08));assert(parcelPV(120000,12,.1365)<120000);
  const g=Math.pow(1.12,1/12)-1;near(parcelPV(100000,1,.12),100000/(1+g*(1-.225)),1e-6)});
ok("taxa implícita: à vista = total => nenhuma; com desconto fecha a equação",()=>{
  assert.strictEqual(parcelRate(120000,120000,12),null);
  const i=parcelRate(100000,120000,12);assert(i>0);let s=0;splitParcelas(120000,12).forEach((p,k)=>s+=p/Math.pow(1+i,k+1));near(s,100000,1e-3)});
ok("diagnóstico: sem renda => não analisa",()=>assert.strictEqual(diagnose({inc:0,exp:100,fixed:0,cat:{}}).ok,false));
ok("diagnóstico: saudável (poupa 25%, fixos 30%, reserva 6m) => Boa",()=>{
  const d=diagnose({inc:1000000,exp:750000,fixed:300000,cat:{Moradia:300000,Mercado:150000,Lazer:100000,Restaurantes:50000},saveTarget:20,reserveM:6,reserveAvg:750000,prev:[{exp:760000,cat:{}}]});
  assert.strictEqual(d.level,"Boa");assert(d.score>=90,d.score);assert.strictEqual(d.actions.length,0)});
ok("diagnóstico: gastou mais que ganhou => Crítica (nota limitada a 49) e ação de corte",()=>{
  const d=diagnose({inc:500000,exp:600000,fixed:350000,cat:{Moradia:300000,Lazer:200000},saveTarget:20,reserveM:0.5,reserveAvg:600000});
  assert.strictEqual(d.level,"Crítica");assert(d.score<=49);assert(d.rate<0);
  assert(d.items.find(i=>i.id==="save").sev==="bad");assert(d.actions.some(a=>/faltam R\$ 2\.000/.test(a)),d.actions.join("|"))});
ok("diagnóstico: faixa intermediária (poupa 10%, fixos 45%) => Atenção",()=>{
  const d=diagnose({inc:1000000,exp:900000,fixed:450000,cat:{Moradia:450000,Mercado:100000,Lazer:200000,Restaurantes:100000,Outros:50000},saveTarget:20});
  assert.strictEqual(d.level,"Atenção",d.score);assert.strictEqual(d.items.find(i=>i.id==="fixed").sev,"warn");assert.strictEqual(d.items.find(i=>i.id==="save").sev,"warn")});
ok("diagnóstico: detecta categoria que subiu e limite estourado",()=>{
  const d=diagnose({inc:1000000,exp:800000,fixed:0,cat:{Restaurantes:300000,Mercado:100000},bud:{Mercado:80000},saveTarget:20,prev:[{exp:600000,cat:{Restaurantes:100000,Mercado:100000}}]});
  assert(d.items.find(i=>i.id==="up").txt.includes("Restaurantes"));assert(d.items.find(i=>i.id==="bud").txt.includes("Mercado"))});
ok("diagnóstico: mês em aberto não pontua tendência (gasto parcial x média de meses inteiros)",()=>{
  const b={inc:1000000,exp:300000,fixed:0,cat:{Mercado:300000},saveTarget:20,prev:[{exp:800000,cat:{}}]};
  const f=diagnose(b).items.find(i=>i.id==="trend"),pt=diagnose(Object.assign({partial:true},b)).items.find(i=>i.id==="trend");
  assert.strictEqual(f.max,10);assert.strictEqual(pt.max,0);assert.strictEqual(pt.pts,0);assert(/mês fechado/.test(pt.txt))});
ok("diagnóstico: reserva usa plural correto",()=>{
  const d=diagnose({inc:1000000,exp:500000,fixed:0,cat:{},reserveM:4.5,reserveAvg:500000});assert(/4,5 meses de gastos/.test(d.items.find(i=>i.id==="reserve").txt))});
ok("orçamento sugerido: cabe na renda => limite = média arredondada para cima em R$ 10",()=>{
  const r=suggestBudget({Moradia:200000,Mercado:81234},{Moradia:200000},500000,20);
  assert.strictEqual(r.factor,1);assert.strictEqual(r.lim.Moradia,200000);assert.strictEqual(r.lim.Mercado,82000)});
ok("orçamento sugerido: não cabe => corta só a parte variável, na mesma proporção, e fecha no teto",()=>{
  const r=suggestBudget({Moradia:200000,Mercado:150000,Lazer:150000},{Moradia:200000},500000,20);
  assert.strictEqual(r.allowed,400000);assert.strictEqual(r.lim.Moradia,200000);assert.strictEqual(r.lim.Mercado,100000);assert.strictEqual(r.lim.Lazer,100000);assert.strictEqual(r.total,400000);assert(r.feasible)});
ok("orçamento sugerido: fixos acima do teto => inviável, variáveis zeradas",()=>{
  const r=suggestBudget({Moradia:450000,Lazer:50000},{Moradia:450000},500000,20);assert.strictEqual(r.feasible,false);assert.strictEqual(r.lim.Lazer,0)});
ok("e se: sem juros, meses = falta / aporte; extra encurta",()=>{
  const r=whatIf([{name:"A",target:1200000,saved:0},{name:"B",target:600000,saved:600000}],100000,100000,0);
  assert.strictEqual(r.rows[0].m0,12);assert.strictEqual(r.rows[0].m1,6);assert.strictEqual(r.rows[1].m0,0);assert.strictEqual(r.total.m0,12)});
ok("e se: sem aporte e sem saldo => não chega (null); com juros chega antes",()=>{
  assert.strictEqual(whatIf([{name:"A",target:100000,saved:0}],0,0,0).rows[0].m0,null);
  assert.strictEqual(whatIf([{name:"A",target:12000000,saved:0}],100000,0,0).rows[0].m0,120);assert(whatIf([{name:"A",target:12000000,saved:0}],100000,0,0.12).rows[0].m0<100)});
ok("sugestões de lançamento: ignora acento/maiúscula, prefixo primeiro, mais frequente primeiro, devolve o mais recente",()=>{
  const L=[{n:"Uber",d:"2026-01-01",c:"Transporte",v:1},{n:"uber",d:"2026-02-01",c:"Transporte",v:2},{n:"Pão de Açúcar",d:"2026-02-02",c:"Mercado",v:3},{n:"Subway",d:"2026-02-03",c:"Restaurantes",v:4},{n:"",d:"2026-02-04"}];
  assert.strictEqual(quickPicks(L,"",4).map(t=>t.v).join(),"2,4,3");
  assert.strictEqual(quickPicks(L,"ub",4).map(t=>t.v).join(),"2,4");
  assert.strictEqual(quickPicks(L,"acu",4).map(t=>t.v).join(),"3");assert.strictEqual(normTxt(" São João "),"sao joao")});
ok("diagnóstico: classificação de categoria configurável (Pets como essencial)",()=>{
  const b={inc:1000000,exp:600000,fixed:0,cat:{Pets:600000},saveTarget:20};
  assert.strictEqual(diagnose(b).items.find(i=>i.id==="rule"),undefined);
  assert.strictEqual(diagnose(Object.assign({kind:{Pets:"n"}},b)).items.find(i=>i.id==="rule").sev,"warn")});
console.log("\n"+n+" testes passaram");
