import "server-only";

import type { DataISO } from "@/dominio/datas";
import { DATA_MINIMA, type Filtros, intervalo } from "@/dominio/filtros";
import { gerarInsights } from "@/dominio/insights/gerar";
import type { Insight } from "@/dominio/insights/tipos";
import { construirIndice, type IndiceAcumulado } from "@/dominio/retornos/indice";
import { JANELAS_TABELA, type JanelaPronta, rotuloJanela } from "@/dominio/retornos/janelas";
import { type ModoRetorno, type Referencias, retornoNoModo } from "@/dominio/retornos/retornos";
import { type LinhaJanelas, linhaDeJanelas } from "@/dominio/retornos/tabela";
import { type Indicador, type Ponto, temRetorno } from "@/dominio/series";

import { type Base, type PacoteProjecoes, carregarBase, carregarProjecoes, resumoMercado } from "./painel";
import { parametros, series } from "./repositorio";

const DATA_INICIAL = DATA_MINIMA;

export interface Analise {
  base: Base;
  de: DataISO;
  ate: DataISO;
  serie: Record<string, Ponto[]>;
  indices: Record<string, IndiceAcumulado>;
  refs: Referencias;
  janelas: (LinhaJanelas & { indicador: Indicador })[];
  projecoes: PacoteProjecoes | null;
  insights: Insight[];
}

export function indicesDe(catalogo: Indicador[], serie: Record<string, Ponto[]>): Record<string, IndiceAcumulado> {
  const indices: Record<string, IndiceAcumulado> = {};
  for (const indicador of catalogo) {
    if (!temRetorno(indicador)) continue;
    const indice = construirIndice({ indicador, pontos: serie[indicador.codigo] ?? [] });
    if (indice) indices[indicador.codigo] = indice;
  }
  return indices;
}

function ranking(
  catalogo: Indicador[], indices: Record<string, IndiceAcumulado>, de: DataISO, ate: DataISO, modo: ModoRetorno,
  refs: Referencias,
) {
  return catalogo
    .filter((i) => indices[i.codigo] && i.codigo !== "selic_over")
    .map((i) => ({ nome: i.nomeCurto, retorno: retornoNoModo(indices[i.codigo], de, ate, modo, refs) }))
    .filter((i): i is { nome: string; retorno: number } => i.retorno !== null);
}

/**
 * Carrega séries completas, índices, tabela de janelas, projeções e insights
 * para os filtros. Base comum da Visão geral, Retornos, relatório e assistente.
 */
export async function carregarAnalise(f: Filtros): Promise<Analise> {
  const base = await carregarBase();
  const { de, ate } = intervalo(f, base.ultimaData, DATA_INICIAL);
  const codigos = base.catalogo.map((i) => i.codigo);
  const [serie, param, projecoes] = await Promise.all([
    series(codigos, DATA_INICIAL, ate),
    parametros(),
    carregarProjecoes(base, ate),
  ]);
  const indices = indicesDe(base.catalogo, serie);
  const refs: Referencias = { ipca: indices.ipca ?? null, cdi: indices.cdi ?? null };
  const feriados = new Set(base.feriados);
  const janelas = base.catalogo
    .filter((i) => indices[i.codigo])
    .map((i) => ({ indicador: i, ...linhaDeJanelas(indices[i.codigo], ate, f.modo, refs, feriados, JANELAS_TABELA) }));

  const rotulo = f.janela === "personalizada" ? "o período" : rotuloJanela(f.janela as JanelaPronta);
  const insights = gerarInsights({
    referencia: ate,
    meta: param.meta,
    limiares: param.limiares,
    ipca: serie.ipca ?? [], igpm: serie.igpm ?? [], cdi: serie.cdi ?? [], selicMeta: serie.selic_meta ?? [],
    dolar: serie.dolar_ptax ?? [], ibovespa: serie.ibovespa ?? [], imabYield: serie.imab_yield ?? [],
    idp: serie.idp ?? [], fbcf: serie.fbcf ?? [],
    mercado: resumoMercado(projecoes, serie.selic_meta ?? []),
    ranking: { rotuloJanela: rotulo, itens: ranking(base.catalogo, indices, de, ate, f.modo, refs) },
  });

  return { base, de, ate, serie, indices, refs, janelas, projecoes, insights };
}

