// Agregação por granularidade (mensal, trimestral, anual), respeitando o tipo de cada série.

import { type DataISO, fimDoMes, montar, partes } from "./datas";
import type { Agregacao, Ponto } from "./series";

export type Granularidade = "diaria" | "mensal" | "trimestral" | "anual";

export const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: "diaria", rotulo: "Diária" },
  { valor: "mensal", rotulo: "Mensal" },
  { valor: "trimestral", rotulo: "Trimestral" },
  { valor: "anual", rotulo: "Anual" },
];

export interface PontoAgregado {
  /** Primeiro dia do período. */
  periodo: DataISO;
  valor: number;
  /** Média do período (só para séries de nível). */
  media?: number;
  /** O período foi cortado pelo filtro ou ainda não terminou. */
  parcial: boolean;
}

export function inicioDoPeriodo(data: DataISO, granularidade: Granularidade): DataISO {
  const { ano, mes } = partes(data);
  if (granularidade === "anual") return montar(ano, 1, 1);
  if (granularidade === "trimestral") return montar(ano, Math.floor((mes - 1) / 3) * 3 + 1, 1);
  if (granularidade === "mensal") return montar(ano, mes, 1);
  return data;
}

export function fimDoPeriodo(inicio: DataISO, granularidade: Granularidade): DataISO {
  const { ano, mes } = partes(inicio);
  if (granularidade === "anual") return montar(ano, 12, 31);
  if (granularidade === "trimestral") return fimDoMes(montar(ano, mes + 2, 1));
  if (granularidade === "mensal") return fimDoMes(inicio);
  return inicio;
}

function agregarValores(valores: number[], agregacao: Agregacao): { valor: number; media?: number } {
  switch (agregacao) {
    case "composto":
      return { valor: (valores.reduce((f, v) => f * (1 + v / 100), 1) - 1) * 100 };
    case "soma":
      return { valor: valores.reduce((s, v) => s + v, 0) };
    case "fechamento":
      return { valor: valores[valores.length - 1], media: valores.reduce((s, v) => s + v, 0) / valores.length };
    case "ultimo":
      return { valor: valores[valores.length - 1] };
  }
}

/**
 * Agrega os pontos do intervalo [de, ate]. Um período é parcial quando o
 * intervalo começa depois do seu início ou termina antes do seu fim.
 */
export function agregar(
  pontos: readonly Ponto[],
  agregacao: Agregacao,
  granularidade: Granularidade,
  de: DataISO,
  ate: DataISO,
): PontoAgregado[] {
  const grupos = new Map<DataISO, number[]>();
  for (const [data, valor] of pontos) {
    if (data < de || data > ate) continue;
    const chave = inicioDoPeriodo(data, granularidade);
    const lista = grupos.get(chave);
    if (lista) lista.push(valor);
    else grupos.set(chave, [valor]);
  }
  return [...grupos.entries()].map(([periodo, valores]) => ({
    periodo,
    ...agregarValores(valores, agregacao),
    parcial: granularidade !== "diaria" && (periodo < de || fimDoPeriodo(periodo, granularidade) > ate),
  }));
}
