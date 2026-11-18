import datetime as dt
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append(str(e))); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    S=lambda: pg.evaluate("window.__joint.S()")
    # receita pelo fluxo
    pg.click(".fab"); pg.click("[data-act=wk2][data-id=i]"); pg.click("[data-act=wcat][data-id='Salário']")
    for k in "500000": pg.click(f"[data-act=wkey][data-id='{k}']")
    assert pg.inner_text("#wval")=="R$ 5.000,00"; pg.click("#wok"); pg.click("[data-act=wday][data-id='5']"); pg.wait_for_selector("#sheet",state="hidden")
    # despesa: categoria -> valor (com apagar) -> hoje
    pg.click(".fab"); pg.screenshot(path="shots/wiz0.png"); pg.click("[data-act=wcat][data-id=Mercado]")
    for k in ["1","2","3","del","5","00"]: pg.click(f"[data-act=wkey][data-id='{k}']")
    assert pg.inner_text("#wval")=="R$ 125,00", pg.inner_text("#wval")
    assert "restante" in pg.inner_text(".wring") and "R$ 4.875" in pg.inner_text(".wring"), pg.inner_text(".wring")
    pg.fill("[data-f=wn]","Feira"); pg.screenshot(path="shots/wiz1.png"); pg.click("#wok"); pg.screenshot(path="shots/wiz2.png")
    pg.click("#sheetBody button.btn.sec.full"); pg.wait_for_selector("#sheet",state="hidden")
    t=[x for x in S()["tx"] if x["n"]=="Feira"][0]; assert t["v"]==12500 and t["c"]=="Mercado" and t["d"]==dt.date.today().isoformat() and t["k"]=="o", t
    # repetir recente
    pg.click(".fab"); pg.click("[data-act=wqp][data-id='0']"); assert pg.inner_text("#wval")=="R$ 125,00"; pg.click("#wok"); pg.click("[data-act=wday][data-id='1']"); pg.wait_for_selector("#sheet",state="hidden")
    assert len([x for x in S()["tx"] if x["n"]=="Feira"])==2
    # mais detalhes leva ao formulário completo com o rascunho
    pg.click(".fab"); pg.click("[data-act=wcat][data-id=Lazer]"); pg.click("[data-act=wkey][data-id='9']"); pg.click("[data-act=wfull]")
    assert pg.input_value("[data-f=c]")=="Lazer" and pg.input_value("[data-f=v]")=="0,09"
    print("W",pg.evaluate("[document.querySelector('#sheetBody').scrollWidth,document.querySelector('#sheetBody').clientWidth]"))
print("erros:",errs); assert not errs; print("WIZ OK")
