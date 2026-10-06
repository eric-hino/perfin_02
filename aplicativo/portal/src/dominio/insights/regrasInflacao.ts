// Regras de inflação e juros (insights 1 a 5, 8 e 14).

import { formatarMes, inicioDoMes, somarDias } from "../datas";
import { formatarNumero, formatarPct, formatarPp } from "../formatacao";
import { acumuladoMeses, juroReal, ritmoTrimestralAnualizado, statusMeta } from "../inflacao";
import { cdiDozeMeses } from "../juros";
import { type Ponto, indiceAsOf, pontosEntre } from "../series";
import type { ContextoInsights, Insight } from "./tipos";

function ultimoMes(pontos: readonly Ponto[], referencia: string): Ponto | null {
  const i = indiceAsOf(pontos, referencia);
  return i < 0 ? null : pontos[i];
}

/** 1. IPCA 12m em relação à banda da meta, e há quantos meses. */
export function ipcaFrenteAMeta(c: ContextoInsights): Insight | null {
  const ultimo = ultimoMes(c.ipca, c.referencia);
  if (!ultimo) return null;
  const acumulado = acumuladoMeses(c.ipca, ultimo[0], 12);
  if (acumulado === null) return null;
  const status = statusMeta(acumulado, c.meta);
  let meses = 0;
  for (let i = indiceAsOf(c.ipca, ultimo[0]); i >= 0; i -= 1) {
    const valor = acumuladoMeses(c.ipca, c.ipca[i][0], 12);
    if (valor === null || statusMeta(valor, c.meta) !== status) break;
    meses += 1;
  }
  const teto = c.meta.centro + c.meta.tolerancia;
  const piso = c.meta.centro - c.meta.tolerancia;
  const descricao = status === "acima_do_teto" ? `acima do teto da meta (${formatarPct(teto, 1)})`
    : status === "abaixo_do_piso" ? `abaixo do piso da meta (${formatarPct(piso, 1)})`
    : `dentro da banda da meta (${formatarPct(piso, 1)} a ${formatarPct(teto, 1)})`;
  return {
    id: "ipca_meta",
    severidade: status === "dentro" ? "informativo" : "alerta",
    titulo: "IPCA e a meta",
    texto: `IPCA 12m em ${formatarPct(acumulado)} em ${formatarMes(ultimo[0])}, ${descricao}` +
      (meses > 1 ? ` há ${meses} meses.` : "."),
    indicador: "ipca",
    valor: acumulado,
  };
}

/** 2. Aceleração: ritmo de 3 meses anualizado contra o acumulado em 12 meses. */
export function aceleracaoInflacao(c: ContextoInsights): Insight | null {
  const ultimo = ultimoMes(c.ipca, c.referencia);
  if (!ultimo) return null;
  const ritmo = ritmoTrimestralAnualizado(c.ipca, ultimo[0]);
  const doze = acumuladoMeses(c.ipca, ultimo[0], 12);
  if (ritmo === null || doze === null) return null;
  const diferenca = ritmo - doze;
  if (Math.abs(diferenca) < c.limiares.aceleracao_pp) return null;
  const acelerando = diferenca > 0;
  return {
    id: "ipca_ritmo",
    severidade: acelerando ? "atencao" : "informativo",
    titulo: acelerando ? "Inflação acelerando" : "Inflação desacelerando",
    texto: `Ritmo de 3 meses anualizado em ${formatarPct(ritmo)} contra ${formatarPct(doze)} em 12 meses ` +
      `(${formatarPp(diferenca)}).`,
    indicador: "ipca",
    valor: diferenca,
  };
}

