# Importação de fatura em PDF, com uma fatura FICTÍCIA gerada aqui no formato do Nubank (nenhum dado real).
import os,tempfile
from reportlab.pdfgen import canvas
from playwright.sync_api import sync_playwright
L1=["Data de vencimento: 10 JAN 2027","Período vigente: 03 DEZ a 03 JAN","Nu Pagamentos S.A.","TRANSAÇÕES DE 03 DEZ A 03 JAN","Fulano de Tal R$ 500,00"]
ROWS=[("05 DEZ","•••• 1111","Loja Exemplo - Parcela 2/5","R$ 100,00"),("06 DEZ","•••• 1111","Padaria Teste","R$ 12,50"),("06 DEZ","•••• 1111","Padaria Teste","R$ 12,50"),("07 DEZ","","Recarga de celular","R$ 20,00"),
      ("02 JAN","•••• 2222","Cinema Xyz","R$ 40,00"),("03 JAN","",'Estorno de "Cinema Xyz"',"-R$ 40,00"),("28 DEZ","",'Estorno de "Loja Antiga"',"-R$ 9,90"),("29 DEZ","•••• 1111","Uber *Trip","R$ 30,00")]
FIN=[("10 DEZ","","Pagamento em 10 DEZ","-R$ 300,00"),("15 DEZ","","EMPRESA PIX S.A.","R$ 78,75")]
def make(path):
    c=canvas.Canvas(path,pagesize=(595,842));y=800;c.setFont("Helvetica",10)
    for l in L1: c.drawString(40,y,l);y-=18
    def row(r):
        global_y=None
    for sec in (ROWS,None,FIN):
        if sec is None: c.drawString(60,y,"Pagamentos e Financiamentos");c.drawRightString(550,y,"-R$ 300,00");y-=18;continue
        for d,card,n,v in sec:
            c.drawString(60,y,d);
            if card: c.drawString(110,y,card)
            c.drawString(170,y,n);c.drawRightString(550,y,v);y-=18
    c.save()
errs=[]
with sync_playwright() as pw:
    tmp=os.path.join(tempfile.mkdtemp(),"fatura.pdf");make(tmp)
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(viewport={"width":390,"height":844},locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append(str(e))); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    S=lambda: pg.evaluate("window.__joint.S()")
    # lançamento manual igual a um da fatura: deve virar "possível duplicado"
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])"); pg.fill("[data-f=v]","30,00"); pg.fill("[data-f=n]","Uber"); pg.fill("[data-f=d]","2026-12-29"); pg.select_option("[data-f=c]","Lazer"); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    pg.click("[data-act=tab][data-id=gastos]"); pg.set_input_files("#pdf",tmp); pg.wait_for_selector(".improw",timeout=20000)
    t=pg.inner_text("#sheetBody")
    assert pg.locator(".improw").count()==7, pg.locator(".improw").count()          # 5 compras + 1 estorno solto + 1 Pix; cinema e seu estorno se anulam; pagamento fora
    assert "10/01/2027" in t and "possível duplicado" in t and "estorno, entra como receita" in t and "1 pagamentos da própria fatura" in t and "1 compra estornada" in t, t[:300]
    assert "5 selecionados" in pg.inner_text("#impsum") and "R$ 223,75" in pg.inner_text("#impsum"), pg.inner_text("#impsum")   # 100+12,50+12,50+20+78,75
    # mesma loja: trocar a categoria de uma muda a outra
    sel=pg.locator("[data-impc]"); idx=[i for i in range(sel.count()) if "Padaria" in pg.locator(".improw").nth(i).inner_text()]
    pg.locator(".improw").nth(idx[0]).locator("[data-impc]").select_option("Mercado"); assert pg.locator(".improw").nth(idx[1]).locator("[data-impc]").input_value()=="Mercado"
    pg.select_option("[data-f=is]","0"); pg.wait_for_selector(".improw")
    pg.click("[data-act=impgo]"); pg.wait_for_selector("#sheet",state="hidden")
    st=S(); tx=[x for x in st["tx"] if not x.get("x") and x["id"][0] in "ip"]
    now=[x for x in tx if x["m"]=="2027-01"]; assert len(now)==5 and sum(x["v"] for x in now)==22375, (len(now),sum(x["v"] for x in now))
    assert st["cards"][0]["name"]=="Nubank" and st["cards"][0]["close"]==3 and st["cards"][0]["due"]==10 and all(x.get("cd")==st["cards"][0]["id"] for x in now)
    par=sorted([x for x in tx if x.get("ip")],key=lambda x:x["in"]); assert [(x["in"],x["m"],x["d"]) for x in par]==[(2,"2027-01","2026-12-05"),(3,"2027-02","2027-01-05"),(4,"2027-03","2027-02-05"),(5,"2027-04","2027-03-05")], par
    assert all(x["s"]==0 for x in now) and sorted(x["c"] for x in now if "Padaria" in x["n"])==["Mercado","Mercado"] and [x["d"] for x in now if x["n"]=="Recarga de celular"]==["2026-12-07"]
    assert "5 lançamentos importados e 3 parcelas futuras" in pg.inner_text("#toast")
    # importar de novo: nada duplica; parcela seguinte da mesma compra em outra fatura cai no id já existente
    pg.set_input_files("#pdf",tmp); pg.wait_for_selector(".improw",timeout=20000); assert "0 selecionados" in pg.inner_text("#impsum") and pg.locator(".improw.off").count()==5
    pg.click("#sheetBody [data-act=close]"); assert len([x for x in S()["tx"] if not x.get("x")])==len(tx)+1
    # arquivo que não é fatura
    bad=os.path.join(os.path.dirname(tmp),"x.pdf"); c=canvas.Canvas(bad); c.drawString(50,700,"Documento qualquer"); c.save()
    pg.set_input_files("#pdf",bad); pg.wait_for_selector("text=Não encontrei lançamentos",timeout=20000)
print("erros:",errs); assert not errs; print("IMP OK")
