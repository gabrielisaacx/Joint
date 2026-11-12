/* ---------- utilidades ---------- */
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pad(n){return n<10?"0"+n:""+n}
function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function today(){return iso(new Date())}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function clone(o){return JSON.parse(JSON.stringify(o))}
var MESL=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"],MESC=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
function ymLabel(ym){return MESL[+ym.slice(5,7)-1]+" de "+ym.slice(0,4)}
function ymTitle(ym){var t=ymLabel(ym);return t.charAt(0).toUpperCase()+t.slice(1)}
function ymShort(ym){return MESL[+ym.slice(5,7)-1].slice(0,3)+"/"+ym.slice(2,4)}
function ymAdd(ym,k){var d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+k,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function dim(ym){return new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate()}
function brl(c){var v=Math.abs(c)/100;return (c<0?"−":"")+"R$ "+v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
function brl0(c){var v=Math.abs(c)/100;return (c<0?"−":"")+"R$ "+v.toLocaleString("pt-BR",{maximumFractionDigits:0})}
function brlR(v){return brl(Math.round(v*100))}
function brlR0(v){return brl0(Math.round(v*100))}
function pc(x,d){return (x*100).toLocaleString("pt-BR",{minimumFractionDigits:d||0,maximumFractionDigits:d||0})+"%"}
function nf(v,d){return Number(v).toLocaleString("pt-BR",{maximumFractionDigits:d==null?2:d})}
function fin(c){return c?(c/100).toFixed(2).replace(".",","):""}   /* centavos -> texto de input */
function fnum(v){return v?String(v).replace(".",","):""}
function ymOf(d){return String(d).slice(0,7)}
function dayLabel(d){var x=new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10));var w=["dom","seg","ter","qua","qui","sex","sáb"][x.getDay()];return w+", "+pad(x.getDate())+"/"+pad(x.getMonth()+1)}
function compact(v){var a=Math.abs(v);if(a>=1e6)return "R$ "+nf(v/1e6,1)+" mi";if(a>=1e3)return "R$ "+nf(v/1e3,a>=1e4?0:1)+" mil";return "R$ "+nf(v,0)}
function n0(v){return v>=1e6?nf(v/1e6,2)+' mi':Math.round(v).toLocaleString('pt-BR')}
function mLabel(m){if(m<24||m%12)return m+(m===1?" mês":" meses");return (m/12)+" anos"}

/* ---------- estado ---------- */
var KEY="joint.v1",MEKEY="joint.me",SYKEY="joint.sync",THKEY="joint.theme";
var EXP=["Moradia","Mercado","Restaurantes","Transporte","Saúde","Lazer","Viagem","Assinaturas","Educação","Casa","Pessoal","Presentes","Outros"];
var INC=["Salário","Extra","Rendimentos","Outros"];
var TRIP=["Passagens","Hospedagem","Alimentação","Transporte local","Passeios","Seguro viagem","Compras e lembranças"];
function blank(){return {cfg:{names:["Pessoa 1","Pessoa 2"],catk:{},split:50,saveTarget:20,cdi:13.65,infl:4.5,spread:2,goalPct:100,cats:EXP.slice(),u:0},tx:[],rec:[],goals:[],cont:[],day:[],ach:[],cards:[],bud:{v:{},t:{},u:0},sim:null,updatedAt:0}}
function load(){var d=blank();try{var r=JSON.parse(localStorage.getItem(KEY));if(r&&typeof r==="object"){for(var k in d)if(r[k]!==undefined)d[k]=r[k];var b=blank().cfg;for(k in b)if(d.cfg[k]===undefined)d.cfg[k]=b[k]}}catch(e){}return d}
var S=load(),saveT=null;
function persist(){clearTimeout(saveT);saveT=null;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function save(){S.updatedAt=Date.now();sync.dirty=true;sync.seq++;if(!saveT)saveT=setTimeout(persist,250);schedPush();updDot()}
window.addEventListener("pagehide",function(){if(saveT)persist()});
function ME(){var m=parseInt(localStorage.getItem(MEKEY),10);return m===1?1:0}
function hasMe(){return localStorage.getItem(MEKEY)!==null}
function NM(i){return S.cfg.names[i]||("Pessoa "+(i+1))}
function find(list,id){for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return null}
function upsert(list,o){o.u=Date.now();for(var i=0;i<list.length;i++)if(list[i].id===o.id){list[i]=o;return}list.push(o)}
function del(list,id){var o=find(list,id);if(o){o.x=1;o.u=Date.now()}}
function live(list){return list.filter(function(x){return !x.x})}
var tab="home",month=today().slice(0,7),whoF=-1,goalId=null,draft=null,sheetKind="";

