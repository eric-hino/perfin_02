import { describe, expect, it } from "vitest";

import { META, diaria, indicador, mensal, repetir, trimestral } from "@/testes/fabricas";

import { compor } from "../inflacao";
import type { Insight } from "../insights/tipos";
import type { ValoresHorizonte } from "../projecoes/projecoes";
import { type Ponto, pontosEntre } from "../series";
import { assuntoDoRelatorio, corpoDoRelatorio, escolherDestaques } from "./email";
import { type DadosRelatorio, montarAbas } from "./planilha";
import { type LinhaResumo, resumoDoMes } from "./resumo";

const MES = "2025-12-01";

const IPCA_2025 = [0.16, 1.31, 0.56, 0.43, 0.26, 0.24, 0.26, -0.11, 0.48, 0.09, 0.18, 0.33];

const CATALOGO = [
  indicador({ codigo: "ipca", nome: "IPCA", tipoSerie: "taxa_periodo", frequencia: "mensal", agregacao: "composto" }),
  indicador({ codigo: "cdi", nome: "CDI", tipoSerie: "taxa_periodo", frequencia: "diaria", agregacao: "composto" }),
  indicador({ codigo: "selic_meta", nome: "Selic meta", tipoSerie: "taxa", agregacao: "ultimo" }),
  indicador({ codigo: "dolar_ptax", nome: "Dólar PTAX", tipoSerie: "nivel" }),
  indicador({ codigo: "idp", nome: "IDP", tipoSerie: "fluxo", frequencia: "mensal", agregacao: "soma" }),
  indicador({ codigo: "fbcf", nome: "FBCF", tipoSerie: "fluxo", frequencia: "trimestral", agregacao: "soma" }),
  indicador({ codigo: "imab_duration", nome: "Duration", tipoSerie: "auxiliar" }),
];

const CDI_2025 = diaria("2025-01-01", "2025-12-31", 0.05);

const SERIES: Record<string, Ponto[]> = {
  ipca: mensal("2024-01-01", [...repetir(0.4, 12), ...IPCA_2025]),
  cdi: CDI_2025,
  selic_meta: [["2024-12-12", 12.25], ["2025-11-05", 14.75], ["2025-12-10", 15]],
  dolar_ptax: [["2024-12-31", 6], ["2025-06-30", 5], ["2025-11-28", 5.5], ["2025-12-30", 5]],
  idp: mensal("2024-01-01", Array.from({ length: 24 }, (_, i) => i + 1)),
  fbcf: trimestral("2024-01-01", [100, 101, 102, 103, 104, 105, 106, 107]),
};

function linha(linhas: LinhaResumo[], codigo: string): LinhaResumo {
  return linhas.find((l) => l.codigo === codigo)!;
}

