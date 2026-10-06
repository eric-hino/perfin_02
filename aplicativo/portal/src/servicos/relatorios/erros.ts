import "server-only";

import { NextResponse } from "next/server";

import { erroApi } from "../auth/sessao";
import { ErroGoogle, ErroGoogleReconectar } from "../google/erros";
import { ErroRegistroRascunho } from "./servico";

/** Converte erros do fluxo de relatórios em respostas claras, sem detalhes internos. */
export function respostaDeErro(erro: unknown): NextResponse {
  if (erro instanceof ErroGoogleReconectar) {
    return NextResponse.json({ erro: erro.message, reconectar: true }, { status: 409 });
  }
  if (erro instanceof ErroGoogle) return erroApi(502, erro.message);
  if (erro instanceof ErroRegistroRascunho) return erroApi(500, erro.message);
  return erroApi(500, "Não foi possível concluir agora. Tente novamente.");
}

export const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
