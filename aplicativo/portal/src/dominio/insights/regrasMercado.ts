// Regras de mercado (insights 6 a 13).

import { type DataISO, formatarData, formatarMes, inicioDoMes, somarDias, somarMeses } from "../datas";
import { drawdown, volatilidadeAnualizada } from "../estatisticas";
import { formatarFracaoPct, formatarNumero, formatarPct, formatarPp, formatarReais } from "../formatacao";
import { compor } from "../inflacao";
import { type Ponto, indiceAsOf, pontosEntre, valorAsOf } from "../series";
import { cdi12m } from "./regrasInflacao";
import type { ContextoInsights, Insight } from "./tipos";

/** 6. Copom precificado na próxima reunião e Selic implícita no fim do ano. */
export function copomPrecificado(c: ContextoInsights): Insight | null {
  const m = c.mercado;
  if (!m || m.selicAtual === null || !m.proximaReuniao) return null;
  const mudanca = m.proximaReuniao.selic - m.selicAtual;
  // Arredonda para múltiplos de 0,25 p.p. simetricamente (alta e corte).
  const passo = Math.sign(mudanca) * Math.round(Math.abs(mudanca) / 0.25) * 0.25;
  const leitura = Math.abs(passo) < 0.25 ? "manutenção da Selic"
    : `${passo > 0 ? "alta" : "corte"} de ${formatarNumero(Math.abs(passo))} p.p.`;
  const fimAno = m.selicFimAno === null ? "" : `; Selic implícita de ${formatarPct(m.selicFimAno)} no fim do ano`;
  return {
    id: "copom_precificado",
    severidade: "informativo",
    titulo: "O que o mercado precifica para o Copom",
    texto: `Mercado precifica ${leitura} na reunião de ${formatarData(m.proximaReuniao.data)}${fimAno} ` +
      `(curva de ${formatarData(m.dataCurva)}).`,
    indicador: "selic_meta",
    valor: m.proximaReuniao.selic,
  };
}

/** 7. A curva mudou de forma relevante em uma semana. */
export function curvaMudou(c: ContextoInsights): Insight | null {
  const m = c.mercado;
  if (!m?.semanaAnterior) return null;
  const limiar = c.limiares.mudanca_curva_pp;
  const mudancas: string[] = [];
  let maior = 0;
  const comparar = (nome: string, atual: number | null, antes: number | null) => {
    if (atual === null || antes === null) return;
    const delta = atual - antes;
    if (Math.abs(delta) >= limiar) {
      mudancas.push(`${nome} ${formatarPp(delta)} (para ${formatarPct(atual)})`);
      maior = Math.max(maior, Math.abs(delta));
    }
  };
  comparar("Selic implícita no fim do ano", m.selicFimAno, m.semanaAnterior.selicFimAno);
  comparar("IPCA implícito em 12 meses", m.ipcaImplicito12m, m.semanaAnterior.ipcaImplicito12m);
  if (!mudancas.length) return null;
  return {
    id: "curva_mudou",
    severidade: "atencao",
    titulo: "A curva mudou na semana",
    texto: `Desde ${formatarData(m.semanaAnterior.dataCurva)}: ${mudancas.join("; ")}.`,
    indicador: "selic_meta",
    valor: maior,
  };
}

/** 8. Inflação implícita em 12 meses fora da banda da meta. */
export function inflacaoImplicita(c: ContextoInsights): Insight | null {
  const valor = c.mercado?.ipcaImplicito12m;
  if (valor === null || valor === undefined) return null;
  const teto = c.meta.centro + c.meta.tolerancia;
  const piso = c.meta.centro - c.meta.tolerancia;
  if (valor <= teto && valor >= piso) return null;
  return {
    id: "ipca_implicito",
    severidade: "atencao",
    titulo: "Inflação implícita fora da meta",
    texto: `O mercado embute IPCA de ${formatarPct(valor)} nos próximos 12 meses, ` +
      `${valor > teto ? `acima do teto (${formatarPct(teto, 1)})` : `abaixo do piso (${formatarPct(piso, 1)})`}.`,
    indicador: "ipca",
    valor,
  };
}

