import sys, json
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=b.new_context(color_scheme=(sys.argv[1] if len(sys.argv)>1 else "light"),viewport={"width":390,"height":844},device_scale_factor=2,locale="pt-BR",timezone_id="America/Sao_Paulo")
    pg=ctx.new_page()
    pg.on("console",lambda m: errs.append("console."+m.type+": "+m.text) if m.type in("error","warning") else None)
    pg.on("response",lambda r: errs.append("HTTP "+str(r.status)+" "+r.url) if r.status>=400 else None)
    pg.on("requestfailed",lambda r: errs.append("FAIL "+r.url))
    pg.on("pageerror",lambda e: errs.append("pageerror: "+str(e)))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_timeout(500)
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#auth",state="detached"); pg.wait_for_timeout(300)
    assert pg.is_visible("#sheet"), "welcome sheet deveria abrir"
    pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    assert not pg.is_visible("#sheet")
    def add(kind,v,desc,cat=None,w=None,split=None,rep=False):
        pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
        if kind!="o": pg.click(f"[data-act=kind][data-id={kind}]")
        pg.fill("[data-f=v]",v)
        if desc is not None and pg.query_selector("[data-f=n]"): pg.fill("[data-f=n]",desc)
        if cat: pg.select_option("[data-f=c]",cat)
        if w is not None: pg.click(f"[data-act=setw][data-id='{w}']")
        if split is not None: pg.select_option("[data-f=s]",str(split))
        if rep: pg.check("[data-f=rep]")
        pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    add("i","8.500,00","Salário",cat="Salário",w=0)
    add("i","6.200,00","Salário",cat="Salário",w=1)
    add("o","2.400,00","Aluguel",cat="Moradia",w=0,rep=True)
    add("o","612,35","Mercado da semana",cat="Mercado",w=1)
    add("o","180,00","Jantar",cat="Restaurantes",w=0,split=1)
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-01-home.png",full_page=True)
    S=pg.evaluate("window.__joint.S()")
    import datetime as _dt
    _cur=_dt.date.today().strftime("%Y-%m")
    live=[t for t in S["tx"] if not t.get("x") and not (t.get("r") and t["d"][:7]>_cur)]
    print("tx:",len(live),[ (t["n"],t["v"],t["s"],t["w"]) for t in live])
    assert len(live)==5 and len(S["rec"])==1
    # saldo: aluguel 2400 pago por 0 (divide 50/50) => +1200; mercado 61235 pago por 1 => -30618 (arred); jantar so de quem pagou => 0
    exp=1200_00-round(61235*0.5) if False else None
    txt=pg.inner_text("#app"); print(txt[:900])
    pg.click("[data-act=tab][data-id=gastos]"); pg.wait_for_timeout(200)
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-02-gastos.png",full_page=True)
    # orçamento
    pg.click("[data-act=cat][data-id=Mercado]"); pg.fill("[data-f=v]","500"); pg.click("[data-act=budsave]")
    assert "estourou" in pg.inner_text("#app")
    # acerto
    pg.click("[data-act=tab][data-id=home]"); pg.click("[data-act=settle]"); pg.wait_for_selector("#sheet:not([hidden])")
    print("acerto v:",pg.input_value("[data-f=v]")); pg.click("[data-act=txsave]")
    print("pós-acerto:",pg.inner_text("#app").split("ENTRE VOCÊS")[1][:80].replace("\n"," "))
    # meta de viagem
    pg.click("[data-act=tab][data-id=metas]"); pg.click("[data-act=goalnew]"); pg.click("[data-act=gtype][data-id=viagem]")
    pg.fill("[data-f=name]","Lua de mel Florianópolis")
    its=pg.query_selector_all("[data-it]")
    vals=["3000","4200","2500","600","1500","300","800"]
    for r,v in zip(its,vals): r.query_selector("[data-iv]").fill(v)
    pg.fill("[data-f=due]","2027-06"); pg.click("[data-act=goalsave]")
    pg.wait_for_selector("text=Quanto guardar por mês")
    print(pg.inner_text("#app")[:700].replace("\n"," | "))
    pg.click("[data-act=contnew]"); pg.fill("[data-f=v]","1.000,00"); pg.click("[data-act=contsave]")
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-03-meta.png",full_page=True)
    # simulador a partir da meta
    pg.click("[data-act=simgoal]"); pg.wait_for_selector("#cbox svg")
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-04-sim.png",full_page=True)
    pg.query_selector("#xhr").scroll_into_view_if_needed(); box=pg.query_selector("#xhr").bounding_box(); pg.mouse.move(box["x"]+box["width"]*0.6,box["y"]+30)
    pg.wait_for_timeout(150); print("tip:",pg.inner_text("#tip").replace("\n"," | "))
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-05-sim-hover.png")
    # 20 anos
    pg.click("[data-act=months][data-id=\"240\"]"); pg.wait_for_selector("#cbox svg")
    print("20a:",pg.inner_text("#simOut .bigv"))
    pg.fill("[data-sim=target]","1.000.000"); pg.wait_for_timeout(200)
    print(pg.inner_text("#simGoal").replace("\n"," | ")[:420])
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-06-sim20.png",full_page=True)
    # persistência
    pg.reload(); pg.wait_for_selector("#auth"); pg.wait_for_timeout(800)
    assert pg.inner_text("#app").strip()=="", "dados não podem aparecer antes do login"
    pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]","7391"); pg.wait_for_selector("#auth",state="detached"); pg.wait_for_timeout(300)
    S2=pg.evaluate("window.__joint.S()"); print("após reload tx:",len([t for t in S2["tx"] if not t.get("x")]),"metas:",len(S2["goals"]))
    # tema claro
    pg.click("#dot"); pg.click("[data-act=theme][data-id=light]"); pg.click("[data-act=close]")
    pg.screenshot(path="shots/"+(sys.argv[1] if len(sys.argv)>1 else "light")+"-07-light.png",full_page=True)
    b.close()
print("ERROS:",errs if errs else "nenhum")
