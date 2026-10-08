// Regras de entrada do login e do cadastro (puras, usadas no cliente e no servidor).

import { z } from "zod";

import { ESCOPOS_GOOGLE } from "@/servicos/google/escopos";

/** Limite do bcrypt usado pelo Supabase Auth: senhas acima de 72 bytes são truncadas. */
export const MAX_BYTES_SENHA = 72;
export const MIN_SENHA = 12;

const CARACTERE_CONTROLE = /\p{Cc}/u;

const email = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail longo demais.")
  .pipe(z.email({ error: "Informe um e-mail válido." }));

const senhaNova = z
  .string({ error: "Informe a senha." })
  .min(MIN_SENHA, `A senha precisa ter ${MIN_SENHA} caracteres ou mais.`)
  .refine((s) => new TextEncoder().encode(s).length <= MAX_BYTES_SENHA, "Senha longa demais (máximo de 72 bytes).")
  .refine((s) => /\p{L}/u.test(s) && /\p{N}/u.test(s), "A senha precisa ter letras e números.");

const nome = z
  .string({ error: "Informe seu nome." })
  .trim()
  .min(2, "Informe seu nome (2 caracteres ou mais).")
  .max(100, "Nome longo demais (máximo de 100 caracteres).")
  .refine((s) => !CARACTERE_CONTROLE.test(s), "O nome tem caracteres inválidos.");

const CONFIRMACAO_DIFERENTE = "A confirmação não é igual à senha.";

export const esquemaCadastro = z
  .object({ nome, email, senha: senhaNova, confirmacao: z.string({ error: "Confirme a senha." }) })
  .refine((d) => d.senha === d.confirmacao, { error: CONFIRMACAO_DIFERENTE, path: ["confirmacao"] });

export const esquemaLogin = z.object({
  email,
  senha: z.string({ error: "Informe a senha." }).min(1, "Informe a senha.").max(200, "Senha longa demais."),
});

export const esquemaEsqueciSenha = z.object({ email });

export const esquemaNovaSenha = z
  .object({ senha: senhaNova, confirmacao: z.string({ error: "Confirme a senha." }) })
  .refine((d) => d.senha === d.confirmacao, { error: CONFIRMACAO_DIFERENTE, path: ["confirmacao"] });

export type DadosCadastro = z.infer<typeof esquemaCadastro>;
export type DadosLogin = z.infer<typeof esquemaLogin>;

/** Lê campos de texto de um FormData (campos ausentes ou arquivos viram undefined). */
export function lerCampos(formulario: FormData, campos: readonly string[]): Record<string, string | undefined> {
  const saida: Record<string, string | undefined> = {};
  for (const campo of campos) {
    const valor = formulario.get(campo);
    saida[campo] = typeof valor === "string" ? valor : undefined;
  }
  return saida;
}

/** Primeira mensagem de erro de uma validação (para exibir ao usuário). */
export function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Confira os dados informados.";
}

export type AbaLogin = "entrar" | "cadastro";

/** Aba da tela de login a partir do parâmetro ?aba= (padrão: entrar). */
export function abaDoLogin(valor: unknown): AbaLogin {
  return valor === "cadastro" ? "cadastro" : "entrar";
}

const LINK_INVALIDO = "Link inválido ou expirado. Peça um novo.";
const BLOQUEADO = "Seu acesso foi bloqueado pelo administrador.";
const LIMITE = "Limite de envios atingido. Tente de novo em alguns minutos ou use o Google.";

const MENSAGENS_AUTH: Record<string, string> = {
  invalid_credentials: "E-mail ou senha inválidos.",
  email_not_confirmed: "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  over_email_send_rate_limit: LIMITE,
  over_request_rate_limit: LIMITE,
  weak_password: "Senha fraca: use 12 caracteres ou mais, com letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  user_banned: BLOQUEADO,
  bloqueado: BLOQUEADO,
  signup_disabled: "O cadastro está temporariamente desativado. Fale com o administrador.",
  email_provider_disabled: "O acesso por e-mail e senha está desativado. Use o Google.",
  user_already_exists: "Não foi possível criar a conta com este e-mail. Tente entrar ou recuperar a senha.",
  email_exists: "Não foi possível criar a conta com este e-mail. Tente entrar ou recuperar a senha.",
  email_address_invalid: "Informe um e-mail válido.",
  otp_expired: LINK_INVALIDO,
  flow_state_expired: LINK_INVALIDO,
  flow_state_not_found: LINK_INVALIDO,
  bad_code_verifier: LINK_INVALIDO,
  session_not_found: "Sua sessão expirou. Entre novamente.",
  session_expired: "Sua sessão expirou. Entre novamente.",
  reauthentication_needed: "Sua sessão expirou. Entre novamente.",
};

/** Traduz o código de erro do Supabase Auth. O padrão é genérico, sem detalhes internos. */
export function mensagemErroAuth(codigo?: string): string {
  if (codigo && Object.hasOwn(MENSAGENS_AUTH, codigo)) return MENSAGENS_AUTH[codigo];
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}

// O Google devolve "email" e "profile" com o nome longo no tokeninfo.
const SINONIMOS_ESCOPO: Record<string, string> = {
  "https://www.googleapis.com/auth/userinfo.email": "email",
  "https://www.googleapis.com/auth/userinfo.profile": "profile",
};

/** true se os escopos concedidos pelo Google incluem todos os de ESCOPOS_GOOGLE. */
export function escoposCompletos(concedidos: readonly string[]): boolean {
  const normalizados = new Set(concedidos.map((e) => SINONIMOS_ESCOPO[e] ?? e));
  return ESCOPOS_GOOGLE.every((e) => normalizados.has(e));
}
