import "server-only";

import { z } from "zod";

import { NOME_MAXIMO, type OrigemUsuario, nomeValido, normalizarNome } from "@/dominio/admin/usuarios";

import { clienteSupabase } from "../supabase/servidor";

// Todas as operações passam pelo RLS: só administradores conseguem ler e alterar.

export interface UsuarioAutorizado {
  email: string;
  nome: string | null;
  origem: OrigemUsuario;
  papel: "admin" | "usuario";
  ativo: boolean;
  principal: boolean;
  criadoPor: string | null;
  criadoEm: string;
}

export class ErroAdmin extends Error {}

export async function listarUsuarios(): Promise<UsuarioAutorizado[]> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase
    .from("usuarios_autorizados")
    .select("email,nome,origem,papel,ativo,principal,criado_por,criado_em")
    .order("principal", { ascending: false })
    .order("email");
  if (error) throw new ErroAdmin("Não foi possível listar os usuários.");
  return (data ?? []).map((u) => ({
    email: u.email,
    nome: u.nome ?? null,
    origem: u.origem === "cadastro" ? "cadastro" : "admin",
    papel: u.papel,
    ativo: u.ativo,
    principal: u.principal,
    criadoPor: u.criado_por,
    criadoEm: u.criado_em,
  }));
}

export const esquemaNovoUsuario = z.object({
  email: z.email("E-mail inválido.").max(254).transform((e) => e.trim().toLowerCase()),
  papel: z.enum(["admin", "usuario"]),
  // Opcional: aparado, e string vazia vira ausente (a coluna fica nula).
  nome: z.preprocess(
    normalizarNome,
    z.string().max(NOME_MAXIMO).refine(nomeValido, "Nome inválido.").optional(),
  ),
});

export async function incluirUsuario(entrada: z.infer<typeof esquemaNovoUsuario>): Promise<void> {
  const supabase = await clienteSupabase();
  const { error } = await supabase.from("usuarios_autorizados").insert({ ...entrada, ativo: true });
  if (error?.code === "23505") throw new ErroAdmin("Este e-mail já está cadastrado.");
  if (error) throw new ErroAdmin("Não foi possível incluir o usuário.");
}

export async function alterarUsuario(email: string, mudancas: { papel?: "admin" | "usuario"; ativo?: boolean }) {
  const supabase = await clienteSupabase();
  const { error, count } = await supabase.from("usuarios_autorizados").update(mudancas, { count: "exact" }).eq("email", email);
  if (error) throw new ErroAdmin(error.code === "42501" ? "O administrador principal não pode ser alterado." : "Não foi possível alterar o usuário.");
  if (!count) throw new ErroAdmin("Usuário não encontrado.");
}

export async function removerUsuario(email: string): Promise<void> {
  const supabase = await clienteSupabase();
  // Contas criadas pelo cadastro não são removidas (perderiam o acesso sem marcação): use o bloqueio.
  const { error, count } = await supabase
    .from("usuarios_autorizados")
    .delete({ count: "exact" })
    .eq("email", email)
    .eq("origem", "admin");
  if (error) throw new ErroAdmin(error.code === "42501" ? "O administrador principal não pode ser removido." : "Não foi possível remover o usuário.");
  if (!count) throw new ErroAdmin("Usuário não encontrado ou criado pelo cadastro (use Bloquear).");
}

// --- Parâmetros ----------------------------------------------------------------------

const numero = (min: number, max: number) => z.coerce.number().min(min).max(max);

export const esquemaParametros = z.object({
  meta_inflacao: z.object({ centro: numero(0, 20), tolerancia: numero(0, 10) }),
  limiares_insights: z.object({
    aceleracao_pp: numero(0, 20),
    descolamento_igpm_ipca_pp: numero(0, 50),
    juro_real_restritivo_pct: numero(-10, 30),
    juro_real_expansionista_pct: numero(-10, 30),
    dolar_variacao_mes_pct: numero(0, 50),
    drawdown_ibovespa_pct: numero(0, 90),
    mudanca_curva_pp: numero(0, 10),
    yield_imab_alto_pct: numero(-5, 30),
    meses_extremo: z.coerce.number().int().min(3).max(120),
  }),
  copom_reunioes: z.object({
    datas: z.array(z.iso.date()).max(24),
  }),
});

export type ParametrosEditaveis = z.infer<typeof esquemaParametros>;

export async function salvarParametros(p: ParametrosEditaveis): Promise<void> {
  const supabase = await clienteSupabase();
  for (const [chave, valor] of Object.entries(p)) {
    const { error, count } = await supabase.from("parametros").update({ valor }, { count: "exact" }).eq("chave", chave);
    if (error || count === 0) throw new ErroAdmin("Não foi possível salvar os parâmetros.");
  }
}

// --- Coletas ---------------------------------------------------------------------------

export interface Coleta {
  id: number;
  iniciadaEm: string;
  finalizadaEm: string | null;
  status: "executando" | "sucesso" | "parcial" | "falha";
  detalhes: Record<string, { status: string; linhas: number; ultima_referencia: string | null; erro: string | null }>;
}

export async function listarColetas(limite = 30): Promise<Coleta[]> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase
    .from("coletas")
    .select("id,iniciada_em,finalizada_em,status,detalhes")
    .order("iniciada_em", { ascending: false })
    .limit(limite);
  if (error) throw new ErroAdmin("Não foi possível listar as coletas.");
  return (data ?? []).map((c) => ({
    id: c.id, iniciadaEm: c.iniciada_em, finalizadaEm: c.finalizada_em, status: c.status, detalhes: c.detalhes ?? {},
  }));
}

/** Coletas recentes e dias desde a última execução (para o alerta de coleta parada). */
export async function painelDeColeta(): Promise<{ coletas: Coleta[]; diasSemColeta: number | null }> {
  const coletas = await listarColetas();
  const ultima = coletas[0];
  const diasSemColeta = ultima ? Math.floor((Date.now() - new Date(ultima.iniciadaEm).getTime()) / 86_400_000) : null;
  return { coletas, diasSemColeta };
}
