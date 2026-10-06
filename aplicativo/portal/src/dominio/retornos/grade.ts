// Grade de dias úteis do gráfico de retornos: índices pré-calculados e séries rebaseadas.

import { type DataISO, listarDiasUteis, paraMs } from "../datas";
import type { PontoProjetado } from "../projecoes/projecoes";
import type { Indicador } from "../series";
import { type IndiceAcumulado, construirIndice } from "./indice";
import { type ModoRetorno, aplicarModo, referenciaDoModo, retornoNoModo } from "./retornos";

export interface Preparado {
  grade: DataISO[];
  gradeMs: number[];
  indices: Record<string, IndiceAcumulado>;
  /** Valor do índice em cada dia da grade (NaN quando não há dado). */
  valores: Record<string, Float64Array>;
}

/** Índices de cada série e seus valores na grade de dias úteis (calculado uma vez). */
export function prepararGrade(
  indicadores: readonly Indicador[],
  pontos: Readonly<Record<string, readonly (readonly [DataISO, number])[]>>,
  feriados: readonly DataISO[],
): Preparado {
  const indices: Record<string, IndiceAcumulado> = {};
  for (const indicador of indicadores) {
    const indice = construirIndice({ indicador, pontos: pontos[indicador.codigo] ?? [] });
    if (indice) indices[indicador.codigo] = indice;
  }
  const primeiras = Object.values(indices).map((i) => i.primeiraData).sort();
  const ultimas = Object.values(indices).map((i) => i.ultimaData).sort();
  const grade = primeiras.length ? listarDiasUteis(primeiras[0], ultimas[ultimas.length - 1], new Set(feriados)) : [];
  const valores: Record<string, Float64Array> = {};
  for (const [codigo, indice] of Object.entries(indices)) {
    valores[codigo] = Float64Array.from(grade, (d) => indice.valorEm(d) ?? Number.NaN);
  }
  return { grade, gradeMs: grade.map(paraMs), indices, valores };
}

/** Posição na grade do último dia útil <= data. */
export function posicaoNaGrade(grade: readonly DataISO[], data: DataISO): number {
  let baixo = 0;
  let alto = grade.length - 1;
  let achado = 0;
  while (baixo <= alto) {
    const meio = (baixo + alto) >> 1;
    if (grade[meio] <= data) {
      achado = meio;
      baixo = meio + 1;
    } else {
      alto = meio - 1;
    }
  }
  return achado;
}

/**
 * Série rebaseada em 0% no início da janela, no modo pedido, como pares
 * [ms, retorno] para o ECharts. Pontos sem dado viram null.
 */
export function serieNaJanela(
  p: Preparado, codigo: string, inicio: DataISO, modo: ModoRetorno,
): [number, number | null][] {
  const valores = p.valores[codigo];
  if (!valores) return [];
  const base = posicaoNaGrade(p.grade, inicio);
  const ref = referenciaDoModo(modo, { ipca: p.indices.ipca ?? null, cdi: p.indices.cdi ?? null });
  const valoresRef = ref ? p.valores[ref.codigo] : null;
  const saida: [number, number | null][] = new Array(p.grade.length);
  for (let i = 0; i < p.grade.length; i += 1) {
    const retorno = valores[i] / valores[base] - 1;
    let valor: number | null = Number.isFinite(retorno) ? retorno : null;
    if (valor !== null && modo !== "nominal") {
      const r = valoresRef ? valoresRef[i] / valoresRef[base] - 1 : Number.NaN;
      valor = aplicarModo(valor, Number.isFinite(r) ? r : null, modo);
    }
    saida[i] = [p.gradeMs[i], valor];
  }
  return saida;
}

/** Índice projetado rebaseado no início da janela, partindo do último valor realizado. */
export function serieProjetada(p: Preparado, codigo: string, inicio: DataISO, pontos: readonly PontoProjetado[]): [number, number][] {
  const valores = p.valores[codigo];
  const indice = p.indices[codigo];
  if (!valores || !indice || !pontos.length) return [];
  const base = valores[posicaoNaGrade(p.grade, inicio)];
  const partida: [number, number] = [paraMs(indice.ultimaData), (indice.valorEm(indice.ultimaData) ?? Number.NaN) / base - 1];
  return [partida, ...pontos.map((pt) => [paraMs(pt.data), pt.valor / base - 1] as [number, number])];
}

/** Retorno de cada série entre duas datas no modo pedido, do maior para o menor. */
export function retornosNoPeriodo(
  indicadores: readonly Indicador[], indices: Record<string, IndiceAcumulado>, de: DataISO, ate: DataISO, modo: ModoRetorno,
): { indicador: Indicador; retorno: number | null }[] {
  const refs = { ipca: indices.ipca ?? null, cdi: indices.cdi ?? null };
  return indicadores
    .filter((i) => indices[i.codigo])
    .map((indicador) => ({ indicador, retorno: retornoNoModo(indices[indicador.codigo], de, ate, modo, refs) }))
    .sort((a, b) => (b.retorno ?? -Infinity) - (a.retorno ?? -Infinity));
}
