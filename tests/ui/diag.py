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
    cur=pg.evaluate("(()=>{const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')})()")
    # sem renda
    pg.click("[data-act=diag]"); assert "Sem receita" in pg.inner_text("#sheetBody"); pg.click("#sheetBody [data-act=close]")
    def tx(k,v,c,n,d="01"):
        pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])")
        if k=="i": pg.click("[data-id=i]") if pg.locator("[data-id=i]").count() else pg.click("text=Receita")
        pg.fill("[data-f=v]",v); pg.fill("[data-f=n]",n); pg.fill("[data-f=d]",cur+"-"+d)
        if k=="o": pg.select_option("[data-f=c]",c)
        pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    tx("i","5.000,00",None,"Salário")
    tx("o","2.000,00","Moradia","Aluguel"); tx("o","900,00","Mercado","Mercado"); tx("o","1.100,00","Restaurantes","Delivery"); tx("o","800,00","Lazer","Cinema"); tx("o","400,00","Transporte","Uber")
    pg.click("[data-act=tab][data-id=home]")
    t=pg.inner_text("#app"); assert "DIAGNÓSTICO" in t.upper(), t[:300]
    pg.screenshot(path="shots/diag_home.png")
    pg.click("[data-act=diag]"); pg.wait_for_selector("#sheetBody .bigv")
    s=pg.inner_text("#sheetBody"); print(s[:1800])
    assert "POUPANÇA DO MÊS" in s.upper() and "ESSENCIAIS X DESEJOS" in s.upper() and "COMO MELHORAR" in s.upper()
    assert "R$ 5.200" in s and "até hoje" in s, s[:400]
    pg.screenshot(path="shots/diag_sheet.png")
    pg.click("[data-act=dwho][data-id='1']"); s2=pg.inner_text("#sheetBody"); assert "Sem receita" in s2
    # overflow
    print("scrollW",pg.evaluate("[document.documentElement.scrollWidth,innerWidth,document.querySelector('#sheetBody').scrollWidth,document.querySelector('#sheetBody').clientWidth]"))
    pg.click("#sheetBody [data-act=close]")
print("erros:",errs); assert not errs; print("DIAG OK")
