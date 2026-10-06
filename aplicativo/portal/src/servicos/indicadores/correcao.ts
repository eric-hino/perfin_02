import "server-only";

import { z } from "zod";

import { clienteSupabase } from "../supabase/servidor";

export const esquemaCorrecao = z.object({
  indice: z.enum(["ipca", "igpm"]),
  mesInicial: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  mesFinal: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  valor: z.coerce.number().positive().max(1_000_000_000_000),
});

export interface ResultadoCorrecao {
  fator: number;
  variacaoPct: number;
  valorCorrigido: number;
  meses: number;
}

/** Correção monetária pela função SQL corrigir_valor (mesma regra do site público). */
export async function corrigir(entrada: z.infer<typeof esquemaCorrecao>): Promise<ResultadoCorrecao> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.rpc("corrigir_valor", {
    p_indice: entrada.indice,
    p_mes_inicial: `${entrada.mesInicial}-01`,
    p_mes_final: `${entrada.mesFinal}-01`,
    p_valor: entrada.valor,
  });
  // Erros de validação da função (código 22023) têm mensagem própria para o usuário.
  if (error) throw new Error(error.code === "22023" ? error.message : "Não foi possível calcular agora.");
  const linha = (data as { fator: number; variacao_pct: number; valor_corrigido: number; meses: number }[])[0];
  return { fator: Number(linha.fator), variacaoPct: Number(linha.variacao_pct), valorCorrigido: Number(linha.valor_corrigido), meses: linha.meses };
}
