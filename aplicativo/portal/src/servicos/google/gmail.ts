import "server-only";

import { chamarGoogleJson } from "./api";

// IMPORTANTE: este módulo só CRIA RASCUNHOS. O Portal nunca envia e-mails.
// Não adicione chamadas a messages.send ou drafts.send (há um teste que verifica isso).

/** Cria um rascunho no Gmail do usuário a partir de uma mensagem MIME em base64url. */
export async function criarRascunho(accessToken: string, mensagemBase64Url: string): Promise<{ id: string }> {
  const rascunho = await chamarGoogleJson<{ id: string }>(
    accessToken,
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw: mensagemBase64Url } }),
    },
  );
  return { id: rascunho.id };
}