describe("resumo do mês por tipo de série", () => {
  const linhas = resumoDoMes(CATALOGO, SERIES, MES, META);

  it("ignora séries auxiliares e mantém a ordem do catálogo", () => {
    expect(linhas.map((l) => l.codigo)).toEqual(["ipca", "cdi", "selic_meta", "dolar_ptax", "idp", "fbcf"]);
  });

  it("taxa mensal: mês, anterior, variação em p.p., no ano, 12 meses, extremos e status da meta", () => {
    const l = linha(linhas, "ipca");
    const ano = compor(IPCA_2025);
    expect(l).toMatchObject({ mes: 0.33, anterior: 0.18, tipoVariacao: "pp", unidade: "% no mês", minimo12m: -0.11, maximo12m: 1.31 });
    expect(l.variacao).toBeCloseTo(0.15, 12);
    expect(l.noAno).toBeCloseTo(ano, 10);
    expect(l.dozeMeses).toBeCloseTo(ano, 10);
    expect(l.status).toBe("Dentro da meta");
  });

  it("taxa mensal de outro indicador não recebe status da meta", () => {
    const igpm = indicador({ codigo: "igpm", tipoSerie: "taxa_periodo", frequencia: "mensal" });
    const [l] = resumoDoMes([igpm], { igpm: SERIES.ipca }, MES, META);
    expect(l.status).toBeNull();
  });

  it("taxa diária: compõe o mês, o mês anterior, o ano e 12 meses", () => {
    const l = linha(linhas, "cdi");
    const composto = (de: string, ate: string) => compor(pontosEntre(CDI_2025, de, ate).map(([, v]) => v));
    expect(l.mes).toBeCloseTo(composto("2025-12-01", "2025-12-31"), 10);
    expect(l.anterior).toBeCloseTo(composto("2025-11-01", "2025-11-30"), 10);
    expect(l.noAno).toBeCloseTo(composto("2025-01-01", "2025-12-31"), 10);
    expect(l.dozeMeses).toBeCloseTo(composto("2025-01-01", "2025-12-31"), 10);
    expect(l).toMatchObject({ unidade: "% no período", minimo12m: null, maximo12m: null, status: null });
  });

  it("taxa (Selic meta): valor no fim do mês e no fim do mês anterior, extremos de 12 meses", () => {
    const l = linha(linhas, "selic_meta");
    expect(l).toMatchObject({ mes: 15, anterior: 14.75, tipoVariacao: "pp", noAno: null, dozeMeses: null, minimo12m: 14.75, maximo12m: 15 });
    expect(l.variacao).toBeCloseTo(0.25, 12);
  });

  it("nível: variação percentual no mês, no ano e em 12 meses", () => {
    const l = linha(linhas, "dolar_ptax");
    expect(l).toMatchObject({ mes: 5, anterior: 5.5, tipoVariacao: "pct", minimo12m: 5, maximo12m: 6 });
    expect(l.variacao).toBeCloseTo((5 / 5.5 - 1) * 100, 10);
    expect(l.noAno).toBeCloseTo((5 / 6 - 1) * 100, 10);
    expect(l.dozeMeses).toBeCloseTo((5 / 6 - 1) * 100, 10);
  });

  it("nível com valor anterior zero não divide por zero", () => {
    const [l] = resumoDoMes([CATALOGO[3]], { dolar_ptax: [["2025-11-28", 0], ["2025-12-30", 5]] }, MES, META);
    expect(l.variacao).toBeNull();
  });

  it("fluxo mensal: último mês, anterior, soma de 12 meses e comparação anual", () => {
    const l = linha(linhas, "idp");
    expect(l).toMatchObject({ mes: 24, anterior: 23, dozeMeses: 222, tipoVariacao: "pct" });
    expect(l.variacao).toBeCloseTo((24 / 23 - 1) * 100, 10);
    expect(l.status).toBe("Ref. 2025-12; 12m contra o ano anterior: 184,6%");
  });

  it("fluxo trimestral: soma de 4 trimestres e referência do último trimestre", () => {
    const l = linha(linhas, "fbcf");
    expect(l).toMatchObject({ mes: 107, anterior: 106, dozeMeses: 422 });
    expect(l.status).toBe("Ref. 2025-10; 12m contra o ano anterior: 3,9%");
  });

  it("fluxo com menos de 12 meses não tem soma nem status", () => {
    const [l] = resumoDoMes([CATALOGO[4]], { idp: mensal("2025-03-01", repetir(10, 10)) }, MES, META);
    expect(l).toMatchObject({ mes: 10, dozeMeses: null, status: null });
  });

  it("séries vazias (ou ausentes) produzem linhas com valores nulos sem quebrar", () => {
    const vazias = resumoDoMes(CATALOGO, {}, MES, META);
    expect(vazias).toHaveLength(6);
    for (const l of vazias) {
      expect(l).toMatchObject({ mes: null, anterior: null, variacao: null, dozeMeses: null, status: null });
    }
  });

  // Corrigido (era bug): resumo.ts:42 e 47 usam acumuladoMeses/acumuladoNoAno, que aceitam o último mês
  // disponível ("as of"). Se o IPCA do mês do relatório ainda não saiu, a coluna "Mês" fica
  // vazia, mas "No ano", "12 meses" e o status da meta mostram os valores do mês anterior sem
  // qualquer aviso. Em janeiro, "No ano" chega a mostrar o acumulado do ano anterior inteiro.
  it("taxa mensal sem o dado do mês não mostra acumulados de outro mês", () => {
    const semDezembro = { ipca: SERIES.ipca.slice(0, -1) };
    const [l] = resumoDoMes([CATALOGO[0]], semDezembro, MES, META);
    expect(l.mes).toBeNull();
    expect(l.dozeMeses).toBeNull();
    expect(l.noAno).toBeNull();
    expect(l.status).toBeNull();
  });
});