/** 3. IGP-M descolado do IPCA (contratos e aluguéis). */
export function descolamentoIgpm(c: ContextoInsights): Insight | null {
  const ultimo = ultimoMes(c.igpm, c.referencia);
  const ultimoIpca = ultimoMes(c.ipca, c.referencia);
  if (!ultimo || !ultimoIpca) return null;
  const igpm = acumuladoMeses(c.igpm, ultimo[0], 12);
  const ipca = acumuladoMeses(c.ipca, ultimoIpca[0], 12);
  if (igpm === null || ipca === null) return null;
  const spread = igpm - ipca;
  if (Math.abs(spread) < c.limiares.descolamento_igpm_ipca_pp) return null;
  return {
    id: "igpm_ipca",
    severidade: "atencao",
    titulo: "IGP-M descolado do IPCA",
    texto: `IGP-M 12m ${formatarPp(spread)} ${spread > 0 ? "acima" : "abaixo"} do IPCA ` +
      `(${formatarPct(igpm)} contra ${formatarPct(ipca)}): atenção a contratos e aluguéis indexados.`,
    indicador: "igpm",
    valor: spread,
  };
}

/** CDI acumulado nos 12 meses até a referência, em % (mesma regra do cartão do painel). */
export function cdi12m(c: ContextoInsights): number | null {
  return cdiDozeMeses(c.cdi, c.referencia);
}

/** 4. Juro real ex-post (CDI 12m descontado o IPCA 12m). */
export function juroRealExPost(c: ContextoInsights): Insight | null {
  const ultimoIpca = ultimoMes(c.ipca, c.referencia);
  const cdi = cdi12m(c);
  const ipca = ultimoIpca ? acumuladoMeses(c.ipca, ultimoIpca[0], 12) : null;
  if (cdi === null || ipca === null) return null;
  const real = juroReal(cdi, ipca);
  const { juro_real_restritivo_pct: alto, juro_real_expansionista_pct: baixo } = c.limiares;
  if (real < alto && real > baixo) return null;
  const restritivo = real >= alto;
  return {
    id: "juro_real",
    severidade: "informativo",
    titulo: restritivo ? "Juro real alto" : "Juro real baixo",
    texto: `Juro real ex-post de ${formatarPct(real)} em 12 meses (CDI ${formatarPct(cdi)} e IPCA ` +
      `${formatarPct(ipca)}): política monetária ${restritivo ? "restritiva" : "expansionista"}.`,
    indicador: "cdi",
    valor: real,
  };
}

/** 5. Decisão do Copom no mês de referência. */
export function decisaoCopom(c: ContextoInsights): Insight | null {
  const inicio = inicioDoMes(c.referencia);
  const doMes = pontosEntre(c.selicMeta, inicio, c.referencia);
  const antes = ultimoMes(c.selicMeta, somarDias(inicio, -1));
  if (!doMes.length || !antes) return null;
  const final = doMes[doMes.length - 1][1];
  const variacao = final - antes[1];
  if (Math.abs(variacao) < 0.01) return null;
  return {
    id: "copom",
    severidade: "informativo",
    titulo: "Decisão do Copom",
    texto: `Copom ${variacao > 0 ? "elevou" : "cortou"} a Selic em ${formatarNumero(Math.abs(variacao))} p.p., ` +
      `para ${formatarPct(final)}.`,
    indicador: "selic_meta",
    valor: final,
  };
}

/** 14. Recorde: maior (ou menor) IPCA mensal em muitos meses. */
export function recordeIpca(c: ContextoInsights): Insight | null {
  const i = indiceAsOf(c.ipca, c.referencia);
  if (i < 24) return null;
  const atual = c.ipca[i][1];
  let j = i - 1;
  while (j >= 0 && c.ipca[j][1] < atual) j -= 1;
  const meses = i - j - 1;
  if (meses < 24) return null;
  const desde = j >= 0 ? formatarMes(c.ipca[j][0]) : "o início da série";
  return {
    id: "ipca_recorde",
    severidade: "atencao",
    titulo: "Recorde do IPCA mensal",
    texto: `IPCA de ${formatarPct(atual)} em ${formatarMes(c.ipca[i][0])}: o maior desde ${desde}.`,
    indicador: "ipca",
    valor: atual,
  };
}
