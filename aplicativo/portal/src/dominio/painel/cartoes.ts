// Cartões (KPIs) da Visão geral: valores já formatados em pt-BR.

import { type DataISO, formatarMes, inicioDoMes, somarDias, somarMeses } from "../datas";
import { formatarNumero, formatarPct, formatarPp, sinalDe } from "../formatacao";
import { acumuladoMeses, compor, juroReal, type MetaInflacao, serieAcumulada12m, statusMeta } from "../inflacao";
import type { ValoresHorizonte } from "../projecoes/projecoes";
import { type Ponto, indiceAsOf, pontosEntre, ultimoPonto, valorAsOf } from "../series";

export interface Cartao {
  chave: string;
  rotulo: string;
  valor: string;
  detalhe?: string;
  variacao?: { texto: string; sinal: "positivo" | "negativo" | "neutro" };
  selo?: string;
  minilinha?: number[];
}

const SELO_META = { abaixo_do_piso: "Abaixo do piso da meta", dentro: "Dentro da meta", acima_do_teto: "Acima do teto da meta" };

/** Normaliza para 0..1 (minilinha). */
export function normalizar(valores: number[]): number[] {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return valores.map((v) => (max === min ? 0.5 : (v - min) / (max - min)));
}

/** Um valor por fim de mês nos últimos 12 meses (série de nível ou taxa). */
function mensal12(pontos: readonly Ponto[], ref: DataISO): number[] {
  const valores: number[] = [];
  for (let k = 11; k >= 0; k -= 1) {
    const v = valorAsOf(pontos, somarDias(inicioDoMes(somarMeses(ref, -k + 1)), -1));
    if (v !== null) valores.push(v);
  }
  return normalizar(valores);
}

function variacaoPct(atual: number | null, antes: number | null): number | null {
  return atual === null || antes === null || antes === 0 ? null : (atual / antes - 1) * 100;
}

function inflacao(codigo: string, rotulo: string, pontos: readonly Ponto[], ref: DataISO, meta: MetaInflacao | null): Cartao | null {
  const i = indiceAsOf(pontos, ref);
  if (i < 0) return null;
  const [mes, valorMes] = pontos[i];
  const doze = acumuladoMeses(pontos, mes, 12);
  const serie12 = serieAcumulada12m(pontos.slice(Math.max(0, i - 23), i + 1)).slice(-12).map(([, v]) => v);
  return {
    chave: codigo, rotulo,
    valor: formatarPct(doze),
    detalhe: `${formatarMes(mes)}: ${formatarPct(valorMes)} no mês`,
    selo: meta && doze !== null ? SELO_META[statusMeta(doze, meta)] : undefined,
    minilinha: normalizar(serie12),
  };
}

function cdi12(cdi: readonly Ponto[], ref: DataISO): number | null {
  const pts = pontosEntre(cdi, somarDias(somarMeses(ref, -12), 1), ref);
  return pts.length > 200 ? compor(pts.map(([, v]) => v)) : null;
}

function nivel(chave: string, rotulo: string, pontos: readonly Ponto[], ref: DataISO, casas: number, prefixo = ""): Cartao | null {
  const atual = valorAsOf(pontos, ref);
  if (atual === null) return null;
  const mes = variacaoPct(atual, valorAsOf(pontos, somarDias(inicioDoMes(ref), -1)));
  const doze = variacaoPct(atual, valorAsOf(pontos, somarMeses(ref, -12)));
  return {
    chave, rotulo,
    valor: `${prefixo}${formatarNumero(atual, casas)}`,
    variacao: { texto: `${formatarPct(mes, 1, true)} no mês`, sinal: sinalDe(mes) },
    detalhe: `${formatarPct(doze, 1, true)} em 12 meses`,
    minilinha: mensal12(pontos, ref),
  };
}

export interface EntradaCartoes {
  referencia: DataISO;
  meta: MetaInflacao;
  series: Readonly<Record<string, readonly Ponto[]>>;
  horizontes: ValoresHorizonte[];
}

export function montarCartoes(e: EntradaCartoes): Cartao[] {
  const s = (c: string) => e.series[c] ?? [];
  const ref = e.referencia;
  const ipca = inflacao("ipca", "IPCA 12 meses", s("ipca"), ref, e.meta);
  const cdi = cdi12(s("cdi"), ref);
  const ultimoIpca = ultimoPonto(pontosEntre(s("ipca"), "2000-01-01", ref));
  const ipca12 = ultimoIpca ? acumuladoMeses(s("ipca"), ultimoIpca[0], 12) : null;
  const selic = valorAsOf(s("selic_meta"), ref);
  const fimAno = e.horizontes.find((h) => h.horizonte === "fim_ano");
  const yieldImab = valorAsOf(s("imab_yield"), ref);

  return [
    ipca,
    inflacao("igpm", "IGP-M 12 meses", s("igpm"), ref, null),
    selic === null ? null : {
      chave: "selic", rotulo: "Selic meta", valor: formatarPct(selic),
      detalhe: fimAno?.selicNoHorizonte != null ? `Implícita no fim do ano: ${formatarPct(fimAno.selicNoHorizonte)}` : undefined,
      minilinha: mensal12(s("selic_meta"), ref),
    },
    cdi === null ? null : { chave: "cdi", rotulo: "CDI 12 meses", valor: formatarPct(cdi) },
    cdi === null || ipca12 === null ? null : {
      chave: "juro_real", rotulo: "Juro real ex-post (12m)", valor: formatarPct(juroReal(cdi, ipca12)),
      detalhe: "CDI 12m descontado o IPCA 12m",
    },
    nivel("ibovespa", "Ibovespa", s("ibovespa"), ref, 0),
    nivel("dolar", "Dólar PTAX", s("dolar_ptax"), ref, 4, "R$ "),
    yieldImab === null ? null : {
      chave: "imab_yield", rotulo: "IMA-B (juro real)", valor: `IPCA + ${formatarPct(yieldImab)}`,
      variacao: (() => {
        const antes = valorAsOf(s("imab_yield"), somarDias(inicioDoMes(ref), -1));
        const delta = antes === null ? null : yieldImab - antes;
        return { texto: `${formatarPp(delta)} no mês`, sinal: sinalDe(delta === null ? null : -delta) };
      })(),
      minilinha: mensal12(s("imab_yield"), ref),
    },
    fluxo12("idp", "IDP 12 meses", s("idp"), ref, 12, 1000, "US$ ", " bi"),
    fluxo12("fbcf", "FBCF 4 trimestres", s("fbcf"), ref, 4, 1_000_000, "R$ ", " tri"),
  ].filter((c): c is Cartao => c !== null);
}

function fluxo12(
  chave: string, rotulo: string, pontos: readonly Ponto[], ref: DataISO, n: number, divisor: number, prefixo: string, sufixo: string,
): Cartao | null {
  const i = indiceAsOf(pontos, ref);
  if (i < 2 * n - 1) return null;
  const soma = (fim: number) => pontos.slice(fim - n + 1, fim + 1).reduce((t, [, v]) => t + v, 0);
  const atual = soma(i);
  const variacao = variacaoPct(atual, soma(i - n));
  return {
    chave, rotulo,
    valor: `${prefixo}${formatarNumero(atual / divisor, 1)}${sufixo}`,
    variacao: { texto: `${formatarPct(variacao, 1, true)} contra o ano anterior`, sinal: sinalDe(variacao) },
    detalhe: `Até ${formatarMes(pontos[i][0])}`,
  };
}
