import json, re
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(color_scheme="light",viewport={"width":390,"height":844},device_scale_factor=2,locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append("pageerror: "+str(e)))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    S=lambda: pg.evaluate("window.__joint.S()")
    cur=pg.evaluate("(()=>{const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')})()")
    nxt=lambda ym,k: (lambda y,m:(f"{y+(m+k-1)//12}-{(m+k-1)%12+1:02d}"))(int(ym[:4]),int(ym[5:]))
    # 1) cartão
    pg.click(".round"); pg.wait_for_selector("#sheet:not([hidden])"); pg.click("[data-act=cardnew]")
    pg.fill("[data-f=name]","Nubank"); pg.fill("[data-f=close]","5"); pg.fill("[data-f=due]","12")
    pg.click("[data-act=cardsave]"); assert "fecha dia 5 · vence dia 12" in pg.inner_text("#sheetBody"); pg.click("[data-act=close]")
    # validação do cartão
    pg.click(".round"); pg.click("[data-act=cardnew]"); pg.fill("[data-f=name]","X"); pg.fill("[data-f=close]","31"); pg.click("[data-act=cardsave]")
    assert "1 a 28" in pg.inner_text("#toast"); pg.click("#sheetBody [data-act=cfg]"); pg.click("#sheetBody [data-act=close]")
    # 2) compra parcelada no cartão: 10x, compra no dia 1 (<= fechamento) => 1ª fatura = mês atual
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
    pg.fill("[data-f=v]","3.000,00"); pg.fill("[data-f=n]","Geladeira"); pg.fill("[data-f=d]",cur+"-01")
    pg.select_option("[data-f=cd]",label="Cartão Nubank"); pg.fill("[data-f=np]","10")
    h=pg.inner_text("#parcHint"); print("hint:",h.replace("\n"," "))
    assert "10× de R$ 300,00" in h and "vence em 12/" in h and "Pagar à vista compensa se o desconto passar de" in h
    pg.click("details.cmp summary"); pg.fill("[data-f=av]","2.800,00"); h=pg.inner_text("#parcHint")
    assert ("pagar à vista é melhor" in h or "parcelar e aplicar a diferença é melhor" in h) and "a.a." in h, h
    pg.fill("[data-f=av]","3.100,00"); assert "não é menor" in pg.inner_text("#parcHint")
    pg.fill("[data-f=av]",""); pg.check("[data-f=rep]"); pg.click("[data-act=txsave]"); assert "parcelar e repetir" in pg.inner_text("#toast")
    pg.uncheck("[data-f=rep]"); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    assert "10 parcelas lançadas" in pg.inner_text("#toast")
    ps=sorted([t for t in S()["tx"] if t.get("ip")],key=lambda t:t["in"])
    assert len(ps)==10 and sum(t["v"] for t in ps)==300000 and all(t["v"]==30000 for t in ps)
    assert [t["m"] for t in ps]==[nxt(cur,k) for k in range(10)], [t["m"] for t in ps]
    assert ps[0]["d"]==cur+"-01" and ps[1]["d"]==nxt(cur,1)+"-01" and all(t["cd"]==ps[0]["cd"] for t in ps) and ps[3]["it"]==10
    # 3) comprometido: 9 parcelas futuras = R$ 2.700
    pg.click("[data-act=tab][data-id=home]"); t=pg.inner_text("#app")
    assert "COMPROMETIDO" in t.upper() and "R$ 2.700" in t and pg.locator(".catrow[data-act=gotom]").count()==6 and "e mais 3 meses" in t
    assert "Projeção de fechamento: R$ 300" in t.replace("\n"," "), t[:900]   # parcela é fixa: não extrapola pelo ritmo diário
    pg.screenshot(path="shots/parc-home.png",full_page=True)
    # 4) faturas e badges em Gastos
    pg.click("[data-act=tab][data-id=gastos]"); t=pg.inner_text("#app")
    assert "FATURAS" in t.upper() and "Nubank" in t and "R$ 300,00" in t and "1/10" in t and "Geladeira" in t
    pg.screenshot(path="shots/parc-gastos.png",full_page=True)
    pg.click("[data-act=nextm]"); t=pg.inner_text("#app"); assert "2/10" in t and "vence 12/"+nxt(cur,1)[5:] in t
    # 5) compra depois do fechamento (dia 6) cai na fatura seguinte
    pg.click("[data-act=tab][data-id=home]"); pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
    pg.fill("[data-f=v]","100,00"); pg.fill("[data-f=n]","Mercado"); pg.fill("[data-f=d]",cur+"-06"); pg.select_option("[data-f=cd]",label="Cartão Nubank")
    assert "vence em 12/"+nxt(cur,1)[5:] in pg.inner_text("#parcHint")
    pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    m=[t for t in S()["tx"] if t["n"]=="Mercado"][0]; assert m["m"]==nxt(cur,1) and m["d"]==cur+"-06" and "ip" not in m
    # 6) editar uma parcela e excluir em série
    pg.click("[data-act=tab][data-id=gastos]")   # o mês selecionado continua o seguinte
    pg.click("[data-act=tx]:has-text('Geladeira')"); pg.wait_for_selector("#sheet:not([hidden])")
    assert "Parcela 2/10" in pg.inner_text("#sheetBody") and pg.locator("[data-f=np]").count()==0
    pg.click("[data-act=txdelnext]"); pg.wait_for_selector("#sheet",state="hidden")
    live=[t for t in S()["tx"] if t.get("ip") and not t.get("x")]; assert len(live)==1 and live[0]["in"]==1
    pg.click("[data-act=tab][data-id=home]"); t=pg.inner_text("#app")
    assert "R$ 100" in t and "R$ 2.700" not in t   # resta só o Mercado de R$ 100 na fatura do mês que vem
    # 7) parcelado sem cartão: datas no fim do mês e soma exata
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
    pg.fill("[data-f=v]","100,01"); pg.fill("[data-f=n]","Sofá"); pg.fill("[data-f=d]","2027-01-31"); pg.fill("[data-f=np]","3"); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    so=sorted([t for t in S()["tx"] if t["n"]=="Sofá"],key=lambda t:t["in"])
    assert [t["d"] for t in so]==["2027-01-31","2027-02-28","2027-03-31"] and [t["v"] for t in so]==[3335,3333,3333] and all("m" not in t and "cd" not in t for t in so)
    # 8) fixo no cartão
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
    pg.fill("[data-f=v]","39,90"); pg.fill("[data-f=n]","Streaming"); pg.fill("[data-f=d]",cur+"-03"); pg.select_option("[data-f=cd]",label="Cartão Nubank"); pg.check("[data-f=rep]")
    pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    st=[t for t in S()["tx"] if t["n"]=="Streaming"][0]; assert st["cd"] and st["m"]==cur and st.get("r") and S()["rec"][0]["cd"]==st["cd"]
    # 9) excluir cartão preserva histórico; persistência
    pg.reload(); pg.wait_for_selector("#auth"); pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]","7391"); pg.wait_for_selector("#auth",state="detached")
    assert len([t for t in S()["tx"] if t["n"] in("Geladeira","Mercado","Sofá","Streaming") and not t.get("x")])==1+1+3+12
    pg.click(".round"); pg.click("[data-act=cardedit]"); pg.click("[data-act=carddel]")
    assert S()["cards"][0].get("x")==1 and len([t for t in S()["tx"] if t.get("cd") and not t.get("x")])==3-1+12
    pg.click("[data-act=close]")
    print("erros:",errs); assert not errs; print("PARC OK"); b.close()