/** Extremo da série no ponto de referência dentro de N meses. */
function extremo(pontos: readonly Ponto[], referencia: DataISO, meses: number): "maxima" | "minima" | null {
  const janela = pontosEntre(pontos, somarMeses(referencia, -meses), referencia);
  if (janela.length < 20) return null;
  const atual = janela[janela.length - 1][1];
  const valores = janela.map(([, v]) => v);
  if (Math.max(...valores) === Math.min(...valores)) return null; // série plana não tem extremo
  if (atual >= Math.max(...valores)) return "maxima";
  if (atual <= Math.min(...valores)) return "minima";
  return null;
}

/** 9. Yield do IMA-B (juro real) em extremo ou acima do limiar. */
export function yieldImab(c: ContextoInsights): Insight | null {
  const atual = valorAsOf(c.imabYield, c.referencia);
  if (atual === null) return null;
  const meses = c.limiares.meses_extremo;
  const ext = extremo(c.imabYield, c.referencia, meses);
  const alto = atual >= c.limiares.yield_imab_alto_pct;
  if (!ext && !alto) return null;
  const detalhe = ext ? `, a ${ext === "maxima" ? "maior" : "menor"} taxa em ${meses} meses` : "";
  return {
    id: "imab_yield",
    severidade: alto ? "atencao" : "informativo",
    titulo: "Juro real do IMA-B",
    texto: `IMA-B pagando IPCA + ${formatarPct(atual)}${detalhe}.`,
    indicador: "imab_yield",
    valor: atual,
  };
}

/** 10. Ibovespa contra o CDI em 12 meses e drawdown. */
export function ibovespaContraCdi(c: ContextoInsights): Insight | null {
  const atual = valorAsOf(c.ibovespa, c.referencia);
  const antes = valorAsOf(c.ibovespa, somarMeses(c.referencia, -12));
  const cdi = cdi12m(c);
  if (atual === null || antes === null || cdi === null) return null;
  const retorno = (atual / antes - 1) * 100;
  const dd = drawdown(pontosEntre(c.ibovespa, somarMeses(c.referencia, -12), c.referencia));
  const emQueda = dd !== null && dd.atual * 100 <= -c.limiares.drawdown_ibovespa_pct;
  const queda = emQueda ? ` Está ${formatarFracaoPct(-dd.atual)} abaixo do pico de 12 meses.` : "";
  return {
    id: "ibovespa_cdi",
    severidade: emQueda ? "atencao" : "informativo",
    titulo: retorno >= cdi ? "Ibovespa ganhou do CDI" : "Ibovespa perdeu para o CDI",
    texto: `Em 12 meses, Ibovespa ${formatarPct(retorno, 1, true)} contra CDI ${formatarPct(cdi, 1)}.${queda}`,
    indicador: "ibovespa",
    valor: retorno - cdi,
  };
}

