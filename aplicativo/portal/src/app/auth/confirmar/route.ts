import { NextResponse, type NextRequest } from "next/server";

import { TIPOS_LINK, type TipoLink, papelDaSessao, sair, trocarCodigo, verificarLink } from "@/servicos/auth/conta";
import { urlDoSite } from "@/servicos/config/env";

const TOKEN = /^[A-Za-z0-9_-]{1,200}$/;

function ir(caminho: string) {
  return NextResponse.redirect(`${urlDoSite()}${caminho}`, { status: 303 });
}

function tipoDoLink(valor: string | null): TipoLink | null {
  return TIPOS_LINK.find((t) => t === valor) ?? null;
}

/** Valida o token do link (token_hash + type) ou, como alternativa, o código PKCE. */
async function abrirSessao(parametros: URLSearchParams, tipo: TipoLink | null): Promise<boolean> {
  const tokenHash = parametros.get("token_hash");
  if (tokenHash !== null) return tipo !== null && TOKEN.test(tokenHash) && verificarLink(tokenHash, tipo);
  const codigo = parametros.get("code");
  return codigo !== null && TOKEN.test(codigo) && trocarCodigo(codigo);
}

/**
 * Destino dos links dos e-mails do Supabase (confirmação de cadastro e "esqueci a
 * senha"). Os destinos são fixos: não há parâmetro "next".
 */
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const tipo = tipoDoLink(parametros.get("type"));

  let aberta: boolean;
  try {
    aberta = await abrirSessao(parametros, tipo);
  } catch {
    aberta = false;
  }
  if (!aberta) return ir("/login?erro=link");
  if (tipo === "recovery") return ir("/redefinir-senha");

  try {
    if (await papelDaSessao()) return ir("/visao-geral");
  } catch {
    return ir("/login?erro=sessao");
  }
  await sair();
  return ir("/acesso-nao-autorizado");
}
