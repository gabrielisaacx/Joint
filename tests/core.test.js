const fs=require("fs"),vm=require("vm"),assert=require("assert");
const ctx={};vm.createContext(ctx);const html=fs.readFileSync(__dirname+"/../index.html","utf8");const a=html.indexOf("/* ===== NÚCLEO FINANCEIRO"),b=html.indexOf("/* ===== FIM DO NÚCLEO");if(a<0||b<0)throw new Error("núcleo não encontrado no index.html");vm.runInContext(html.slice(a,b),ctx);
const {simulate,solvePmt,solveMonths,fvClosed,mRate,irRate,shares,balance,parseMoney}=ctx;
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
console.log("\n"+n+" testes passaram");
