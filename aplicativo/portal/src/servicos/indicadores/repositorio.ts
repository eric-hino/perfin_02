import "server-only";

import { cache } from "react";

import type { DataISO } from "@/dominio/datas";
import type { MetaInflacao } from "@/dominio/inflacao";
import { LIMIARES_PADRAO, type Limiares } from "@/dominio/insights/tipos";
import type { Curva, Vertice } from "@/dominio/projecoes/curva";
import type { CurvaMercado, Indicador, Ponto } from "@/dominio/series";

import { clienteSupabase } from "../supabase/servidor";

export class ErroDados extends Error {
  constructor(mensagem = "Não foi possível carregar os dados. Tente novamente em instantes.") {
    super(mensagem);
    this.name = "ErroDados";
  }
}

interface LinhaIndicador {
  codigo: string; nome: string; nome_curto: string; unidade: string; casas: number;
  frequencia: Indicador["frequencia"]; tipo_serie: Indicador["tipoSerie"]; agregacao: Indicador["agregacao"];
  fonte: string; cor: string; curva_projecao: CurvaMercado | null; ordem: number;
}

export const catalogo = cache(async (): Promise<Indicador[]> => {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase
    .from("indicadores")
    .select("codigo,nome,nome_curto,unidade,casas,frequencia,tipo_serie,agregacao,fonte,cor,curva_projecao,ordem")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new ErroDados();
  return (data as LinhaIndicador[]).map((l) => ({
    codigo: l.codigo, nome: l.nome, nomeCurto: l.nome_curto, unidade: l.unidade, casas: l.casas,
    frequencia: l.frequencia, tipoSerie: l.tipo_serie, agregacao: l.agregacao, fonte: l.fonte,
    cor: l.cor, curvaProjecao: l.curva_projecao, ordem: l.ordem,
  }));
});

/** Séries compactas (uma chamada, sem o limite de 1.000 linhas da API). */
export async function series(codigos: string[], de: DataISO, ate: DataISO): Promise<Record<string, Ponto[]>> {
  if (!codigos.length) return {};
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.rpc("series_valores", { p_codigos: codigos, p_de: de, p_ate: ate });
  if (error) throw new ErroDados();
  const bruto = (data ?? {}) as Record<string, [string, number | string][]>;
  const saida: Record<string, Ponto[]> = {};
  for (const codigo of codigos) {
    saida[codigo] = (bruto[codigo] ?? []).map(([d, v]) => [d, Number(v)] as const);
  }
  return saida;
}

export const feriados = cache(async (): Promise<DataISO[]> => {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.from("feriados").select("data").order("data").limit(1000);
  if (error) throw new ErroDados();
  return (data as { data: string }[]).map((f) => f.data);
});

export interface CurvasDoDia {
  dataBase: DataISO;
  curvas: Partial<Record<CurvaMercado, Curva>>;
}

/** Curvas do último dia útil coletado até `data`. */
export async function curvasDoDia(data: DataISO): Promise<CurvasDoDia | null> {
  const supabase = await clienteSupabase();
  const { data: bruto, error } = await supabase.rpc("curvas_do_dia", { p_data: data });
  if (error) throw new ErroDados();
  if (!bruto) return null;
  const { data_base, curvas } = bruto as { data_base: string; curvas: Record<string, [number, number, number | string][]> };
  const saida: CurvasDoDia = { dataBase: data_base, curvas: {} };
  for (const [nome, vertices] of Object.entries(curvas ?? {})) {
    const lista: Vertice[] = vertices.map(([dc, du, taxa]) => ({ diasCorridos: dc, diasUteis: du, taxa: Number(taxa) }));
    saida.curvas[nome as CurvaMercado] = { dataBase: data_base, curva: nome as CurvaMercado, vertices: lista };
  }
  return saida;
}

export interface Parametros {
  meta: MetaInflacao;
  limiares: Limiares;
  reunioesCopom: DataISO[];
}

export const parametros = cache(async (): Promise<Parametros> => {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.from("parametros").select("chave,valor");
  if (error) throw new ErroDados();
  const mapa = new Map((data as { chave: string; valor: unknown }[]).map((p) => [p.chave, p.valor]));
  const meta = (mapa.get("meta_inflacao") ?? { centro: 3, tolerancia: 1.5 }) as MetaInflacao;
  const limiares = { ...LIMIARES_PADRAO, ...((mapa.get("limiares_insights") ?? {}) as Partial<Limiares>) };
  const copom = (mapa.get("copom_reunioes") ?? { datas: [] }) as { datas?: string[] };
  return { meta, limiares, reunioesCopom: (copom.datas ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) };
});