/** 11. Dólar: variação no mês, extremos em 12 meses e volatilidade. */
export function dolarNoMes(c: ContextoInsights): Insight | null {
  const fim = valorAsOf(c.dolar, c.referencia);
  const inicio = valorAsOf(c.dolar, somarDias(inicioDoMes(c.referencia), -1));
  if (fim === null || inicio === null) return null;
  const variacao = (fim / inicio - 1) * 100;
  const ext = extremo(c.dolar, c.referencia, c.limiares.meses_extremo);
  const volAtual = volatilidadeAnualizada(pontosEntre(c.dolar, somarMeses(c.referencia, -1), c.referencia));
  const volAno = volatilidadeAnualizada(pontosEntre(c.dolar, somarMeses(c.referencia, -12), c.referencia));
  const volAlta = volAtual !== null && volAno !== null && volAtual > volAno * 1.25;
  if (Math.abs(variacao) < c.limiares.dolar_variacao_mes_pct && !ext && !volAlta) return null;
  const partes = [`Dólar em ${formatarReais(fim, 4)}, ${formatarPct(variacao, 1, true)} no mês`];
  if (ext) partes.push(`${ext === "maxima" ? "maior" : "menor"} cotação em ${c.limiares.meses_extremo} meses`);
  if (volAlta) partes.push(`volatilidade de ${formatarFracaoPct(volAtual, 0)} contra ${formatarFracaoPct(volAno, 0)} em 12m`);
  return {
    id: "dolar",
    severidade: Math.abs(variacao) >= c.limiares.dolar_variacao_mes_pct ? "atencao" : "informativo",
    titulo: "Câmbio",
    texto: `${partes.join("; ")}.`,
    indicador: "dolar_ptax",
    valor: variacao,
  };
}

/** 12. IDP 12m em queda por 3 meses seguidos; FBCF com variação contra o ano anterior. */
export function investimento(c: ContextoInsights): Insight | null {
  const i = indiceAsOf(c.idp, c.referencia);
  if (i >= 15) {
    const soma12 = (k: number) => c.idp.slice(k - 11, k + 1).reduce((s, [, v]) => s + v, 0);
    const quedas = [i, i - 1, i - 2].every((k) => soma12(k) < soma12(k - 1));
    if (quedas) {
      return {
        id: "idp_queda",
        severidade: "atencao",
        titulo: "Investimento estrangeiro em queda",
        texto: `Ingresso de IDP em 12 meses caiu pelo 3º mês seguido, para US$ ` +
          `${formatarNumero(soma12(i) / 1000, 1)} bi (até ${formatarMes(c.idp[i][0])}).`,
        indicador: "idp",
        valor: soma12(i),
      };
    }
  }
  return fbcfAnual(c);
}

function fbcfAnual(c: ContextoInsights): Insight | null {
  const i = indiceAsOf(c.fbcf, c.referencia);
  if (i < 4) return null;
  const [data, atual] = c.fbcf[i];
  const anterior = c.fbcf[i - 4][1];
  const meses = pontosEntre(c.ipca, somarMeses(data, -9), somarMeses(data, 2));
  if (meses.length !== 12) return null; // sem os 12 meses de IPCA não há variação real
  const inflacao = compor(meses.map(([, v]) => v));
  const real = ((atual / anterior) / (1 + inflacao / 100) - 1) * 100;
  return {
    id: "fbcf",
    severidade: "informativo",
    titulo: real >= 0 ? "Investimento (FBCF) em alta" : "Investimento (FBCF) em queda",
    texto: `FBCF variou ~${formatarPct(real, 1, true)} reais no trimestre de ${formatarMes(data)} contra o ` +
      `mesmo trimestre do ano anterior (aproximação deflacionada pelo IPCA).`,
    indicador: "fbcf",
    valor: real,
  };
}

/** 13. Ranking da janela: quem lidera e quem fica em último. */
export function rankingJanela(c: ContextoInsights): Insight | null {
  const itens = c.ranking?.itens.filter((i) => Number.isFinite(i.retorno)) ?? [];
  if (!c.ranking || itens.length < 3) return null;
  const ordenados = [...itens].sort((a, b) => b.retorno - a.retorno);
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  return {
    id: "ranking",
    severidade: "informativo",
    titulo: `Ranking em ${c.ranking.rotuloJanela}`,
    texto: `Em ${c.ranking.rotuloJanela}: ${primeiro.nome} ${formatarFracaoPct(primeiro.retorno, 1, true)} lidera; ` +
      `${ultimo.nome} ${formatarFracaoPct(ultimo.retorno, 1, true)} fica em último.`,
    indicador: "ranking",
    valor: primeiro.retorno,
  };
}
