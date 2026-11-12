/* ---------- sincronização (Google Sheets via Apps Script, igual ao app Treino) ---------- */
function SY(){try{return JSON.parse(localStorage.getItem(SYKEY))||{}}catch(e){return {}}}
var sync={st:(SY().api&&SY().id)?"idle":"off",dirty:false,timer:null,seq:0,last:0,block:false};
function post(o){return fetch(SY().api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(o)}).then(function(r){return r.json()})}
function b64(u){var r="",i;for(i=0;i<u.length;i+=8192)r+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(r)}
function pack(str){
  if(typeof CompressionStream==="undefined"||typeof Response==="undefined")return Promise.resolve(str);
  try{var cs=new CompressionStream("gzip"),w=cs.writable.getWriter();w.write(new TextEncoder().encode(str));w.close();
    return new Response(cs.readable).arrayBuffer().then(function(buf){var o="gz1:"+b64(new Uint8Array(buf));return o.length<str.length?o:str}).catch(function(){return str})}catch(e){return Promise.resolve(str)}
}
function unpack(txt){
  if(!txt||txt.indexOf("gz1:")!==0)return Promise.resolve(txt);
  if(typeof DecompressionStream==="undefined")return Promise.reject(new Error("Este navegador não abre dados compactados. Atualize o iOS/Safari."));
  var bin=atob(txt.slice(4)),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  var ds=new DecompressionStream("gzip"),w=ds.writable.getWriter();w.write(u);w.close();return new Response(ds.readable).text();
}
/* mescla por registro (id + carimbo u): o mais novo vence; exclusões viajam como lápide (x) */
function mergeList(a,b){var m={};(a||[]).forEach(function(x){m[x.id]=x});(b||[]).forEach(function(x){var y=m[x.id];if(!y||(x.u||0)>(y.u||0))m[x.id]=x});return Object.keys(m).map(function(k){return m[k]})}
/* conquistas: vale a data de desbloqueio mais antiga */
function mergeAch(a,b){var m={};(a||[]).concat(b||[]).forEach(function(x){var y=m[x.id];if(!y||(x.d||"")<(y.d||""))m[x.id]=x});return Object.keys(m).map(function(k){return m[k]})}
/* limites: mescla por categoria (t[c] = quando aquele limite mudou), para duas edições em categorias diferentes não se anularem */
function mergeBud(a,b){
  a=a||{v:{},t:{},u:0};b=b||{v:{},t:{},u:0};var o={v:{},t:{},u:Math.max(a.u||0,b.u||0)},ks={},k;
  for(k in a.v||{})ks[k]=1;for(k in b.v||{})ks[k]=1;for(k in a.t||{})ks[k]=1;for(k in b.t||{})ks[k]=1;
  for(k in ks){var ta=(a.t&&a.t[k])||((a.v&&k in a.v)?(a.u||0):-1),tb=(b.t&&b.t[k])||((b.v&&k in b.v)?(b.u||0):-1),w=tb>ta?b:a;o.v[k]=(w.v&&w.v[k])||0;o.t[k]=Math.max(ta,tb,0)}
  return o;
}
function mergeObj(a,b){return (b&&(b.u||0)>((a&&a.u)||0))?b:a}
function mergeState(L,R){
  var o=blank();
  o.cfg=mergeObj(L.cfg,R.cfg)||o.cfg;o.bud=mergeBud(L.bud,R.bud);o.sim=mergeObj(L.sim,R.sim)||null;
  ["tx","rec","goals","cont","day","cards"].forEach(function(k){o[k]=mergeList(L[k],R[k])});o.ach=mergeAch(L.ach,R.ach);
  var b=blank().cfg;for(var k in b)if(o.cfg[k]===undefined)o.cfg[k]=b[k];
  o.updatedAt=Math.max(L.updatedAt||0,R.updatedAt||0);return o;
}
function setSync(st){sync.st=st;updDot()}
function schedPush(){if(sync.st==="off")return;clearTimeout(sync.timer);sync.timer=setTimeout(pull,2500)}   /* sempre baixa e mescla antes de gravar: enviar direto apagaria da nuvem o que o outro aparelho gravou nesse meio-tempo */
