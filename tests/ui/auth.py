import sys, json
from playwright.sync_api import sync_playwright
U,P="teste_user","7391"          # valores de teste, não são credenciais reais
errs=[]
def setup(pg,u=U,p=P):
    pg.fill("#auth [name=u]",u); pg.fill("#auth [name=p]",p); pg.fill("#auth [name=p2]",p)
    pg.click("#auth button[type=submit]")
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=b.new_context(color_scheme="light",viewport={"width":390,"height":844},device_scale_factor=2,locale="pt-BR")
    pg=ctx.new_page()
    pg.on("pageerror",lambda e: errs.append("pageerror: "+str(e)))
    pg.on("dialog",lambda d: d.accept())
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_timeout(1500)
    # 1) primeiro acesso: tela de criação, app coberto
    assert pg.is_visible("#auth") and "Crie seu acesso" in pg.inner_text("#auth")
    assert pg.inner_text("#app").strip()=="", "app não pode renderizar antes do login"
    assert pg.get_attribute(".tabbar","inert") is not None
    pg.screenshot(path="shots/auth-1-setup.png")
    # 2) validações
    def tryset(u,p,p2):
        pg.fill("#auth [name=u]",u); pg.fill("#auth [name=p]",p); pg.fill("#auth [name=p2]",p2); pg.click("#auth button[type=submit]")
        return pg.inner_text("#auth .auth-msg")
    assert "Usuário" in tryset("ab","7391","7391")
    assert "4 números" in tryset(U,"73","73")
    assert "fácil" in tryset(U,"1234","1234")
    assert "1111" not in "" and "fácil" in tryset(U,"1111","1111")
    assert "não são iguais" in tryset(U,"7391","7392")
    assert pg.is_visible("#auth")
    # 3) cria e entra
    setup(pg); pg.wait_for_selector("#auth",state="detached",timeout=5000)
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    assert pg.inner_text("#app").strip()!=""
    raw=pg.evaluate("localStorage.getItem('joint.auth')")
    a=json.loads(raw); assert a["n"]==U and len(a["h"])==64 and a["m"]==5
    assert P not in raw, "PIN não pode aparecer em texto"
    # 4) reabrir pede login, usuário preenchido, nada de dados na tela
    pg.reload(); pg.wait_for_selector("#auth"); pg.wait_for_timeout(900)
    assert "Entre com seu usuário" in pg.inner_text("#auth") and pg.input_value("#auth [name=u]")==U
    assert pg.inner_text("#app").strip()==""
    pg.screenshot(path="shots/auth-2-login.png")
    # 5) PIN errado x5 => bloqueio com contagem; PIN certo durante bloqueio é recusado
    for i in range(5):
        pg.fill("#auth [name=u]",U); pg.fill("#auth [name=p]","0000" if i<4 else "9999")
        pg.wait_for_timeout(450)
        if i<4: assert "incorretos" in pg.inner_text("#auth .auth-msg"), pg.inner_text("#auth .auth-msg")
    pg.wait_for_timeout(500)
    assert "Aguarde" in pg.inner_text("#auth .auth-msg") and pg.is_disabled("#auth button[type=submit]")
    pg.fill("#auth [name=p]",P); pg.wait_for_timeout(500)
    assert pg.is_visible("#auth"), "durante o bloqueio o PIN certo não pode entrar"
    pg.screenshot(path="shots/auth-3-bloqueio.png")
    # 6) simula fim do bloqueio; usuário em maiúsculas + PIN certo entra (auto-envio ao 4º dígito)
    pg.evaluate("var a=JSON.parse(localStorage.getItem('joint.auth'));a.t=0;localStorage.setItem('joint.auth',JSON.stringify(a))")
    pg.wait_for_timeout(700)
    pg.fill("#auth [name=u]",U.upper()); pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]",P)
    pg.wait_for_selector("#auth",state="detached",timeout=5000)
    assert json.loads(pg.evaluate("localStorage.getItem('joint.auth')"))["f"]==0
    # 7) ajustes: Bloquear agora, tempo de bloqueio, trava ao sair do app
    pg.click(".round"); pg.wait_for_selector("#sheet:not([hidden])")
    assert U in pg.inner_text("#sheetBody")
    pg.click("[data-act=lockmin][data-id='0']"); assert json.loads(pg.evaluate("localStorage.getItem('joint.auth')"))["m"]==0
    pg.click("[data-act=lock]"); pg.wait_for_selector("#auth"); assert pg.is_hidden("#sheet")
    pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]",P); pg.wait_for_selector("#auth",state="detached")
    pg.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_selector("#auth")      # m=0: bloqueia ao sair do app
    pg.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))")
    pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]",P); pg.wait_for_selector("#auth",state="detached")
    # 8) alterar PIN
    pg.click(".round"); pg.click("[data-act=pinchg]")
    def chg(p0,p1,p2):
        pg.fill("[data-f=p0]",p0); pg.fill("[data-f=p1]",p1); pg.fill("[data-f=p2]",p2); pg.click("[data-act=pinsave]"); pg.wait_for_timeout(700)
    chg("0000","5824","5824"); assert "incorreto" in pg.inner_text("#toast")
    chg(P,"5824","5825"); assert "iguais" in pg.inner_text("#toast")
    chg(P,"5824","5824"); assert "alterado" in pg.inner_text("#toast")
    pg.reload(); pg.wait_for_selector("#auth"); pg.wait_for_timeout(900)
    pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]",P); pg.wait_for_timeout(700)
    assert pg.is_visible("#auth"), "PIN antigo não pode mais valer"
    pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]","5824"); pg.wait_for_selector("#auth",state="detached")
    # dados continuam lá depois do login
    assert pg.inner_text("#app").strip()!=""
    # 9) esqueci o PIN: apaga tudo e volta à criação
    pg.evaluate("window.__joint")  # sanidade
    pg.click(".round"); pg.click("[data-act=lock]"); pg.wait_for_selector("#auth")
    pg.click("[data-auth=forgot]"); pg.wait_for_timeout(1500)
    assert "Crie seu acesso" in pg.inner_text("#auth")
    assert pg.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('joint.')===0).length")==0
    print("erros de página:",errs); assert not errs
    print("AUTH OK")
    b.close()
