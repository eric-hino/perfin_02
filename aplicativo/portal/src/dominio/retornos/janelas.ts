// Janelas de retorno prontas: todas terminam na data de referência.

import { type DataISO, fimDoMes, inicioDoMes, montar, partes, somarDias, somarMeses } from "../datas";

export type JanelaPronta =
  | "mes" | "ano" | "1m" | "3m" | "6m" | "12m" | "24m" | "36m" | "60m" | "120m" | "inicio";

export const JANELAS: { valor: JanelaPronta; rotulo: string; meses: number | null }[] = [
  { valor: "mes", rotulo: "No mês", meses: null },
  { valor: "ano", rotulo: "No ano", meses: null },
  { valor: "1m", rotulo: "1m", meses: 1 },
  { valor: "3m", rotulo: "3m", meses: 3 },
  { valor: "6m", rotulo: "6m", meses: 6 },
  { valor: "12m", rotulo: "12m", meses: 12 },
  { valor: "24m", rotulo: "24m", meses: 24 },
  { valor: "36m", rotulo: "36m", meses: 36 },
  { valor: "60m", rotulo: "5a", meses: 60 },
  { valor: "120m", rotulo: "10a", meses: 120 },
  { valor: "inicio", rotulo: "Desde o início", meses: null },
];

/** Janelas da tabela de janelas (Retornos e relatório). */
export const JANELAS_TABELA: JanelaPronta[] = ["mes", "ano", "3m", "6m", "12m", "24m", "36m", "60m", "inicio"];

export function rotuloJanela(janela: JanelaPronta): string {
  return JANELAS.find((j) => j.valor === janela)?.rotulo ?? janela;
}

/**
 * Data inicial (base) da janela. O retorno da janela é R(inicio, referência).
 * "No mês" parte do último dia do mês anterior; "no ano", de 31/12 do ano anterior.
 */
export function inicioDaJanela(janela: JanelaPronta, referencia: DataISO, primeiraData: DataISO): DataISO {
  switch (janela) {
    case "mes":
      return somarDias(inicioDoMes(referencia), -1);
    case "ano":
      return montar(partes(referencia).ano - 1, 12, 31);
    case "inicio":
      return primeiraData;
    default: {
      const meses = JANELAS.find((j) => j.valor === janela)?.meses ?? 12;
      return somarMeses(referencia, -meses);
    }
  }
}

/** Janelas acima de 12 meses são exibidas anualizadas. */
export function janelaAnualizada(janela: JanelaPronta): boolean {
  const meses = JANELAS.find((j) => j.valor === janela)?.meses;
  return janela === "inicio" || (meses !== null && meses !== undefined && meses > 12);
}

/** Fim do mês fechado mais recente em relação à data (para relatórios). */
export function ultimoMesFechado(hoje: DataISO): DataISO {
  return fimDoMes(somarDias(inicioDoMes(hoje), -1));
}
