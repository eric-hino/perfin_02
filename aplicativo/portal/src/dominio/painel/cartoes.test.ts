import { describe, expect, it } from "vitest";

import { META, diaria, mensal, repetir, trimestral } from "@/testes/fabricas";

import { formatarPct } from "../formatacao";
import { compor } from "../inflacao";
import type { ValoresHorizonte } from "../projecoes/projecoes";
import type { Ponto } from "../series";
import { type Cartao, montarCartoes, normalizar } from "./cartoes";

const REF = "2025-12-31";
const IPCA_2025 = [0.16, 1.31, 0.56, 0.43, 0.26, 0.24, 0.26, -0.11, 0.48, 0.09, 0.18, 0.33];

const SERIES: Record<string, Ponto[]> = {
  ipca: mensal("2024-01-01", [...repetir(0.4, 12), ...IPCA_2025]),
  igpm: mensal("2024-01-01", repetir(0.5, 24)),
  cdi: diaria("2025-01-01", REF, 0.05),
  selic_meta: [["2024-06-19", 10.5], ["2025-06-19", 15]],
  ibovespa: [["2024-12-31", 100], ["2025-11-28", 110], ["2025-12-30", 121]],
  dolar_ptax: [["2024-12-31", 6], ["2025-11-28", 5.5], ["2025-12-30", 5]],
  imab_yield: [["2024-12-31", 7], ["2025-11-28", 6.5], ["2025-12-30", 7]],
  idp: mensal("2024-01-01", Array.from({ length: 24 }, (_, i) => i + 1)),
  fbcf: trimestral("2024-01-01", [100, 101, 102, 103, 104, 105, 106, 107]),
};

const fimAno: ValoresHorizonte = {
  horizonte: "fim_ano", data: REF, cdiAcumulado: null, cdiAnual: null, selicNoHorizonte: 12.5,
  ipcaAcumulado: null, igpmAcumulado: null, dolar: null, imabCarrego: null,
};

function cartoes(series: Record<string, Ponto[]> = SERIES, horizontes: ValoresHorizonte[] = [fimAno]): Cartao[] {
  return montarCartoes({ referencia: REF, meta: META, series, horizontes });
}

const cartao = (lista: Cartao[], chave: string) => lista.find((c) => c.chave === chave);

describe("normalizar (minilinha)", () => {
  it("lista vazia continua vazia", () => {
    expect(normalizar([])).toEqual([]);
  });

  it("valores iguais ficam no meio", () => {
    expect(normalizar([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
  });

  it("escala entre 0 e 1", () => {
    expect(normalizar([1, 3, 2])).toEqual([0, 1, 0.5]);
  });
});

describe("cartões da Visão geral", () => {
  const lista = cartoes();

  it("sem nenhuma série não há cartões nem erro", () => {
    expect(cartoes({}, [])).toEqual([]);
  });

  it("mantém a ordem dos cartões", () => {
    expect(lista.map((c) => c.chave)).toEqual([
      "ipca", "igpm", "selic", "cdi", "juro_real", "ibovespa", "dolar", "imab_yield", "idp", "fbcf",
    ]);
  });

  it("IPCA mostra 12 meses, o mês e o selo da meta", () => {
    const c = cartao(lista, "ipca")!;
    expect(c.valor).toBe(formatarPct(compor(IPCA_2025)));
    expect(c.detalhe).toBe("dez/2025: 0,33% no mês");
    expect(c.selo).toBe("Dentro da meta");
    expect(c.minilinha).toHaveLength(12);
    expect(c.minilinha!.every((x) => x >= 0 && x <= 1)).toBe(true);
  });

  it("IGP-M não tem selo da meta", () => {
    expect(cartao(lista, "igpm")!.selo).toBeUndefined();
  });

  it("IPCA com menos de 12 meses mostra traço e não tem selo", () => {
    const c = cartao(cartoes({ ipca: mensal("2025-06-01", repetir(0.3, 7)) }), "ipca")!;
    expect(c.valor).toBe("—");
    expect(c.selo).toBeUndefined();
    expect(c.minilinha).toEqual([]);
  });

  it("Selic mostra a implícita no fim do ano só quando há horizonte", () => {
    expect(cartao(lista, "selic")!.detalhe).toBe("Implícita no fim do ano: 12,50%");
    expect(cartao(cartoes(SERIES, []), "selic")!.detalhe).toBeUndefined();
  });

  it("CDI e juro real exigem mais de 200 dias de CDI", () => {
    const poucos = { ...SERIES, cdi: SERIES.cdi.slice(-200) };
    const semCdi = cartoes(poucos);
    expect(cartao(semCdi, "cdi")).toBeUndefined();
    expect(cartao(semCdi, "juro_real")).toBeUndefined();
    expect(cartao(cartoes({ ...SERIES, cdi: SERIES.cdi.slice(-201) }), "cdi")).toBeDefined();
  });

  it("nível: variação no mês e em 12 meses com sinal", () => {
    const ibov = cartao(lista, "ibovespa")!;
    expect(ibov.valor).toBe("121");
    expect(ibov.variacao).toEqual({ texto: "+10,0% no mês", sinal: "positivo" });
    expect(ibov.detalhe).toBe("+21,0% em 12 meses");
    const dolar = cartao(lista, "dolar")!;
    expect(dolar.valor).toBe("R$ 5,0000");
    expect(dolar.variacao!.sinal).toBe("negativo");
  });

  it("alta do yield do IMA-B aparece com sinal negativo (preço cai)", () => {
    const c = cartao(lista, "imab_yield")!;
    expect(c.valor).toBe("IPCA + 7,00%");
    expect(c.variacao).toEqual({ texto: "+0,50 p.p. no mês", sinal: "negativo" });
  });

  it("IMA-B sem valor no mês anterior mostra traço e sinal neutro", () => {
    const c = cartao(cartoes({ imab_yield: [["2025-12-30", 7]] }), "imab_yield")!;
    expect(c.variacao).toEqual({ texto: "— no mês", sinal: "neutro" });
  });

  it("fluxos exigem dois anos completos", () => {
    expect(cartao(lista, "idp")!.variacao!.texto).toBe("+184,6% contra o ano anterior");
    expect(cartao(lista, "idp")!.detalhe).toBe("Até dez/2025");
    expect(cartao(lista, "fbcf")).toBeDefined();
    const curtos = cartoes({ idp: SERIES.idp.slice(1), fbcf: SERIES.fbcf.slice(1) });
    expect(cartao(curtos, "idp")).toBeUndefined();
    expect(cartao(curtos, "fbcf")).toBeUndefined();
  });

  it("ignora dados posteriores à referência", () => {
    const futuro = { ...SERIES, ibovespa: [...SERIES.ibovespa, ["2026-01-05", 999] as const] };
    expect(cartao(cartoes(futuro), "ibovespa")!.valor).toBe("121");
  });
});
