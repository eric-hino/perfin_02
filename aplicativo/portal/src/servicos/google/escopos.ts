// Escopos do Google pedidos no login. Não existe escopo "só rascunho" no Gmail:
// gmail.compose também permitiria enviar, mas o código só cria rascunhos
// (servicos/google/gmail.ts expõe apenas criarRascunho).
export const ESCOPOS_GOOGLE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.compose",
] as const;
