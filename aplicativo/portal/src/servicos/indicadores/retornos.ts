import "server-only";

import type { Filtros } from "@/dominio/filtros";
import { encadearProjecao } from "@/dominio/projecoes/encadear";
import type { PontoProjetado, TaxaMensal } from "@/dominio/projecoes/projecoes";
import { janelaMovel } from "@/dominio/retornos/tabela";
import { somarMeses } from "@/dominio/datas";
import { temRetorno } from "@/dominio/series";

import type { DadosGraficoRetornos } from "@/componentes/retornos/tipos";

import type { Analise } from "./analise";

export const SERIES_PADRAO = ["cdi", "ipca", "dolar_ptax", "ibovespa", "imab"];

function projetarIndice(a: Analise, codigo: string, taxas: TaxaMensal[] | null | undefined): PontoProjetado[] {
  const indice = a.indices[codigo];
  if (!indice || !taxas?.length) return [];
  const base = indice.valorEm(indice.ultimaData);
  return base === null ? [] : encadearProjecao(base, indice.ultimaData, taxas);
}

/** Índices projetados (mesma escala do índice realizado) para o tracejado do gráfico. */
export function projecoesDosIndices(a: Analise): Record<string, PontoProjetado[]> {
  const p = a.projecoes?.projecoes;
  if (!p) return {};
  return {
    cdi: projetarIndice(a, "cdi", p.cdiMensal),
    selic_over: projetarIndice(a, "selic_over", p.cdiMensal),
    ipca: projetarIndice(a, "ipca", p.ipcaMensal),
    igpm: projetarIndice(a, "igpm", p.igpmMensal),
    imab: projetarIndice(a, "imab", p.imabMensal),
    dolar_ptax: p.dolarFuturo,
  };
}

/** Dados serializáveis do gráfico de retornos. */
export function dadosDoGrafico(a: Analise, f: Filtros): DadosGraficoRetornos {
  const indicadores = a.base.catalogo.filter(temRetorno);
  const codigos = new Set(indicadores.map((i) => i.codigo));
  const selecionadas = (f.series.length ? f.series : SERIES_PADRAO).filter((c) => codigos.has(c));
  return {
    indicadores,
    pontos: Object.fromEntries(indicadores.map((i) => [i.codigo, a.serie[i.codigo] ?? []])),
    projecoes: projecoesDosIndices(a),
    dataCurva: a.projecoes?.entrada.dataBase ?? null,
    feriados: a.base.feriados,
    janelaInicial: { de: a.de, ate: a.ate },
    modo: f.modo,
    selecionadas,
    projecoesLigadas: f.projecoes,
  };
}

/** Opção do gráfico de janela móvel (retorno de N meses rolando), últimos 10 anos. */
export function opcaoJanelaMovel(a: Analise, f: Filtros, meses: number): Record<string, unknown> {
  const escolhidas = f.series.length ? f.series : SERIES_PADRAO;
  const indicadores = a.base.catalogo.filter((i) => temRetorno(i) && a.indices[i.codigo] && escolhidas.includes(i.codigo));
  const inicio = somarMeses(a.ate, -120);
  return {
    legend: { data: indicadores.map((i) => i.nomeCurto) },
    series: indicadores.map((i) => ({
      name: i.nomeCurto,
      type: "line",
      showSymbol: false,
      color: i.cor,
      lineStyle: { width: 2 },
      data: janelaMovel(a.indices[i.codigo], meses, inicio, a.ate, f.modo, a.refs).map((p) => [p.data, p.retorno]),
    })),
  };
}
