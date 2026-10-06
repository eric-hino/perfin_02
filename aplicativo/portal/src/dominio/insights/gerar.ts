// Avalia todas as regras e devolve os insights em ordem de severidade.

import {
  aceleracaoInflacao, decisaoCopom, descolamentoIgpm, ipcaFrenteAMeta, juroRealExPost, recordeIpca,
} from "./regrasInflacao";
import {
  copomPrecificado, curvaMudou, dolarNoMes, ibovespaContraCdi, inflacaoImplicita, investimento, rankingJanela, yieldImab,
} from "./regrasMercado";
import type { ContextoInsights, Insight, Severidade } from "./tipos";

const REGRAS: ((c: ContextoInsights) => Insight | null)[] = [
  ipcaFrenteAMeta,
  aceleracaoInflacao,
  descolamentoIgpm,
  juroRealExPost,
  decisaoCopom,
  copomPrecificado,
  curvaMudou,
  inflacaoImplicita,
  yieldImab,
  ibovespaContraCdi,
  dolarNoMes,
  investimento,
  rankingJanela,
  recordeIpca,
];

const PESO: Record<Severidade, number> = { alerta: 0, atencao: 1, informativo: 2 };

export function gerarInsights(contexto: ContextoInsights): Insight[] {
  const insights: Insight[] = [];
  for (const regra of REGRAS) {
    const insight = regra(contexto);
    if (insight) insights.push(insight);
  }
  // Ordenação estável: severidade primeiro, depois a ordem das regras.
  return insights
    .map((insight, ordem) => ({ insight, ordem }))
    .sort((a, b) => PESO[a.insight.severidade] - PESO[b.insight.severidade] || a.ordem - b.ordem)
    .map(({ insight }) => insight);
}
