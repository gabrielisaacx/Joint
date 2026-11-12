import datetime as dt,json
from playwright.sync_api import sync_playwright
errs=[]
def ymadd(ym,k):
    y,m=int(ym[:4]),int(ym[5:]);t=y*12+m-1+k;return f"{t//12}-{t%12+1:02d}"
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=b.new_context(viewport={"width":390,"height":844},locale="pt-BR",accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e: errs.append(str(e))); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])")
    assert pg.input_value("[data-f=n0]")=="" and "Gabriel" not in pg.content() and "Dayse" not in pg.content()   # nomes genéricos no código público
    pg.fill("[data-f=n0]","Ana"); pg.fill("[data-f=n1]","Bia"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    S=lambda: pg.evaluate("window.__joint.S()"); cur=dt.date.today().strftime("%Y-%m"); prev=ymadd(cur,-1)
    def tx(k,v,c,n,date):
        pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
        if k=="i": pg.click("#sheetBody [data-id=i]")
        pg.fill("[data-f=v]",v); pg.fill("[data-f=n]",n); pg.fill("[data-f=d]",date)
        if k=="o": pg.select_option("[data-f=c]",c)
        pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    tx("i","5.000,00",None,"Salário",prev+"-05"); tx("o","2.000,00","Moradia","Aluguel",prev+"-10"); tx("o","1.500,00","Restaurantes","Jantar fora",prev+"-12"); tx("o","1.500,00","Lazer","Show",prev+"-15")
    tx("o","25,00","Transporte","Uber",cur+"-01"); tx("o","31,00","Transporte","Uber",cur+"-02")
    # 1) lançamento rápido
    pg.click(".fab"); pg.wait_for_selector("#qp .chip"); assert "Uber" in pg.inner_text("#qp")
    pg.fill("[data-f=n]","ub"); pg.wait_for_timeout(100); assert pg.locator("#qp .chip").count()==1
    pg.click("#qp .chip"); assert pg.input_value("[data-f=n]")=="Uber" and pg.input_value("[data-f=c]")=="Transporte" and pg.input_value("[data-f=v]")=="31,00"
    pg.fill("[data-f=v]","40,00"); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    assert sum(1 for t in S()["tx"] if t["n"]=="Uber")==3
    # 2) busca em todos os meses, sem perder o foco
    pg.click("[data-act=tab][data-id=gastos]"); pg.click("#txq"); pg.keyboard.type("jantar")
    assert pg.evaluate("document.activeElement.id")=="txq"; t=pg.inner_text("#txl"); assert "1 resultado" in t and "Jantar fora" in t and "Uber" not in t, t
    pg.fill("#txq","uber"); assert "3 resultados" in pg.inner_text("#txl") and "R$ 96,00" in pg.inner_text("#txl")
    pg.fill("#txq","")
    # 5) orçamento sugerido: renda 5000, meta 20% => teto 4000; média 5000 com 0 fixo => corta 20%
    pg.click("[data-act=sug]"); t=pg.inner_text("#sheetBody"); assert "R$ 4.000" in t and "20%" in t, t
    pg.click("[data-act=sugok]"); bud=S()["bud"]["v"]; assert bud["Moradia"]==160000 and bud["Restaurantes"]==120000 and sum(bud.values())==400000, bud
    # 3) categorias: tipo, renomear, excluir
    pg.click(".round"); pg.locator("[data-act=cated]").filter(has_text="Lazer").click()
    pg.select_option("[data-f=kd]","n"); pg.fill("[data-f=nm]","Diversão"); pg.click("[data-act=budsave]")
    st=S(); assert "Diversão" in st["cfg"]["cats"] and "Lazer" not in st["cfg"]["cats"] and st["cfg"]["catk"]["Diversão"]=="n"
    assert [t["c"] for t in st["tx"] if t["n"]=="Show"]==["Diversão"] and st["bud"]["v"]["Diversão"]==120000 and st["bud"]["v"]["Lazer"]==0
    pg.click(".round"); pg.locator("[data-act=cated]").filter(has_text="Presentes").click(); pg.click("[data-act=catdel]"); assert "Presentes" not in S()["cfg"]["cats"]
    # 4) e se
    pg.click("[data-act=tab][data-id=metas]"); pg.click("[data-act=goalnew]"); pg.wait_for_selector("#sheet:not([hidden])")
    pg.fill("[data-f=name]","Reserva"); pg.fill("[data-f=target]","12.000,00"); pg.click("[data-act=goalsave]"); pg.wait_for_selector("#sheet",state="hidden")
    if pg.locator("[data-act=goalback]").count(): pg.click("[data-act=goalback]")
    pg.click("[data-act=tab][data-id=metas]"); pg.click("[data-act=wif]"); pg.wait_for_selector("#wifo")
    pg.fill("[data-f=wm]","1.000,00"); t0=pg.inner_text("#wifo"); assert "Reserva" in t0 and "faltam R$ 12.000" in t0, t0
    pg.fill("[data-f=wx]","1.000,00"); t1=pg.inner_text("#wifo"); assert "Com mais R$ 1.000" in t1 and "−" in t1, t1
    print(t1.replace("\n"," | "))
    pg.click("#sheetBody [data-act=close]")
    # 7) CSV e lembrete de backup
    pg.click(".round")
    with pg.expect_download() as d: pg.click("[data-act=csv]")
    csv=open(d.value.path(),encoding="utf-8-sig",newline="").read().split("\r\n")
    assert csv[0].startswith('"Data";"Tipo";"Descrição"') and len(csv)==1+len([t for t in S()["tx"] if not t.get("x")]) and any('"Uber";"Transporte";"40,00";"Ana";"Casal"' in l for l in csv), csv[:3]
    pg.click("#sheetBody [data-act=close]")
    for i in range(4): tx("o","5,00","Outros","Café %d"%i,cur+"-03")
    pg.click("[data-act=tab][data-id=home]"); assert "ainda não fizeram backup" in pg.inner_text("#app")
    with pg.expect_download() as d: pg.click("#app [data-act=export]")
    assert json.load(open(d.value.path()))["tx"]; pg.wait_for_timeout(200); assert "ainda não fizeram backup" not in pg.inner_text("#app")
    print("W",pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
    b.close()
print("erros:",errs); assert not errs; print("FEAT OK")
