// Construtores de séries do ECharts (apresentação). Os dados vêm calculados do domínio.

import type { Ponto } from "@/dominio/series";

export function linha(nome: string, cor: string, pontos: readonly (readonly [string, number | null])[], extra: Record<string, unknown> = {}) {
  return { name: nome, type: "line", showSymbol: false, color: cor, lineStyle: { width: 2 }, data: pontos.map(([d, v]) => [d, v]), ...extra };
}

export function barras(nome: string, cor: string, pontos: readonly (readonly [string, number | null])[], extra: Record<string, unknown> = {}) {
  return { name: nome, type: "bar", color: cor, barCategoryGap: "35%", data: pontos.map(([d, v]) => [d, v]), ...extra };
}

export function tracejada(nome: string, cor: string, pontos: readonly (readonly [string, number | null])[]) {
  return linha(nome, cor, pontos, { lineStyle: { width: 2, type: "dashed" } });
}

export function escalar(pontos: readonly Ponto[], fator: number): Ponto[] {
  return pontos.map(([d, v]) => [d, v * fator] as const);
}

export function entre(pontos: readonly Ponto[], de: string, ate: string): Ponto[] {
  return pontos.filter(([d]) => d >= de && d <= ate);
}
