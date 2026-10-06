// Tabela de janelas (indicador × janela) e janela móvel.

import { type DataISO, fimDoMes, inicioDoMes, somarMeses } from "../datas";
import type { IndiceAcumulado } from "./indice";
import { JANELAS_TABELA, type JanelaPronta, inicioDaJanela, janelaAnualizada } from "./janelas";
import { type ModoRetorno, type Referencias, referenciaDoModo, retornoAnualizado, retornoNoModo } from "./retornos";

export interface CelulaJanela {
  janela: JanelaPronta;
  de: DataISO;
  ate: DataISO;
  retorno: number | null;
  /** Preenchido nas janelas acima de 12 meses. */
  anualizado: number | null;
}

export interface LinhaJanelas {
  codigo: string;
  /** Última data com dado realizado; janelas que passam dela ficam marcadas. */
  ultimaData: DataISO;
  celulas: CelulaJanela[];
}

export function linhaDeJanelas(
  indice: IndiceAcumulado,
  referencia: DataISO,
  modo: ModoRetorno,
  refs: Referencias,
  feriados: ReadonlySet<DataISO>,
  janelas: JanelaPronta[] = JANELAS_TABELA,
): LinhaJanelas {
  // Séries com defasagem (ex.: IPCA) terminam antes da referência: a janela é
  // contada a partir do último dado, para que "12m" sejam de fato 12 meses. Nos
  // modos real e de CDI, também até o último dado da série de referência.
  const ref = referenciaDoModo(modo, refs);
  const limites = [referencia, indice.ultimaData, ...(ref ? [ref.ultimaData] : [])].sort();
  const ate = limites[0];
  const celulas = janelas.map((janela) => {
    const inicio = inicioDaJanela(janela, ate, indice.primeiraData);
    const de = inicio < indice.primeiraData ? indice.primeiraData : inicio;
    const retorno = retornoNoModo(indice, de, ate, modo, refs);
    const anualizado =
      janelaAnualizada(janela) && modo !== "pct_cdi" ? retornoAnualizado(retorno, de, ate, feriados) : null;
    return { janela, de, ate, retorno, anualizado };
  });
  return { codigo: indice.codigo, ultimaData: indice.ultimaData, celulas };
}

export interface PontoJanelaMovel {
  data: DataISO;
  retorno: number | null;
}

/**
 * Retorno de N meses rolando no tempo, amostrado no fim de cada mês do período.
 */
export function janelaMovel(
  indice: IndiceAcumulado,
  meses: number,
  de: DataISO,
  ate: DataISO,
  modo: ModoRetorno,
  refs: Referencias,
): PontoJanelaMovel[] {
  const pontos: PontoJanelaMovel[] = [];
  const limite = ate < indice.ultimaData ? ate : indice.ultimaData;
  for (let fim = fimDoMes(de); fim <= limite; fim = fimDoMes(somarMeses(inicioDoMes(fim), 1))) {
    pontos.push({ data: fim, retorno: retornoNoModo(indice, somarMeses(fim, -meses), fim, modo, refs) });
  }
  return pontos;
}
