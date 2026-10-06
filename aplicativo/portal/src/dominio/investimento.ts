// Investimento: IDP (fluxo mensal em US$ mi) e FBCF (trimestral em R$ mi correntes).

import { type DataISO, fimDoMes, somarMeses } from "./datas";
import { resumoDoMes } from "./estatisticas";
import { compor } from "./inflacao";
import { type Ponto, pontosEntre } from "./series";

/** Soma móvel de `n` períodos (12 meses para IDP, 4 trimestres para FBCF). */
export function somaMovel(pontos: readonly Ponto[], n: number): Ponto[] {
  const saida: Ponto[] = [];
  let soma = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    soma += pontos[i][1];
    if (i >= n) soma -= pontos[i - n][1];
    if (i >= n - 1) saida.push([pontos[i][0], soma]);
  }
  return saida;
}

/** IDP convertido para R$ (bi) pela PTAX média do mês: US$ mi × média / 1000. */
export function idpEmReais(idp: readonly Ponto[], ptax: readonly Ponto[]): Ponto[] {
  return idp.flatMap(([mes, valor]) => {
    const media = resumoDoMes(ptax, mes, fimDoMes(mes))?.media;
    return media === undefined ? [] : [[mes, (valor * media) / 1000] as const];
  });
}

export interface VariacaoFbcf {
  trimestre: DataISO;
  nominal: number;
  /** Aproximação: nominal deflacionada pelo IPCA de 12 meses até o fim do trimestre. */
  real: number | null;
}

/** Variação da FBCF contra o mesmo trimestre do ano anterior. */
export function variacaoAnualFbcf(fbcf: readonly Ponto[], ipca: readonly Ponto[]): VariacaoFbcf[] {
  const saida: VariacaoFbcf[] = [];
  for (let i = 4; i < fbcf.length; i += 1) {
    const [trimestre, valor] = fbcf[i];
    const nominal = (valor / fbcf[i - 4][1] - 1) * 100;
    const meses = pontosEntre(ipca, somarMeses(trimestre, -9), somarMeses(trimestre, 2));
    const real = meses.length === 12 ? ((1 + nominal / 100) / (1 + compor(meses.map(([, v]) => v)) / 100) - 1) * 100 : null;
    saida.push({ trimestre, nominal, real });
  }
  return saida;
}
