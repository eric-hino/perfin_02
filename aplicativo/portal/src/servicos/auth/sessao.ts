import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ambiente } from "../config/env";
import { clienteSupabase } from "../supabase/servidor";

export type Papel = "admin" | "usuario";

export interface Sessao {
  userId: string;
  email: string;
  papel: Papel;
  /** Admin principal (ADMIN_EMAIL do ambiente). */
  principal: boolean;
}

/**
 * Lê o usuário validando o JWT no servidor de autenticação (getUser) e o papel
 * na tabela usuarios_autorizados (função perfil_atual, sujeita ao RLS).
 * Memorizado por requisição.
 */
export const obterSessao = cache(async (): Promise<Sessao | null | "nao_autorizado"> => {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  const { data: papel, error: erroPapel } = await supabase.rpc("perfil_atual");
  // Falha do banco é erro (500), não falta de autorização.
  if (erroPapel) throw new Error("Não foi possível verificar o acesso.");
  if (papel !== "admin" && papel !== "usuario") return "nao_autorizado";

  const email = data.user.email.toLowerCase();
  return {
    userId: data.user.id,
    email,
    papel,
    principal: email === ambiente().ADMIN_EMAIL,
  };
});

/** Para páginas: redireciona quem não está logado ou não tem o papel exigido. */
export async function exigirPerfil(minimo: Papel = "usuario"): Promise<Sessao> {
  const sessao = await obterSessao();
  if (sessao === null) redirect("/login");
  if (sessao === "nao_autorizado") redirect("/acesso-nao-autorizado");
  if (minimo === "admin" && sessao.papel !== "admin") redirect("/acesso-nao-autorizado?motivo=admin");
  return sessao;
}

export type ResultadoApi = { ok: true; sessao: Sessao } | { ok: false; resposta: NextResponse };

/** Para route handlers: 401 sem sessão, 403 sem autorização. Nunca libera por padrão. */
export async function verificarPerfilApi(minimo: Papel = "usuario"): Promise<ResultadoApi> {
  let sessao: Awaited<ReturnType<typeof obterSessao>>;
  try {
    sessao = await obterSessao();
  } catch {
    return { ok: false, resposta: erroApi(500, "Não foi possível verificar a sessão.") };
  }
  if (sessao === null) return { ok: false, resposta: erroApi(401, "Sessão expirada. Entre novamente.") };
  if (sessao === "nao_autorizado" || (minimo === "admin" && sessao.papel !== "admin")) {
    return { ok: false, resposta: erroApi(403, "Acesso não autorizado.") };
  }
  return { ok: true, sessao };
}

export function erroApi(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status, headers: { "Cache-Control": "no-store" } });
}
