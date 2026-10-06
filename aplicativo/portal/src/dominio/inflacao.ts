// Inflação (IPCA, IGP-M) e juros reais. Taxas em % (ex.: 0,44 = 0,44% no mês).

import { type DataISO, partes } from "./datas";
import { type Ponto, indiceAsOf } from "./series";

export interface MetaInflacao {
  centro: number;
  tolerancia: number;
}

export type StatusMeta = "abaixo_do_piso" | "dentro" | "acima_do_teto";

/** Composição de taxas mensais: (Π(1 + v/100) − 1) × 100. */
export function compor(taxasPct: readonly number[]): number {
  return (taxasPct.reduce((f, v) => f * (1 + v / 100), 1) - 1) * 100;
}

/** Acumulado dos `n` meses terminados no ponto `ate` (inclusive). Null se faltar mês. */
export function acumuladoMeses(pontos: readonly Ponto[], ate: DataISO, n: number): number | null {
  const fim = indiceAsOf(pontos, ate);
  if (fim < 0 || fim - n + 1 < 0) return null;
  const janela = pontos.slice(fim - n + 1, fim + 1);
  if (!mesesConsecutivos(janela)) return null;
  return compor(janela.map(([, v]) => v));
}

/** Acumulado no ano até o mês `ate` (inclusive). */
export function acumuladoNoAno(pontos: readonly Ponto[], ate: DataISO): number | null {
  const fim = indiceAsOf(pontos, ate);
  if (fim < 0) return null;
  const ano = partes(pontos[fim][0]).ano;
  const doAno = pontos.slice(0, fim + 1).filter(([d]) => partes(d).ano === ano);
  if (doAno.length !== partes(pontos[fim][0]).mes) return null;
  return compor(doAno.map(([, v]) => v));
}

/** Ritmo recente: média dos 3 últimos meses anualizada, ((Π₃(1 + v))⁴ − 1) × 100. */
export function ritmoTrimestralAnualizado(pontos: readonly Ponto[], ate: DataISO): number | null {
  const tres = acumuladoMeses(pontos, ate, 3);
  return tres === null ? null : (Math.pow(1 + tres / 100, 4) - 1) * 100;
}

export function statusMeta(acumulado12m: number, meta: MetaInflacao): StatusMeta {
  if (acumulado12m > meta.centro + meta.tolerancia) return "acima_do_teto";
  if (acumulado12m < meta.centro - meta.tolerancia) return "abaixo_do_piso";
  return "dentro";
}

/** Juro real: ((1 + nominal) / (1 + inflação) − 1) × 100, com entradas em %. */
export function juroReal(nominalPct: number, inflacaoPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflacaoPct / 100) - 1) * 100;
}

/** Série de acumulados de 12 meses, um ponto por mês. */
export function serieAcumulada12m(pontos: readonly Ponto[]): Ponto[] {
  const saida: Ponto[] = [];
  for (const [data] of pontos) {
    const valor = acumuladoMeses(pontos, data, 12);
    if (valor !== null) saida.push([data, valor]);
  }
  return saida;
}

function mesesConsecutivos(pontos: readonly Ponto[]): boolean {
  for (let i = 1; i < pontos.length; i += 1) {
    const a = partes(pontos[i - 1][0]);
    const b = partes(pontos[i][0]);
    if (b.ano * 12 + b.mes - (a.ano * 12 + a.mes) !== 1) return false;
  }
  return true;
}

/** Diferença entre duas séries mensais na mesma data (ex.: IGP-M 12m − IPCA 12m). */
export function diferencaDeSeries(a: readonly Ponto[], b: readonly Ponto[]): Ponto[] {
  const mapa = new Map(b);
  return a.flatMap(([d, v]) => (mapa.has(d) ? [[d, v - (mapa.get(d) as number)] as const] : []));
}

/**
 * Deflaciona uma série de nível pelo índice de inflação, a preços da última data:
 * valor_real(t) = valor(t) × I(última) / I(t).
 */
export function deflacionar(
  pontos: readonly Ponto[],
  indiceEm: (data: DataISO) => number | null,
  dataBase: DataISO,
): Ponto[] {
  const base = indiceEm(dataBase);
  if (base === null) return [];
  return pontos.flatMap(([d, v]) => {
    const i = indiceEm(d);
    return i === null ? [] : [[d, (v * base) / i] as const];
  });
}
