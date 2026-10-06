import { describe, expect, it } from "vitest";

import { SEM_FERIADOS } from "@/testes/fabricas";

import {
  diaUtilAnterior, diasCorridos, diasNoMes, diasUteisEntre, ehDataISO, fimDoMes, formatarData, formatarMes,
  formatarMesLongo, listarDiasUteis, somarDias, somarMeses,
} from "./datas";

describe("somarMeses", () => {
  it("31 de janeiro + 1 mês vira o último dia de fevereiro", () => {
    expect(somarMeses("2025-01-31", 1)).toBe("2025-02-28");
  });

  it("respeita ano bissexto", () => {
    expect(somarMeses("2024-01-31", 1)).toBe("2024-02-29");
    expect(somarMeses("2024-02-29", 12)).toBe("2025-02-28");
    expect(somarMeses("2024-02-29", 48)).toBe("2028-02-29");
  });

  it("subtrai meses atravessando o ano", () => {
    expect(somarMeses("2025-03-31", -1)).toBe("2025-02-28");
    expect(somarMeses("2025-01-15", -13)).toBe("2023-12-15");
    expect(somarMeses("2025-01-31", -12)).toBe("2024-01-31");
  });

  it("zero meses não altera a data", () => {
    expect(somarMeses("2025-05-31", 0)).toBe("2025-05-31");
  });

  it("dezembro + 1 vira janeiro do ano seguinte", () => {
    expect(somarMeses("2025-12-31", 1)).toBe("2026-01-31");
  });
});

describe("dias no mês e fim do mês", () => {
  it("fevereiro em anos bissextos e seculares", () => {
    expect(diasNoMes(2024, 2)).toBe(29);
    expect(diasNoMes(2025, 2)).toBe(28);
    expect(diasNoMes(2000, 2)).toBe(29);
    expect(diasNoMes(2100, 2)).toBe(28);
  });

  it("fim do mês", () => {
    expect(fimDoMes("2024-02-10")).toBe("2024-02-29");
    expect(fimDoMes("2025-12-01")).toBe("2025-12-31");
  });
});

describe("dias úteis", () => {
  const feriados = new Set(["2026-10-12"]);

  it("conta o intervalo (de, ate]", () => {
    expect(diasUteisEntre("2026-10-02", "2026-10-05", SEM_FERIADOS)).toBe(1); // sexta → segunda
    expect(diasUteisEntre("2026-10-05", "2026-10-12", SEM_FERIADOS)).toBe(5);
  });

  it("mesma data, datas invertidas ou só fim de semana dão zero", () => {
    expect(diasUteisEntre("2026-10-05", "2026-10-05", SEM_FERIADOS)).toBe(0);
    expect(diasUteisEntre("2026-10-06", "2026-10-05", SEM_FERIADOS)).toBe(0);
    expect(diasUteisEntre("2026-10-02", "2026-10-04", SEM_FERIADOS)).toBe(0);
  });

  it("partindo de um sábado conta igual a partir da sexta", () => {
    expect(diasUteisEntre("2026-10-03", "2026-10-09", SEM_FERIADOS)).toBe(diasUteisEntre("2026-10-02", "2026-10-09", SEM_FERIADOS));
  });

  it("desconta feriados", () => {
    expect(diasUteisEntre("2026-10-09", "2026-10-13", feriados)).toBe(1);
  });

  it("um ano sem feriados tem 261 dias da semana em 2025", () => {
    expect(diasUteisEntre("2024-12-31", "2025-12-31", SEM_FERIADOS)).toBe(261);
  });

  it("listar dias úteis inclui as duas pontas e pula feriado", () => {
    expect(listarDiasUteis("2026-10-09", "2026-10-13", feriados)).toEqual(["2026-10-09", "2026-10-13"]);
    expect(listarDiasUteis("2026-10-10", "2026-10-11", feriados)).toEqual([]);
  });

  it("dia útil anterior volta de domingo e de feriado na segunda", () => {
    expect(diaUtilAnterior("2026-10-04", SEM_FERIADOS)).toBe("2026-10-02");
    expect(diaUtilAnterior("2026-10-12", feriados)).toBe("2026-10-09");
    expect(diaUtilAnterior("2026-10-13", feriados)).toBe("2026-10-13");
  });
});

describe("validação e formatação", () => {
  it("valida datas ISO reais", () => {
    expect(ehDataISO("2024-02-29")).toBe(true);
    expect(ehDataISO("2025-02-29")).toBe(false);
    expect(ehDataISO("2025-13-01")).toBe(false);
    expect(ehDataISO("2025-1-01")).toBe(false);
    expect(ehDataISO("")).toBe(false);
    expect(ehDataISO("01/02/2025")).toBe(false);
  });

  it("soma dias atravessando ano bissexto", () => {
    expect(somarDias("2024-02-28", 1)).toBe("2024-02-29");
    expect(somarDias("2024-03-01", -1)).toBe("2024-02-29");
    expect(diasCorridos("2024-01-01", "2025-01-01")).toBe(366);
  });

  it("formata em pt-BR", () => {
    expect(formatarData("2025-03-05")).toBe("05/03/2025");
    expect(formatarMes("2025-03-05")).toBe("mar/2025");
    expect(formatarMesLongo("2025-03-05")).toBe("março/2025");
  });
});
