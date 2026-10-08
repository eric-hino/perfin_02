import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Supabase simulado: a rota passa por servicos/auth/conta.ts de verdade.
const auth = { verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), signOut: vi.fn() };
const rpc = vi.fn();
vi.mock("@/servicos/supabase/servidor", () => ({ clienteSupabase: async () => ({ auth, rpc }) }));
vi.mock("@/servicos/config/env", () => ({ urlDoSite: () => "https://portal.exemplo" }));

const { GET } = await import("./route");

const SESSAO = { data: { session: { access_token: "x" } }, error: null };
const FALHA = { data: { session: null }, error: { code: "otp_expired" } };

async function destino(consulta: string) {
  const resposta = await GET(new NextRequest(`https://portal.exemplo/auth/confirmar${consulta}`));
  expect(resposta.status).toBe(303);
  return resposta.headers.get("location");
}

describe("GET /auth/confirmar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.verifyOtp.mockResolvedValue(SESSAO);
    auth.exchangeCodeForSession.mockResolvedValue(SESSAO);
    rpc.mockResolvedValue({ data: "usuario", error: null });
  });

  it("confirmação de cadastro abre a sessão e vai para a visão geral", async () => {
    expect(await destino("?token_hash=abc_123-x&type=signup")).toBe("https://portal.exemplo/visao-geral");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc_123-x", type: "signup" });
  });

  it("recuperação vai para /redefinir-senha", async () => {
    expect(await destino("?token_hash=abc&type=recovery")).toBe("https://portal.exemplo/redefinir-senha");
  });

  it("token inválido ou expirado vai para /login?erro=link", async () => {
    auth.verifyOtp.mockResolvedValue(FALHA);
    expect(await destino("?token_hash=abc&type=email")).toBe("https://portal.exemplo/login?erro=link");
  });

  it("rejeita formato e tipo inválidos sem chamar o Supabase", async () => {
    expect(await destino("?token_hash=abc&type=magiclink")).toBe("https://portal.exemplo/login?erro=link");
    expect(await destino("?token_hash=a%20b&type=signup")).toBe("https://portal.exemplo/login?erro=link");
    expect(await destino(`?token_hash=${"a".repeat(201)}&type=signup`)).toBe("https://portal.exemplo/login?erro=link");
    expect(await destino("")).toBe("https://portal.exemplo/login?erro=link");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("aceita o código PKCE como alternativa", async () => {
    expect(await destino("?code=123e4567-e89b-12d3")).toBe("https://portal.exemplo/visao-geral");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("123e4567-e89b-12d3");
  });

  it("ignora parâmetro next (destinos fixos)", async () => {
    expect(await destino("?token_hash=abc&type=signup&next=https://mal.exemplo")).toBe("https://portal.exemplo/visao-geral");
  });

  it("usuário sem papel (bloqueado) sai e vai para /acesso-nao-autorizado", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await destino("?token_hash=abc&type=signup")).toBe("https://portal.exemplo/acesso-nao-autorizado");
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("falha do Supabase não libera o acesso", async () => {
    auth.verifyOtp.mockRejectedValue(new Error("rede"));
    expect(await destino("?token_hash=abc&type=signup")).toBe("https://portal.exemplo/login?erro=link");
  });
});
