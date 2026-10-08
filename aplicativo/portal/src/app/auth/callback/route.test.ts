import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = { exchangeCodeForSession: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() };
const rpc = vi.fn();
const cookiesGravados = new Map<string, string>();
const loja = {
  get: (nome: string) => (cookiesGravados.has(nome) ? { name: nome, value: cookiesGravados.get(nome) } : undefined),
  set: vi.fn((nome: string, valor: string) => cookiesGravados.set(nome, valor)),
};
const salvarRefreshToken = vi.fn();
const escoposConcedidos = vi.fn();

vi.mock("@/servicos/supabase/servidor", () => ({ clienteSupabase: async () => ({ auth, rpc }) }));
vi.mock("@/servicos/config/env", () => ({ urlDoSite: () => "https://portal.exemplo" }));
vi.mock("next/headers", () => ({ cookies: async () => loja }));
vi.mock("@/servicos/google/tokens", () => ({
  salvarRefreshToken: (...a: unknown[]) => salvarRefreshToken(...a),
  escoposConcedidos: (...a: unknown[]) => escoposConcedidos(...a),
}));

const { GET } = await import("./route");

const USUARIO = "123e4567-e89b-12d3-a456-426614174000";
const OUTRO = "223e4567-e89b-12d3-a456-426614174000";
const TODOS = [
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.compose",
];

function sessaoGoogle(userId: string, refresh: string | null = "rt") {
  return {
    data: { user: { id: userId }, session: { provider_token: "at", provider_refresh_token: refresh } },
    error: null,
  };
}

async function destino(consulta: string) {
  const resposta = await GET(new NextRequest(`https://portal.exemplo/auth/callback${consulta}`));
  expect(resposta.status).toBe(303);
  return resposta.headers.get("location");
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesGravados.clear();
    auth.exchangeCodeForSession.mockResolvedValue(sessaoGoogle(USUARIO));
    rpc.mockResolvedValue({ data: "usuario", error: null });
    escoposConcedidos.mockResolvedValue(TODOS);
  });

  it("login básico não grava token e tira os tokens do Google do cookie", async () => {
    expect(await destino("?code=abc")).toBe("https://portal.exemplo/visao-geral");
    expect(salvarRefreshToken).not.toHaveBeenCalled();
    expect(auth.refreshSession).toHaveBeenCalled();
  });

  it("login básico com cookie de conectar esquecido também não grava", async () => {
    cookiesGravados.set("perfin_conectar", `${USUARIO}|agenda`);
    expect(await destino("?code=abc")).toBe("https://portal.exemplo/visao-geral");
    expect(salvarRefreshToken).not.toHaveBeenCalled();
  });

  it("conectar com cookie do mesmo usuário grava os escopos reais e volta ao destino", async () => {
    cookiesGravados.set("perfin_conectar", `${USUARIO}|relatorios`);
    expect(await destino("?code=abc&conectar=1")).toBe("https://portal.exemplo/relatorios");
    expect(escoposConcedidos).toHaveBeenCalledWith("at");
    expect(salvarRefreshToken).toHaveBeenCalledWith(expect.anything(), USUARIO, "rt", TODOS);
    expect(cookiesGravados.get("perfin_conectar")).toBe("");
    expect(auth.refreshSession).toHaveBeenCalled();
  });

  it("conectar sem o cookie não grava", async () => {
    expect(await destino("?code=abc&conectar=1")).toBe("https://portal.exemplo/visao-geral");
    expect(salvarRefreshToken).not.toHaveBeenCalled();
  });

  it("conectar com escopos incompletos não grava", async () => {
    cookiesGravados.set("perfin_conectar", `${USUARIO}|agenda`);
    escoposConcedidos.mockResolvedValue(["openid", "email", "profile"]);
    expect(await destino("?code=abc&conectar=1")).toBe("https://portal.exemplo/agenda");
    expect(salvarRefreshToken).not.toHaveBeenCalled();
  });

  it("conectar com outra conta Google sai e avisa", async () => {
    cookiesGravados.set("perfin_conectar", `${OUTRO}|agenda`);
    expect(await destino("?code=abc&conectar=1")).toBe("https://portal.exemplo/login?erro=conta_diferente");
    expect(auth.signOut).toHaveBeenCalled();
    expect(salvarRefreshToken).not.toHaveBeenCalled();
  });

  it("desistência no consentimento do conectar volta ao destino", async () => {
    cookiesGravados.set("perfin_conectar", `${USUARIO}|agenda`);
    expect(await destino("?error=access_denied&conectar=1")).toBe("https://portal.exemplo/agenda");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("erro do Supabase (hook) ou sem código vai para /acesso-nao-autorizado", async () => {
    expect(await destino("?error=access_denied")).toBe("https://portal.exemplo/acesso-nao-autorizado");
    expect(await destino("")).toBe("https://portal.exemplo/acesso-nao-autorizado");
  });

  it("falha na troca do código vai para /login?erro=sessao", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: { user: null, session: null }, error: { code: "x" } });
    expect(await destino("?code=abc")).toBe("https://portal.exemplo/login?erro=sessao");
  });

  it("usuário bloqueado sai e vai para /acesso-nao-autorizado", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    cookiesGravados.set("perfin_conectar", `${USUARIO}|agenda`);
    expect(await destino("?code=abc&conectar=1")).toBe("https://portal.exemplo/acesso-nao-autorizado");
    expect(auth.signOut).toHaveBeenCalled();
    expect(salvarRefreshToken).not.toHaveBeenCalled();
  });
});
