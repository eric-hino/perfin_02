import { describe, expect, it } from "vitest";

import { diaria, mensal, repetir } from "@/testes/fabricas";

import { agregar, fimDoPeriodo, inicioDoPeriodo } from "./agregacao";
import { compor } from "./inflacao";
import { pontosEntre } from "./series";

describe("início e fim de período", () => {
  it("início do período por granularidade", () => {
    expect(inicioDoPeriodo("2025-08-15", "trimestral")).toBe("2025-07-01");
    expect(inicioDoPeriodo("2025-12-31", "trimestral")).toBe("2025-10-01");
    expect(inicioDoPeriodo("2025-08-15", "anual")).toBe("2025-01-01");
    expect(inicioDoPeriodo("2025-08-15", "mensal")).toBe("2025-08-01");
    expect(inicioDoPeriodo("2025-08-15", "diaria")).toBe("2025-08-15");
  });

  it("fim do período, inclusive trimestre com fevereiro bissexto e 4º trimestre", () => {
    expect(fimDoPeriodo("2024-01-01", "trimestral")).toBe("2024-03-31");
    expect(fimDoPeriodo("2025-10-01", "trimestral")).toBe("2025-12-31");
    expect(fimDoPeriodo("2024-02-01", "mensal")).toBe("2024-02-29");
    expect(fimDoPeriodo("2025-01-01", "anual")).toBe("2025-12-31");
  });
});

describe("agregar", () => {
  it("sem pontos devolve lista vazia", () => {
    expect(agregar([], "composto", "anual", "2025-01-01", "2025-12-31")).toEqual([]);
  });

  it("trimestral com filtro no meio dos trimestres marca o primeiro e o último como parciais", () => {
    const dolar = diaria("2025-01-01", "2025-09-30", (i) => 5 + i / 1000);
    const r = agregar(dolar, "fechamento", "trimestral", "2025-02-15", "2025-07-15");
    expect(r.map((p) => [p.periodo, p.parcial])).toEqual([
      ["2025-01-01", true], ["2025-04-01", false], ["2025-07-01", true],
    ]);
    // O valor do trimestre parcial é o último ponto dentro do filtro.
    expect(r[2].valor).toBe(pontosEntre(dolar, "2025-07-01", "2025-07-15").at(-1)![1]);
  });

  it("anual composto: o ano cortado no início é parcial e só compõe os meses filtrados", () => {
    const ipca = mensal("2024-01-01", [...repetir(0.5, 12), ...repetir(0.3, 12)]);
    const r = agregar(ipca, "composto", "anual", "2024-03-01", "2025-12-31");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ periodo: "2024-01-01", parcial: true });
    expect(r[0].valor).toBeCloseTo(compor(repetir(0.5, 10)), 12);
    expect(r[1].parcial).toBe(false);
  });

  it("ano corrente que ainda não terminou é parcial", () => {
    const ipca = mensal("2025-01-01", repetir(0.3, 9));
    expect(agregar(ipca, "composto", "anual", "2025-01-01", "2025-09-30")[0].parcial).toBe(true);
  });

  it("fluxo trimestral soma só os meses dentro do filtro", () => {
    const idp = mensal("2025-01-01", [10, 20, 30, 40]);
    const r = agregar(idp, "soma", "trimestral", "2025-01-01", "2025-04-30");
    expect(r.map((p) => [p.valor, p.parcial])).toEqual([[60, false], [40, true]]);
  });

  it("'último' pega o último valor do período, sem média", () => {
    const selic = [["2025-01-29", 13.25], ["2025-03-19", 14.25]] as const;
    const [t] = agregar(selic, "ultimo", "trimestral", "2025-01-01", "2025-03-31");
    expect(t).toEqual({ periodo: "2025-01-01", valor: 14.25, parcial: false });
  });

  it("mensal termina parcial quando o filtro corta o mês", () => {
    const dolar = diaria("2025-11-01", "2025-12-31", 5);
    const r = agregar(dolar, "fechamento", "mensal", "2025-11-01", "2025-12-15");
    expect(r.map((p) => p.parcial)).toEqual([false, true]);
  });

  it("granularidade diária nunca é parcial", () => {
    const dolar = diaria("2025-11-03", "2025-11-07", 5);
    expect(agregar(dolar, "fechamento", "diaria", "2025-11-04", "2025-11-06").map((p) => p.parcial)).toEqual([false, false, false]);
  });
});