function dados(parcial: Partial<DadosRelatorio> = {}): DadosRelatorio {
  return {
    mes: MES, geradoEm: "05/01/2026 10:00:00", resumo: [], insights: [], retornos: [], dataCurva: null,
    horizontes: [], horizontesMesAnterior: null, dataCurvaMesAnterior: null, series: {},
    ...parcial,
  };
}

function horizonte(parcial: Partial<ValoresHorizonte>): ValoresHorizonte {
  return {
    horizonte: "12m", data: "2026-12-31", cdiAcumulado: 13, cdiAnual: 13, selicNoHorizonte: 12.5,
    ipcaAcumulado: 4, igpmAcumulado: null, dolar: 5.6, imabCarrego: 11, ...parcial,
  };
}

function insight(id: string, titulo = id, texto = `texto ${id}`): Insight {
  return { id, severidade: "informativo", titulo, texto, indicador: "x", valor: null };
}

describe("abas da planilha", () => {
  it("monta as 9 abas na ordem esperada, cada uma com cabeçalho, mesmo sem dados", () => {
    const abas = montarAbas(dados());
    expect(abas.map((a) => a.titulo)).toEqual([
      "Resumo", "Retornos", "Projeções", "Inflação", "Juros", "Câmbio", "Bolsa e RF", "Investimento", "Metodologia",
    ]);
    for (const aba of abas) {
      expect(aba.linhasCabecalho).toBe(1);
      expect(aba.linhas[0].length).toBeGreaterThan(0);
      expect(aba.linhas[0].every((c) => typeof c === "string" && c.length > 0)).toBe(true);
    }
  });

  it("formatos numéricos apontam para colunas que existem no cabeçalho", () => {
    for (const aba of montarAbas(dados())) {
      for (const { coluna } of aba.formatosNumero) expect(coluna).toBeLessThan(aba.linhas[0].length);
    }
  });

  it("abas mensais cobrem os 24 meses até o mês do relatório", () => {
    const abas = montarAbas(dados());
    for (const titulo of ["Inflação", "Juros", "Câmbio", "Bolsa e RF"]) {
      const aba = abas.find((a) => a.titulo === titulo)!;
      expect(aba.linhas).toHaveLength(25);
      expect(aba.linhas[1][0]).toBe("jan/2024");
      expect(aba.linhas[24][0]).toBe("dez/2025");
    }
  });

  it("aba Resumo traz observação do tipo de variação, status e os destaques", () => {
    const [l] = resumoDoMes([CATALOGO[0]], SERIES, MES, META);
    const resumo = montarAbas(dados({ resumo: [l, { ...l, tipoVariacao: "pct", status: null }], insights: [insight("a", "Título", "Texto")] }))[0];
    expect(resumo.linhas[1][9]).toBe("variação em p.p. · Dentro da meta");
    expect(resumo.linhas[2][9]).toBe("variação em %");
    expect(resumo.linhas).toContainEqual(["Título: Texto"]);
    expect(resumo.linhas).toContainEqual(["Relatório de indicadores — dez/2025"]);
  });

  it("aba Retornos converte frações em % e mantém nulos", () => {
    const celula = (janela: "mes" | "12m", retorno: number | null) => ({ janela, de: "", ate: "", retorno, anualizado: null });
    const retornos = [{ nome: "CDI", nominal: [celula("mes", 0.01), celula("12m", null)], real: [celula("mes", 0.005), celula("12m", null)] }];
    const aba = montarAbas(dados({ retornos }))[1];
    expect(aba.linhas[0]).toEqual(["Retorno nominal (%)", "No mês", "12m"]);
    expect(aba.linhas[1]).toEqual(["CDI", 1, null]);
    expect(aba.linhas[4][0]).toBe("CDI");
    expect(aba.linhas[4][1]).toBeCloseTo(0.5, 12);
  });

  it("aba Projeções sem curva avisa que não há curva", () => {
    const aba = montarAbas(dados())[2];
    expect(aba.linhas).toHaveLength(5);
    expect(aba.linhas).toContainEqual(["Sem curva de mercado disponível."]);
  });

  it("aba Projeções calcula a mudança da Selic contra o mês anterior só quando ambos existem", () => {
    const aba = montarAbas(dados({
      dataCurva: "2025-12-30",
      dataCurvaMesAnterior: "2025-11-28",
      horizontes: [horizonte({}), horizonte({ horizonte: "fim_ano", data: "2025-12-31" }), horizonte({ horizonte: "24m" })],
      horizontesMesAnterior: [horizonte({ selicNoHorizonte: 12.75 }), horizonte({ horizonte: "24m", selicNoHorizonte: null })],
    }))[2];
    expect(aba.linhas[1].slice(0, 2)).toEqual(["12 meses", "31/12/2026"]);
    expect(aba.linhas[1][9]).toBeCloseTo(-0.25, 12);
    expect(aba.linhas[2][0]).toBe("Fim deste ano");
    expect(aba.linhas[2][9]).toBeNull();
    expect(aba.linhas[3][9]).toBeNull();
    expect(aba.linhas).toContainEqual(["Curvas B3 de 30/12/2025"]);
    expect(aba.linhas).toContainEqual(["Comparação com a curva de 28/11/2025."]);
  });

  it("aba Inflação calcula 12 meses e a diferença IGP-M − IPCA", () => {
    const igpm = mensal("2024-01-01", repetir(0.5, 24));
    const aba = montarAbas(dados({ series: { ipca: SERIES.ipca, igpm } }))[3];
    const dez = aba.linhas[24];
    expect(dez[1]).toBe(0.33);
    expect(dez[2]).toBeCloseTo(compor(IPCA_2025), 10);
    expect(dez[5]).toBeCloseTo(compor(repetir(0.5, 12)) - compor(IPCA_2025), 10);
    // Jan/2024 não tem 12 meses de histórico.
    expect(aba.linhas[1][2]).toBeNull();
    expect(aba.linhas[1][5]).toBeNull();
  });

  it("aba Juros só mostra CDI 12m e juro real com histórico suficiente", () => {
    const aba = montarAbas(dados({ series: { cdi: CDI_2025, ipca: SERIES.ipca, selic_meta: SERIES.selic_meta } }))[4];
    const dez = aba.linhas[24];
    const jul = aba.linhas[19];
    expect(dez[1]).toBe(15);
    expect(dez[3]).toBeCloseTo(compor(CDI_2025.map(([, v]) => v)), 10);
    expect(dez[5]).not.toBeNull();
    // Até jul/2025 a série tem ~150 dias úteis: sem CDI 12m nem juro real, mas com CDI no mês.
    expect(jul[0]).toBe("jul/2025");
    expect(jul[2]).not.toBeNull();
    expect(jul[3]).toBeNull();
    expect(jul[5]).toBeNull();
  });

  it("aba Câmbio calcula a variação no mês contra o fechamento anterior", () => {
    const aba = montarAbas(dados({ series: { dolar_ptax: SERIES.dolar_ptax } }))[5];
    const dez = aba.linhas[24];
    expect(dez[1]).toBe(5);
    expect(dez[2]).toBe(5);
    expect(dez[3]).toBeCloseTo((5 / 5.5 - 1) * 100, 10);
    // Mês sem cotação fica vazio.
    expect(aba.linhas[1].slice(1)).toEqual([null, null, null]);
  });

  it("aba Investimento soma 12 meses de IDP só com 12 meses e lista os 8 últimos trimestres da FBCF", () => {
    const fbcf = trimestral("2023-01-01", Array.from({ length: 12 }, (_, i) => 100 + i));
    const aba = montarAbas(dados({ series: { idp: SERIES.idp.slice(1), fbcf } }))[7];
    expect(aba.linhas[24]).toEqual(["dez/2025", 24, 222]);
    expect(aba.linhas[12][2]).toBeNull(); // dez/2024: só 11 meses na série
    const trimestres = aba.linhas.slice(aba.linhas.findIndex((l) => l[0] === "Trimestre (início)") + 1);
    expect(trimestres).toHaveLength(8);
    expect(trimestres[0]).toEqual(["jan/2024", 104]);
    expect(trimestres[7]).toEqual(["out/2025", 111]);
  });
});

