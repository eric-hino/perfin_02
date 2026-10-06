"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { urlDoSite } from "@/servicos/config/env";
import { ESCOPOS_GOOGLE } from "@/servicos/google/escopos";
import { clienteSupabase } from "@/servicos/supabase/servidor";

/** Inicia o login com o Google (também usado para "Conectar conta Google"). */
export async function entrarComGoogle(): Promise<void> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${urlDoSite()}/auth/callback`,
      scopes: ESCOPOS_GOOGLE.join(" "),
      // offline + consent: o Google devolve o refresh token para Agenda, Drive e Gmail.
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect("/login?erro=google");
  redirect(data.url);
}

export interface EstadoLoginSenha {
  erro: string | null;
}

const esquemaSenha = z.object({
  email: z.email().max(254),
  senha: z.string().min(1).max(200),
});

/** Login do administrador por e-mail e senha (Supabase Auth). */
export async function entrarComSenha(_anterior: EstadoLoginSenha, formulario: FormData): Promise<EstadoLoginSenha> {
  const entrada = esquemaSenha.safeParse({ email: formulario.get("email"), senha: formulario.get("senha") });
  if (!entrada.success) return { erro: "Informe um e-mail e uma senha válidos." };

  const supabase = await clienteSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: entrada.data.email.trim().toLowerCase(),
    password: entrada.data.senha,
  });
  // Mensagem genérica: não revela se o e-mail existe.
  if (error) return { erro: "E-mail ou senha inválidos." };

  const { data: papel } = await supabase.rpc("perfil_atual");
  if (papel !== "admin") {
    await supabase.auth.signOut();
    return { erro: "Acesso por senha é exclusivo do administrador." };
  }
  redirect("/visao-geral");
}
