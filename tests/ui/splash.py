from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,color_scheme="dark").new_page()
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto("http://localhost:8123/index.html",wait_until="commit");pg.wait_for_selector("#splash img");pg.wait_for_timeout(250)
    pg.screenshot(path="shots/splash-1.png")
    pg.wait_for_function("!document.getElementById('splash')||document.getElementById('splash').classList.contains('out')",timeout=5000)
    pg.wait_for_timeout(600)
    print("splash removido:",pg.query_selector("#splash") is None,"| erros:",errs or "nenhum")
    pg.screenshot(path="shots/splash-2.png"); b.close()
