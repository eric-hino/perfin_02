import { describe, expect, it } from "vitest";

import { type Vertice, cupomLinear, curvaImplicita, fatorAcumulado, taxaATermo, taxaAVista } from "./curva";
import { encadearProjecao } from "./encadear";
import { type EntradaProjecao, projetar, valoresNoHorizonte } from "./projecoes";

const v = (diasUteis: number, taxa: number, diasCorridos = Math.round(diasUteis * 1.45)): Vertice => ({
  diasUteis, diasCorridos, taxa,
});

describe("curva flat-forward", () => {
  const pre = [v(1, 13.65), v(252, 13.38), v(504, 13.71)];

  it("reproduz os vértices", () => {
    expect(taxaAVista(pre, 252)).toBeCloseTo(13.38, 10);
    expect(taxaAVista(pre, 504)).toBeCloseTo(13.71, 10);
  });

  it("interpola exponencialmente entre vértices (taxa a termo constante no trecho)", () => {
    const f1 = taxaATermo(pre, 252, 300)!;
    const f2 = taxaATermo(pre, 300, 504)!;
    expect(f1).toBeCloseTo(f2, 10);
    const esperado = ((1.1371 ** 2 / 1.1338) - 1) * 100;
    expect(taxaATermo(pre, 252, 504)).toBeCloseTo(esperado, 8);
  });

  it("extrapola com a última taxa a termo", () => {
    const termoFinal = taxaATermo(pre, 252, 504)!;
    expect(taxaATermo(pre, 504, 756)).toBeCloseTo(termoFinal, 8);
  });

  it("fator zero dias é 1", () => {
    expect(fatorAcumulado(pre, 0)).toBe(1);
  });
});

describe("inflação implícita e cupom cambial", () => {
  it("implícita = (1 + pré)/(1 + real) − 1", () => {
    const pre = [v(252, 13.3811)];
    const real = [v(252, 6.5624)];
    expect(curvaImplicita(pre, real)[0].taxa).toBeCloseTo((1.133811 / 1.065624 - 1) * 100, 8);
  });

  it("cupom linear interpola por dias corridos", () => {
    const cupom = [v(10, 4, 30), v(40, 5, 90)];
    expect(cupomLinear(cupom, 60)).toBeCloseTo(4.5, 10);
    expect(cupomLinear(cupom, 10)).toBe(4);
    expect(cupomLinear(cupom, 200)).toBe(5);
  });
});

function entrada(parcial: Partial<EntradaProjecao> = {}): EntradaProjecao {
  return {
    dataBase: "2026-10-02",
    feriados: new Set(["2026-10-12", "2026-11-02", "2026-11-20", "2026-12-25"]),
    pre: [v(1, 13.65), v(252, 13.38), v(504, 13.71)],
    ipcaReal: [v(252, 6.56), v(504, 7.37)],
    igpmReal: [],
    cupomCambial: [v(1, 4.8, 3), v(252, 5.0, 365)],
    dolarSpot: 5.4,
    yieldImab: 6.7,
    spreadSelicCdi: 0.1,
    reunioesCopom: [],
    ...parcial,
  };
}

describe("projeções", () => {
  it("CDI mensal projetado é positivo e o IGP-M fica sem projeção sem curva", () => {
    const p = projetar(entrada());
    expect(p.cdiMensal.length).toBe(24);
    expect(p.cdiMensal[1].taxa).toBeGreaterThan(0.9);
    expect(p.cdiMensal[1].taxa).toBeLessThan(1.2);
    expect(p.igpmMensal).toBeNull();
  });

  it("dólar futuro segue a paridade coberta", () => {
    const e = entrada();
    const h = valoresNoHorizonte(e, "12m", "2027-10-04");
    expect(h.dolar).not.toBeNull();
    expect(h.dolar!).toBeGreaterThan(e.dolarSpot!);
  });

  it("Selic implícita usa as reuniões do Copom quando informadas", () => {
    const p = projetar(entrada({ reunioesCopom: ["2026-11-04", "2026-12-09"] }));
    expect(p.selicImplicita.map((s) => s.data)).toEqual(["2026-11-04", "2026-12-09"]);
  });
});

describe("encadear projeção", () => {
  it("continua o índice a partir do último valor realizado", () => {
    const pontos = encadearProjecao(100, "2026-08-31", [
      { mes: "2026-10-01", taxa: 0.2, parcial: true },
      { mes: "2026-11-01", taxa: 0.4 },
      { mes: "2026-12-01", taxa: 0.5 },
    ], 4);
    // setembro e outubro (lacuna) usam a taxa de mês cheio (novembro)
    expect(pontos.map((p) => p.data)).toEqual(["2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31"]);
    expect(pontos[3].valor).toBeCloseTo(100 * 1.004 * 1.004 * 1.004 * 1.005, 10);
  });
});
