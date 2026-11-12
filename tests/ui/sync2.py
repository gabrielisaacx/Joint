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
    pg.click(".round"); pg.wait_for_selector("[data-f=api]"); pg.fill("[data-f=api]",API); pg.fill("[data-f=sid]","casalteste"); pg.fill("[data-f=pin]","9911"); pg.click("[data-act=cfgsave]"); pg.wait_for_timeout(1500)
    return pg
def tx(pg,v,n,c="Mercado"):
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])"); pg.fill("[data-f=v]",v); pg.fill("[data-f=n]",n); pg.select_option("[data-f=c]",c); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
S=lambda pg:pg.evaluate("window.__joint.S()")
names=lambda pg:sorted(t["n"] for t in S(pg)["tx"] if not t.get("x"))
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    A=device(b,"a"); B=device(b,"b")
    # 1) os dois lançam sem ter baixado o do outro: ninguém apaga ninguém
    tx(A,"10,00","DoA"); tx(B,"20,00","DoB"); A.wait_for_timeout(4500)
    remote=sorted(t["n"] for t in json.loads(store["data"])["tx"]) if not store["data"].startswith("gz1:") else None
    A.evaluate("window.__joint.pull()"); A.wait_for_timeout(1500); B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500)
    assert names(A)==["DoA","DoB"]==names(B), (names(A),names(B))
    # 2) limites em categorias diferentes, editados ao mesmo tempo: os dois ficam
    def lim(pg,cat,v):
        pg.click("[data-act=tab][data-id=gastos]"); pg.locator(".catrow[data-act=cat]").filter(has_text=cat).click(); pg.fill("[data-f=v]",v); pg.click("[data-act=budsave]")
    tx(A,"5,00","L","Lazer"); A.wait_for_timeout(3500); B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500)
    lim(A,"Mercado","800,00"); lim(B,"Lazer","300,00"); A.wait_for_timeout(4500)
    A.evaluate("window.__joint.pull()"); A.wait_for_timeout(1500); B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500)
    for d in (A,B):
        v=S(d)["bud"]["v"]; assert v.get("Mercado")==80000 and v.get("Lazer")==30000, v
    # 3) remover limite num aparelho chega ao outro
    lim(A,"Mercado",""); A.wait_for_timeout(3500); B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500); assert not S(B)["bud"]["v"].get("Mercado")
    # 4) editar o mesmo lançamento nos dois: vale a edição mais recente, sem duplicar
    def edit(pg,name,v):
        pg.click("[data-act=tab][data-id=gastos]"); pg.locator("button.tx").filter(has_text=name).first.click(); pg.fill("[data-f=v]",v); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    edit(A,"DoA","11,00"); A.wait_for_timeout(300); edit(B,"DoA","12,00"); A.wait_for_timeout(4500)
    A.evaluate("window.__joint.pull()"); A.wait_for_timeout(1500); B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500)
    for d in (A,B):
        x=[t for t in S(d)["tx"] if t["n"]=="DoA" and not t.get("x")]; assert len(x)==1 and x[0]["v"]==1200, x
    # 5) excluir num, editar antes no outro: a exclusão (mais recente) vence nos dois
    edit(B,"DoB","21,00"); B.wait_for_timeout(300)
    A.click("[data-act=tab][data-id=gastos]"); A.locator("button.tx").filter(has_text="DoB").first.click(); A.click("[data-act=txdel]"); A.wait_for_timeout(4500)
    B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500); A.evaluate("window.__joint.pull()"); A.wait_for_timeout(1500)
    assert "DoB" not in names(A) and "DoB" not in names(B)
    # 6) ciclo sem novidade não redesenha a tela (não tira o foco de quem digita)
    B.click("[data-act=tab][data-id=gastos]"); B.click("#txq"); B.keyboard.type("do"); B.evaluate("window.__joint.pull()"); B.wait_for_timeout(1500)
    assert B.evaluate("document.activeElement.id")=="txq" and B.input_value("#txq")=="do"
print("erros:",errs); assert not errs; print("SYNC2 OK")
