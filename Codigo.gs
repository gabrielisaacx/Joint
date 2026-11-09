/**
 * Joint: backend em Google Sheets (Apps Script, web app) para sincronizar o casal entre aparelhos.
 * Abas criadas sozinhas: Espacos, Dados.
 * Segurança: cada "espaço do casal" tem um PIN (guardado só como hash SHA-256). Sem o PIN certo nada é lido nem gravado.
 * Implantar como: Executar como "Eu" e acesso "Qualquer pessoa" (o PIN protege os dados).
 */
var MAX_CHUNK = 45000;   // limite da célula é 50.000 caracteres
var MAX_PARTS = 12;      // até ~540 KB por espaço (os dados vão compactados com gzip)

function doGet() { return out_({ ok: true, msg: "Joint API" }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return out_(handle_(JSON.parse(e.postData.contents)));
  } catch (err) {
    return out_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange("A:A").setNumberFormat("@");
    s.appendRow(header);
    s.setFrozenRows(1);
  }
  return s;
}

function hash_(pin, id) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "joint:" + id + ":" + pin);
  return bytes.map(function (b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}

function findRow_(sheet, col, value) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) if (String(vals[i][col]) === value) return i + 1;
  return -1;
}

function handle_(r) {
  var id = String(r.p || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  var pin = String(r.pin || "");
  if (!id || pin.length < 4) return { ok: false, erro: "Código ou PIN inválido (PIN com 4+ caracteres)." };

  var espacos = sheet_("Espacos", ["id", "nome", "pin_hash", "criado_em", "atualizado_em"]);
  var row = findRow_(espacos, 0, id);
  var h = hash_(pin, id);
  var now = new Date();

  if (row < 0) {
    if (r.a !== "login") return { ok: false, erro: "Espaço não existe. Conecte primeiro." };
    espacos.appendRow([id, String(r.nome || id).slice(0, 40), h, now, now]);
    return { ok: true, novo: true };
  }
  if (String(espacos.getRange(row, 3).getValue()) !== h) return { ok: false, erro: "PIN incorreto." };

  if (r.a === "login") return { ok: true, novo: false };

  if (r.a === "save") {
    var data = String(r.data || "");
    var header = ["id", "atualizado_em"];
    for (var p = 1; p <= MAX_PARTS; p++) header.push("parte" + p);
    var dados = sheet_("Dados", header);
    var parts = [];
    for (var i = 0; i < data.length; i += MAX_CHUNK) parts.push(data.substr(i, MAX_CHUNK));
    if (parts.length > MAX_PARTS) return { ok: false, erro: "Dados grandes demais para a planilha." };
    var line = [id, now];
    for (var k = 0; k < MAX_PARTS; k++) line.push(parts[k] || "");
    var dr = findRow_(dados, 0, id);
    if (dr < 0) dr = dados.getLastRow() + 1;
    dados.getRange(dr, 1, 1, line.length).setValues([line]);
    espacos.getRange(row, 5).setValue(now);
    return { ok: true, em: now.getTime() };
  }

  if (r.a === "load") {
    var d2 = sheet_("Dados", ["id", "atualizado_em"]);
    var rr = findRow_(d2, 0, id);
    if (rr < 0) return { ok: true, data: "", em: 0 };
    var vals = d2.getRange(rr, 1, 1, 2 + MAX_PARTS).getValues()[0];
    var txt = "";
    for (var j = 2; j < vals.length; j++) txt += String(vals[j] || "");
    return { ok: true, data: txt, em: new Date(vals[1]).getTime() };
  }

  return { ok: false, erro: "Ação desconhecida." };
}
