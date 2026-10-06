// Índice acumulado de cada série, base para todos os retornos.
//
// - nível (Ibovespa, IMA-B, dólar): I(t) = valor(t), "as of".
// - taxa do período diária (CDI, Selic over): I(t) = Π (1 + r/100) das taxas
//   com data <= t. A taxa do dia d remunera o dia d, então o retorno entre d1 e d2
//   usa as taxas de (d1, d2].
// - taxa do período mensal (IPCA, IGP-M): pro rata geométrico por dias corridos
//   dentro do mês: I(d) = I(fim do mês anterior) × (1 + r_m)^(dia / dias do mês).

import { type DataISO, diasNoMes, fimDoMes, partes, somarDias } from "../datas";
import { type Ponto, type Serie, indiceAsOf } from "../series";

export interface IndiceAcumulado {
  codigo: string;
  /** Primeira data em que o índice existe. */
  primeiraData: DataISO;
  /** Última data coberta por dados realizados. */
  ultimaData: DataISO;
  valorEm(data: DataISO): number | null;
}

export function construirIndice(serie: Serie): IndiceAcumulado | null {
  const { indicador, pontos } = serie;
  if (!pontos.length) return null;
  if (indicador.tipoSerie === "nivel") return indiceDeNivel(indicador.codigo, pontos);
  if (indicador.tipoSerie !== "taxa_periodo") return null;
  return indicador.frequencia === "mensal"
    ? indiceDeTaxaMensal(indicador.codigo, pontos)
    : indiceDeTaxaDiaria(indicador.codigo, pontos);
}

function indiceDeNivel(codigo: string, pontos: readonly Ponto[]): IndiceAcumulado {
  return {
    codigo,
    primeiraData: pontos[0][0],
    ultimaData: pontos[pontos.length - 1][0],
    valorEm(data) {
      const i = indiceAsOf(pontos, data);
      return i < 0 ? null : pontos[i][1];
    },
  };
}

function acumular(pontos: readonly Ponto[]): number[] {
  const acumulado: number[] = new Array(pontos.length);
  let fator = 1;
  for (let i = 0; i < pontos.length; i += 1) {
    fator *= 1 + pontos[i][1] / 100;
    acumulado[i] = fator;
  }
  return acumulado;
}

function indiceDeTaxaDiaria(codigo: string, pontos: readonly Ponto[]): IndiceAcumulado {
  const acumulado = acumular(pontos);
  // A base (I = 1) vale no dia anterior à primeira taxa.
  const base = somarDias(pontos[0][0], -1);
  return {
    codigo,
    primeiraData: base,
    ultimaData: pontos[pontos.length - 1][0],
    valorEm(data) {
      if (data < base) return null;
      const i = indiceAsOf(pontos, data);
      return i < 0 ? 1 : acumulado[i];
    },
  };
}

function indiceDeTaxaMensal(codigo: string, pontos: readonly Ponto[]): IndiceAcumulado {
  const acumulado = acumular(pontos);
  const base = somarDias(pontos[0][0], -1); // último dia do mês anterior ao primeiro
  const ultimaData = fimDoMes(pontos[pontos.length - 1][0]);
  return {
    codigo,
    primeiraData: base,
    ultimaData,
    valorEm(data) {
      if (data < base || data > ultimaData) return null;
      if (data === base) return 1;
      const i = indiceAsOf(pontos, data); // ponto do mês da data (dia 1)
      const anterior = i > 0 ? acumulado[i - 1] : 1;
      const { ano, mes, dia } = partes(data);
      const taxa = pontos[i][1] / 100;
      return anterior * Math.pow(1 + taxa, dia / diasNoMes(ano, mes));
    },
  };
}
