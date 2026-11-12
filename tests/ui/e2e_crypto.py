import json
from playwright.sync_api import sync_playwright
API="https://fake.joint.test/exec"; store={"data":"","pin":None,"saves":0}; errs=[]
def handler(route):
    r=json.loads(route.request.post_data or "{}")
    if store["pin"] is None and r.get("a")=="login": store["pin"]=r["pin"]; out={"ok":True,"novo":True}
    elif r.get("pin")!=store["pin"]: out={"ok":False,"erro":"PIN incorreto."}
    elif r["a"]=="login": out={"ok":True}
    elif r["a"]=="save": store["data"]=r["data"]; store["saves"]+=1; out={"ok":True}
    elif r["a"]=="load": out={"ok":True,"data":store["data"]}
    route.fulfill(status=200,content_type="application/json",body=json.dumps(out))
def device(b,name):
    pg=b.new_context(viewport={"width":390,"height":844},locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append(name+": "+str(e)))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort()); pg.route(API,handler)
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_"+name); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    return pg
def tx(pg,v,n):
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])"); pg.fill("[data-f=v]",v); pg.fill("[data-f=n]",n); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
def connect(pg,epw):
    pg.click(".round"); pg.wait_for_selector("[data-f=api]"); pg.fill("[data-f=api]",API); pg.fill("[data-f=sid]","casalteste"); pg.fill("[data-f=pin]","9911")
    if epw is not None: pg.fill("[data-f=epw]",epw)
    pg.click("[data-act=cfgsave]"); pg.wait_for_timeout(3500)
names=lambda pg:sorted(t["n"] for t in pg.evaluate("window.__joint.S()")["tx"] if not t.get("x"))
toast=lambda pg:pg.evaluate("window.__joint.sync().err+' | '+document.querySelector('#toast').textContent")
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    # 0) aparelho antigo/sem senha grava texto aberto
    P=device(b,"p"); tx(P,"10,00","Aberto"); connect(P,None)
    assert store["data"] and not store["data"].startswith("e1:"), store["data"][:20]
    # 1) A liga a criptografia: mescla o que estava aberto e regrava cifrado
    A=device(b,"a"); tx(A,"50,00","DoA"); connect(A,"senha-forte-123")
    assert store["data"].startswith("e1:") and "DoA" not in store["data"] and "Aberto" not in store["data"], store["data"][:30]
    assert names(A)==["Aberto","DoA"], names(A)
    c1=store["data"]
    # 2) B com a mesma senha recebe tudo e continua cifrado
    B=device(b,"b"); tx(B,"20,00","DoB"); connect(B,"senha-forte-123")
    assert names(B)==["Aberto","DoA","DoB"], names(B); assert store["data"].startswith("e1:") and store["data"]!=c1
    c2=store["data"]; n2=store["saves"]
    # 3) senha errada: avisa, não mescla e não sobrescreve, mesmo depois de lançar
    C=device(b,"c"); tx(C,"30,00","DoC"); connect(C,"senha-errada-999")
    assert "diferente" in toast(C), toast(C); tx(C,"31,00","DoC2"); C.wait_for_timeout(3200)
    assert store["data"]==c2 and store["saves"]==n2 and names(C)==["DoC","DoC2"]
    # 4) sem senha: avisa que está criptografado e não sobrescreve
    D=device(b,"d"); tx(D,"40,00","DoD"); connect(D,None)
    assert "criptografad" in toast(D), toast(D); tx(D,"41,00","DoD2"); D.wait_for_timeout(3200)
    assert store["data"]==c2 and store["saves"]==n2
    # 5) senha curta é recusada
    E=device(b,"e"); connect(E,"curta"); assert "8 caracteres" in toast(E), toast(E)
    # 6) nuvem adulterada/ilegível não é sobrescrita
    store["data"]="e1:AAAA"+c2[7:]; A.evaluate("window.__joint.pull()"); A.wait_for_timeout(2500); assert store["saves"]==n2 and names(A)==["Aberto","DoA"]
    store["data"]=c2
    # 7) texto aberto depois que a criptografia já valia: não mescla, regrava cifrado
    store["data"]=json.dumps({"cfg":{},"tx":[{"id":"zz","k":"o","v":1,"d":"2026-01-01","c":"Outros","w":0,"s":0,"n":"Injetado","u":9e15}]})
    B.evaluate("window.__joint.pull()"); B.wait_for_timeout(3000); assert "Injetado" not in names(B) and store["data"].startswith("e1:")
    # 8) chave fica no aparelho só derivada, nunca a senha
    sy=B.evaluate("localStorage.getItem('joint.sync')"); assert "senha-forte" not in sy and len(json.loads(sy)["k"])==64
print("erros:",errs); assert not errs; print("CRYPTO OK")
