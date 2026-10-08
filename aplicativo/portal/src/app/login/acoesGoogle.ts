"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_CONECTAR, destinoConectar, valorCookieConectar } from "@/dominio/auth/conectar";
import { verificarPerfilApi } from "@/servicos/auth/sessao";
import { urlDoSite } from "@/servicos/config/env";
import { ESCOPOS_GOOGLE, ESCOPOS_LOGIN } from "@/servicos/google/escopos";
import { clienteSupabase } from "@/servicos/supabase/servidor";

/** Login e cadastro com o Google: só identidade (openid, email, profile). */
export async function entrarComGoogle(): Promise<void> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${urlDoSite()}/auth/callback`,
      scopes: ESCOPOS_LOGIN.join(" "),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/login?erro=google");
  redirect(data.url);
}

/**
 * "Conectar conta Google": pede Agenda, Drive e Gmail com refresh token (offline).
 * O cookie httpOnly amarra o retorno do OAuth ao usuário que clicou no botão;
 * o callback só grava o token se o usuário for o mesmo.
 */
export async function conectarGoogle(formulario: FormData): Promise<void> {
  const verificacao = await verificarPerfilApi("usuario");
  if (!verificacao.ok) redirect("/login");
  const { userId, email } = verificacao.sessao;
  const destino = destinoConectar(formulario.get("destino"));

  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${urlDoSite()}/auth/callback?conectar=1`,
      scopes: ESCOPOS_GOOGLE.join(" "),
      // offline + consent: o Google devolve o refresh token para Agenda, Drive e Gmail.
      queryParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true", login_hint: email },
    },
  });
  if (error || !data.url) redirect("/login?erro=google");

  (await cookies()).set(COOKIE_CONECTAR, valorCookieConectar({ userId, destino }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/auth",
  });
  redirect(data.url);
}
