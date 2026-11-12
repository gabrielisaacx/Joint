/* ---------- criptografia ponta a ponta da sincronização ----------
   Chave AES-256 derivada da senha de criptografia com PBKDF2-SHA256 (600 mil iterações; sal = SHA-256 do código do casal).
   O aparelho guarda só a chave derivada, nunca a senha. A planilha recebe "e1:" + base64(iv de 12 bytes + texto cifrado AES-GCM).
   O código do casal entra como dado autenticado, então um pacote de outro espaço não abre. */
var E2E_IT=600000,e2eK=null,e2eKh="";
function b64d(s){var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function hexd(h){var u=new Uint8Array(h.length/2);for(var i=0;i<u.length;i++)u[i]=parseInt(h.substr(i*2,2),16);return u}
function e2eOk(){return !!(window.crypto&&window.crypto.subtle&&typeof TextEncoder!=="undefined")}
function e2eDerive(pw,id){
  var te=new TextEncoder(),cs=window.crypto.subtle;
  return cs.digest("SHA-256",te.encode("joint-e2e-v1:"+id)).then(function(salt){
    return cs.importKey("raw",te.encode(pw),"PBKDF2",false,["deriveBits"]).then(function(k){return cs.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:salt,iterations:E2E_IT},k,256)});
  }).then(function(bits){return hex(new Uint8Array(bits))});
}
function e2eKey(){
  var h=SY().k;if(!h)return Promise.resolve(null);if(e2eK&&e2eKh===h)return Promise.resolve(e2eK);
  return window.crypto.subtle.importKey("raw",hexd(h),"AES-GCM",false,["encrypt","decrypt"]).then(function(k){e2eK=k;e2eKh=h;return k});
}
function e2eAad(){return new TextEncoder().encode("joint:"+SY().id)}
function seal(str){
  return e2eKey().then(function(k){
    if(!k)return str;var iv=window.crypto.getRandomValues(new Uint8Array(12));
    return window.crypto.subtle.encrypt({name:"AES-GCM",iv:iv,additionalData:e2eAad()},k,new TextEncoder().encode(str)).then(function(ct){var c=new Uint8Array(ct),o=new Uint8Array(12+c.length);o.set(iv);o.set(c,12);return "e1:"+b64(o)});
  });
}
function unseal(txt){
  if(!txt||txt.indexOf("e1:")!==0)return Promise.resolve(txt);
  return e2eKey().then(function(k){
    if(!k)throw new Error("E2E_NOKEY");var u;try{u=b64d(txt.slice(3))}catch(e){throw new Error("E2E_FMT")}
    return window.crypto.subtle.decrypt({name:"AES-GCM",iv:u.subarray(0,12),additionalData:e2eAad()},k,u.subarray(12)).then(function(pt){return new TextDecoder().decode(pt)},function(){throw new Error("E2E_BAD")});
  });
}
function syPatch(o){var sy=SY();for(var k in o){if(o[k]===undefined)delete sy[k];else sy[k]=o[k]}try{localStorage.setItem(SYKEY,JSON.stringify(sy))}catch(e){}}
var SYERR={E2E_NOKEY:"Os dados na nuvem estão criptografados. Informe a senha de criptografia em Ajustes. Nada foi sobrescrito.",E2E_BAD:"Senha de criptografia diferente da usada no outro aparelho. Nada foi sobrescrito.",E2E_FMT:"Dados da nuvem ilegíveis. Nada foi sobrescrito; os dados deste aparelho continuam salvos."};
function push(){
  var sy=SY();if(!sy.api)return Promise.resolve();
  if(sync.block){setSync("err");toast(sync.err||"Sincronização pausada.");return Promise.resolve()}   /* nuvem não pôde ser lida: enviar agora apagaria o que o outro aparelho gravou */
  if(saveT)persist();
  var seq0=sync.seq;setSync("syncing");
  return pack(JSON.stringify(S)).then(seal).then(function(data){return post({a:"save",p:sy.id,pin:sy.pin,data:data})}).then(function(r){if(!r.ok)throw new Error(r.erro||"erro");if(sync.seq===seq0)sync.dirty=false;if(sy.k&&!sy.e)syPatch({e:1});setSync("ok")}).catch(function(e){setSync("err");toast(String(e.message||e).indexOf("PIN")>=0?"PIN incorreto.":"Sem conexão. As alterações ficam salvas no aparelho.")});
}
function pull(){
  var sy=SY();if(!sy.api)return Promise.resolve();setSync("syncing");sync.last=Date.now();sync.block=false;sync.err="";var plain=false;
  return (sync.logged?Promise.resolve({ok:true}):post({a:"login",p:sy.id,pin:sy.pin,nome:sy.id})).then(function(r){if(!r.ok)throw new Error(r.erro||"erro");sync.logged=true;return post({a:"load",p:sy.id,pin:sy.pin})}).then(function(r){
    if(!r.ok)throw new Error(r.erro||"erro");var raw=r.data||"";plain=!!raw&&raw.indexOf("e1:")!==0;return unseal(raw)
  }).then(unpack).then(function(txt){
    if(!txt)return push();
    var remote=null;try{remote=JSON.parse(txt)}catch(e){}
    if(!remote||typeof remote!=="object"||!Array.isArray(remote.tx))throw new Error("E2E_FMT");
    if(plain&&sy.k&&sy.e){toast("A nuvem tinha dados sem criptografia (outro aparelho desatualizado ou sem a senha). Regravei criptografado.");return push()}   /* não mescla texto aberto depois que a criptografia já estava valendo */
    try{localStorage.setItem("joint.backup",JSON.stringify(S))}catch(e){}
    var before=JSON.stringify(S);S=mergeState(S,remote);ensureRec();
    if(JSON.stringify(S)!==before){persist();render()}   /* só redesenha se chegou algo novo, para não tirar o foco de quem está digitando */
    return push();
  }).catch(function(e){var m=String(e.message||e);if(SYERR[m]){sync.block=true;sync.err=SYERR[m]}setSync("err");toast(SYERR[m]||(m.indexOf("PIN")>=0?"PIN incorreto.":"Não consegui sincronizar agora."))});
}
document.addEventListener("visibilitychange",function(){if(started&&document.visibilityState==="visible"&&sync.st!=="off"&&Date.now()-sync.last>20000)pull()});


