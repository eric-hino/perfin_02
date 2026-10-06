import { NextResponse, type NextRequest } from "next/server";

import { urlDoSite } from "@/servicos/config/env";
import { ESCOPOS_GOOGLE } from "@/servicos/google/escopos";
import { salvarRefreshToken } from "@/servicos/google/tokens";
import { clienteSupabase } from "@/servicos/supabase/servidor";

function ir(caminho: string) {
  return NextResponse.redirect(`${urlDoSite()}${caminho}`, { status: 303 });
}

/**
 * Retorno do OAuth (Google → Supabase → aqui). Troca o código pela sessão,
 * confere se o e-mail está autorizado e guarda o refresh token do Google cifrado.
 */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  // Erro vindo do Supabase: inclui o Auth Hook que bloqueia e-mails não autorizados.
  if (request.nextUrl.searchParams.get("error") || !codigo) return ir("/acesso-nao-autorizado");

  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error || !data.session || !data.user) return ir("/login?erro=sessao");

  const { data: papel } = await supabase.rpc("perfil_atual");
  if (papel !== "admin" && papel !== "usuario") {
    await supabase.auth.signOut();
    return ir("/acesso-nao-autorizado");
  }

  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken) {
    try {
      await salvarRefreshToken(supabase, data.user.id, refreshToken, ESCOPOS_GOOGLE);
    } catch {
      // O login segue; Agenda, Drive e Gmail pedirão para reconectar.
    }
    // A sessão recém-criada carrega os tokens do Google; renovar regrava o cookie
    // sem eles, que ficam só no banco, cifrados.
    await supabase.auth.refreshSession();
  }
  return ir("/visao-geral");
}
