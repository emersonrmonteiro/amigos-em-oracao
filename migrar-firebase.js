// ============================================================
// migrar-firebase.js — Migração JSONBin → Firebase Realtime DB
// ============================================================
// Baixa os dados do JSONBin e gera um firebase-import.json
// pronto pra importar no console do Firebase.
//
// As credenciais são lidas AUTOMATICAMENTE do env-config.js
// (as mesmas que o app usa pra rodar localmente), então você
// não precisa digitar nada — evita o problema do shell comer
// os "$" da chave (formato $2a$10$...).
//
// Uso (Node 18+):
//   node migrar-firebase.js
//
//   (opcional) override via args — use ASPAS SIMPLES na chave:
//   node migrar-firebase.js <BIN_ID> '$2a$10$....'
//
// Depois:
//   1. Console do Firebase → Realtime Database → Data
//   2. Menu ⋮ (canto superior direito) → Importar JSON
//   3. Selecione firebase-import.json gerado por este script
//   4. Os dados vão parar no nó /amigos/data (como o db.js lê)
// ============================================================

const fs = require("fs");
const vm = require("vm");

// ----------------------------------------------------------
// Lê as credenciais do env-config.js (mesmas do app local)
// ----------------------------------------------------------
let binId = "";
let apiKey = "";

try {
  const src = fs.readFileSync("env-config.js", "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox);
  binId = (sandbox.window.ENV_CONFIG || {}).JSONBIN_BIN_ID || "";
  apiKey = (sandbox.window.ENV_CONFIG || {}).JSONBIN_API_KEY || "";
} catch (e) {
  console.warn("[migrar] ⚠️  Não consegui ler env-config.js:", e.message);
  console.warn("[migrar]    Tentando argumentos passados manualmente...");
}

// Override opcional via args
const [argBin, argKey] = process.argv.slice(2);
if (argBin) binId = argBin;
if (argKey) apiKey = argKey;

if (!binId || !apiKey) {
  console.error("[migrar] ❌ Credenciais não encontradas.");
  console.error(
    "        Popule o env-config.js, ou passe manualmente (use ASPAS SIMPLES):",
  );
  console.error("        node migrar-firebase.js <BIN_ID> '<API_KEY>'");
  process.exit(1);
}

(async () => {
  const url = `https://api.jsonbin.io/v3/b/${binId}/latest`;
  console.log(`[migrar] Baixando dados do JSONBin...`);
  console.log(`[migrar] ${url}`);

  const resp = await fetch(url, {
    headers: {
      "X-Master-Key": apiKey,
      "X-Bin-Meta": "false",
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error(`[migrar] ❌ Erro HTTP ${resp.status}: ${txt}`);
    if (resp.status === 401) {
      console.error(
        "[migrar] Dica: se passou a chave como argumento, use ASPAS SIMPLES",
      );
      console.error(
        "        (a chave tem '$' que o shell tenta interpretar como variável).",
      );
    }
    process.exit(1);
  }

  const dados = await resp.json();
  const tamanho = JSON.stringify(dados).length;
  console.log(`[migrar] ✅ Dados baixados (${tamanho} bytes).`);

  if (!dados || typeof dados !== "object") {
    console.error("[migrar] ❌ Conteúdo do bin não é um objeto JSON válido.");
    process.exit(1);
  }

  // Empacota no formato que o db.js espera: raiz → amigos/data
  const importData = { amigos: { data: dados } };

  const destino = "firebase-import.json";
  fs.writeFileSync(destino, JSON.stringify(importData, null, 2), "utf8");
  console.log(`[migrar] ✅ Arquivo "${destino}" gerado.`);
  console.log("");
  console.log("[migrar] Próximo passo:");
  console.log("  Console do Firebase → Realtime Database → Data");
  console.log("  → ⋮ → Importar JSON → selecione firebase-import.json");
})();
