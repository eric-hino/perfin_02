import { describe, expect, it } from "vitest";

import { diaria, mensal, repetir, trimestral } from "@/testes/fabricas";

import { compor, juroReal } from "./inflacao";
import { idpEmReais, somaMovel, variacaoAnualFbcf } from "./investimento";
import { cdiDozeMeses, serieJuroRealExPost } from "./juros";

describe("investimento", () => {
  it("soma móvel com menos pontos que a janela é vazia", () => {
    expect(somaMovel([], 12)).toEqual([]);
    expect(somaMovel(mensal("2025-01-01", [1, 2]), 3)).toEqual([]);
  });

  it("soma móvel de 3 períodos", () => {
    expect(somaMovel(mensal("2025-01-01", [1, 2, 3, 4]), 3)).toEqual([["2025-03-01", 6], ["2025-04-01", 9]]);
  });

  it("IDP em reais usa a PTAX média do mês e descarta meses sem PTAX", () => {
    const idp = mensal("2025-01-01", [100, 200]);
    const ptax = [["2025-01-02", 5], ["2025-01-31", 6]] as const;
    expect(idpEmReais(idp, ptax)).toEqual([["2025-01-01", 0.55]]);
  });

  it("FBCF: variação nominal e real contra o mesmo trimestre do ano anterior", () => {
    const fbcf = trimestral("2024-10-01", [100, 100, 100, 100, 110]);
    const [v] = variacaoAnualFbcf(fbcf, mensal("2025-01-01", repetir(0.5, 12)));
    expect(v.trimestre).toBe("2025-10-01");
    expect(v.nominal).toBeCloseTo(10, 10);
    expect(v.real).toBeCloseTo((1.1 / (1 + compor(repetir(0.5, 12)) / 100) - 1) * 100, 10);
  });

  it("FBCF sem os 12 meses de IPCA tem real nulo", () => {
    const fbcf = trimestral("2024-10-01", [100, 100, 100, 100, 110]);
    expect(variacaoAnualFbcf(fbcf, mensal("2025-02-01", repetir(0.5, 11)))[0].real).toBeNull();
  });

  it("FBCF com menos de 5 trimestres não tem variação", () => {
    expect(variacaoAnualFbcf(trimestral("2025-01-01", [1, 2, 3, 4]), [])).toEqual([]);
  });
});

describe("juros", () => {
  const cdi2025 = diaria("2025-01-01", "2025-12-31", 0.04);

  it("CDI 12m exige mais de 200 dias", () => {
    expect(cdiDozeMeses(cdi2025.slice(-200), "2025-12-31")).toBeNull();
    expect(cdiDozeMeses(cdi2025.slice(-201), "2025-12-31")).toBeCloseTo(compor(repetir(0.04, 201)), 10);
  });

  it("CDI 12m não inclui o dia exatamente 12 meses antes", () => {
    const cdi = diaria("2024-12-31", "2025-12-31", 0.04);
    expect(cdiDozeMeses(cdi, "2025-12-31")).toBeCloseTo(compor(repetir(0.04, cdi.length - 1)), 10);
  });

  it("juro real ex-post só nos meses com IPCA 12m e CDI 12m, dentro do filtro", () => {
    const ipca = mensal("2024-01-01", repetir(0.4, 24));
    const cdi = diaria("2024-01-01", "2025-12-31", 0.04);
    const serie = serieJuroRealExPost(cdi, ipca, "2024-01-01", "2025-12-31");
    expect(serie[0][0]).toBe("2024-12-01");
    expect(serie).toHaveLength(13);
    const filtrada = serieJuroRealExPost(cdi, ipca, "2025-06-01", "2025-08-31");
    expect(filtrada.map(([d]) => d)).toEqual(["2025-06-01", "2025-07-01", "2025-08-01"]);
    expect(filtrada[0][1]).toBeCloseTo(juroReal(cdiDozeMeses(cdi, "2025-06-30")!, compor(repetir(0.4, 12))), 10);
  });

  it("sem dados a série de juro real é vazia", () => {
    expect(serieJuroRealExPost([], [], "2024-01-01", "2025-12-31")).toEqual([]);
  });
});
