"use server";

import { corrigir, esquemaCorrecao } from "@/lib/dados";
import { lerValorReais, numero, pct } from "@/lib/formatacao";

export interface EstadoCalculadora {
  erro: string | null;
  resultado: { valor: string; fator: string; variacao: string; meses: number } | null;
}

/** Calculadora pública: valida tudo no servidor antes de chamar a função do banco. */
export async function calcular(_anterior: EstadoCalculadora, formulario: FormData): Promise<EstadoCalculadora> {
  const entrada = esquemaCorrecao.safeParse({
    indice: formulario.get("indice"),
    mesInicial: formulario.get("mesInicial"),
    mesFinal: formulario.get("mesFinal"),
    valor: lerValorReais(String(formulario.get("valor") ?? "")) ?? Number.NaN,
  });
  if (!entrada.success) return { erro: "Preencha o índice, os meses e um valor positivo.", resultado: null };
  try {
    const r = await corrigir(entrada.data);
    return {
      erro: null,
      resultado: { valor: `R$ ${numero(r.valorCorrigido)}`, fator: numero(r.fator, 6), variacao: pct(r.variacaoPct, 4), meses: r.meses },
    };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Não foi possível calcular agora.", resultado: null };
  }
}
