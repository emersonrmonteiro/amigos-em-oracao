// ============================================================
// firebase-config.js — Configuração PÚBLICA do Firebase (TEMPLATE)
// ============================================================
// ESTES VALORES NÃO SÃO SEGREDO. O Firebase é projetado para que
// esta config fique no código do cliente. A segurança real vem
// das Security Rules (database.rules.json / console), não de
// esconder estes valores.
//
// Como obter:
//   Console do Firebase → Configurações do projeto (⚙️)
//   → Seus apps → Web App → "Config do SDK"
//
// COMO USAR:
//   1. Copie este arquivo para firebase-config.js (na mesma pasta)
//   2. Preencha os valores abaixo com os do seu projeto
//   3. firebase-config.js está no .gitignore — não sobe pro repo,
//      mas o `firebase deploy` publica a partir do disco.
// ============================================================

window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "COLE_AQUI_SENDER_ID",
  appId: "COLE_AQUI_APP_ID",
};

// E-mails autorizados a acessar o painel admin (login Google).
// Vazio ([]) = qualquer conta Google pode acessar.
// Para travar: window.ADMIN_EMAILS = ["seu.email@gmail.com"];
window.ADMIN_EMAILS = [];
