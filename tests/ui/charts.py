import sys,datetime as dt
from playwright.sync_api import sync_playwright
errs=[];mode=sys.argv[1] if len(sys.argv)>1 else "dark"
def ymadd(ym,k):
    y,m=int(ym[:4]),int(ym[5:]);t=y*12+m-1+k;return f"{t//12}-{t%12+1:02d}"
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(color_scheme=mode,viewport={"width":390,"height":844},device_scale_factor=2,locale="pt-BR").new_page()
    pg.on("pageerror",lambda e: errs.append("pageerror: "+str(e)))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html"); pg.wait_for_selector("#auth")
    pg.fill("#auth [name=u]","teste_user"); pg.fill("#auth [name=p]","7391"); pg.fill("#auth [name=p2]","7391"); pg.click("#auth button[type=submit]")
    pg.wait_for_selector("#sheet:not([hidden])"); pg.select_option("[data-f=me]","0"); pg.click("[data-act=welcomesave]")
    cur=dt.date.today().strftime("%Y-%m")
    def tx(k,v,c,n,date,rep=False):
        pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
        if k=="i": pg.click("#sheetBody [data-id=i]")
        pg.fill("[data-f=v]",v); pg.fill("[data-f=n]",n); pg.fill("[data-f=d]",date)
        if k=="o": pg.select_option("[data-f=c]",c)
        if rep: pg.check("[data-f=rep]")
        pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    for k,(m,r,l) in enumerate([("900,00","700,00","300,00"),("1.000,00","900,00","500,00")]):
        ym=ymadd(cur,k-2)
        tx("i","5.000,00",None,"Salário",ym+"-05"); tx("o","2.000,00","Moradia","Aluguel",ym+"-10"); tx("o",m,"Mercado","Mercado",ym+"-12"); tx("o",r,"Restaurantes","Jantar",ym+"-18"); tx("o",l,"Lazer","Cinema",ym+"-25")
    tx("i","5.000,00",None,"Salário",cur+"-01",True); tx("o","2.000,00","Moradia","Aluguel",cur+"-02",True)
    tx("o","700,00","Mercado","Mercado",cur+"-03"); tx("o","1.300,00","Restaurantes","Jantar",cur+"-04")
    pg.click("[data-act=tab][data-id=home]")
    t=pg.inner_text("#app").upper()
    assert "EVOLUÇÃO" in t and pg.locator("[data-act=ctab]").count()==2, t[:500]
    assert pg.locator("[data-act=trend]").count()==6 and pg.locator(".tb-e").count()>=5
    assert "MÉDIA R$ 800" in t and "ACIMA" in t, t   # restaurantes: média (700+900)/2
    pg.locator("[data-act=trend]").nth(5).click()
    t2=pg.inner_text("#app"); assert "(planejado)" in t2 and "Sobra R$ 3.000" in t2.replace("\n"," "), t2[t2.find("Evolu"):][:500]
    pg.screenshot(path=f"shots/compact_home_{mode}.png",full_page=True)
    pg.click("[data-act=ctab][data-id=pace]"); assert "RITMO DO MÊS" in pg.inner_text("#app").upper()
    pg.locator("#pbox svg").scroll_into_view_if_needed(); bx=pg.locator("#pbox svg").bounding_box(); pg.mouse.move(bx["x"]+bx["width"]*0.3,bx["y"]+40); pg.mouse.down(); pg.mouse.up()
    tip=pg.inner_text("#ptip"); assert "Dia" in tip, tip
    pg.screenshot(path=f"shots/charts_home_{mode}.png",full_page=True)
    print("W",pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
    pg.click("[data-act=tab][data-id=gastos]"); pg.screenshot(path=f"shots/charts_gastos_{mode}.png")
    assert "MÉDIA DOS 2 MESES ANTERIORES" in pg.inner_text("#app").upper()
    pg.click("[data-act=tab][data-id=home]"); pg.click("[data-act=diag]"); pg.wait_for_selector("#sheetBody .bigv")
    assert pg.locator("#sheetBody svg .tb-e, #sheetBody svg .tb-i").count()==3
    pg.screenshot(path=f"shots/charts_diag_{mode}.png")
print("erros:",errs); assert not errs; print("CHARTS OK")
