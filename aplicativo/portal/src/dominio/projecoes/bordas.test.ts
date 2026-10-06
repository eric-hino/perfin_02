// Casos de borda das projeções: curvas vazias, datas-base fora de dia útil, horizontes passados.

import { describe, expect, it } from "vitest";

import { diasUteisEntre } from "../datas";
import {
  type Vertice, cupomLinear, curvaImplicita, curvaUtilizavel, fatorAcumulado, normalizarVertices, taxaATermo, taxaAVista,
} from "./curva";
import { encadearProjecao } from "./encadear";
import {
  type EntradaProjecao, dataDoHorizonte, finsDeMes, projetar, tabelaDeHorizontes, valoresNoHorizonte,
} from "./projecoes";

const v = (diasUteis: number, taxa: number, diasCorridos = Math.round(diasUteis * 1.45)): Vertice => ({
  diasUteis, diasCorridos, taxa,
});

const FERIADOS = new Set(["2026-10-12", "2026-11-02", "2026-11-20", "2026-12-25", "2027-01-01"]);

function entrada(parcial: Partial<EntradaProjecao> = {}): EntradaProjecao {
  return {
    dataBase: "2026-10-02",
    feriados: FERIADOS,
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

describe("curva: entradas vazias e inválidas", () => {
  it("curva vazia tem fator 1 e taxa à vista zero", () => {
    expect(fatorAcumulado([], 100)).toBe(1);
    expect(taxaAVista([], 100)).toBe(0);
  });

  it("prazos não positivos ou invertidos não têm taxa", () => {
    const pre = [v(252, 10)];
    expect(fatorAcumulado(pre, -5)).toBe(1);
    expect(taxaAVista(pre, 0)).toBeNull();
    expect(taxaAVista(pre, -1)).toBeNull();
    expect(taxaATermo(pre, 10, 10)).toBeNull();
    expect(taxaATermo(pre, 20, 10)).toBeNull();
  });

  it("um só vértice: usa a própria taxa antes e depois dele", () => {
    const pre = [v(252, 10)];
    expect(fatorAcumulado(pre, 126)).toBeCloseTo(Math.sqrt(1.1), 12);
    expect(fatorAcumulado(pre, 504)).toBeCloseTo(1.21, 12);
  });

  it("cupom cambial sem vértices não tem taxa", () => {
    expect(cupomLinear([], 30)).toBeNull();
  });

  it("normaliza vértices: descarta prazo zero, mantém o de menor prazo corrido e ordena", () => {
    const n = normalizarVertices([v(10, 5, 15), v(0, 9, 0), v(5, 4, 7), v(10, 6, 14)]);
    expect(n.map((x) => [x.diasUteis, x.taxa])).toEqual([[5, 4], [10, 6]]);
  });

  it("inflação implícita ignora vértices reais sem prazo", () => {
    expect(curvaImplicita([v(252, 10)], [v(0, 5, 0), v(252, 5)])).toHaveLength(1);
  });

  it("curva utilizável exige o mínimo de vértices até o prazo limite", () => {
    expect(curvaUtilizavel([v(21, 1), v(63, 1), v(126, 1)])).toBe(false);
    expect(curvaUtilizavel([v(21, 1), v(63, 1), v(126, 1), v(600, 1)])).toBe(false);
    expect(curvaUtilizavel([v(21, 1), v(63, 1), v(126, 1), v(504, 1)])).toBe(true);
  });
});

describe("projetar: curvas vazias e dados ausentes", () => {
  it("sem curva pré, o CDI projetado é zero e não vira NaN", () => {
    const p = projetar(entrada({ pre: [] }));
    expect(p.cdiMensal).toHaveLength(24);
    expect(p.cdiMensal.every((t) => t.taxa === 0)).toBe(true);
  });

  it("sem curva de cupom de IPCA não há IPCA nem carrego do IMA-B", () => {
    const p = projetar(entrada({ ipcaReal: [] }));
    expect(p.ipcaMensal).toEqual([]);
    expect(p.imabMensal).toBeNull();
  });

  it("IMA-B sem yield não tem carrego, mas mantém o IPCA", () => {
    const p = projetar(entrada({ yieldImab: null }));
    expect(p.imabMensal).toBeNull();
    expect(p.ipcaMensal).toHaveLength(24);
  });

  it("sem PTAX ou sem cupom cambial não há dólar futuro", () => {
    expect(projetar(entrada({ dolarSpot: null })).dolarFuturo).toEqual([]);
    expect(projetar(entrada({ cupomCambial: [] })).dolarFuturo).toEqual([]);
  });

  it("IGP-M projetado só com curva utilizável", () => {
    const igpmReal = [v(21, 6), v(63, 6.2), v(252, 6.5), v(504, 6.8)];
    expect(projetar(entrada({ igpmReal })).igpmMensal).toHaveLength(24);
  });
});

describe("projetar: data-base fora de dia útil", () => {
  it("as taxas mensais compostas reproduzem o fator da curva até cada fim de mês", () => {
    for (const dataBase of ["2026-10-02", "2026-10-03", "2026-10-12"]) {
      const e = entrada({ dataBase });
      const p = projetar(e);
      let fator = 1;
      p.cdiMensal.forEach((t, i) => {
        fator *= 1 + t.taxa / 100;
        const fim = finsDeMes(dataBase)[i];
        expect(fator).toBeCloseTo(fatorAcumulado(e.pre, diasUteisEntre(dataBase, fim, FERIADOS)), 10);
      });
    }
  });

  it("data-base no sábado projeta igual à sexta anterior", () => {
    const sexta = projetar(entrada({ dataBase: "2026-10-02" }));
    const sabado = projetar(entrada({ dataBase: "2026-10-03" }));
    expect(sabado.cdiMensal).toEqual(sexta.cdiMensal);
    expect(sabado.ipcaMensal).toEqual(sexta.ipcaMensal);
  });

  it("data-base em feriado projeta igual ao dia útil anterior", () => {
    const sexta = projetar(entrada({ dataBase: "2026-10-09" }));
    const feriado = projetar(entrada({ dataBase: "2026-10-12" }));
    expect(feriado.cdiMensal).toEqual(sexta.cdiMensal);
  });

  it("data-base no último dia do mês começa no mês seguinte, com 24 meses", () => {
    const fins = finsDeMes("2026-09-30");
    expect(fins[0]).toBe("2026-10-31");
    expect(fins).toHaveLength(24);
    expect(projetar(entrada({ dataBase: "2026-09-30" })).cdiMensal[0].mes).toBe("2026-10-01");
  });
});

describe("Selic implícita e reuniões do Copom", () => {
  it("reuniões todas no passado caem para os fins de mês (18)", () => {
    const p = projetar(entrada({ reunioesCopom: ["2026-07-29", "2026-09-16"] }));
    expect(p.selicImplicita).toHaveLength(18);
    expect(p.selicImplicita[0].data).toBe("2026-10-31");
  });

  it("descarta reuniões passadas e ordena as futuras", () => {
    const p = projetar(entrada({ reunioesCopom: ["2026-12-09", "2026-07-29", "2026-11-04"] }));
    expect(p.selicImplicita.map((s) => s.data)).toEqual(["2026-11-04", "2026-12-09"]);
  });

  it("reunião na própria data-base é considerada", () => {
    const p = projetar(entrada({ reunioesCopom: ["2026-10-02", "2026-11-04"] }));
    expect(p.selicImplicita[0].data).toBe("2026-10-02");
  });

  it("Selic implícita soma o spread Selic − CDI à taxa a termo", () => {
    const sem = projetar(entrada({ spreadSelicCdi: 0 })).selicImplicita;
    const com = projetar(entrada({ spreadSelicCdi: 0.1 })).selicImplicita;
    com.forEach((s, i) => expect(s.valor - sem[i].valor).toBeCloseTo(0.1, 10));
  });
});

describe("horizontes", () => {
  it("horizonte na data-base, antes dela ou em dia sem pregão logo depois não tem valores", () => {
    for (const data of ["2026-10-02", "2026-09-30", "2026-10-03"]) {
      const h = valoresNoHorizonte(entrada(), "3m", data);
      expect(h).toMatchObject({
        cdiAcumulado: null, cdiAnual: null, selicNoHorizonte: null, ipcaAcumulado: null,
        igpmAcumulado: null, dolar: null, imabCarrego: null,
      });
    }
  });

  it("sem yield do IMA-B o carrego é nulo e o IPCA continua", () => {
    const h = valoresNoHorizonte(entrada({ yieldImab: null }), "12m", "2027-10-04");
    expect(h.imabCarrego).toBeNull();
    expect(h.ipcaAcumulado).not.toBeNull();
  });

  it("sem curva de IPCA não há IPCA nem carrego; sem cupom não há dólar", () => {
    const h = valoresNoHorizonte(entrada({ ipcaReal: [], cupomCambial: [] }), "12m", "2027-10-04");
    expect(h).toMatchObject({ ipcaAcumulado: null, imabCarrego: null, dolar: null });
    expect(h.cdiAcumulado).not.toBeNull();
  });

  it("filtra horizontes que já passaram em relação à data-base", () => {
    const tabela = tabelaDeHorizontes(entrada(), "2026-06-30");
    expect(tabela.map((h) => h.horizonte)).toEqual(["6m", "12m", "24m", "fim_ano", "fim_proximo_ano"]);
  });

  it("no último dia do ano o horizonte 'fim deste ano' some", () => {
    const tabela = tabelaDeHorizontes(entrada({ dataBase: "2026-12-31" }), "2026-12-31");
    expect(tabela.map((h) => h.horizonte)).toEqual(["3m", "6m", "12m", "24m", "fim_proximo_ano"]);
  });

  it("datas dos horizontes respeitam o fim de mês mais curto", () => {
    expect(dataDoHorizonte("3m", "2026-11-30")).toBe("2027-02-28");
    expect(dataDoHorizonte("fim_ano", "2026-03-15")).toBe("2026-12-31");
    expect(dataDoHorizonte("fim_proximo_ano", "2026-03-15")).toBe("2027-12-31");
  });
});

describe("encadear projeção: bordas", () => {
  const taxas = [
    { mes: "2026-10-01", taxa: 1.0 },
    { mes: "2026-11-01", taxa: 0.8 },
    { mes: "2026-12-01", taxa: 0.9 },
  ];

  it("sem taxas ou com zero meses não projeta", () => {
    expect(encadearProjecao(100, "2026-10-02", [])).toEqual([]);
    expect(encadearProjecao(100, "2026-10-02", taxas, 0)).toEqual([]);
  });

  it("série diária no meio do mês continua com a taxa do restante do mês", () => {
    const pontos = encadearProjecao(100, "2026-10-02", taxas, 3);
    expect(pontos.map((p) => p.data)).toEqual(["2026-10-31", "2026-11-30", "2026-12-31"]);
    expect(pontos[0].valor).toBeCloseTo(101, 10);
    expect(pontos[2].valor).toBeCloseTo(100 * 1.01 * 1.008 * 1.009, 10);
  });

  it("para quando acabam as taxas", () => {
    expect(encadearProjecao(100, "2026-10-02", taxas, 24)).toHaveLength(3);
  });

  it("dado realizado depois do fim das taxas não projeta", () => {
    expect(encadearProjecao(100, "2027-03-15", taxas)).toEqual([]);
  });

  it("com uma só taxa e lacuna, a lacuna usa essa taxa", () => {
    const pontos = encadearProjecao(100, "2026-08-31", [{ mes: "2026-10-01", taxa: 0.5 }]);
    expect(pontos.map((p) => p.data)).toEqual(["2026-09-30", "2026-10-31"]);
    expect(pontos[1].valor).toBeCloseTo(100 * 1.005 ** 2, 10);
  });

  // Corrigido (era bug): encadear.ts:29-31. Com data-base no último dia do mês (ex.: 30/09/2026, quarta),
  // a primeira taxa (outubro) já é de mês cheio. Mas `lacuna` fica verdadeiro porque
  // "2026-09-30" < "2026-10-01", e outubro passa a usar a taxa de novembro (taxas[1]).
  // Para o CDI realizado até 30/09, o primeiro mês projetado sai com a taxa errada.
  it("data-base no fim do mês: o primeiro mês usa a própria taxa (série diária)", () => {
    const pontos = encadearProjecao(100, "2026-09-30", taxas, 1);
    expect(pontos[0].data).toBe("2026-10-31");
    expect(pontos[0].valor).toBeCloseTo(101, 10);
  });

  // Mesmo bug, série mensal (IPCA até agosto, data-base 30/09): setembro (lacuna) deveria usar
  // "a primeira taxa de mês cheio da projeção" (outubro, 1,0%), como diz o comentário da função.
  it("data-base no fim do mês: a lacuna usa a primeira taxa de mês cheio (série mensal)", () => {
    const pontos = encadearProjecao(100, "2026-08-31", taxas, 2);
    expect(pontos[0].valor).toBeCloseTo(101, 10);
    expect(pontos[1].valor).toBeCloseTo(100 * 1.01 * 1.01, 10);
  });
});
