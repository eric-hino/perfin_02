import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { hojeEmSaoPaulo, inicioDoMes } from "@/dominio/datas";
import { ultimoMesFechado } from "@/dominio/retornos/janelas";
import { erroApi, verificarPerfilApi } from "@/servicos/auth/sessao";
import { respostaDeErro } from "@/servicos/relatorios/erros";
import { gerarRelatorio } from "@/servicos/relatorios/servico";

export const maxDuration = 60;

const esquema = z.object({ mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

/** Gera a Planilha Google do mês pedido (AAAA-MM). */
export async function POST(request: NextRequest) {
  const acesso = await verificarPerfilApi("usuario");
  if (!acesso.ok) return acesso.resposta;

  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return erroApi(400, "Informe o mês no formato AAAA-MM.");
  const mes = `${corpo.data.mes}-01`;
  const limite = inicioDoMes(ultimoMesFechado(hojeEmSaoPaulo()));
  if (mes < "2001-01-01" || mes > limite) return erroApi(400, "Escolha um mês fechado a partir de 2001.");

  try {
    const relatorio = await gerarRelatorio(acesso.sessao, mes);
    return NextResponse.json({ relatorio }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
