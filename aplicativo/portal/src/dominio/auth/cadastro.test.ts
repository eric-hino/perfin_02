import { describe, expect, it } from "vitest";

import {
  abaDoLogin,
  escoposCompletos,
  esquemaCadastro,
  esquemaEsqueciSenha,
  esquemaLogin,
  esquemaNovaSenha,
  lerCampos,
  mensagemErroAuth,
  primeiroErro,
} from "./cadastro";
import { destinoConectar, lerCookieConectar, valorCookieConectar } from "./conectar";

const VALIDO = { nome: "  Maria Silva ", email: "  Maria@Exemplo.COM ", senha: "senhaforte123", confirmacao: "senhaforte123" };

function erroDe(resultado: ReturnType<typeof esquemaCadastro.safeParse>): string | null {
  return resultado.success ? null : primeiroErro(resultado.error);
}

describe("esquemaCadastro", () => {
  it("aceita dados válidos e normaliza nome e e-mail", () => {
    const r = esquemaCadastro.safeParse(VALIDO);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ nome: "Maria Silva", email: "maria@exemplo.com" });
  });

  it("valida o nome (2 a 100 caracteres após trim, sem controle)", () => {
    expect(erroDe(esquemaCadastro.safeParse({ ...VALIDO, nome: " a " }))).toMatch(/nome/i);
    expect(erroDe(esquemaCadastro.safeParse({ ...VALIDO, nome: "x".repeat(101) }))).toMatch(/longo/);
    expect(erroDe(esquemaCadastro.safeParse({ ...VALIDO, nome: "Ana\u0000Paula" }))).toMatch(/inválidos/);
    expect(esquemaCadastro.safeParse({ ...VALIDO, nome: "x".repeat(100) }).success).toBe(true);
  });

  it("valida o e-mail", () => {
    expect(erroDe(esquemaCadastro.safeParse({ ...VALIDO, email: "sem-arroba" }))).toBe("Informe um e-mail válido.");
    expect(erroDe(esquemaCadastro.safeParse({ ...VALIDO, email: `${"a".repeat(250)}@b.com` }))).toMatch(/longo/);
  });

  it("exige senha de 12+ caracteres com letra e número, até 72 bytes", () => {
    const comSenha = (senha: string) => esquemaCadastro.safeParse({ ...VALIDO, senha, confirmacao: senha });
    expect(erroDe(comSenha("abc123"))).toMatch(/12 caracteres/);
    expect(erroDe(comSenha("somenteletras"))).toMatch(/letras e números/);
    expect(erroDe(comSenha("123456789012"))).toMatch(/letras e números/);
    expect(comSenha("a1".repeat(36)).success).toBe(true); // 72 bytes
    expect(erroDe(comSenha(`${"a1".repeat(36)}x`))).toMatch(/72 bytes/);
    // "é" ocupa 2 bytes: 36 caracteres = 72 bytes passam; 37 não.
    expect(comSenha(`${"é".repeat(35)}1`).success).toBe(true);
    expect(erroDe(comSenha(`${"é".repeat(36)}1`))).toMatch(/72 bytes/);
  });

  it("exige confirmação igual, apontando o campo confirmacao", () => {
    const r = esquemaCadastro.safeParse({ ...VALIDO, confirmacao: "outrasenha123" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirmacao"]);
    expect(r.error?.issues[0].message).toBe("A confirmação não é igual à senha.");
  });

  it("campos ausentes geram mensagem em português", () => {
    expect(erroDe(esquemaCadastro.safeParse({}))).toBe("Informe seu nome.");
  });
});

describe("demais esquemas", () => {
  it("login aceita qualquer senha de 1 a 200 caracteres", () => {
    expect(esquemaLogin.safeParse({ email: "a@b.com", senha: "x" }).success).toBe(true);
    expect(esquemaLogin.safeParse({ email: "a@b.com", senha: "" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ email: "a@b.com", senha: "x".repeat(201) }).success).toBe(false);
  });

  it("esqueci a senha normaliza o e-mail", () => {
    expect(esquemaEsqueciSenha.safeParse({ email: " A@B.com" }).data).toEqual({ email: "a@b.com" });
  });

  it("nova senha segue as regras do cadastro", () => {
    expect(esquemaNovaSenha.safeParse({ senha: "novasenha1234", confirmacao: "novasenha1234" }).success).toBe(true);
    expect(esquemaNovaSenha.safeParse({ senha: "curta1", confirmacao: "curta1" }).success).toBe(false);
    expect(esquemaNovaSenha.safeParse({ senha: "novasenha1234", confirmacao: "x" }).success).toBe(false);
  });
});

