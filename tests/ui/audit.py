import datetime as dt,re
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(viewport={"width":390,"height":844},locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append(str(e))); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    td=dt.date.today(); cur=td.strftime("%Y-%m")
    # saldo entre vocês: 10x de R$ 100 dividido meio a meio, só a parcela de hoje conta (R$ 50), não as 10 (R$ 500)
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])"); pg.fill("[data-f=v]","1.000,00"); pg.fill("[data-f=n]","Sofá"); pg.fill("[data-f=np]","10"); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    pg.click("[data-act=tab][data-id=home]"); t=pg.inner_text("#app"); assert "deve R$ 50,00" in t, t[t.find("ENTRE"):][:200]
    # projeção: compra do mês passado que cai na fatura deste mês é valor conhecido, não entra no ritmo diário
    prev=(td.replace(day=1)-dt.timedelta(days=1)).strftime("%Y-%m-20")
    pg.evaluate("([d,m])=>{window.__joint.S().tx.push({id:'carry1',k:'o',v:90000,d:d,m:m,c:'Mercado',w:0,s:1,n:'Fatura',u:5})}",[prev,cur])
    pg.click("[data-act=tab][data-id=gastos]"); pg.click("[data-act=tab][data-id=home]"); t=pg.inner_text("#app")
    m=re.search(r"Projeção de fechamento: R\$ ([\d.]*\d)",t); assert m and m.group(1)=="1.000", t[:600]   # 100 (parcela) + 900 (fatura), sem multiplicar pelos dias
print("erros:",errs); assert not errs; print("AUDIT OK")
