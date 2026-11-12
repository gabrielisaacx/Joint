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
    def tx(k,v,c,n,d):
        pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
        if k=="i": pg.click("#sheetBody [data-id=i]")
        pg.fill("[data-f=v]",v); pg.fill("[data-f=n]",n); pg.fill("[data-f=d]",cur+"-"+d)
        if k=="o": pg.select_option("[data-f=c]",c)
        pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    tx("i","5.000,00",None,"Salário","05"); tx("o","2.000,00","Moradia","Aluguel","10"); tx("o","900,00","Mercado","Mercado","12")
    pg.click("[data-act=tab][data-id=home]")
    assert "ESTÁ VAZIO" in pg.inner_text("#app").upper()
    pg.click("[data-act=repopen]"); pg.wait_for_selector("[data-rep]"); assert pg.locator("[data-rep]").count()==3
    pg.screenshot(path="shots/rep_sheet.png")
    pg.locator("[data-rep]").nth(2).uncheck()   # tira o mercado (ordem por data: 05,10,12)
    pg.click("[data-act=repgo]"); pg.wait_for_selector("#sheet",state="hidden")
    st=S(); assert len(st["rec"])==2, st["rec"]
    fut=[t for t in st["tx"] if t.get("r") and t["d"][:7]>cur and not t.get("x")]
    assert len(fut)==22, len(fut)
    n1=[t for t in fut if t["d"][:7]==nxt(cur,1)]; assert len(n1)==2 and sorted(t["v"] for t in n1)==[200000,500000]
    assert max(t["d"][:7] for t in fut)==nxt(cur,11)
    # originais viraram fixos; mercado não
    orig=[t for t in st["tx"] if t["d"][:7]==cur and not t.get("x")]; assert sum(1 for t in orig if t.get("r"))==2
    # card de vazio some; saldo entre vocês não conta fixos futuros
    pg.click("[data-act=tab][data-id=home]"); assert "ESTÁ VAZIO" not in pg.inner_text("#app").upper()
    # dezembro (próximo mês) mostra os dados
    pg.click("[data-act=nextm]"); t=pg.inner_text("#app"); assert "R$ 5.000" in t and "R$ 2.000" in t, t[:600]
    pg.click("[data-act=diag]"); s=pg.inner_text("#sheetBody"); assert "Mês futuro" in s and "planejado" in s, s[:300]; pg.click("#sheetBody [data-act=close]")
    # commitCard não inclui fixos
    pg.click("[data-act=prevm]"); assert "COMPROMETIDO" not in pg.inner_text("#app").upper()
    # editar fixo propaga só para frente
    pg.click("[data-act=tab][data-id=gastos]"); pg.click("[data-act=fixos]"); pg.wait_for_selector("[data-act=recedit]")
    pg.locator("[data-act=recedit]").filter(has_text="Aluguel").click(); pg.fill("[data-f=v]","2.500,00"); pg.click("[data-act=recsave]")
    st=S(); rent=[t for t in st["tx"] if t.get("r") and t["n"]=="Aluguel" and not t.get("x")]
    assert all(t["v"]==250000 for t in rent if t["d"][:7]>cur) and [t["v"] for t in rent if t["d"][:7]==cur]==[200000], [(t["d"],t["v"]) for t in rent][:3]
    assert all(t.get("a")==1 and t["u"]>1 for t in rent if t["d"][:7]>cur)   # carimbo novo vence a mescla no outro aparelho
    pg.locator("[data-act=recedit]").filter(has_text="Aluguel").click(); pg.fill("[data-f=v]","2.600,00"); pg.click("[data-act=recsave]")
    assert all(t["v"]==260000 for t in S()["tx"] if t.get("r") and t["n"]=="Aluguel" and not t.get("x") and t["d"][:7]>cur)   # segunda edição também propaga
    # parar o fixo some dos próximos, mantém o atual
    pg.locator("[data-act=recedit]").filter(has_text="Aluguel").click(); pg.click("[data-act=recdel]")
    st=S(); rent=[t for t in st["tx"] if t["n"]=="Aluguel" and not t.get("x")]; assert [t["d"][:7] for t in rent]==[cur], [t["d"] for t in rent]
    # idempotência: reabrir o app não duplica
    pg.reload(); pg.wait_for_selector("#auth")
print("erros:",errs); assert not errs; print("REP OK")
