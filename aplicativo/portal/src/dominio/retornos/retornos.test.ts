import { describe, expect, it } from "vitest";

import type { Indicador, Ponto } from "../series";
import { construirIndice } from "./indice";
import { inicioDaJanela } from "./janelas";
import { anualizar, aplicarModo, retornoEntre, retornoNoModo, serieRebaseada } from "./retornos";
import { linhaDeJanelas } from "./tabela";

function indicador(parcial: Partial<Indicador>): Indicador {
  return {
    codigo: "x", nome: "X", nomeCurto: "X", unidade: "", casas: 2, frequencia: "diaria",
    tipoSerie: "nivel", agregacao: "fechamento", fonte: "BCB_SGS", cor: "#101B2A", curvaProjecao: null, ordem: 0,
    ...parcial,
  };
}

const SEM_FERIADOS = new Set<string>();

describe("índice de nível", () => {
  const pontos: Ponto[] = [["2026-01-02", 100], ["2026-01-05", 110], ["2026-01-06", 99]];
  const indice = construirIndice({ indicador: indicador({}), pontos })!;

  it("calcula retorno entre datas pelo valor 'as of'", () => {
    expect(retornoEntre(indice, "2026-01-02", "2026-01-05")).toBeCloseTo(0.1, 12);
    // sábado 03/01 usa o valor de sexta 02/01
    expect(retornoEntre(indice, "2026-01-03", "2026-01-06")).toBeCloseTo(-0.01, 12);
  });

  it("retorna null antes do primeiro dado ou com datas invertidas", () => {
    expect(retornoEntre(indice, "2025-12-31", "2026-01-05")).toBeNull();
    expect(retornoEntre(indice, "2026-01-06", "2026-01-02")).toBeNull();
  });
});

describe("índice de taxa diária (CDI)", () => {
  const pontos: Ponto[] = [["2026-01-02", 0.05], ["2026-01-05", 0.05], ["2026-01-06", 0.05]];
  const indice = construirIndice({ indicador: indicador({ tipoSerie: "taxa_periodo" }), pontos })!;

  it("compõe as taxas de (d1, d2]", () => {
    expect(retornoEntre(indice, "2026-01-02", "2026-01-06")).toBeCloseTo(1.0005 ** 2 - 1, 12);
    expect(retornoEntre(indice, "2026-01-01", "2026-01-06")).toBeCloseTo(1.0005 ** 3 - 1, 12);
  });
});

describe("índice de taxa mensal (IPCA) com pro rata", () => {
  const pontos: Ponto[] = [["2026-01-01", 1], ["2026-02-01", 2]];
  const indice = construirIndice({
    indicador: indicador({ tipoSerie: "taxa_periodo", frequencia: "mensal" }), pontos,
  })!;

  it("mês cheio compõe as taxas mensais", () => {
    expect(retornoEntre(indice, "2025-12-31", "2026-02-28")).toBeCloseTo(1.01 * 1.02 - 1, 12);
  });

  it("data quebrada usa pro rata geométrico por dias corridos", () => {
    expect(retornoEntre(indice, "2025-12-31", "2026-02-14")).toBeCloseTo(1.01 * 1.02 ** (14 / 28) - 1, 12);
  });

  it("não existe depois do último mês divulgado", () => {
    expect(retornoEntre(indice, "2025-12-31", "2026-03-01")).toBeNull();
    expect(indice.ultimaData).toBe("2026-02-28");
  });
});

describe("modos de retorno", () => {
  it("real e excesso dividem pelos fatores; % do CDI divide os retornos", () => {
    expect(aplicarModo(0.1, 0.05, "real")).toBeCloseTo(1.1 / 1.05 - 1, 12);
    expect(aplicarModo(0.1, 0.05, "excesso_cdi")).toBeCloseTo(1.1 / 1.05 - 1, 12);
    expect(aplicarModo(0.1, 0.05, "pct_cdi")).toBeCloseTo(2, 12);
    expect(aplicarModo(0.1, 0, "pct_cdi")).toBeNull();
    expect(aplicarModo(0.1, null, "real")).toBeNull();
  });

  it("retornoNoModo usa a referência no mesmo intervalo", () => {
    const bolsa = construirIndice({ indicador: indicador({}), pontos: [["2026-01-01", 100], ["2026-02-01", 120]] })!;
    const cdi = construirIndice({
      indicador: indicador({ tipoSerie: "taxa_periodo" }), pontos: [["2025-12-31", 0], ["2026-01-15", 10]],
    })!;
    expect(retornoNoModo(bolsa, "2026-01-01", "2026-02-01", "excesso_cdi", { ipca: null, cdi }))
      .toBeCloseTo(1.2 / 1.1 - 1, 12);
  });
});

describe("anualização e rebase", () => {
  it("anualiza em 252 dias úteis", () => {
    expect(anualizar(0.21, 504)).toBeCloseTo(0.1, 12);
    expect(anualizar(0.1, 0)).toBeNull();
  });

  it("série rebaseada começa em 0", () => {
    const indice = construirIndice({ indicador: indicador({}), pontos: [["2026-01-02", 50], ["2026-01-05", 60]] })!;
    const serie = serieRebaseada(indice, ["2026-01-02", "2026-01-05"], "nominal", { ipca: null, cdi: null });
    expect(serie[0]).toBe(0);
    expect(serie[1]).toBeCloseTo(0.2, 12);
  });
});

describe("janelas", () => {
  it("série defasada conta a janela a partir do último dado", () => {
    const meses: Ponto[] = Array.from({ length: 24 }, (_, i) => [`${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, 1] as const);
    const indice = construirIndice({ indicador: indicador({ tipoSerie: "taxa_periodo", frequencia: "mensal" }), pontos: meses.slice(0, 20) })!;
    // dados até ago/2026, referência em out/2026: 12m = set/2025 a ago/2026
    const linha = linhaDeJanelas(indice, "2026-10-06", "nominal", { ipca: null, cdi: null }, SEM_FERIADOS, ["12m"]);
    expect(linha.celulas[0].ate).toBe("2026-08-31");
    expect(linha.celulas[0].retorno).toBeCloseTo(1.01 ** 12 - 1, 10);
  });

  it("calcula o início das janelas prontas", () => {
    expect(inicioDaJanela("mes", "2026-10-06", "2000-01-01")).toBe("2026-09-30");
    expect(inicioDaJanela("ano", "2026-10-06", "2000-01-01")).toBe("2025-12-31");
    expect(inicioDaJanela("12m", "2026-10-06", "2000-01-01")).toBe("2025-10-06");
    expect(inicioDaJanela("1m", "2026-03-31", "2000-01-01")).toBe("2026-02-28");
    expect(inicioDaJanela("inicio", "2026-10-06", "2000-01-03")).toBe("2000-01-03");
  });

  it("tabela de janelas anualiza só janelas acima de 12 meses", () => {
    const pontos: Ponto[] = [["2023-10-06", 100], ["2025-10-06", 121], ["2026-10-06", 133.1]];
    const indice = construirIndice({ indicador: indicador({}), pontos })!;
    const linha = linhaDeJanelas(indice, "2026-10-06", "nominal", { ipca: null, cdi: null }, SEM_FERIADOS, ["12m", "36m"]);
    expect(linha.celulas[0].retorno).toBeCloseTo(0.1, 12);
    expect(linha.celulas[0].anualizado).toBeNull();
    expect(linha.celulas[1].retorno).toBeCloseTo(0.331, 12);
    expect(linha.celulas[1].anualizado).not.toBeNull();
  });
});
