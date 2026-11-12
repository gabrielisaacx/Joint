import json
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
    home=lambda: pg.inner_text("#app")
    # 1) estado inicial
    t=home(); assert "SEQUÊNCIAS" in t.upper() and "Conquistas 0/14" in t and "0 dias" in t, t[:400]
    # 2) hoje sem gastos / desfazer
    pg.click("[data-act=noday]"); assert "1 dia" in home() and pg.locator(".wd.on").count()==1 and "sem gastos" in home()
    pg.click("[data-act=noundo]"); assert "0 dias" in home() and pg.locator(".wd.on").count()==0
    # 3) um gasto vira registro do dia e destrava "Primeiro passo"
    pg.click(".fab"); pg.wait_for_selector("#sheet:not([hidden])"); pg.fill("[data-f=v]","50,00"); pg.click("[data-act=txsave]"); pg.wait_for_selector("#sheet",state="hidden")
    t=home(); assert "1 dia" in t and "Conquistas 1/14" in t, t[:300]
    assert [a["id"] for a in S()["ach"]]==["first"]
    # 4) meses anteriores: 3 meses fechados no plano + reserva
    pg.evaluate("""(()=>{const S=window.__joint.S(),n=new Date();
      for(let k=1;k<=3;k++){const d=new Date(n.getFullYear(),n.getMonth()-k,10),ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
        S.tx.push({id:'i'+k,k:'i',v:1000000,d:ym+'-05',c:'Salário',w:0,s:0,n:'',u:Date.now()});
        S.tx.push({id:'o'+k,k:'o',v:500000,d:ym+'-10',c:'Moradia',w:0,s:0,n:'',u:Date.now()})}
      const ym=n.getFullYear()+'-'+String(n.getMonth()+4).padStart(2,'0');
      S.goals.push({id:'g1',name:'Lua de mel',type:'viagem',items:[{n:'Passagens',v:300000},{n:'Hospedagem',v:700000}],margin:0,target:0,base:0,due:new Date(n.getFullYear(),n.getMonth()+3,1).toISOString().slice(0,7),ev:'2027-01-23',infl:false,u:Date.now()});
      S.goals.push({id:'g2',name:'Reserva',type:'geral',target:3000000,base:600000,due:'',items:[],margin:0,infl:false,u:Date.now()});})()""")
    pg.click("[data-act=tab][data-id=gastos]"); pg.click("[data-act=tab][data-id=home]")
    t=home(); assert "3 meses" in t, t[:500]
    ids=sorted(a["id"] for a in S()["ach"]); print("conquistas:",ids)
    for k in ["first","blue","tri","r1"]: assert k in ids, k
    assert "r3" not in ids and "sem" not in ids
    # 5) sheet de conquistas
    pg.click("[data-act=ach]"); pg.wait_for_selector("#sheet:not([hidden])")
    st=pg.inner_text("#sheetBody"); assert "NÍVEL DO CASAL" in st.upper() and "Reserva de 1 mês" in st and "Trimestre firme" in st
    assert pg.locator(".ach.on").count()==len(ids)
    pg.screenshot(path="shots/game-conquistas.png"); pg.click("[data-act=close]")
    # 6) jornada da meta de viagem
    pg.click("[data-act=tab][data-id=metas]"); pg.click("[data-act=goal][data-id=g1]")
    j=pg.inner_text("#app"); exp_days=pg.evaluate("(()=>{const n=new Date();return Math.round((Date.UTC(2027,0,23)-Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()))/864e5)})()")
    assert "JORNADA" in j.upper() and str(exp_days) in j and "23/01/2027" in j, j[:400]
    assert pg.locator(".stp").count()==4 and pg.locator(".stp.on").count()==0 and "Próximo marco: 25%" in j.replace("\n"," ")
    assert "Sem aportes recentes" in j
    pg.screenshot(path="shots/game-jornada-antes.png",full_page=True)
    # 7) aporte cruza 25% => aviso de marco + marcos preenchidos
    pg.click("[data-act=contnew]"); pg.wait_for_selector("#sheet:not([hidden])"); pg.fill("[data-f=v]","2.600,00"); pg.click("[data-act=contsave]")
    pg.wait_for_selector("#sheet",state="hidden"); assert "Marco de 25%" in pg.inner_text("#toast")
    j=pg.inner_text("#app").replace("\n"," "); assert pg.locator(".stp.on").count()==1 and "Próximo marco: 50%" in j
    badge=pg.inner_text(".badge >> nth=-1") if pg.locator(".badge").count() else ""
    print("ritmo:",[x for x in ["À frente","No ritmo","Abaixo"] if x in j])
    pg.screenshot(path="shots/game-jornada-depois.png",full_page=True)
    # 8) "Dupla": a outra pessoa aporta no mesmo mês
    pg.evaluate("window.__joint.S().cont.push({id:'c9',g:'g1',v:100000,d:new Date().toISOString().slice(0,10),w:1,n:'',u:Date.now()})")
    pg.click("[data-act=tab][data-id=home]"); ids=[a["id"] for a in S()["ach"]]
    for k in ["cont","duo"]: assert k in ids, (k,ids)
    pg.wait_for_timeout(1300); pg.evaluate("window.scrollTo(0,0)"); pg.screenshot(path="shots/game-home.png",full_page=True)
    # 9) persistência e merge: conquistas guardam a data mais antiga
    pg.reload(); pg.wait_for_selector("#auth"); pg.fill("#auth [name=p]",""); pg.type("#auth [name=p]","7391"); pg.wait_for_selector("#auth",state="detached")
    assert len(S()["ach"])==len(ids)
    print("erros:",errs); assert not errs; print("GAME OK"); b.close()
