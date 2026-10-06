import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Autorização das rotas: sem sessão → 401; sem permissão → 403; entrada inválida → 400.
const verificar = vi.fn();
vi.mock("@/servicos/auth/sessao", () => ({
  verificarPerfilApi: (...args: unknown[]) => verificar(...args),
  erroApi: (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status }),
}));
vi.mock("@/servicos/indicadores/analise", () => ({ carregarAnalise: vi.fn() }));
vi.mock("@/servicos/assistente/gemini", () => ({ perguntar: vi.fn(), ErroAssistente: class extends Error {} }));
vi.mock("@/servicos/relatorios/servico", () => ({
  gerarRelatorio: vi.fn(), obterRelatorio: vi.fn(), baixarXlsx: vi.fn(), nomeDoArquivo: vi.fn(), criarRascunhoDoRelatorio: vi.fn(),
  ErroRegistroRascunho: class extends Error {},
}));

const { POST: assistente } = await import("./assistente/route");
const { POST: gerar } = await import("./relatorios/route");
const { POST: rascunho } = await import("./relatorios/[id]/rascunho/route");

function req(corpo: unknown) {
  return new Request("https://portal.exemplo/api", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
  }) as never;
}

const negado = (status: number) => ({ ok: false, resposta: NextResponse.json({ erro: "x" }, { status }) });
const SESSAO = { ok: true, sessao: { userId: "u1", email: "a@b.com", papel: "usuario", principal: false, provedores: [] } };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("rotas de API", () => {
  beforeEach(() => verificar.mockReset());

  it("sem sessão respondem 401", async () => {
    verificar.mockResolvedValue(negado(401));
    expect((await assistente(req({}))).status).toBe(401);
    expect((await gerar(req({}))).status).toBe(401);
    expect((await rascunho(req({}), params("x"))).status).toBe(401);
  });

  it("e-mail não autorizado recebe 403", async () => {
    verificar.mockResolvedValue(negado(403));
    expect((await gerar(req({ mes: "2026-09" }))).status).toBe(403);
  });

  it("entradas inválidas recebem 400", async () => {
    verificar.mockResolvedValue(SESSAO);
    expect((await assistente(req({ pergunta: "", historico: [], filtros: "" }))).status).toBe(400);
    expect((await gerar(req({ mes: "2026-13" }))).status).toBe(400);
    expect((await gerar(req({ mes: "2999-01" }))).status).toBe(400);
    expect((await rascunho(req({ para: [] }), params("nao-e-uuid"))).status).toBe(400);
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect((await rascunho(req({ para: ["a@b.com\r\nBcc: c@d.com"] }), params(id))).status).toBe(400);
  });
});
