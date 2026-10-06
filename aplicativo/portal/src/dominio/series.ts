import type { DataISO } from "./datas";

export type TipoSerie = "taxa_periodo" | "nivel" | "taxa" | "fluxo" | "auxiliar";
export type Frequencia = "diaria" | "mensal" | "trimestral";
export type Agregacao = "composto" | "fechamento" | "ultimo" | "soma";
export type CurvaMercado = "pre" | "ipca_real" | "igpm_real" | "cupom_cambial";

export interface Indicador {
  codigo: string;
  nome: string;
  nomeCurto: string;
  unidade: string;
  casas: number;
  frequencia: Frequencia;
  tipoSerie: TipoSerie;
  agregacao: Agregacao;
  fonte: string;
  cor: string;
  curvaProjecao: CurvaMercado | null;
  ordem: number;
}

/** Ponto de uma série: [data, valor]. As séries ficam em ordem crescente de data. */
export type Ponto = readonly [DataISO, number];

export interface Serie {
  indicador: Indicador;
  pontos: readonly Ponto[];
}

/** Séries que têm retorno acumulado (entram no gráfico de retornos). */
export function temRetorno(indicador: Indicador): boolean {
  return indicador.tipoSerie === "taxa_periodo" || indicador.tipoSerie === "nivel";
}

/** Índice do último ponto com data <= `data`, ou -1. Busca binária. */
export function indiceAsOf(pontos: readonly Ponto[], data: DataISO): number {
  let baixo = 0;
  let alto = pontos.length - 1;
  let achado = -1;
  while (baixo <= alto) {
    const meio = (baixo + alto) >> 1;
    if (pontos[meio][0] <= data) {
      achado = meio;
      baixo = meio + 1;
    } else {
      alto = meio - 1;
    }
  }
  return achado;
}

/** Valor do último ponto com data <= `data` (convenção "as of"). */
export function valorAsOf(pontos: readonly Ponto[], data: DataISO): number | null {
  const i = indiceAsOf(pontos, data);
  return i < 0 ? null : pontos[i][1];
}

export function ultimoPonto(pontos: readonly Ponto[]): Ponto | null {
  return pontos.length ? pontos[pontos.length - 1] : null;
}

export function pontosEntre(pontos: readonly Ponto[], de: DataISO, ate: DataISO): Ponto[] {
  return pontos.filter(([d]) => d >= de && d <= ate);
}
