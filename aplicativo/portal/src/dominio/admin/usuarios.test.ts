import { describe, expect, it } from "vitest";

import { nomeValido, normalizarNome, podeRemover, resumoUsuarios, textoResumo } from "./usuarios";

describe("resumoUsuarios", () => {
  it("conta total, contas do cadastro e bloqueadas", () => {
    const lista = [
      { origem: "admin" as const, ativo: true },
      { origem: "cadastro" as const, ativo: true },
      { origem: "cadastro" as const, ativo: false },
      { origem: "admin" as const, ativo: false },
    ];
    expect(resumoUsuarios(lista)).toEqual({ total: 4, porCadastro: 2, bloqueados: 2 });
  });

  it("lista vazia zera tudo", () => {
    expect(resumoUsuarios([])).toEqual({ total: 0, porCadastro: 0, bloqueados: 0 });
  });
});

describe("textoResumo", () => {
  it("usa plural e singular", () => {
    expect(textoResumo({ total: 3, porCadastro: 1, bloqueados: 0 })).toBe("3 usuários · 1 por cadastro · 0 bloqueados");
    expect(textoResumo({ total: 1, porCadastro: 0, bloqueados: 1 })).toBe("1 usuário · 0 por cadastro · 1 bloqueado");
  });
});

describe("normalizarNome", () => {
  it("apara espaços e transforma vazio em ausente", () => {
    expect(normalizarNome("  Ana Souza ")).toBe("Ana Souza");
    expect(normalizarNome("   ")).toBeUndefined();
    expect(normalizarNome("")).toBeUndefined();
    expect(normalizarNome(null)).toBeUndefined();
    expect(normalizarNome(undefined)).toBeUndefined();
  });
});

describe("nomeValido", () => {
  it("aceita de 1 a 100 caracteres", () => {
    expect(nomeValido("A")).toBe(true);
    expect(nomeValido("a".repeat(100))).toBe(true);
    expect(nomeValido("a".repeat(101))).toBe(false);
    expect(nomeValido("")).toBe(false);
  });

  it("recusa caracteres de controle", () => {
    expect(nomeValido("Ana\nSouza")).toBe(false);
    expect(nomeValido("Ana\u0000")).toBe(false);
    expect(nomeValido("Ana\u007F")).toBe(false);
    expect(nomeValido("José Ávila")).toBe(true);
  });
});

describe("podeRemover", () => {
  it("só permite remover linhas incluídas pelo admin", () => {
    expect(podeRemover("admin")).toBe(true);
    expect(podeRemover("cadastro")).toBe(false);
  });
});
