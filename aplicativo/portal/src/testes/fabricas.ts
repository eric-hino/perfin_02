// Fábricas de dados para os testes de domínio (não é código de produção).

import { type DataISO, listarDiasUteis, somarMeses } from "@/dominio/datas";
import { LIMIARES_PADRAO, type ContextoInsights } from "@/dominio/insights/tipos";
import type { MetaInflacao } from "@/dominio/inflacao";
import type { Indicador, Ponto } from "@/dominio/series";

export const SEM_FERIADOS: ReadonlySet<DataISO> = new Set<DataISO>();

export const META: MetaInflacao = { centro: 3, tolerancia: 1.5 };

/** Série mensal com datas no dia 1, a partir de `inicio`. */
export function mensal(inicio: DataISO, valores: readonly number[]): Ponto[] {
  return valores.map((v, i) => [somarMeses(inicio, i), v] as const);
}

/** Série trimestral com datas no dia 1 do trimestre, a partir de `inicio`. */
export function trimestral(inicio: DataISO, valores: readonly number[]): Ponto[] {
  return valores.map((v, i) => [somarMeses(inicio, 3 * i), v] as const);
}

/** Série diária em dias úteis no intervalo [de, ate]. */
export function diaria(
  de: DataISO,
  ate: DataISO,
  valor: number | ((i: number, data: DataISO) => number),
  feriados: ReadonlySet<DataISO> = SEM_FERIADOS,
): Ponto[] {
  return listarDiasUteis(de, ate, feriados).map((d, i) => [d, typeof valor === "number" ? valor : valor(i, d)] as const);
}

export function repetir(valor: number, n: number): number[] {
  return Array.from({ length: n }, () => valor);
}

export function indicador(parcial: Partial<Indicador>): Indicador {
  return {
    codigo: "x", nome: "X", nomeCurto: "X", unidade: "", casas: 2, frequencia: "diaria",
    tipoSerie: "nivel", agregacao: "fechamento", fonte: "BCB_SGS", cor: "#101B2A", curvaProjecao: null, ordem: 0,
    ...parcial,
  };
}

/** Contexto de insights vazio (nenhuma regra deve disparar). */
export function contexto(parcial: Partial<ContextoInsights> = {}): ContextoInsights {
  return {
    referencia: "2025-12-31",
    meta: META,
    limiares: { ...LIMIARES_PADRAO },
    ipca: [], igpm: [], cdi: [], selicMeta: [], dolar: [], ibovespa: [], imabYield: [], idp: [], fbcf: [],
    mercado: null,
    ranking: null,
    ...parcial,
  };
}
