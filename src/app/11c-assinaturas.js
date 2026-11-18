/* ---------- serviços de assinatura (no lançamento em passos) ----------
   O logo vem, na hora, do ícone que o próprio site do serviço publica, buscado pelo serviço de ícones do Google.
   Nenhum logo fica guardado no código. Sem internet, ou se o ícone não carregar, aparece a inicial na cor do serviço.
   Escolher um serviço já marca o lançamento como fixo mensal. */
var SUBS=[
 ["Netflix","netflix.com","#E50914"],["YouTube Premium","youtube.com","#FF0000"],["Spotify","spotify.com","#1DB954"],["Disney+","disneyplus.com","#113CCF"],
 ["Max","max.com","#002BE7"],["Prime Video","primevideo.com","#00A8E1"],["Globoplay","globoplay.globo.com","#FB0234"],["Apple TV+","tv.apple.com","#111111"],
 ["Paramount+","paramountplus.com","#0064FF"],["Deezer","deezer.com","#A238FF"],["Apple Music","music.apple.com","#FA243C"],["Crunchyroll","crunchyroll.com","#F47521"],
 ["Smart Fit","smartfit.com.br","#FFB800"],["Wellhub","wellhub.com","#E8336F"],["Bluefit","bluefit.com.br","#0057B8"],["Strava","strava.com","#FC4C02"],
 ["iCloud","icloud.com","#3693F3"],["Google One","one.google.com","#4285F4"],["Microsoft 365","microsoft.com","#D83B01"],["ChatGPT","chatgpt.com","#10A37F"],
 ["Duolingo","duolingo.com","#58CC02"],["Amazon Prime","amazon.com.br","#00A8E1"],["Mercado Livre","mercadolivre.com.br","#FFE600"],["iFood Clube","ifood.com.br","#EA1D2C"]
];
function subLogo(s,big){
  var sz=big?44:36;
  return '<span class="slogo" style="width:'+sz+'px;height:'+sz+'px;background:'+s[2]+'"><b>'+esc(s[0].charAt(0))+'</b><img alt="" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain='+encodeURIComponent(s[1])+'&sz=128" onload="this.parentNode.classList.add(\'ok\')" onerror="this.remove()"></span>';
}
function subFind(n){var k=normTxt(n);for(var i=0;i<SUBS.length;i++)if(normTxt(SUBS[i][0])===k)return SUBS[i];return null}
function wizSubs(){
  return wizHead("Qual assinatura?")+'<div class="wgrid">'+SUBS.map(function(s,i){return '<button class="wcat" data-act="wsub" data-id="'+i+'">'+subLogo(s,true)+esc(s[0])+'</button>'}).join('')
    +'<button class="wcat" data-act="wsub" data-id="-1"><span>✏️</span>Outra</button></div><p class="note">Os logos são carregados do site de cada serviço quando há internet. A assinatura entra como fixo mensal.</p>';
}
