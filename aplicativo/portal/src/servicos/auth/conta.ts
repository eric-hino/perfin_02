import "server-only";

import type { AuthError, EmailOtpType } from "@supabase/supabase-js";

import { urlDoSite } from "../config/env";
import { clienteSupabase } from "../supabase/servidor";
import type { Papel } from "./sessao";

// Funções finas sobre o Supabase Auth para login, cadastro e senha.
// Os códigos de erro são traduzidos na interface por dominio/auth/cadastro.ts.

export type ResultadoConta = { ok: true } | { ok: false; codigo?: string };

export const TIPOS_LINK = ["email", "signup", "recovery"] as const;
export type TipoLink = (typeof TIPOS_LINK)[number] & EmailOtpType;

type Cliente = Awaited<ReturnType<typeof clienteSupabase>>;

function falha(erro: AuthError): ResultadoConta {
  // O Auth Hook recusa e-mails bloqueados com 403 "Acesso bloqueado.".
  if (erro.status === 403 && /bloquead/i.test(erro.message)) return { ok: false, codigo: "bloqueado" };
  return { ok: false, codigo: erro.code };
}

function urlDeConfirmacao(): string {
  return `${urlDoSite()}/auth/confirmar`;
}

/** Papel do usuário da sessão (perfil_atual, sujeito ao RLS). null = bloqueado ou sem acesso. */
export async function papelDaSessao(supabase?: Cliente): Promise<Papel | null> {
  const cliente = supabase ?? (await clienteSupabase());
  const { data, error } = await cliente.rpc("perfil_atual");
  if (error) throw new Error("Não foi possível verificar o acesso.");
  return data === "admin" || data === "usuario" ? data : null;
}

/**
 * Cria a conta e envia o e-mail de confirmação. E-mail já cadastrado também volta
 * como sucesso (o Supabase devolve identities vazio): a tela não revela se ele existe.
 */
export async function cadastrar(nome: string, email: string, senha: string): Promise<ResultadoConta> {
  const supabase = await clienteSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: urlDeConfirmacao(), data: { nome } },
  });
  return error ? falha(error) : { ok: true };
}

/** Login por e-mail e senha de qualquer usuário ativo. Bloqueado ⇒ sai e devolve "bloqueado". */
export async function entrar(email: string, senha: string): Promise<ResultadoConta> {
  const supabase = await clienteSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return falha(error);

  let papel: Papel | null;
  try {
    papel = await papelDaSessao(supabase);
  } catch {
    await supabase.auth.signOut();
    return { ok: false };
  }
  if (!papel) {
    await supabase.auth.signOut();
    return { ok: false, codigo: "bloqueado" };
  }
  return { ok: true };
}

/** Envia o link de "esqueci a senha". A resposta é sempre neutra (não revela se o e-mail existe). */
export async function pedirNovaSenha(email: string): Promise<void> {
  const supabase = await clienteSupabase();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlDeConfirmacao() });
}

/** Troca a senha do usuário da sessão atual (inclusive a sessão de recuperação). */
export async function redefinirSenha(senha: string): Promise<ResultadoConta> {
  const supabase = await clienteSupabase();
  const { error } = await supabase.auth.updateUser({ password: senha });
  return error ? falha(error) : { ok: true };
}

/** Valida o link do e-mail (confirmação ou recuperação) e abre a sessão. */
export async function verificarLink(tokenHash: string, tipo: TipoLink): Promise<boolean> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  return !error && Boolean(data.session);
}

/** Alternativa PKCE: troca o código do link pela sessão. */
export async function trocarCodigo(codigo: string): Promise<boolean> {
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  return !error && Boolean(data.session);
}

export async function sair(): Promise<void> {
  const supabase = await clienteSupabase();
  await supabase.auth.signOut();
}
