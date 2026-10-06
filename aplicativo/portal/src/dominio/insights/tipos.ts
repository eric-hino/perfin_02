import type { DataISO } from "../datas";
import type { MetaInflacao } from "../inflacao";
import type { Ponto } from "../series";

export type Severidade = "informativo" | "atencao" | "alerta";

export interface Insight {
  id: string;
  severidade: Severidade;
  titulo: string;
  texto: string;
  indicador: string;
  valor: number | null;
}

export interface Limiares {
  aceleracao_pp: number;
  descolamento_igpm_ipca_pp: number;
  juro_real_restritivo_pct: number;
  juro_real_expansionista_pct: number;
  dolar_variacao_mes_pct: number;
  drawdown_ibovespa_pct: number;
  mudanca_curva_pp: number;
  yield_imab_alto_pct: number;
  meses_extremo: number;
}

export const LIMIARES_PADRAO: Limiares = {
  aceleracao_pp: 1,
  descolamento_igpm_ipca_pp: 3,
  juro_real_restritivo_pct: 5,
  juro_real_expansionista_pct: 2,
  dolar_variacao_mes_pct: 5,
  drawdown_ibovespa_pct: 10,
  mudanca_curva_pp: 0.25,
  yield_imab_alto_pct: 6,
  meses_extremo: 12,
};

/** Resumo do mercado precificado, calculado a partir das projeções. */
export interface ResumoMercado {
  dataCurva: DataISO;
  selicAtual: number | null;
  proximaReuniao: { data: DataISO; selic: number } | null;
  selicFimAno: number | null;
  ipcaImplicito12m: number | null;
  /** Mesmos valores calculados com a curva de ~1 semana antes. */
  semanaAnterior: { dataCurva: DataISO; selicFimAno: number | null; ipcaImplicito12m: number | null } | null;
}

export interface ItemRanking {
  nome: string;
  retorno: number; // fração
}

export interface ContextoInsights {
  /** Data de referência (fim do período analisado). */
  referencia: DataISO;
  meta: MetaInflacao;
  limiares: Limiares;
  ipca: readonly Ponto[];
  igpm: readonly Ponto[];
  cdi: readonly Ponto[];
  selicMeta: readonly Ponto[];
  dolar: readonly Ponto[];
  ibovespa: readonly Ponto[];
  imabYield: readonly Ponto[];
  idp: readonly Ponto[];
  fbcf: readonly Ponto[];
  mercado: ResumoMercado | null;
  ranking: { rotuloJanela: string; itens: ItemRanking[] } | null;
}
