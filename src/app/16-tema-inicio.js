/* ---------- tema e início ---------- */
function applyTheme(){var t=localStorage.getItem(THKEY)||"auto";if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t)}
applyTheme();
document.addEventListener("DOMContentLoaded",function(){});
function startApp(){
  ensureRec();render();
  if(!hasMe())openWelcome();
  if(sync.st!=="off")pull();
}
function boot(){
  if("serviceWorker" in navigator&&location.protocol.indexOf("http")===0)navigator.serviceWorker.register("sw.js").catch(function(){});
  showAuth(AU().h?"login":"setup");
  var sp=$("#splash");if(sp){setTimeout(function(){sp.classList.add("out");setTimeout(function(){if(sp.parentNode)sp.parentNode.removeChild(sp)},450)},Math.max(0,800-performance.now()))}
}
boot();
window.__joint={S:function(){return S},sync:function(){return {st:sync.st,block:sync.block,err:sync.err||""}},pull:function(){return pull()}}; /* ajuda de depuração */
})();
