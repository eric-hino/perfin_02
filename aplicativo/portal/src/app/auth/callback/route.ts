import type { Session, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { escoposCompletos } from "@/dominio/auth/cadastro";
import { COOKIE_CONECTAR, lerCookieConectar, type PedidoConectar } from "@/dominio/auth/conectar";
import { urlDoSite } from "@/servicos/config/env";
import { escoposConcedidos, salvarRefreshToken } from "@/servicos/google/tokens";
import { clienteSupabase } from "@/servicos/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof clienteSupabase>>;

function ir(caminho: string) {
  return NextResponse.redirect(`${urlDoSite()}${caminho}`, { status: 303 });
}

/** Lê e apaga o cookie do pedido "Conectar conta Google" (uso único). */
async function consumirPedidoConectar(): Promise<PedidoConectar | null> {
  const loja = await cookies();
  const pedido = lerCookieConectar(loja.get(COOKIE_CONECTAR)?.value);
  loja.set(COOKIE_CONECTAR, "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/auth" });
  return pedido;
}

/** Grava o refresh token só se o Google concedeu todos os escopos (Agenda, Drive e Gmail). */
async function guardarAutorizacao(supabase: Cliente, user: User, sessao: Session): Promise<void> {
  const refreshToken = sessao.provider_refresh_token;
  if (!refreshToken || !sessao.provider_token) return;
  const escopos = await escoposConcedidos(sessao.provider_token);
  if (!escoposCompletos(escopos)) return;
  try {
    await salvarRefreshToken(supabase, user.id, refreshToken, escopos);
  } catch {
    // Agenda, Drive e Gmail pedirão para conectar de novo.
  }
}

/**
 * Retorno do OAuth (Google → Supabase → aqui). Troca o código pela sessão e confere
 * o papel. O refresh token do Google só é gravado no fluxo "Conectar conta Google"
 * (?conectar=1), quando o cookie do pedido pertence ao mesmo usuário.
 */
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const conectar = parametros.get("conectar") === "1";
  const pedido = await consumirPedidoConectar();
  const codigo = parametros.get("code");

  // Erro vindo do Supabase: inclui o Auth Hook que bloqueia e-mails. No "Conectar",
  // é o usuário desistindo no consentimento: volta para a tela de onde saiu.
  if (parametros.get("error") || !codigo) {
    return ir(conectar && pedido ? `/${pedido.destino}` : "/acesso-nao-autorizado");
  }

  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error || !data.session || !data.user) return ir("/login?erro=sessao");

  const { data: papel } = await supabase.rpc("perfil_atual");
  if (papel !== "admin" && papel !== "usuario") {
    await supabase.auth.signOut();
    return ir("/acesso-nao-autorizado");
  }

  if (conectar && pedido && pedido.userId !== data.user.id) {
    await supabase.auth.signOut();
    return ir("/login?erro=conta_diferente");
  }

  const conectado = conectar && pedido !== null;
  if (conectado) await guardarAutorizacao(supabase, data.user, data.session);
  // A sessão recém-criada carrega os tokens do Google; renovar regrava o cookie
  // sem eles (o refresh token fica só no banco, cifrado).
  if (data.session.provider_token || data.session.provider_refresh_token) await supabase.auth.refreshSession();
  return ir(conectado ? `/${pedido.destino}` : "/visao-geral");
}
