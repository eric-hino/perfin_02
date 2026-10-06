// Curvas de juros: interpolação flat-forward exponencial (base 252) e taxas a termo.

import type { DataISO } from "../datas";
import type { CurvaMercado } from "../series";

export interface Vertice {
  diasCorridos: number;
  diasUteis: number;
  /** % a.a. (base 252 para pré e cupons de inflação; linear 360 para cupom cambial). */
  taxa: number;
}

export interface Curva {
  dataBase: DataISO;
  curva: CurvaMercado;
  vertices: readonly Vertice[];
}

/** Ordena por dias úteis e mantém um vértice por prazo (o de menor prazo corrido). */
export function normalizarVertices(vertices: readonly Vertice[]): Vertice[] {
  const porDu = new Map<number, Vertice>();
  for (const v of [...vertices].sort((a, b) => a.diasCorridos - b.diasCorridos)) {
    if (v.diasUteis > 0 && !porDu.has(v.diasUteis)) porDu.set(v.diasUteis, v);
  }
  return [...porDu.values()].sort((a, b) => a.diasUteis - b.diasUteis);
}

function fatorDoVertice(v: Vertice): number {
  return Math.pow(1 + v.taxa / 100, v.diasUteis / 252);
}

/**
 * Fator acumulado (1 + r)^(du/252) até `du` dias úteis, com interpolação
 * flat-forward exponencial entre vértices. Antes do primeiro vértice usa a
 * taxa dele; depois do último, estende a última taxa a termo.
 */
export function fatorAcumulado(vertices: readonly Vertice[], du: number): number {
  if (du <= 0 || !vertices.length) return 1;
  const primeiro = vertices[0];
  if (du <= primeiro.diasUteis) return Math.pow(1 + primeiro.taxa / 100, du / 252);

  for (let i = 1; i < vertices.length; i += 1) {
    const a = vertices[i - 1];
    const b = vertices[i];
    if (du <= b.diasUteis) {
      const fa = fatorDoVertice(a);
      const fb = fatorDoVertice(b);
      return fa * Math.pow(fb / fa, (du - a.diasUteis) / (b.diasUteis - a.diasUteis));
    }
  }

  const ultimo = vertices[vertices.length - 1];
  const penultimo = vertices.length > 1 ? vertices[vertices.length - 2] : null;
  const termoFinal = penultimo
    ? Math.pow(fatorDoVertice(ultimo) / fatorDoVertice(penultimo), 1 / (ultimo.diasUteis - penultimo.diasUteis))
    : Math.pow(1 + ultimo.taxa / 100, 1 / 252);
  return fatorDoVertice(ultimo) * Math.pow(termoFinal, du - ultimo.diasUteis);
}

/** Taxa à vista (% a.a., base 252) até `du`. */
export function taxaAVista(vertices: readonly Vertice[], du: number): number | null {
  if (du <= 0) return null;
  return (Math.pow(fatorAcumulado(vertices, du), 252 / du) - 1) * 100;
}

/** Taxa a termo (% a.a., base 252) entre du1 e du2. */
export function taxaATermo(vertices: readonly Vertice[], du1: number, du2: number): number | null {
  if (du2 <= du1) return null;
  const f = fatorAcumulado(vertices, du2) / fatorAcumulado(vertices, du1);
  return (Math.pow(f, 252 / (du2 - du1)) - 1) * 100;
}

/** Cupom cambial (linear 360): interpolação linear na taxa por dias corridos, extrapolação plana. */
export function cupomLinear(vertices: readonly Vertice[], dc: number): number | null {
  const ordenados = [...vertices].sort((a, b) => a.diasCorridos - b.diasCorridos);
  if (!ordenados.length) return null;
  if (dc <= ordenados[0].diasCorridos) return ordenados[0].taxa;
  for (let i = 1; i < ordenados.length; i += 1) {
    const a = ordenados[i - 1];
    const b = ordenados[i];
    if (dc <= b.diasCorridos) {
      return a.taxa + ((b.taxa - a.taxa) * (dc - a.diasCorridos)) / (b.diasCorridos - a.diasCorridos);
    }
  }
  return ordenados[ordenados.length - 1].taxa;
}

/**
 * Inflação implícita por vértice: (1 + pré) / (1 + juro real) − 1, alinhando
 * os vértices pelo prazo em dias úteis.
 */
export function curvaImplicita(pre: readonly Vertice[], real: readonly Vertice[]): Vertice[] {
  return real
    .filter((v) => v.diasUteis > 0)
    .map((v) => {
      const fator = fatorAcumulado(pre, v.diasUteis) / fatorDoVertice(v);
      return { ...v, taxa: (Math.pow(fator, 252 / v.diasUteis) - 1) * 100 };
    });
}

/** A curva tem vértices suficientes para projetar (ex.: DI × IGP-M, pouco líquida). */
export function curvaUtilizavel(vertices: readonly Vertice[], minimo = 4, ateDu = 504): boolean {
  return vertices.filter((v) => v.diasUteis <= ateDu).length >= minimo;
}
