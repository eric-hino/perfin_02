import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ambiente } from "./config";

// O site usa só as duas funções públicas do banco (destaques_publicos e
// corrigir_valor), que entregam dados agregados do BCB/IBGE. Não há sessão.

function cliente() {
  const env = ambiente();
  if (!env) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Destaque {
  codigo: string;
  nome: string;
  unidade: string;
  casas: number;
  dataReferencia: string;
  valor: number;
  valorAnterior: number | null;
  acumulado12m: number | null;
}

const linha = z.object({
  codigo: z.string(), nome: z.string(), unidade: z.string(), casas: z.coerce.number(),
  data_referencia: z.string(), valor: z.coerce.number(),
  valor_anterior: z.coerce.number().nullable(), acumulado_12m: z.coerce.number().nullable(),
});

export async function destaques(): Promise<Destaque[] | null> {
  const supabase = cliente();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("destaques_publicos");
  if (error) return null;
  const linhas = z.array(linha).safeParse(data);
  if (!linhas.success) return null;
  return linhas.data.map((l) => ({
    codigo: l.codigo, nome: l.nome, unidade: l.unidade, casas: l.casas, dataReferencia: l.data_referencia,
    valor: l.valor, valorAnterior: l.valor_anterior, acumulado12m: l.acumulado_12m,
  }));
}

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

/** Correção monetária pela função SQL pública (mesma regra do Portal). */
export async function corrigir(e: z.infer<typeof esquemaCorrecao>): Promise<ResultadoCorrecao> {
  const supabase = cliente();
  if (!supabase) throw new Error("Calculadora indisponível no momento.");
  const { data, error } = await supabase.rpc("corrigir_valor", {
    p_indice: e.indice, p_mes_inicial: `${e.mesInicial}-01`, p_mes_final: `${e.mesFinal}-01`, p_valor: e.valor,
  });
  if (error) throw new Error(error.code === "22023" ? error.message : "Não foi possível calcular agora.");
  const r = (data as { fator: number; variacao_pct: number; valor_corrigido: number; meses: number }[])[0];
  return { fator: Number(r.fator), variacaoPct: Number(r.variacao_pct), valorCorrigido: Number(r.valor_corrigido), meses: r.meses };
}
