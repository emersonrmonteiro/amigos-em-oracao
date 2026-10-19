// ============================================================
// DB.JS — Camada de abstração Firebase Realtime Database
// Usado por app.js (leitura) e admin.js (leitura + escrita)
//
// Como funciona:
//   - Leitura:  ref('amigos/data').get()
//   - Escrita:  ref('amigos/data').set(dados)
//   - localStorage é usado como cache para funcionar offline
//     e evitar bater no banco a cada clique.
//
// A config do Firebase é pública (firebase-config.js) — a
// segurança vem das Security Rules configuradas no console,
// não de esconder a config no bundle.
// ============================================================

const DB = (() => {
  "use strict";

  const CACHE_KEY = "amigos_data"; // localStorage cache
  const DATA_PATH = "amigos/data"; // nó raiz dos dados no banco
  let _db = null;
  let _initTried = false;

  // ----------------------------------------------------------
  // INICIALIZAÇÃO DO FIREBASE (preguiçosa — só na 1ª chamada)
  // ----------------------------------------------------------
  function getDb() {
    if (_db) return _db;
    if (_initTried) return null; // já falhou antes; não tenta de novo
    _initTried = true;

    const cfg = (typeof window !== "undefined" && window.FIREBASE_CONFIG) || {};
    if (!cfg.databaseURL || !cfg.apiKey) return null;

    try {
      if (typeof firebase === "undefined") {
        console.warn("[DB] SDK do Firebase não carregou.");
        return null;
      }
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(cfg);
      }
      _db = firebase.database();
      console.info("[DB] Firebase inicializado ✅");
      return _db;
    } catch (err) {
      console.warn("[DB] Erro ao inicializar Firebase:", err.message);
      return null;
    }
  }

  // ----------------------------------------------------------
  // CACHE LOCAL
  // ----------------------------------------------------------
  function getCacheLocal() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.__ts) {
        const dados = Object.assign({}, parsed);
        delete dados.__ts;
        return dados;
      }
      return parsed;
    } catch (e) {}
    return null;
  }

  function setCacheLocal(dados) {
    const comTs = Object.assign({}, dados, { __ts: Date.now() });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(comTs));
    } catch (e) {}
  }

  function invalidarCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.__ts = 0; // zera timestamp → cache "expirado"
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {}
  }

  // ----------------------------------------------------------
  // LEITURA — busca do Firebase ou fallback para cache/SITE_DATA
  // ----------------------------------------------------------
  async function ler() {
    const database = getDb();
    if (database) {
      try {
        const snap = await database.ref(DATA_PATH).get();
        if (snap.exists()) {
          const dados = snap.val();
          setCacheLocal(dados);
          return dados;
        }
        console.info("[DB] Nó do banco vazio — usando fallback.");
      } catch (err) {
        console.warn("[DB] Firebase leitura falhou:", err.message);
      }
    }

    const cached = getCacheLocal();
    if (cached) {
      console.info("[DB] Usando cache local (offline/sem config).");
      return cached;
    }

    console.info("[DB] Usando SITE_DATA padrão.");
    return JSON.parse(
      JSON.stringify(typeof SITE_DATA !== "undefined" ? SITE_DATA : {}),
    );
  }

  // ----------------------------------------------------------
  // ESCRITA — salva no Firebase E atualiza cache local
  // ----------------------------------------------------------
  async function salvar(dados) {
    setCacheLocal(dados);

    const database = getDb();
    if (!database) {
      console.info("[DB] Firebase não configurado — salvo só no cache local.");
      return { ok: false, local: true, erro: "Firebase não configurado" };
    }

    try {
      await database.ref(DATA_PATH).set(dados);
      console.info("[DB] Dados salvos no Firebase ✅");
      return { ok: true };
    } catch (err) {
      console.error("[DB] Erro ao salvar no Firebase:", err.message);
      return { ok: false, local: true, erro: err.message };
    }
  }

  // ----------------------------------------------------------
  // OBSERVAR — assina mudanças em tempo real no nó amigos/data
  // callback(dados) é chamado sempre que o banco muda (inclusive
  // mudanças feitas por outras abas/usuários). Retorna uma função
  // para cancelar a assinatura.
  // ----------------------------------------------------------
  function observar(callback) {
    const database = getDb();
    if (!database) return () => {};
    const ref = database.ref(DATA_PATH);
    const handler = (snap) => {
      if (snap && snap.exists()) {
        const dados = snap.val();
        setCacheLocal(dados);
        if (typeof callback === "function") callback(dados);
      }
    };
    ref.on("value", handler);
    return () => ref.off("value", handler);
  }

  // ----------------------------------------------------------
  // INCREMENTAR VISUALIZAÇÕES — transação atômica no campo
  // amigos/data/config/visualizacoes. Diferente de salvar(),
  // isto NÃO sobrescreve o nó inteiro — só toca o contador,
  // preservando os pedidos, orações, etc.
  // ----------------------------------------------------------
  async function incrementarVisualizacoes() {
    const database = getDb();
    if (!database) return false;
    try {
      const refV = database.ref(DATA_PATH + "/config/visualizacoes");
      await refV.transaction((atual) =>
        atual === null ? 1 : (Number(atual) || 0) + 1,
      );
      return true;
    } catch (err) {
      console.warn("[DB] Falha ao incrementar visualizações:", err.message);
      return false;
    }
  }

  // API pública (mesma usada por app.js e admin.js)
  return {
    ler,
    salvar,
    invalidarCache,
    getCacheLocal,
    observar,
    incrementarVisualizacoes,
  };
})();