describe("lerCampos", () => {
  it("lê só textos; ausentes viram undefined", () => {
    const f = new FormData();
    f.set("email", "a@b.com");
    f.set("arquivo", new Blob(["x"]));
    expect(lerCampos(f, ["email", "senha", "arquivo"])).toEqual({ email: "a@b.com", senha: undefined, arquivo: undefined });
  });
});

describe("abaDoLogin", () => {
  it("padrão é entrar", () => {
    expect(abaDoLogin("cadastro")).toBe("cadastro");
    expect(abaDoLogin("entrar")).toBe("entrar");
    expect(abaDoLogin(undefined)).toBe("entrar");
    expect(abaDoLogin(["cadastro"])).toBe("entrar");
  });
});

describe("mensagemErroAuth", () => {
  it("traduz os códigos do Supabase Auth", () => {
    expect(mensagemErroAuth("invalid_credentials")).toBe("E-mail ou senha inválidos.");
    expect(mensagemErroAuth("email_not_confirmed")).toBe("Confirme seu e-mail pelo link que enviamos antes de entrar.");
    expect(mensagemErroAuth("over_email_send_rate_limit")).toMatch(/Limite de envios/);
    expect(mensagemErroAuth("over_request_rate_limit")).toMatch(/use o Google/);
    expect(mensagemErroAuth("weak_password")).toBe("Senha fraca: use 12 caracteres ou mais, com letras e números.");
    expect(mensagemErroAuth("same_password")).toBe("A nova senha precisa ser diferente da atual.");
    expect(mensagemErroAuth("user_banned")).toBe("Seu acesso foi bloqueado pelo administrador.");
    expect(mensagemErroAuth("bloqueado")).toBe("Seu acesso foi bloqueado pelo administrador.");
    expect(mensagemErroAuth("signup_disabled")).toMatch(/cadastro/);
  });

  it("código desconhecido ou ausente vira mensagem genérica", () => {
    const generica = "Não foi possível concluir agora. Tente novamente em instantes.";
    expect(mensagemErroAuth()).toBe(generica);
    expect(mensagemErroAuth("unexpected_failure")).toBe(generica);
    expect(mensagemErroAuth("constructor")).toBe(generica);
  });
});

describe("escoposCompletos", () => {
  const SENSIVEIS = [
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/gmail.compose",
  ];

  it("aceita os nomes longos que o tokeninfo devolve", () => {
    const tokeninfo = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"];
    expect(escoposCompletos([...tokeninfo, ...SENSIVEIS])).toBe(true);
  });

  it("falta qualquer escopo ⇒ false", () => {
    expect(escoposCompletos(["openid", "email", "profile", ...SENSIVEIS.slice(1)])).toBe(false);
    expect(escoposCompletos(["openid", "email", "profile"])).toBe(false);
    expect(escoposCompletos([])).toBe(false);
  });
});

describe("cookie do Conectar conta Google", () => {
  const ID = "123e4567-e89b-12d3-a456-426614174000";

  it("ida e volta", () => {
    expect(lerCookieConectar(valorCookieConectar({ userId: ID, destino: "relatorios" }))).toEqual({ userId: ID, destino: "relatorios" });
  });

  it("rejeita formatos inválidos e destinos fora da lista", () => {
    expect(lerCookieConectar(undefined)).toBeNull();
    expect(lerCookieConectar(`${ID}|https://mal.exemplo`)).toBeNull();
    expect(lerCookieConectar(`nao-e-uuid|agenda`)).toBeNull();
    expect(lerCookieConectar(`${ID}|agenda|x`)).toBeNull();
  });

  it("destino padrão é a agenda", () => {
    expect(destinoConectar("relatorios")).toBe("relatorios");
    expect(destinoConectar("//mal.exemplo")).toBe("agenda");
    expect(destinoConectar(null)).toBe("agenda");
  });
});
