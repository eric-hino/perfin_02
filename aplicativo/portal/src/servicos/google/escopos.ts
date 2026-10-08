// Escopos do Google.
//
// ESCOPOS_LOGIN: pedidos no login e no cadastro (só identidade, sem aviso de app não verificado).
// ESCOPOS_GOOGLE: pedidos no botão "Conectar conta Google" (Agenda, Drive e Gmail).
//
// Não existe escopo "só rascunho" no Gmail: gmail.compose também permitiria enviar,
// mas o código só cria rascunhos (servicos/google/gmail.ts expõe apenas criarRascunho).
export const ESCOPOS_LOGIN = ["openid", "email", "profile"] as const;

export const ESCOPOS_GOOGLE = [
  ...ESCOPOS_LOGIN,
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.compose",
] as const;
