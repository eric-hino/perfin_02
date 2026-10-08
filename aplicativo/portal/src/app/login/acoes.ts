"use server";

import { redirect } from "next/navigation";

import {
  esquemaCadastro,
  esquemaEsqueciSenha,
  esquemaLogin,
  esquemaNovaSenha,
  lerCampos,
  mensagemErroAuth,
  primeiroErro,
} from "@/dominio/auth/cadastro";
import * as conta from "@/servicos/auth/conta";
import { verificarPerfilApi } from "@/servicos/auth/sessao";

// Ações dos formulários de login, cadastro e senha (assinatura do useActionState).
// A validação do cliente é só conveniência: tudo é validado de novo aqui.

export interface EstadoFormulario {
  erro: string | null;
  /** Valores devolvidos para preencher de novo o formulário após um erro. */
  email?: string;
  nome?: string;
}

export interface EstadoCadastro extends EstadoFormulario {
  enviadoPara: string | null;
}

export interface EstadoEsqueciSenha {
  erro: string | null;
  enviado: boolean;
}

/** Login por e-mail e senha de qualquer usuário ativo. */
export async function entrarComSenha(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const campos = lerCampos(formulario, ["email", "senha"]);
  const entrada = esquemaLogin.safeParse(campos);
  if (!entrada.success) return { erro: primeiroErro(entrada.error), email: campos.email };

  const resultado = await conta.entrar(entrada.data.email, entrada.data.senha);
  if (!resultado.ok) return { erro: mensagemErroAuth(resultado.codigo), email: entrada.data.email };
  redirect("/visao-geral");
}

/** Cadastro por e-mail e senha: a conta só entra depois de confirmar o e-mail. */
export async function cadastrarComSenha(_anterior: EstadoCadastro, formulario: FormData): Promise<EstadoCadastro> {
  const campos = lerCampos(formulario, ["nome", "email", "senha", "confirmacao"]);
  const entrada = esquemaCadastro.safeParse(campos);
  if (!entrada.success) {
    return { erro: primeiroErro(entrada.error), enviadoPara: null, nome: campos.nome, email: campos.email };
  }

  const { nome, email, senha } = entrada.data;
  const resultado = await conta.cadastrar(nome, email, senha);
  if (!resultado.ok) return { erro: mensagemErroAuth(resultado.codigo), enviadoPara: null, nome, email };
  return { erro: null, enviadoPara: email };
}

/** Pede o link de "esqueci a senha". Resposta neutra: não revela se o e-mail existe. */
export async function pedirNovaSenha(_anterior: EstadoEsqueciSenha, formulario: FormData): Promise<EstadoEsqueciSenha> {
  const entrada = esquemaEsqueciSenha.safeParse(lerCampos(formulario, ["email"]));
  if (!entrada.success) return { erro: primeiroErro(entrada.error), enviado: false };

  try {
    await conta.pedirNovaSenha(entrada.data.email);
  } catch {
    // Mesmo em falha a resposta é a mesma, para não revelar nada.
  }
  return { erro: null, enviado: true };
}

/** Define a nova senha (exige sessão, inclusive a de recuperação) e entra no Portal. */
export async function redefinirSenha(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const verificacao = await verificarPerfilApi("usuario");
  if (!verificacao.ok) return { erro: "Sua sessão expirou. Peça um novo link em \"Esqueci minha senha\"." };

  const entrada = esquemaNovaSenha.safeParse(lerCampos(formulario, ["senha", "confirmacao"]));
  if (!entrada.success) return { erro: primeiroErro(entrada.error) };

  const resultado = await conta.redefinirSenha(entrada.data.senha);
  if (!resultado.ok) return { erro: mensagemErroAuth(resultado.codigo) };
  redirect("/visao-geral");
}
