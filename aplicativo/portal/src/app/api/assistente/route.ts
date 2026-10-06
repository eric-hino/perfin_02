import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { lerFiltros } from "@/dominio/filtros";
import { contextoDoRecorte } from "@/servicos/assistente/contextoDoRecorte";
import { ErroAssistente, perguntar } from "@/servicos/assistente/gemini";
import { dentroDoLimite } from "@/servicos/assistente/limite";
import { erroApi, verificarPerfilApi } from "@/servicos/auth/sessao";
import { carregarAnalise } from "@/servicos/indicadores/analise";

export const maxDuration = 60;

const TAMANHO_MAXIMO = 64 * 1024;

const esquema = z.object({
  pergunta: z.string().trim().min(1).max(2000),
  historico: z.array(z.object({ papel: z.enum(["usuario", "assistente"]), texto: z.string().max(8000) })).max(10),
  // Query string dos filtros da tela; é revalidada por lerFiltros.
  filtros: z.string().max(500),
});

export async function POST(request: NextRequest) {
  const acesso = await verificarPerfilApi("usuario");
  if (!acesso.ok) return acesso.resposta;
  const bruto = await request.text().catch(() => "");
  if (bruto.length > TAMANHO_MAXIMO) return erroApi(413, "Mensagem grande demais.");
  if (!dentroDoLimite(acesso.sessao.userId)) return erroApi(429, "Muitas perguntas em pouco tempo. Aguarde um minuto.");

  let json: unknown = null;
  try {
    json = JSON.parse(bruto);
  } catch {
    json = null;
  }
  const corpo = esquema.safeParse(json);
  if (!corpo.success) return erroApi(400, "Pergunta inválida.");

  try {
    const filtros = lerFiltros(Object.fromEntries(new URLSearchParams(corpo.data.filtros)));
    const analise = await carregarAnalise(filtros);
    const contexto = contextoDoRecorte(analise, filtros.modo);
    const resposta = await perguntar(contexto, corpo.data.historico, corpo.data.pergunta);
    return NextResponse.json(
      { resposta, periodo: { de: analise.de, ate: analise.ate }, dataCurva: analise.projecoes?.entrada.dataBase ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    if (erro instanceof ErroAssistente) return erroApi(502, erro.message);
    return erroApi(500, "Não foi possível responder agora. Tente novamente.");
  }
}
