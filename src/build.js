// Monta o index.html de arquivo único: template + style.css + core.js + app/*.js (em ordem alfabética).
// Uso: node build.js [saida/index.html]
const fs=require("fs");const d=__dirname;
const core=fs.readFileSync(d+"/core.js","utf8");
const app=fs.readdirSync(d+"/app").filter(f=>f.endsWith(".js")).sort().map(f=>fs.readFileSync(d+"/app/"+f,"utf8")).join("");
let js=app.replace("/*@CORE@*/",()=>core);
let html=fs.readFileSync(d+"/template.html","utf8").replace("/*@CSS@*/",()=>fs.readFileSync(d+"/style.css","utf8")).replace("/*@JS@*/",()=>js);
fs.writeFileSync(process.argv[2]||d+"/out/index.html",html);console.log("index.html",html.length,"bytes");
