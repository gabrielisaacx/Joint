from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append(str(e))); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.route("**/www.google.com/s2/favicons**",lambda r:r.abort())   # sem internet no teste: cai para a inicial colorida
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    S=lambda: pg.evaluate("window.__joint.S()")
    pg.click(".fab"); pg.click("[data-act=wcat][data-id=Assinaturas]")
    assert "Qual assinatura?" in pg.inner_text("#sheetBody") and pg.locator("[data-act=wsub]").count()==25
    assert 'domain=netflix.com' in pg.inner_html("#sheetBody")
    pg.wait_for_timeout(300); pg.screenshot(path="shots/subs.png")
    pg.locator("[data-act=wsub]").filter(has_text="Netflix").click()
    for k in "4490": pg.click(f"[data-act=wkey][data-id='{k}']")
    pg.click("#wok"); assert "todo mês" in pg.inner_text("#sheetBody"); pg.click("[data-act=wday][data-id='12']"); pg.wait_for_selector("#sheet",state="hidden")
    st=S(); r=[x for x in st["rec"] if x["n"]=="Netflix"]; assert r and r[0]["v"]==4490 and r[0]["day"]==12 and r[0]["c"]=="Assinaturas", st["rec"]
    assert len([t for t in st["tx"] if t["n"]=="Netflix" and not t.get("x")])>=12
    # voltar da tela de valor retorna à lista de serviços
    pg.click(".fab"); pg.click("[data-act=wcat][data-id=Assinaturas]"); pg.locator("[data-act=wsub]").filter(has_text="Spotify").click(); assert pg.inner_text("#wval")=="R$ 0,00"
    pg.click("[data-act=wback]"); assert "Qual assinatura?" in pg.inner_text("#sheetBody"); pg.click("[data-act=wback]"); assert "Com o que foi?" in pg.inner_text("#sheetBody")
print("erros:",errs); assert not errs; print("SUBS OK")
