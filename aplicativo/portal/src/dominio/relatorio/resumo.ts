// Resumo do mês por indicador (aba "Resumo" do relatório e e-mail).

import { type DataISO, fimDoMes, montar, partes, somarDias, somarMeses } from "../datas";
import { acumuladoMeses, acumuladoNoAno, compor, type MetaInflacao, statusMeta } from "../inflacao";
import { type Indicador, type Ponto, indiceAsOf, pontosEntre, valorAsOf } from "../series";

export type TipoVariacao = "pp" | "pct";

export interface LinhaResumo {
  codigo: string;
  indicador: string;
  unidade: string;
  casas: number;
  mes: number | null;
  anterior: number | null;
  variacao: number | null;
  tipoVariacao: TipoVariacao;
  noAno: number | null;
  dozeMeses: number | null;
  minimo12m: number | null;
  maximo12m: number | null;
  status: string | null;
}

const STATUS_META = { abaixo_do_piso: "Abaixo do piso da meta", dentro: "Dentro da meta", acima_do_teto: "Acima do teto da meta" };

function variacaoPct(a: number | null, b: number | null): number | null {
  return a === null || b === null || b === 0 ? null : (a / b - 1) * 100;
}

function extremos(valores: number[]): { minimo12m: number | null; maximo12m: number | null } {
  return valores.length ? { minimo12m: Math.min(...valores), maximo12m: Math.max(...valores) } : { minimo12m: null, maximo12m: null };
}

function linhaBase(i: Indicador): Omit<LinhaResumo, "mes" | "anterior" | "variacao" | "tipoVariacao" | "noAno" | "dozeMeses" | "minimo12m" | "maximo12m" | "status"> {
  return { codigo: i.codigo, indicador: i.nome, unidade: i.unidade, casas: i.casas };
}

function taxaMensal(i: Indicador, p: readonly Ponto[], mes: DataISO, meta: MetaInflacao | null): LinhaResumo {
  const atual = valorAsOf(pontosEntre(p, mes, mes), mes);
  const anterior = valorAsOf(pontosEntre(p, somarMeses(mes, -1), somarMeses(mes, -1)), somarMeses(mes, -1));
  // Sem o dado do próprio mês (ex.: IPCA ainda não divulgado), os acumulados ficam vazios
  // para não misturar meses na mesma linha.
  const doze = atual === null ? null : acumuladoMeses(p, mes, 12);
  const ultimos = pontosEntre(p, somarMeses(mes, -11), mes).map(([, v]) => v);
  return {
    ...linhaBase(i), mes: atual, anterior, tipoVariacao: "pp",
    variacao: atual === null || anterior === null ? null : atual - anterior,
    noAno: atual === null ? null : acumuladoNoAno(p, mes), dozeMeses: doze, ...extremos(ultimos),
    status: meta && doze !== null ? STATUS_META[statusMeta(doze, meta)] : null,
    unidade: "% no mês",
  };
}

function taxaDiaria(i: Indicador, p: readonly Ponto[], mes: DataISO): LinhaResumo {
  const noPeriodo = (de: DataISO, ate: DataISO) => {
    const pts = pontosEntre(p, de, ate);
    return pts.length ? compor(pts.map(([, v]) => v)) : null;
  };
  const fim = fimDoMes(mes);
  const atual = noPeriodo(mes, fim);
  const anterior = noPeriodo(somarMeses(mes, -1), somarDias(mes, -1));
  return {
    ...linhaBase(i), mes: atual, anterior, tipoVariacao: "pp", unidade: "% no período",
    variacao: atual === null || anterior === null ? null : atual - anterior,
    noAno: noPeriodo(montar(partes(mes).ano, 1, 1), fim),
    dozeMeses: noPeriodo(somarDias(somarMeses(fim, -12), 1), fim),
    minimo12m: null, maximo12m: null, status: null,
  };
}

function taxa(i: Indicador, p: readonly Ponto[], mes: DataISO): LinhaResumo {
  const fim = fimDoMes(mes);
  const atual = valorAsOf(p, fim);
  const anterior = valorAsOf(p, somarDias(mes, -1));
  return {
    ...linhaBase(i), mes: atual, anterior, tipoVariacao: "pp",
    variacao: atual === null || anterior === null ? null : atual - anterior,
    noAno: null, dozeMeses: null, status: null,
    ...extremos(pontosEntre(p, somarMeses(fim, -12), fim).map(([, v]) => v)),
  };
}

function nivel(i: Indicador, p: readonly Ponto[], mes: DataISO): LinhaResumo {
  const fim = fimDoMes(mes);
  const atual = valorAsOf(p, fim);
  const anterior = valorAsOf(p, somarDias(mes, -1));
  return {
    ...linhaBase(i), mes: atual, anterior, tipoVariacao: "pct",
    variacao: variacaoPct(atual, anterior),
    noAno: variacaoPct(atual, valorAsOf(p, montar(partes(mes).ano - 1, 12, 31))),
    dozeMeses: variacaoPct(atual, valorAsOf(p, somarMeses(fim, -12))),
    status: null,
    ...extremos(pontosEntre(p, somarMeses(fim, -12), fim).map(([, v]) => v)),
  };
}

/** Fluxos (IDP mensal, FBCF trimestral): último período até o mês, anterior e soma de 12 meses. */
function fluxo(i: Indicador, p: readonly Ponto[], mes: DataISO): LinhaResumo {
  const porAno = i.frequencia === "trimestral" ? 4 : 12;
  const k = indiceAsOf(p, mes);
  const soma = (fim: number) =>
    fim - porAno + 1 >= 0 ? p.slice(fim - porAno + 1, fim + 1).reduce((s, [, v]) => s + v, 0) : null;
  const atual = k >= 0 ? p[k][1] : null;
  const anterior = k >= 1 ? p[k - 1][1] : null;
  const doze = k >= 0 ? soma(k) : null;
  const dozeAntes = k >= porAno ? soma(k - porAno) : null;
  const variacaoAnual = variacaoPct(doze, dozeAntes);
  return {
    ...linhaBase(i), mes: atual, anterior, tipoVariacao: "pct", variacao: variacaoPct(atual, anterior),
    noAno: null, dozeMeses: doze, minimo12m: null, maximo12m: null,
    status: k >= 0 && variacaoAnual !== null
      ? `Ref. ${p[k][0].slice(0, 7)}; 12m contra o ano anterior: ${variacaoAnual.toFixed(1).replace(".", ",")}%`
      : null,
  };
}

/** Linhas do resumo para o mês de referência (dia 1 do mês). */
export function resumoDoMes(
  catalogo: readonly Indicador[],
  series: Readonly<Record<string, readonly Ponto[]>>,
  mes: DataISO,
  meta: MetaInflacao,
): LinhaResumo[] {
  return catalogo
    .filter((i) => i.tipoSerie !== "auxiliar")
    .map((i) => {
      const p = series[i.codigo] ?? [];
      if (i.tipoSerie === "taxa_periodo") {
        return i.frequencia === "mensal" ? taxaMensal(i, p, mes, i.codigo === "ipca" ? meta : null) : taxaDiaria(i, p, mes);
      }
      if (i.tipoSerie === "taxa") return taxa(i, p, mes);
      if (i.tipoSerie === "nivel") return nivel(i, p, mes);
      return fluxo(i, p, mes);
    });
}
