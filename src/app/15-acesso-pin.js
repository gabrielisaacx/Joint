/* ---------- acesso: usuário + PIN de 4 dígitos (trava local do aparelho) ----------
   Guarda só um hash PBKDF2 (usuário+PIN, sal aleatório). Os dados continuam no aparelho; isto impede o uso por quem pega o celular. */
var AUKEY="joint.auth",started=false,hiddenAt=0,authMode="",cdT=null;
function AU(){try{return JSON.parse(localStorage.getItem(AUKEY))||{}}catch(e){return {}}}
function auPut(o){try{localStorage.setItem(AUKEY,JSON.stringify(o))}catch(e){}}
function hex(u){var s="";for(var i=0;i<u.length;i++)s+=("0"+u[i].toString(16)).slice(-2);return s}
function rnd(n){var u=new Uint8Array(n);window.crypto.getRandomValues(u);return hex(u)}
function weak(str,salt){var h1=0xdeadbeef,h2=0x41c6ce57,t=salt+"|"+str;for(var r=0;r<5000;r++)for(var i=0;i<t.length;i++){var c=t.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);return "w"+(h1>>>0).toString(16)+(h2>>>0).toString(16)}
function hashPin(user,pin,salt,wk){
  var sub=window.crypto&&window.crypto.subtle;
  if(!sub||wk)return Promise.resolve(weak(user+":"+pin,salt));
  var enc=new TextEncoder();
  return sub.importKey("raw",enc.encode(user+":"+pin),"PBKDF2",false,["deriveBits"]).then(function(k){return sub.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:150000},k,256)}).then(function(b){return hex(new Uint8Array(b))});
}
function waitLeft(){return Math.max(0,(AU().t||0)-Date.now())}
function setInert(on){$$(".wrap,.tabbar,#sheet,#toast").forEach(function(e){if(on){e.setAttribute("inert","");e.setAttribute("aria-hidden","true")}else{e.removeAttribute("inert");e.removeAttribute("aria-hidden")}})}
function showAuth(mode){
  authMode=mode;var a=AU(),setup=mode==="setup";
  var el=$("#auth");if(!el){el=document.createElement("div");el.id="auth";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Acesso ao Joint");document.body.appendChild(el)}
  el.innerHTML='<form class="auth-in" novalidate autocomplete="on"><img class="auth-logo" src="icon-512.png" alt="">'
    +'<h2>Joint</h2><p class="auth-sub">'+(setup?'Crie seu acesso a este aparelho. Escolha um usuário e um PIN de 4 números.':'Entre com seu usuário e PIN.')+'</p>'
    +'<label class="af">Usuário<input name="u" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" maxlength="24" value="'+(setup?'':esc(a.n||""))+'"></label>'
    +'<label class="af">PIN<input class="pin" name="p" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="'+(setup?'new-password':'current-password')+'" placeholder="••••"></label>'
    +(setup?'<label class="af">Repita o PIN<input class="pin" name="p2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" placeholder="••••"></label>':'')
    +'<p class="auth-msg" role="alert" aria-live="assertive"></p>'
    +'<button class="btn full" type="submit">'+(setup?'Criar acesso':'Entrar')+'</button>'
    +(setup?'':'<button class="auth-link" type="button" data-auth="forgot">Esqueci o PIN</button>')
    +'</form>';
  setInert(true);document.body.classList.add("noscroll");
  var f=$("#auth form");f.addEventListener("submit",authSubmit);
  $$("#auth .pin").forEach(function(i){i.addEventListener("input",function(){i.value=i.value.replace(/\D/g,"").slice(0,4);if(!setup&&i.value.length===4&&f.elements.u.value.trim())f.requestSubmit?f.requestSubmit():authSubmit({preventDefault:function(){},target:f})})});
  var fg=$('#auth [data-auth="forgot"]');if(fg)fg.addEventListener("click",authForgot);
  setTimeout(function(){var t=(setup||!a.n)?f.elements.u:f.elements.p;if(t)t.focus()},60);
  if(!setup)countdown();
}
function countdown(){
  clearInterval(cdT);
  function t(){var m=$("#auth .auth-msg"),b=$("#auth button[type=submit]");if(!m||!b){clearInterval(cdT);return}var w=waitLeft();
    if(w<=0){clearInterval(cdT);if(/Aguarde/.test(m.textContent))m.textContent="";b.disabled=false;return}
    var s=Math.ceil(w/1000);b.disabled=true;m.textContent="Muitas tentativas. Aguarde "+Math.floor(s/60)+":"+pad(s%60)+".";}
  t();if(waitLeft()>0)cdT=setInterval(t,500);
}
function authOpen(){
  var el=$("#auth");if(el)el.remove();clearInterval(cdT);setInert(false);document.body.classList.remove("noscroll");
  if(!started){started=true;startApp()}
}
function authSubmit(ev){
  ev.preventDefault();
  var f=ev.target,u=f.elements.u.value.trim(),p=f.elements.p.value,msg=$("#auth .auth-msg"),btn=$("#auth button[type=submit]");
  function say(t){msg.textContent=t}
  if(authMode==="setup"){
    if(!/^[A-Za-z0-9_.-]{3,24}$/.test(u))return say("Usuário: de 3 a 24 caracteres (letras, números, _ . -).");
    if(!/^\d{4}$/.test(p))return say("O PIN precisa ter exatamente 4 números.");
    if(/^(\d)\1{3}$/.test(p)||p==="1234"||p==="4321")return say("PIN fácil demais. Escolha outro.");
    if(p!==f.elements.p2.value)return say("Os dois PINs não são iguais.");
    var salt=rnd(16);btn.disabled=true;
    hashPin(u.toLowerCase(),p,salt).then(function(h){var o=AU();auPut({n:u,s:salt,h:h,m:o.m==null?5:o.m,f:0,t:0});authOpen()}).catch(function(){btn.disabled=false;say("Não consegui criar o acesso neste navegador.")});
    return;
  }
  if(waitLeft()>0){countdown();return}
  if(!u||p.length!==4)return say("Informe o usuário e o PIN de 4 números.");
  var a=AU();btn.disabled=true;
  hashPin(u.toLowerCase(),p,a.s,String(a.h).charAt(0)==="w").then(function(h){
    var cur=AU();
    if(h===cur.h){cur.f=0;cur.t=0;auPut(cur);authOpen();return}
    cur.f=(cur.f||0)+1;if(cur.f%5===0)cur.t=Date.now()+Math.min(900000,30000*Math.pow(2,cur.f/5-1));auPut(cur);
    f.elements.p.value="";btn.disabled=false;
    if(cur.t&&cur.t>Date.now()){countdown()}else{say("Usuário ou PIN incorretos. "+(5-cur.f%5)+" tentativa(s) antes do bloqueio temporário.");f.elements.p.focus()}
  }).catch(function(){btn.disabled=false;say("Erro ao verificar. Tente de novo.")});
}
function authForgot(){
  if(!confirm("Esqueci o PIN\n\nIsso apaga TODOS os dados e ajustes deste aparelho, inclusive a sincronização, e você cria um novo acesso. Se usa sincronização, reconecte depois para trazer os dados de volta. Continuar?"))return;
  Object.keys(localStorage).filter(function(k){return k.indexOf("joint.")===0}).forEach(function(k){localStorage.removeItem(k)});
  location.reload();
}
function lockNow(){closeSheet();if(AU().h)showAuth("login")}
document.addEventListener("visibilitychange",function(){
  if(!started)return;var a=AU(),m=a.m==null?5:a.m;
  if(document.visibilityState==="hidden"){hiddenAt=Date.now();if(m===0)lockNow()}
  else if(a.h&&!$("#auth")&&m>0&&Date.now()-hiddenAt>=m*60000)lockNow();
});
function openPin(){sheetKind="pin";openSheet('<h3>Alterar PIN</h3><label class="f">PIN atual<input type="password" inputmode="numeric" maxlength="4" autocomplete="current-password" data-f="p0"></label><div class="grid2"><label class="f">Novo PIN<input type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" data-f="p1"></label><label class="f">Repita<input type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" data-f="p2"></label></div><button class="btn full" data-act="pinsave">Salvar novo PIN</button><button class="btn sec full" data-act="close">Cancelar</button>')}

