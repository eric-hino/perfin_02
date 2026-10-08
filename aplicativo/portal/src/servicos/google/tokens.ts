import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ambiente } from "../config/env";
import { clienteSupabase } from "../supabase/servidor";
import { cifrar, decifrar } from "./cripto";
import { ErroGoogleReconectar } from "./erros";

const TEMPO_TOKENINFO_MS = 5000;

/**
 * Escopos realmente concedidos a um access token do Google (o usuário pode
 * desmarcar permissões na tela de consentimento). Em qualquer erro, devolve [].
 */
export async function escoposConcedidos(accessToken: string): Promise<string[]> {
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`;
    const resposta = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TEMPO_TOKENINFO_MS) });
    if (!resposta.ok) return [];
    const corpo = (await resposta.json()) as { scope?: unknown; aud?: unknown };
    // O token precisa ter sido emitido para o cliente OAuth do Portal.
    if (corpo.aud !== ambiente().GOOGLE_CLIENT_ID || typeof corpo.scope !== "string") return [];
    return corpo.scope.split(" ").filter(Boolean);
  } catch {
    return [];
  }
}

/** Grava o refresh token do Google, cifrado, para o próprio usuário (RLS). */
export async function salvarRefreshToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string,
  escopos: readonly string[],
): Promise<void> {
  const { error } = await supabase.from("google_credenciais").upsert({
    user_id: userId,
    refresh_token_cifrado: cifrar(refreshToken, ambiente().GOOGLE_TOKEN_ENCRYPTION_KEY),
    escopos: [...escopos],
  });
  if (error) throw new Error("Não foi possível guardar a autorização do Google.");
}

async function lerRefreshToken(userId: string): Promise<string> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase
    .from("google_credenciais")
    .select("refresh_token_cifrado")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível ler a autorização do Google.");
  if (!data) throw new ErroGoogleReconectar();
  try {
    return decifrar(data.refresh_token_cifrado, ambiente().GOOGLE_TOKEN_ENCRYPTION_KEY);
  } catch {
    throw new ErroGoogleReconectar();
  }
}

/** Troca o refresh token por um access token novo (válido ~1 h). */
export async function obterAccessToken(userId: string): Promise<string> {
  const refreshToken = await lerRefreshToken(userId);
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = ambiente();
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const corpo = (await resposta.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (corpo.error === "invalid_grant" || resposta.status === 400 || resposta.status === 401) {
    throw new ErroGoogleReconectar();
  }
  if (!resposta.ok || !corpo.access_token) throw new Error("Falha ao autenticar no Google.");
  return corpo.access_token;
}
