// Estatísticas de séries de nível (câmbio, bolsa, IMA-B).

import type { DataISO } from "./datas";
import { type Ponto, pontosEntre } from "./series";

/** Volatilidade anualizada: desvio-padrão amostral dos log-retornos diários × √252. */
export function volatilidadeAnualizada(pontos: readonly Ponto[]): number | null {
  if (pontos.length < 3) return null;
  const retornos: number[] = [];
  for (let i = 1; i < pontos.length; i += 1) {
    if (pontos[i - 1][1] > 0 && pontos[i][1] > 0) retornos.push(Math.log(pontos[i][1] / pontos[i - 1][1]));
  }
  if (retornos.length < 2) return null;
  const media = retornos.reduce((s, r) => s + r, 0) / retornos.length;
  const variancia = retornos.reduce((s, r) => s + (r - media) ** 2, 0) / (retornos.length - 1);
  return Math.sqrt(variancia) * Math.sqrt(252);
}

export interface Drawdown {
  maximo: number;          // pior queda desde um pico no período (negativo ou 0)
  dataPico: DataISO | null;
  dataVale: DataISO | null;
  atual: number;           // queda atual em relação ao maior valor do período
}

export function drawdown(pontos: readonly Ponto[]): Drawdown | null {
  if (!pontos.length) return null;
  let pico = pontos[0];
  let resultado: Drawdown = { maximo: 0, dataPico: null, dataVale: null, atual: 0 };
  for (const ponto of pontos) {
    if (ponto[1] > pico[1]) pico = ponto;
    const queda = ponto[1] / pico[1] - 1;
    if (queda < resultado.maximo) {
      resultado = { ...resultado, maximo: queda, dataPico: pico[0], dataVale: ponto[0] };
    }
  }
  const ultimo = pontos[pontos.length - 1][1];
  return { ...resultado, atual: ultimo / pico[1] - 1 };
}

/** Média móvel simples de `n` pontos (dias úteis). Os n−1 primeiros ficam sem valor. */
export function mediaMovel(pontos: readonly Ponto[], n: number): (number | null)[] {
  const saida: (number | null)[] = new Array(pontos.length).fill(null);
  let soma = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    soma += pontos[i][1];
    if (i >= n) soma -= pontos[i - n][1];
    if (i >= n - 1) saida[i] = soma / n;
  }
  return saida;
}

export interface ResumoMensalNivel {
  fechamento: number;
  media: number;
  minimo: number;
  maximo: number;
}

/** Fechamento, média, mínimo e máximo dos pontos de um mês. */
export function resumoDoMes(pontos: readonly Ponto[], inicioMes: DataISO, fimMes: DataISO): ResumoMensalNivel | null {
  const doMes = pontosEntre(pontos, inicioMes, fimMes);
  if (!doMes.length) return null;
  const valores = doMes.map(([, v]) => v);
  return {
    fechamento: valores[valores.length - 1],
    media: valores.reduce((s, v) => s + v, 0) / valores.length,
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
  };
}

/** Converte taxa diária (% a.d.) em anual base 252 (% a.a.). */
export function taxaDiariaParaAnual(taxaDiariaPct: number): number {
  return (Math.pow(1 + taxaDiariaPct / 100, 252) - 1) * 100;
}

/** Volatilidade anualizada em janela móvel de `n` dias úteis. */
export function serieVolatilidadeMovel(pontos: readonly Ponto[], n = 63): Ponto[] {
  const saida: Ponto[] = [];
  for (let i = n; i < pontos.length; i += 1) {
    const vol = volatilidadeAnualizada(pontos.slice(i - n, i + 1));
    if (vol !== null) saida.push([pontos[i][0], vol]);
  }
  return saida;
}

/** Queda desde o pico acumulado, ponto a ponto (fração ≤ 0). */
export function serieDrawdown(pontos: readonly Ponto[]): Ponto[] {
  let pico = -Infinity;
  return pontos.map(([d, v]) => {
    pico = Math.max(pico, v);
    return [d, v / pico - 1] as const;
  });
}

/** Média móvel como série de pontos (descarta o início sem janela completa). */
export function serieMediaMovel(pontos: readonly Ponto[], n: number): Ponto[] {
  const medias = mediaMovel(pontos, n);
  return pontos.flatMap(([d], i) => (medias[i] === null ? [] : [[d, medias[i] as number] as const]));
}
