import { describe, expect, it } from "vitest";

import { agregar } from "./agregacao";
import { drawdown, volatilidadeAnualizada } from "./estatisticas";
import {
  acumuladoMeses, acumuladoNoAno, compor, juroReal, ritmoTrimestralAnualizado, statusMeta,
} from "./inflacao";
import type { Ponto } from "./series";

const ipca2025: Ponto[] = [
  ["2025-01-01", 0.16], ["2025-02-01", 1.31], ["2025-03-01", 0.56], ["2025-04-01", 0.43],
  ["2025-05-01", 0.26], ["2025-06-01", 0.24], ["2025-07-01", 0.26], ["2025-08-01", -0.11],
  ["2025-09-01", 0.48], ["2025-10-01", 0.09], ["2025-11-01", 0.18], ["2025-12-01", 0.33],
];

describe("inflação", () => {
  it("compõe taxas mensais", () => {
    expect(compor([1, 1])).toBeCloseTo(2.01, 12);
  });

  it("acumulado de 12 meses e no ano", () => {
    const esperado = compor(ipca2025.map(([, v]) => v));
    expect(acumuladoMeses(ipca2025, "2025-12-01", 12)).toBeCloseTo(esperado, 12);
    expect(acumuladoNoAno(ipca2025, "2025-12-01")).toBeCloseTo(esperado, 12);
    expect(acumuladoMeses(ipca2025, "2025-06-01", 12)).toBeNull();
  });

  it("acumulado exige meses consecutivos", () => {
    const comBuraco: Ponto[] = [["2025-01-01", 1], ["2025-03-01", 1]];
    expect(acumuladoMeses(comBuraco, "2025-03-01", 2)).toBeNull();
  });

  it("ritmo de 3 meses anualizado", () => {
    const tres = compor([0.09, 0.18, 0.33]);
    expect(ritmoTrimestralAnualizado(ipca2025, "2025-12-01")).toBeCloseTo(((1 + tres / 100) ** 4 - 1) * 100, 10);
  });

  it("status da meta e juro real", () => {
    const meta = { centro: 3, tolerancia: 1.5 };
    expect(statusMeta(4.6, meta)).toBe("acima_do_teto");
    expect(statusMeta(4.5, meta)).toBe("dentro");
    expect(statusMeta(1.4, meta)).toBe("abaixo_do_piso");
    expect(juroReal(10, 5)).toBeCloseTo((1.1 / 1.05 - 1) * 100, 12);
  });
});

describe("agregação por granularidade", () => {
  it("compõe inflação no ano e marca período parcial", () => {
    const anual = agregar(ipca2025, "composto", "anual", "2025-01-01", "2025-12-31");
    expect(anual).toHaveLength(1);
    expect(anual[0].valor).toBeCloseTo(compor(ipca2025.map(([, v]) => v)), 12);
    expect(anual[0].parcial).toBe(false);
    const parcial = agregar(ipca2025, "composto", "anual", "2025-01-01", "2025-06-30");
    expect(parcial[0].parcial).toBe(true);
  });

  it("nível usa fechamento e média; fluxo soma", () => {
    const dolar: Ponto[] = [["2026-01-02", 5], ["2026-01-30", 6]];
    expect(agregar(dolar, "fechamento", "mensal", "2026-01-01", "2026-01-31")[0]).toMatchObject({ valor: 6, media: 5.5 });
    const idp: Ponto[] = [["2026-01-01", 10], ["2026-02-01", 20], ["2026-03-01", 30]];
    expect(agregar(idp, "soma", "trimestral", "2026-01-01", "2026-03-31")[0].valor).toBe(60);
  });
});

describe("estatísticas", () => {
  it("drawdown máximo e atual", () => {
    const pontos: Ponto[] = [["a", 100], ["b", 120], ["c", 90], ["d", 108]];
    const dd = drawdown(pontos)!;
    expect(dd.maximo).toBeCloseTo(-0.25, 12);
    expect(dd.atual).toBeCloseTo(-0.1, 12);
  });

  it("volatilidade de série constante é zero", () => {
    const pontos: Ponto[] = [["a", 1], ["b", 1], ["c", 1], ["d", 1]];
    expect(volatilidadeAnualizada(pontos)).toBe(0);
  });
});
