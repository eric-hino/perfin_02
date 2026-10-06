"use server";

import { formatarNumero, formatarPct, formatarReais, lerValorReais } from "@/dominio/formatacao";
import { verificarPerfilApi } from "@/servicos/auth/sessao";
import { corrigir, esquemaCorrecao } from "@/servicos/indicadores/correcao";

export interface EstadoCorrecao {
  erro: string | null;
  resultado: { valor: string; fator: string; variacao: string; meses: number } | null;
}

export async function calcularCorrecao(_anterior: EstadoCorrecao, formulario: FormData): Promise<EstadoCorrecao> {
  const acesso = await verificarPerfilApi("usuario");
  if (!acesso.ok) return { erro: "Sessão expirada. Entre novamente.", resultado: null };

  const entrada = esquemaCorrecao.safeParse({
    indice: formulario.get("indice"),
    mesInicial: formulario.get("mesInicial"),
    mesFinal: formulario.get("mesFinal"),
    valor: lerValorReais(String(formulario.get("valor") ?? "")) ?? Number.NaN,
  });
  if (!entrada.success) return { erro: "Preencha índice, meses e um valor positivo.", resultado: null };

  try {
    const r = await corrigir(entrada.data);
    return {
      erro: null,
      resultado: {
        valor: formatarReais(r.valorCorrigido), fator: formatarNumero(r.fator, 6),
        variacao: formatarPct(r.variacaoPct, 4), meses: r.meses,
      },
    };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Não foi possível calcular agora.", resultado: null };
  }
}
