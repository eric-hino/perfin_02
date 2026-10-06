import "server-only";

import { type DataISO, fimDoMes, formatarMes, inicioDoMes } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { montarMensagem } from "@/dominio/gmail/mime";
import { assuntoDoRelatorio, corpoDoRelatorio, escolherDestaques } from "@/dominio/relatorio/email";
import { type DadosRelatorio, montarAbas } from "@/dominio/relatorio/planilha";
import { resumoDoMes } from "@/dominio/relatorio/resumo";
import { linhaDeJanelas } from "@/dominio/retornos/tabela";

import type { Sessao } from "../auth/sessao";
import { obterOuCriarPasta, exportarXlsx, moverParaPasta, TIPO_XLSX } from "../google/drive";
import { criarRascunho } from "../google/gmail";
import { criarPlanilha } from "../google/planilhas";
import { obterAccessToken } from "../google/tokens";
import { carregarAnalise } from "../indicadores/analise";
import { parametros } from "../indicadores/repositorio";
import { clienteSupabase } from "../supabase/servidor";

/** O rascunho já existe no Gmail, só o registro no Portal falhou (não criar outro). */
export class ErroRegistroRascunho extends Error {
  constructor() {
    super("O rascunho foi criado no Gmail (confira em Rascunhos), mas não foi possível registrá-lo no Portal.");
    this.name = "ErroRegistroRascunho";
  }
}

export interface Relatorio {
  id: string;
  mesReferencia: DataISO;
  planilhaId: string;
  planilhaUrl: string;
  rascunhoId: string | null;
  rascunhoCriadoEm: string | null;
  criadoEm: string;
}

interface LinhaRelatorio {
  id: string; mes_referencia: string; planilha_id: string; planilha_url: string;
  rascunho_id: string | null; rascunho_criado_em: string | null; criado_em: string;
}

const COLUNAS = "id,mes_referencia,planilha_id,planilha_url,rascunho_id,rascunho_criado_em,criado_em";

function paraRelatorio(l: LinhaRelatorio): Relatorio {
  return {
    id: l.id, mesReferencia: l.mes_referencia, planilhaId: l.planilha_id, planilhaUrl: l.planilha_url,
    rascunhoId: l.rascunho_id, rascunhoCriadoEm: l.rascunho_criado_em, criadoEm: l.criado_em,
  };
}

export async function listarRelatorios(): Promise<Relatorio[]> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.from("relatorios").select(COLUNAS).order("criado_em", { ascending: false }).limit(36);
  if (error) throw new Error("Não foi possível listar os relatórios.");
  return (data as LinhaRelatorio[]).map(paraRelatorio);
}

/** Relatório do próprio usuário (o RLS garante que não se lê o de outra pessoa). */
export async function obterRelatorio(id: string): Promise<Relatorio | null> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.from("relatorios").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível ler o relatório.");
  return data ? paraRelatorio(data as LinhaRelatorio) : null;
}

/** Monta os dados do relatório do mês (dia 1 do mês). */
export async function dadosDoRelatorio(mes: DataISO): Promise<DadosRelatorio> {
  const fim = fimDoMes(mes);
  const filtros = lerFiltros({ ref: fim, janela: "12m" });
  const [analise, param] = await Promise.all([carregarAnalise(filtros), parametros()]);
  const feriados = new Set(analise.base.feriados);
  const retornos = analise.janelas.map((linha) => ({
    nome: linha.indicador.nomeCurto,
    nominal: linha.celulas,
    real: linhaDeJanelas(analise.indices[linha.codigo], fim, "real", analise.refs, feriados).celulas,
  }));
  return {
    mes,
    geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    resumo: resumoDoMes(analise.base.catalogo, analise.serie, mes, param.meta),
    insights: analise.insights,
    retornos,
    dataCurva: analise.projecoes?.entrada.dataBase ?? null,
    horizontes: analise.projecoes?.horizontes ?? [],
    horizontesMesAnterior: analise.projecoes?.mesAnterior?.horizontes ?? null,
    dataCurvaMesAnterior: analise.projecoes?.mesAnterior?.dataBase ?? null,
    series: analise.serie,
  };
}

/** Gera a Planilha Google do mês na pasta "Portal Perfin" e registra o relatório. */
export async function gerarRelatorio(sessao: Sessao, mes: DataISO): Promise<Relatorio> {
  const inicio = inicioDoMes(mes);
  const [dados, token] = await Promise.all([dadosDoRelatorio(inicio), obterAccessToken(sessao.userId)]);
  const planilha = await criarPlanilha(token, `Portal Perfin — Relatório ${formatarMes(inicio)}`, montarAbas(dados));
  const pasta = await obterOuCriarPasta(token);
  await moverParaPasta(token, planilha.id, pasta);

  const supabase = await clienteSupabase();
  const { data, error } = await supabase
    .from("relatorios")
    .insert({ mes_referencia: inicio, planilha_id: planilha.id, planilha_url: planilha.url })
    .select(COLUNAS)
    .single();
  if (error) throw new Error("A planilha foi criada, mas não foi possível registrar o relatório.");
  return paraRelatorio(data as LinhaRelatorio);
}

export function nomeDoArquivo(r: Relatorio): string {
  return `Portal Perfin - Relatorio ${r.mesReferencia.slice(0, 7)}.xlsx`;
}

export async function baixarXlsx(sessao: Sessao, r: Relatorio): Promise<ArrayBuffer> {
  return exportarXlsx(await obterAccessToken(sessao.userId), r.planilhaId);
}

/** Cria um RASCUNHO no Gmail com o .xlsx anexado. Nunca envia. */
export async function criarRascunhoDoRelatorio(sessao: Sessao, r: Relatorio, para: string[]): Promise<string> {
  const token = await obterAccessToken(sessao.userId);
  const [xlsx, dados] = await Promise.all([exportarXlsx(token, r.planilhaId), dadosDoRelatorio(r.mesReferencia)]);
  const raw = montarMensagem({
    para,
    assunto: assuntoDoRelatorio(r.mesReferencia),
    html: corpoDoRelatorio(r.mesReferencia, escolherDestaques(dados.insights), r.planilhaUrl),
    anexo: { nome: nomeDoArquivo(r), tipo: TIPO_XLSX, conteudo: new Uint8Array(xlsx) },
  });
  const rascunho = await criarRascunho(token, raw);

  const supabase = await clienteSupabase();
  const { error } = await supabase.from("relatorios")
    .update({ rascunho_id: rascunho.id, rascunho_criado_em: new Date().toISOString() })
    .eq("id", r.id);
  // O rascunho já existe no Gmail; só o registro no Portal falhou.
  if (error) throw new ErroRegistroRascunho();
  return rascunho.id;
}
