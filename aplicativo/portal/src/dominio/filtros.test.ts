import { describe, expect, it } from "vitest";

import { intervalo, lerFiltros, paraQuery } from "./filtros";

describe("filtros da URL", () => {
  it("valores inválidos viram o padrão, sem erro", () => {
    const f = lerFiltros({ ref: "2026-13-40", janela: "xyz", modo: "hack", series: "cdi;drop table", proj: "talvez" });
    expect(f).toMatchObject({ referencia: null, janela: "12m", modo: "nominal", series: [], projecoes: false });
  });

  it("lê filtros válidos e remove séries repetidas", () => {
    const f = lerFiltros({ ref: "2026-09-30", janela: "36m", modo: "real", series: "cdi,ipca,cdi", proj: "1" });
    expect(f).toMatchObject({ referencia: "2026-09-30", janela: "36m", modo: "real", series: ["cdi", "ipca"], projecoes: true });
  });

  it("janela personalizada exige data inicial", () => {
    expect(lerFiltros({ janela: "personalizada" }).janela).toBe("12m");
    expect(lerFiltros({ janela: "personalizada", de: "2024-01-01" }).janela).toBe("personalizada");
  });

  it("intervalo limita a referência à última data disponível", () => {
    const f = lerFiltros({ ref: "2030-01-01", janela: "12m" });
    expect(intervalo(f, "2026-10-06")).toEqual({ de: "2025-10-06", ate: "2026-10-06" });
  });

  it("monta a query só com o que difere do padrão", () => {
    expect(paraQuery({ janela: "12m", modo: "nominal" })).toBe("?janela=12m");
  });
});
