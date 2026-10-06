import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { MAXIMO_DESTINATARIOS, validarDestinatarios } from "@/dominio/gmail/mime";
import { erroApi, verificarPerfilApi } from "@/servicos/auth/sessao";
import { REGEX_UUID, respostaDeErro } from "@/servicos/relatorios/erros";
import { criarRascunhoDoRelatorio, obterRelatorio } from "@/servicos/relatorios/servico";

export const maxDuration = 60;

const esquema = z.object({ para: z.array(z.string().max(254)).max(MAXIMO_DESTINATARIOS) });

/** Cria um RASCUNHO no Gmail com o relatório anexado. O Portal nunca envia o e-mail. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await verificarPerfilApi("usuario");
  if (!acesso.ok) return acesso.resposta;
  const { id } = await params;
  if (!REGEX_UUID.test(id)) return erroApi(400, "Relatório inválido.");

  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return erroApi(400, "Lista de destinatários inválida.");
  let para: string[];
  try {
    para = validarDestinatarios(corpo.data.para);
  } catch (erro) {
    return erroApi(400, erro instanceof Error ? erro.message : "Destinatário inválido.");
  }

  try {
    const relatorio = await obterRelatorio(id);
    if (!relatorio) return erroApi(404, "Relatório não encontrado.");
    const rascunhoId = await criarRascunhoDoRelatorio(acesso.sessao, relatorio, para);
    return NextResponse.json(
      { rascunhoId, link: "https://mail.google.com/mail/u/0/#drafts" },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
