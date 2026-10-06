import "server-only";

import { ErroGoogle, ErroGoogleReconectar } from "./erros";

const TEMPO_LIMITE_MS = 25_000;

/** Chamada autenticada a uma API do Google. Nunca registra o token. */
export async function chamarGoogle(accessToken: string, url: string, init: RequestInit = {}): Promise<Response> {
  const resposta = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (resposta.status === 401) throw new ErroGoogleReconectar();
  if (resposta.status === 403) {
    const corpo = await resposta.text();
    // Escopo não concedido também volta como 403: pedir para reconectar.
    if (/insufficient|scope|PERMISSION_DENIED/i.test(corpo)) throw new ErroGoogleReconectar();
    throw new ErroGoogle(403, "O Google negou o acesso a este recurso.");
  }
  if (!resposta.ok) throw new ErroGoogle(resposta.status, "O Google não respondeu como esperado. Tente de novo.");
  return resposta;
}

export async function chamarGoogleJson<T>(accessToken: string, url: string, init: RequestInit = {}): Promise<T> {
  const resposta = await chamarGoogle(accessToken, url, init);
  return (await resposta.json()) as T;
}
