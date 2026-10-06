import type { NextRequest } from "next/server";

import { erroApi, verificarPerfilApi } from "@/servicos/auth/sessao";
import { TIPO_XLSX } from "@/servicos/google/drive";
import { REGEX_UUID, respostaDeErro } from "@/servicos/relatorios/erros";
import { baixarXlsx, nomeDoArquivo, obterRelatorio } from "@/servicos/relatorios/servico";

export const maxDuration = 60;

/** Baixa o relatório em Excel (.xlsx), exportado da Planilha Google pelo Drive. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await verificarPerfilApi("usuario");
  if (!acesso.ok) return acesso.resposta;
  const { id } = await params;
  if (!REGEX_UUID.test(id)) return erroApi(400, "Relatório inválido.");

  try {
    const relatorio = await obterRelatorio(id);
    if (!relatorio) return erroApi(404, "Relatório não encontrado.");
    const conteudo = await baixarXlsx(acesso.sessao, relatorio);
    return new Response(conteudo, {
      headers: {
        "Content-Type": TIPO_XLSX,
        "Content-Disposition": `attachment; filename="${nomeDoArquivo(relatorio)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
