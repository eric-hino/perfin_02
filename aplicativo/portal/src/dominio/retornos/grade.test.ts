// Funções puras do gráfico de retornos (sem DOM e sem React).

import { describe, expect, it } from "vitest";

import { paraMs } from "@/dominio/datas";
import type { IndiceAcumulado } from "@/dominio/retornos/indice";

import { type Preparado, posicaoNaGrade, serieNaJanela } from "@/dominio/retornos/grade";

const GRADE = ["2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07"]; // sexta, segunda, terça, quarta

function indice(codigo: string): IndiceAcumulado {
  return { codigo, primeiraData: GRADE[0], ultimaData: GRADE[3], valorEm: () => null };
}

function preparado(valores: Record<string, number[]>, comIndices = Object.keys(valores)): Preparado {
  return {
    grade: GRADE,
    gradeMs: GRADE.map(paraMs),
    indices: Object.fromEntries(comIndices.map((c) => [c, indice(c)])),
    valores: Object.fromEntries(Object.entries(valores).map(([c, v]) => [c, Float64Array.from(v)])),
  };
}

const VALORES = {
  x: [100, 110, Number.NaN, 121],
  ipca: [1, 1.01, 1.02, 1.03],
  cdi: [1, 1.001, 1.002, 1.003],
};

const valoresDe = (serie: [number, number | null][]) => serie.map(([, v]) => v);

describe("posicaoNaGrade", () => {
  it("grade vazia devolve 0", () => {
    expect(posicaoNaGrade([], "2026-01-05")).toBe(0);
  });

  it("data exata devolve a própria posição", () => {
    expect(posicaoNaGrade(GRADE, "2026-01-05")).toBe(1);
    expect(posicaoNaGrade(GRADE, "2026-01-07")).toBe(3);
  });

  it("fim de semana usa o último dia útil anterior", () => {
    expect(posicaoNaGrade(GRADE, "2026-01-04")).toBe(0);
  });

  it("data antes do início usa a primeira posição", () => {
    expect(posicaoNaGrade(GRADE, "2025-12-31")).toBe(0);
  });

  it("data depois do fim usa a última posição", () => {
    expect(posicaoNaGrade(GRADE, "2026-12-31")).toBe(3);
  });
});

describe("serieNaJanela", () => {
  it("indicador sem valores devolve lista vazia", () => {
    expect(serieNaJanela(preparado(VALORES), "nao_existe", "2026-01-02", "nominal")).toEqual([]);
  });

  it("nominal: rebaseia em 0 no início da janela e usa ms como eixo", () => {
    const serie = serieNaJanela(preparado(VALORES), "x", "2026-01-05", "nominal");
    expect(serie.map(([ms]) => ms)).toEqual(GRADE.map(paraMs));
    const v = valoresDe(serie);
    expect(v[0]).toBeCloseTo(100 / 110 - 1, 12);
    expect(v[1]).toBe(0);
    expect(v[2]).toBeNull(); // sem dado no dia
    expect(v[3]).toBeCloseTo(0.1, 12);
  });

  it("início no fim de semana usa o dia útil anterior como base", () => {
    expect(valoresDe(serieNaJanela(preparado(VALORES), "x", "2026-01-04", "nominal"))[0]).toBe(0);
  });

  it("sem valor na data de início, a série inteira fica sem valor (como serieRebaseada)", () => {
    expect(valoresDe(serieNaJanela(preparado(VALORES), "x", "2026-01-06", "nominal"))).toEqual([null, null, null, null]);
  });

  it("real: desconta o IPCA desde o início da janela", () => {
    const v = valoresDe(serieNaJanela(preparado(VALORES), "x", "2026-01-05", "real"));
    expect(v[1]).toBeCloseTo(0, 12);
    expect(v[3]).toBeCloseTo(1.1 / (1.03 / 1.01) - 1, 12);
  });

  it("excesso sobre o CDI usa o CDI como referência", () => {
    const v = valoresDe(serieNaJanela(preparado(VALORES), "x", "2026-01-05", "excesso_cdi"));
    expect(v[3]).toBeCloseTo(1.1 / (1.003 / 1.001) - 1, 12);
  });

  it("% do CDI: nulo na base (CDI zero) e razão depois", () => {
    const v = valoresDe(serieNaJanela(preparado(VALORES), "x", "2026-01-05", "pct_cdi"));
    expect(v[1]).toBeNull();
    expect(v[3]).toBeCloseTo(0.1 / (1.003 / 1.001 - 1), 10);
  });

  it("modo real sem índice de IPCA deixa tudo nulo", () => {
    const p = preparado(VALORES, ["x", "cdi"]);
    expect(valoresDe(serieNaJanela(p, "x", "2026-01-05", "real")).every((v) => v === null)).toBe(true);
  });

  it("referência sem valor em um dia anula só aquele dia", () => {
    const p = preparado({ ...VALORES, ipca: [1, 1.01, 1.02, Number.NaN] });
    const v = valoresDe(serieNaJanela(p, "x", "2026-01-05", "real"));
    expect(v[0]).not.toBeNull();
    expect(v[3]).toBeNull();
  });

  it("grade vazia devolve lista vazia", () => {
    const p: Preparado = { grade: [], gradeMs: [], indices: {}, valores: { x: new Float64Array(0) } };
    expect(serieNaJanela(p, "x", "2026-01-05", "nominal")).toEqual([]);
  });
});