describe("e-mail do relatório", () => {
  const comuns = ["a", "b", "c", "d", "e", "f"].map((id) => insight(id));

  it("sem insights não há destaques", () => {
    expect(escolherDestaques([])).toEqual([]);
  });

  it("sem projeção devolve os primeiros até o máximo", () => {
    expect(escolherDestaques(comuns).map((i) => i.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("com menos insights que o máximo devolve todos", () => {
    expect(escolherDestaques(comuns.slice(0, 2)).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("garante um de projeção mesmo quando ele está fora dos primeiros", () => {
    const lista = [...comuns, insight("curva_mudou")];
    const ids = escolherDestaques(lista).map((i) => i.id);
    expect(ids).toEqual(["a", "b", "c", "d", "curva_mudou"]);
  });

  it("não duplica a projeção quando ela já está entre os primeiros", () => {
    const lista = [insight("copom_precificado"), ...comuns];
    const ids = escolherDestaques(lista).map((i) => i.id);
    expect(ids).toHaveLength(5);
    expect(ids.filter((id) => id === "copom_precificado")).toHaveLength(1);
  });

  it("respeita o máximo pedido", () => {
    expect(escolherDestaques([...comuns, insight("ipca_implicito")], 3).map((i) => i.id)).toEqual(["a", "b", "ipca_implicito"]);
  });

  it("assunto usa o mês por extenso", () => {
    expect(assuntoDoRelatorio("2025-03-01")).toBe("Relatório de indicadores — março/2025");
  });

  it("corpo escapa HTML de título, texto e URL", () => {
    const html = corpoDoRelatorio(MES, [insight("x", "<b>Título</b>", `Texto & "aspas" 'simples' <script>alert(1)</script>`)],
      `https://exemplo.com/?a=1&b="><img src=x onerror=alert(1)>`);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Título</b>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;b&gt;Título&lt;/b&gt;");
    expect(html).toContain("Texto &amp; &quot;aspas&quot; &#39;simples&#39;");
    expect(html).toContain('href="https://exemplo.com/?a=1&amp;b=&quot;&gt;&lt;img');
  });

  it("corpo sem destaques mostra aviso", () => {
    expect(corpoDoRelatorio(MES, [], "https://x")).toContain("<li>Sem destaques automáticos para o mês.</li>");
  });

  it("corpo mantém acentos e cita o mês por extenso", () => {
    const html = corpoDoRelatorio(MES, [insight("x", "Câmbio", "Ação")], "https://x");
    expect(html).toContain("dezembro/2025");
    expect(html).toContain("<strong>Câmbio:</strong> Ação");
  });
});
