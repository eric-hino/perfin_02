// Retornos entre datas, modos de comparação e anualização.

import { type DataISO, diasUteisEntre } from "../datas";
import type { IndiceAcumulado } from "./indice";

export type ModoRetorno = "nominal" | "real" | "excesso_cdi" | "pct_cdi";

export const MODOS: { valor: ModoRetorno; rotulo: string }[] = [
  { valor: "nominal", rotulo: "Nominal" },
  { valor: "real", rotulo: "Real (descontado o IPCA)" },
  { valor: "excesso_cdi", rotulo: "Excesso sobre o CDI" },
  { valor: "pct_cdi", rotulo: "% do CDI" },
];

/** Indicadores usados como referência pelos modos real e de CDI. */
export interface Referencias {
  ipca: IndiceAcumulado | null;
  cdi: IndiceAcumulado | null;
}

export function retornoEntre(indice: IndiceAcumulado, de: DataISO, ate: DataISO): number | null {
  if (ate < de) return null;
  const inicio = indice.valorEm(de);
  const fim = indice.valorEm(ate);
  if (inicio === null || fim === null || inicio === 0) return null;
  return fim / inicio - 1;
}

/** Converte um retorno nominal para o modo pedido, usando o retorno de referência. */
export function aplicarModo(retorno: number, referencia: number | null, modo: ModoRetorno): number | null {
  switch (modo) {
    case "nominal":
      return retorno;
    case "real":
    case "excesso_cdi":
      return referencia === null ? null : (1 + retorno) / (1 + referencia) - 1;
    case "pct_cdi":
      return referencia === null || referencia <= 0 ? null : retorno / referencia;
  }
}

export function referenciaDoModo(modo: ModoRetorno, refs: Referencias): IndiceAcumulado | null {
  if (modo === "real") return refs.ipca;
  if (modo === "excesso_cdi" || modo === "pct_cdi") return refs.cdi;
  return null;
}

/** Retorno entre datas já convertido para o modo. */
export function retornoNoModo(
  indice: IndiceAcumulado,
  de: DataISO,
  ate: DataISO,
  modo: ModoRetorno,
  refs: Referencias,
): number | null {
  const retorno = retornoEntre(indice, de, ate);
  if (retorno === null) return null;
  if (modo === "nominal") return retorno;
  const ref = referenciaDoModo(modo, refs);
  return aplicarModo(retorno, ref ? retornoEntre(ref, de, ate) : null, modo);
}

/** Anualiza em base 252 dias úteis: (1 + R)^(252/du) − 1. */
export function anualizar(retorno: number, diasUteis: number): number | null {
  if (diasUteis <= 0 || retorno <= -1) return null;
  return Math.pow(1 + retorno, 252 / diasUteis) - 1;
}

export function retornoAnualizado(
  retorno: number | null,
  de: DataISO,
  ate: DataISO,
  feriados: ReadonlySet<DataISO>,
): number | null {
  if (retorno === null) return null;
  return anualizar(retorno, diasUteisEntre(de, ate, feriados));
}

/**
 * Série rebaseada em 0% na primeira data da grade: valor(t) = R(grade[0], t) no modo.
 * Datas sem dado viram null (o gráfico interrompe a linha).
 */
export function serieRebaseada(
  indice: IndiceAcumulado,
  grade: readonly DataISO[],
  modo: ModoRetorno,
  refs: Referencias,
): (number | null)[] {
  if (!grade.length) return [];
  const base = grade[0];
  return grade.map((data) => retornoNoModo(indice, base, data, modo, refs));
}
