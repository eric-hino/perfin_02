import { describe, expect, it } from "vitest";

import { cartoes, lerValorReais, mes, pct } from "./formatacao";

describe("formatação do site", () => {
  it("formata percentuais e meses em pt-BR", () => {
    expect(pct(4.5)).toBe("4,50%");
    expect(pct(null)).toBe("—");
    expect(mes("2026-08-01")).toBe("ago/2026");
  });

  it("monta os cartões só com o que existe, na ordem do site", () => {
    const lista = cartoes([
      { codigo: "dolar_ptax", nome: "Dólar", unidade: "R$/US$", casas: 4, dataReferencia: "2026-10-06", valor: 5.5, valorAnterior: 5.0, acumulado12m: null },
      { codigo: "ipca", nome: "IPCA", unidade: "% a.m.", casas: 2, dataReferencia: "2026-08-01", valor: 0.2, valorAnterior: 0.3, acumulado12m: 4.1 },
    ]);
    expect(lista.map((c) => c.codigo)).toEqual(["ipca", "dolar"]);
    expect(lista[0].valor).toBe("4,10%");
    expect(lista[1].detalhe).toContain("+10,00% no dia");
  });
});

describe("leitura do valor da calculadora", () => {
  it("aceita formatos brasileiros e com ponto decimal", () => {
    expect(lerValorReais("1.500,50")).toBe(1500.5);
    expect(lerValorReais("1500,50")).toBe(1500.5);
    expect(lerValorReais("1500.50")).toBe(1500.5);
    expect(lerValorReais("R$ 1.000")).toBe(1000);
    expect(lerValorReais("1.000.000")).toBe(1000000);
  });

  it("rejeita entradas ambíguas ou inválidas", () => {
    expect(lerValorReais("1.50.0")).toBeNull();
    expect(lerValorReais("abc")).toBeNull();
    expect(lerValorReais("1,5,0")).toBeNull();
  });
});
