import { describe, expect, it } from "vitest";

import { contexto, diaria, mensal, repetir, trimestral } from "@/testes/fabricas";

import { acumuladoMeses, ritmoTrimestralAnualizado } from "../inflacao";
import { cdiDozeMeses } from "../juros";
import type { Ponto } from "../series";
import { gerarInsights } from "./gerar";
import {
  aceleracaoInflacao, cdi12m, decisaoCopom, descolamentoIgpm, ipcaFrenteAMeta, juroRealExPost, recordeIpca,
} from "./regrasInflacao";
import {
  copomPrecificado, curvaMudou, dolarNoMes, ibovespaContraCdi, inflacaoImplicita, investimento, rankingJanela, yieldImab,
} from "./regrasMercado";
import type { ResumoMercado } from "./tipos";

const REF = "2025-12-31";
const ipcaConstante = (taxa: number, meses = 12, inicio = "2025-01-01") => mensal(inicio, repetir(taxa, meses));
/** CDI diário em dias úteis cobrindo os 12 meses até a referência. */
const cdiDiario = (taxa: number, de = "2024-12-01", ate = REF) => diaria(de, ate, taxa);

function mercado(parcial: Partial<ResumoMercado> = {}): ResumoMercado {
  return {
    dataCurva: "2025-12-30",
    selicAtual: 15,
    proximaReuniao: { data: "2026-01-28", selic: 14.75 },
    selicFimAno: 12.5,
    ipcaImplicito12m: 4,
    semanaAnterior: null,
    ...parcial,
  };
}

describe("insight 1: IPCA frente à meta", () => {
  it("retorna null sem dados de IPCA", () => {
    expect(ipcaFrenteAMeta(contexto())).toBeNull();
  });

  it("retorna null com menos de 12 meses", () => {
    expect(ipcaFrenteAMeta(contexto({ ipca: ipcaConstante(0.5, 11, "2025-02-01") }))).toBeNull();
  });

  it("retorna null quando a referência é anterior ao primeiro mês", () => {
    expect(ipcaFrenteAMeta(contexto({ ipca: ipcaConstante(0.5), referencia: "2024-12-31" }))).toBeNull();
  });

  it("acima do teto é alerta e não fala em 'há N meses' com uma só janela", () => {
    const insight = ipcaFrenteAMeta(contexto({ ipca: ipcaConstante(0.5) }))!;
    expect(insight.severidade).toBe("alerta");
    expect(insight.texto).toContain("acima do teto da meta (4,5%)");
    expect(insight.texto).not.toContain("há");
    expect(insight.valor).toBeCloseTo((1.005 ** 12 - 1) * 100, 10);
  });

  it("conta há quantos meses o status se mantém", () => {
    const insight = ipcaFrenteAMeta(contexto({ ipca: ipcaConstante(0.5, 14, "2024-11-01") }))!;
    expect(insight.texto).toMatch(/há 3 meses\.$/);
  });

  it("para a contagem quando o status muda", () => {
    // Três meses de 1% seguidos de 12 de 0,3%: só as duas últimas janelas ficam dentro da banda.
    const ipca = mensal("2024-10-01", [1, 1, 1, ...repetir(0.3, 12)]);
    const insight = ipcaFrenteAMeta(contexto({ ipca }))!;
    expect(insight.severidade).toBe("informativo");
    expect(insight.texto).toMatch(/há 2 meses\.$/);
  });

  it("dentro da banda é informativo e mostra piso e teto", () => {
    const insight = ipcaFrenteAMeta(contexto({ ipca: ipcaConstante(0.3) }))!;
    expect(insight.severidade).toBe("informativo");
    expect(insight.texto).toContain("dentro da banda da meta (1,5% a 4,5%)");
  });

  it("abaixo do piso é alerta", () => {
    const insight = ipcaFrenteAMeta(contexto({ ipca: ipcaConstante(0.05) }))!;
    expect(insight.severidade).toBe("alerta");
    expect(insight.texto).toContain("abaixo do piso da meta (1,5%)");
  });
});

describe("insight 2: aceleração da inflação", () => {
  const acelerando = mensal("2025-01-01", [...repetir(0.3, 9), ...repetir(0.8, 3)]);

  it("retorna null sem 12 meses", () => {
    expect(aceleracaoInflacao(contexto({ ipca: acelerando.slice(1) }))).toBeNull();
  });

  it("retorna null quando há buraco na série", () => {
    const comBuraco = acelerando.filter((_, i) => i !== 5);
    expect(aceleracaoInflacao(contexto({ ipca: comBuraco }))).toBeNull();
  });

  it("ritmo igual ao acumulado não gera insight", () => {
    expect(aceleracaoInflacao(contexto({ ipca: ipcaConstante(0.4) }))).toBeNull();
  });

  it("acelerando é atenção", () => {
    const insight = aceleracaoInflacao(contexto({ ipca: acelerando }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.titulo).toBe("Inflação acelerando");
    expect(insight.valor!).toBeGreaterThan(1);
  });

  it("desacelerando é informativo", () => {
    const ipca = mensal("2025-01-01", [...repetir(0.8, 9), ...repetir(0.3, 3)]);
    const insight = aceleracaoInflacao(contexto({ ipca }))!;
    expect(insight.severidade).toBe("informativo");
    expect(insight.titulo).toBe("Inflação desacelerando");
    expect(insight.valor!).toBeLessThan(-1);
  });

  it("dispara exatamente no limiar e não logo acima dele", () => {
    const diferenca = ritmoTrimestralAnualizado(acelerando, "2025-12-01")! - acumuladoMeses(acelerando, "2025-12-01", 12)!;
    const comLimiar = (aceleracao_pp: number) =>
      aceleracaoInflacao(contexto({ ipca: acelerando, limiares: { ...contexto().limiares, aceleracao_pp } }));
    expect(comLimiar(diferenca)).not.toBeNull();
    expect(comLimiar(diferenca * (1 + 1e-9))).toBeNull();
  });
});

describe("insight 3: IGP-M descolado do IPCA", () => {
  const ipca = ipcaConstante(0.3);

  it("IGP-M bem acima do IPCA gera atenção", () => {
    const insight = descolamentoIgpm(contexto({ ipca, igpm: ipcaConstante(0.6) }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.texto).toContain("acima do IPCA");
    expect(insight.valor!).toBeGreaterThan(3);
  });

  it("IGP-M bem abaixo do IPCA também gera insight", () => {
    const insight = descolamentoIgpm(contexto({ ipca, igpm: ipcaConstante(0) }))!;
    expect(insight.texto).toContain("abaixo do IPCA");
    expect(insight.valor!).toBeLessThan(-3);
  });

  it("spread pequeno não gera insight", () => {
    expect(descolamentoIgpm(contexto({ ipca, igpm: ipcaConstante(0.4) }))).toBeNull();
  });

  it("sem IGP-M retorna null", () => {
    expect(descolamentoIgpm(contexto({ ipca }))).toBeNull();
  });
});

describe("insight 4: juro real ex-post", () => {
  const ipca = ipcaConstante(0.3);

  it("juro real alto é política restritiva", () => {
    const insight = juroRealExPost(contexto({ ipca, cdi: cdiDiario(0.05) }))!;
    expect(insight.titulo).toBe("Juro real alto");
    expect(insight.texto).toContain("restritiva");
  });

  it("juro real baixo (inclusive negativo) é política expansionista", () => {
    const insight = juroRealExPost(contexto({ ipca, cdi: cdiDiario(0.01) }))!;
    expect(insight.titulo).toBe("Juro real baixo");
    expect(insight.valor!).toBeLessThan(0);
  });

  it("entre os limiares não gera insight", () => {
    expect(juroRealExPost(contexto({ ipca, cdi: cdiDiario(0.03) }))).toBeNull();
  });

  it("com menos de 200 dias de CDI retorna null", () => {
    expect(juroRealExPost(contexto({ ipca, cdi: cdiDiario(0.05, "2025-06-01") }))).toBeNull();
  });

  it("CDI 12m coincide com o cálculo do painel quando a data de 12 meses antes é dia útil", () => {
    const cdi = cdiDiario(0.04, "2024-01-01");
    expect(cdi12m(contexto({ cdi }))).toBeCloseTo(cdiDozeMeses(cdi, REF)!, 10);
  });

  // Corrigido (era bug): regrasInflacao.ts:87 descarta sempre o primeiro ponto da janela (.slice(1)), supondo
  // que ele cai exatamente 12 meses antes. Quando essa data é fim de semana/feriado, o primeiro
  // ponto já pertence à janela e um dia de CDI é perdido; o insight diverge do cartão do painel.
  it("CDI 12m não perde um dia quando a data de 12 meses antes cai em fim de semana", () => {
    const cdi = cdiDiario(0.04, "2024-01-01", "2025-03-31"); // 31/03/2024 foi domingo
    const c = contexto({ cdi, referencia: "2025-03-31" });
    expect(cdi12m(c)).toBeCloseTo(cdiDozeMeses(cdi, "2025-03-31")!, 10);
  });
});

describe("insight 5: decisão do Copom", () => {
  const ref = "2025-09-30";

  it("detecta corte no mês", () => {
    const insight = decisaoCopom(contexto({ referencia: ref, selicMeta: [["2025-06-19", 15], ["2025-09-18", 14.5]] }))!;
    expect(insight.texto).toBe("Copom cortou a Selic em 0,50 p.p., para 14,50%.");
    expect(insight.valor).toBe(14.5);
  });

  it("detecta alta no mês", () => {
    const insight = decisaoCopom(contexto({ referencia: ref, selicMeta: [["2025-06-19", 14.5], ["2025-09-18", 15]] }))!;
    expect(insight.texto).toContain("elevou");
  });

  it("sem ponto no mês retorna null", () => {
    expect(decisaoCopom(contexto({ referencia: ref, selicMeta: [["2025-06-19", 15]] }))).toBeNull();
  });

  it("manutenção (mesmo valor ou diferença ínfima) retorna null", () => {
    expect(decisaoCopom(contexto({ referencia: ref, selicMeta: [["2025-06-19", 15], ["2025-09-18", 15]] }))).toBeNull();
    expect(decisaoCopom(contexto({ referencia: ref, selicMeta: [["2025-06-19", 15], ["2025-09-18", 15.005]] }))).toBeNull();
  });

  it("sem valor anterior ao mês retorna null", () => {
    expect(decisaoCopom(contexto({ referencia: ref, selicMeta: [["2025-09-18", 15]] }))).toBeNull();
  });
});

describe("insight 14: recorde do IPCA", () => {
  it("menos de 25 meses retorna null", () => {
    expect(recordeIpca(contexto({ ipca: mensal("2024-01-01", [...repetir(0.3, 23), 0.9]) }))).toBeNull();
  });

  it("maior que todos os 24 anteriores cita o início da série", () => {
    const ipca = mensal("2023-01-01", [...repetir(0.3, 24), 0.9]);
    const insight = recordeIpca(contexto({ ipca, referencia: "2025-01-31" }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.texto).toContain("o maior desde o início da série");
  });

  it("cita o mês do último valor maior", () => {
    const ipca = mensal("2023-01-01", [1, ...repetir(0.3, 25), 0.9]);
    const insight = recordeIpca(contexto({ ipca, referencia: "2025-03-31" }))!;
    expect(insight.texto).toContain("o maior desde jan/2023");
  });

  it("valor maior há menos de 24 meses impede o recorde", () => {
    const ipca = mensal("2023-01-01", [0.3, 1, ...repetir(0.3, 23), 0.9]);
    expect(recordeIpca(contexto({ ipca, referencia: "2025-02-28" }))).toBeNull();
  });
});

describe("insight 6: Copom precificado", () => {
  it("sem mercado, sem Selic atual ou sem próxima reunião retorna null", () => {
    expect(copomPrecificado(contexto())).toBeNull();
    expect(copomPrecificado(contexto({ mercado: mercado({ selicAtual: null }) }))).toBeNull();
    expect(copomPrecificado(contexto({ mercado: mercado({ proximaReuniao: null }) }))).toBeNull();
  });

  it("descreve corte e Selic no fim do ano", () => {
    const insight = copomPrecificado(contexto({ mercado: mercado() }))!;
    expect(insight.texto).toBe(
      "Mercado precifica corte de 0,25 p.p. na reunião de 28/01/2026; Selic implícita de 12,50% no fim do ano " +
        "(curva de 30/12/2025).",
    );
  });

  it("mudança abaixo de meio passo é manutenção", () => {
    const insight = copomPrecificado(contexto({ mercado: mercado({ proximaReuniao: { data: "2026-01-28", selic: 15.1 } }) }))!;
    expect(insight.texto).toContain("manutenção da Selic");
  });

  it("arredonda a alta para passos de 0,25 e omite o fim do ano quando não há valor", () => {
    const insight = copomPrecificado(contexto({
      mercado: mercado({ proximaReuniao: { data: "2026-01-28", selic: 15.52 }, selicFimAno: null }),
    }))!;
    expect(insight.texto).toContain("alta de 0,50 p.p.");
    expect(insight.texto).not.toContain("Selic implícita");
  });

  // BUG (baixa severidade): regrasMercado.ts:16 usa Math.round, que arredonda -0,5 para 0 e
  // +0,5 para 1. Uma alta precificada de 0,125 p.p. vira "alta de 0,25", mas um corte de
  // 0,125 p.p. vira "manutenção": a leitura não é simétrica.
  it("arredondamento do passo é simétrico para alta e corte", () => {
    const leitura = (selic: number) =>
      copomPrecificado(contexto({ mercado: mercado({ proximaReuniao: { data: "2026-01-28", selic } }) }))!.texto;
    expect(leitura(14.875).includes("manutenção")).toBe(leitura(15.125).includes("manutenção"));
  });
});

describe("insight 7: a curva mudou", () => {
  const antes = { dataCurva: "2025-12-23", selicFimAno: 12.25, ipcaImplicito12m: 4 };

  it("sem semana anterior retorna null", () => {
    expect(curvaMudou(contexto({ mercado: mercado() }))).toBeNull();
  });

  it("mudança exatamente no limiar dispara", () => {
    const insight = curvaMudou(contexto({ mercado: mercado({ semanaAnterior: antes, ipcaImplicito12m: 4.1 }) }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.valor).toBeCloseTo(0.25, 12);
    expect(insight.texto).toContain("Selic implícita no fim do ano +0,25 p.p. (para 12,50%)");
    expect(insight.texto).not.toContain("IPCA implícito");
  });

  it("mudança abaixo do limiar não dispara", () => {
    expect(curvaMudou(contexto({ mercado: mercado({ semanaAnterior: antes, selicFimAno: 12.49 }) }))).toBeNull();
  });

  it("valor é a maior mudança absoluta entre as duas medidas", () => {
    const insight = curvaMudou(contexto({ mercado: mercado({ semanaAnterior: antes, ipcaImplicito12m: 3.4 }) }))!;
    expect(insight.valor).toBeCloseTo(0.6, 12);
    expect(insight.texto).toContain("IPCA implícito em 12 meses");
  });

  it("ignora medidas nulas", () => {
    const m = mercado({ selicFimAno: null, ipcaImplicito12m: null, semanaAnterior: antes });
    expect(curvaMudou(contexto({ mercado: m }))).toBeNull();
  });
});

describe("insight 8: inflação implícita", () => {
  const comIpca = (ipcaImplicito12m: number | null) => contexto({ mercado: mercado({ ipcaImplicito12m }) });

  it("nos limites da banda não dispara", () => {
    expect(inflacaoImplicita(comIpca(4.5))).toBeNull();
    expect(inflacaoImplicita(comIpca(1.5))).toBeNull();
  });

  it("acima do teto e abaixo do piso disparam com atenção", () => {
    expect(inflacaoImplicita(comIpca(4.51))!.texto).toContain("acima do teto (4,5%)");
    expect(inflacaoImplicita(comIpca(1.49))!.texto).toContain("abaixo do piso (1,5%)");
    expect(inflacaoImplicita(comIpca(1.49))!.severidade).toBe("atencao");
  });

  it("sem mercado ou sem valor retorna null", () => {
    expect(inflacaoImplicita(contexto())).toBeNull();
    expect(inflacaoImplicita(comIpca(null))).toBeNull();
  });
});

describe("insight 9: yield do IMA-B", () => {
  const serie = (fn: (i: number) => number, ultimo: number): Ponto[] =>
    diaria("2024-12-01", REF, (i, d) => (d === REF ? ultimo : fn(i)));

  it("sem dados retorna null", () => {
    expect(yieldImab(contexto())).toBeNull();
  });

  it("máxima de 12 meses abaixo do limiar alto é informativo", () => {
    const insight = yieldImab(contexto({ imabYield: serie(() => 5, 5.5) }))!;
    expect(insight.severidade).toBe("informativo");
    expect(insight.texto).toBe("IMA-B pagando IPCA + 5,50%, a maior taxa em 12 meses.");
  });

  it("mínima de 12 meses também gera insight", () => {
    expect(yieldImab(contexto({ imabYield: serie(() => 5, 4.5) }))!.texto).toContain("a menor taxa em 12 meses");
  });

  it("no meio do intervalo e abaixo do limiar não gera insight", () => {
    expect(yieldImab(contexto({ imabYield: serie((i) => (i % 2 ? 5.5 : 4), 5) }))).toBeNull();
  });

  it("acima do limiar sem extremo é atenção sem detalhe", () => {
    const insight = yieldImab(contexto({ imabYield: serie((i) => (i % 2 ? 7 : 6), 6.5) }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.texto).toBe("IMA-B pagando IPCA + 6,50%.");
  });

  it("exatamente no limiar alto é atenção", () => {
    expect(yieldImab(contexto({ imabYield: serie((i) => (i % 2 ? 7 : 5), 6) }))!.severidade).toBe("atencao");
  });

  it("com menos de 20 pontos não avalia extremo", () => {
    const poucos = diaria("2025-12-15", REF, (i) => 5 + i * 0.01);
    expect(yieldImab(contexto({ imabYield: poucos }))).toBeNull();
  });
});

describe("insight 10: Ibovespa contra o CDI", () => {
  const cdi = cdiDiario(0.03);

  it("sem CDI suficiente retorna null", () => {
    expect(ibovespaContraCdi(contexto({ ibovespa: diaria("2024-12-01", REF, 100) }))).toBeNull();
  });

  it("sem Ibovespa 12 meses antes retorna null", () => {
    expect(ibovespaContraCdi(contexto({ cdi, ibovespa: diaria("2025-06-01", REF, 100) }))).toBeNull();
  });

  it("Ibovespa parado perde para o CDI", () => {
    const insight = ibovespaContraCdi(contexto({ cdi, ibovespa: diaria("2024-12-01", REF, 100) }))!;
    expect(insight.titulo).toBe("Ibovespa perdeu para o CDI");
    expect(insight.severidade).toBe("informativo");
    expect(insight.valor!).toBeLessThan(0);
  });

  it("queda desde o pico acima do limiar vira atenção", () => {
    const pontos = diaria("2024-12-01", REF, (i) => 100 + i * 0.2);
    const ibovespa: Ponto[] = [...pontos.slice(0, -1), [REF, pontos[pontos.length - 2][1] * 0.8]];
    const insight = ibovespaContraCdi(contexto({ cdi, ibovespa }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.texto).toContain("20,00% abaixo do pico de 12 meses");
  });
});

describe("insight 11: dólar no mês", () => {
  // Oscila entre dois valores e fecha o mês anterior e o atual no meio do intervalo.
  const oscilante = (baixo: number, alto: number, fim: number, fimAnterior = (baixo + alto) / 2): Ponto[] =>
    diaria("2024-12-01", REF, (i, d) => (d === REF ? fim : d === "2025-11-28" ? fimAnterior : i % 2 ? alto : baixo));

  it("sem dados retorna null", () => {
    expect(dolarNoMes(contexto())).toBeNull();
  });

  it("variação pequena, sem extremo e sem volatilidade alta não gera insight", () => {
    expect(dolarNoMes(contexto({ dolar: oscilante(5, 5.2, 5.1) }))).toBeNull();
  });

  it("variação no limiar é atenção", () => {
    const insight = dolarNoMes(contexto({ dolar: oscilante(4, 6, 5.25, 5) }))!;
    expect(insight.severidade).toBe("atencao");
    expect(insight.texto).toContain("+5,0% no mês");
  });

  it("variação abaixo do limiar sem extremo não gera insight", () => {
    expect(dolarNoMes(contexto({ dolar: oscilante(4, 6, 5.24, 5) }))).toBeNull();
  });

  it("máxima de 12 meses aparece no texto", () => {
    const insight = dolarNoMes(contexto({ dolar: oscilante(5, 5.2, 5.406, 5.1) }))!;
    expect(insight.texto).toContain("maior cotação em 12 meses");
  });
});

describe("insight 12: investimento", () => {
  const ref = "2025-12-31";

  it("IDP 12m em queda por 3 meses é atenção", () => {
    const idp = mensal("2024-09-01", Array.from({ length: 16 }, (_, k) => 100 - k));
    const insight = investimento(contexto({ referencia: ref, idp }))!;
    expect(insight.id).toBe("idp_queda");
    expect(insight.severidade).toBe("atencao");
    expect(insight.valor).toBe(1086);
  });

  it("queda em só 2 meses cai para a FBCF (e sem FBCF retorna null)", () => {
    const valores = repetir(100, 16);
    valores[14] = 50;
    valores[15] = 50;
    expect(investimento(contexto({ referencia: ref, idp: mensal("2024-09-01", valores) }))).toBeNull();
  });

  it("FBCF real contra o mesmo trimestre do ano anterior", () => {
    const fbcf = trimestral("2024-10-01", [100, 100, 100, 100, 110]);
    const insight = investimento(contexto({ referencia: ref, fbcf, ipca: ipcaConstante(0.5) }))!;
    expect(insight.id).toBe("fbcf");
    expect(insight.valor).toBeCloseTo((1.1 / 1.005 ** 12 - 1) * 100, 10);
    expect(insight.titulo).toBe("Investimento (FBCF) em alta");
  });

  it("FBCF com menos de 5 trimestres retorna null", () => {
    expect(investimento(contexto({ referencia: ref, fbcf: trimestral("2025-01-01", [100, 100, 100, 110]) }))).toBeNull();
  });

  // Corrigido (era bug): regrasMercado.ts:177-178 compõe o IPCA que existir na janela; sem IPCA, compor([]) = 0
  // e a variação nominal é apresentada como "real". dominio/investimento.ts (variacaoAnualFbcf)
  // devolve real = null quando faltam meses de IPCA; o insight deveria seguir a mesma regra.
  it("FBCF sem os 12 meses de IPCA não apresenta a variação nominal como real", () => {
    const fbcf = trimestral("2024-10-01", [100, 100, 100, 100, 110]);
    expect(investimento(contexto({ referencia: ref, fbcf, ipca: [] }))).toBeNull();
  });
});

describe("insight 13: ranking da janela", () => {
  it("sem ranking ou com menos de 3 itens finitos retorna null", () => {
    expect(rankingJanela(contexto())).toBeNull();
    const itens = [{ nome: "A", retorno: 0.1 }, { nome: "B", retorno: Number.NaN }, { nome: "C", retorno: 0.02 }];
    expect(rankingJanela(contexto({ ranking: { rotuloJanela: "12m", itens } }))).toBeNull();
  });

  it("aponta o líder e o último", () => {
    const itens = [{ nome: "CDI", retorno: 0.02 }, { nome: "Ibovespa", retorno: 0.1 }, { nome: "Dólar", retorno: -0.05 }];
    const insight = rankingJanela(contexto({ ranking: { rotuloJanela: "12m", itens } }))!;
    expect(insight.titulo).toBe("Ranking em 12m");
    expect(insight.texto).toMatch(/^Em 12m: Ibovespa .* lidera; Dólar .* fica em último\.$/);
    expect(insight.valor).toBe(0.1);
  });
});

describe("gerarInsights", () => {
  it("contexto vazio não gera insights nem quebra", () => {
    expect(gerarInsights(contexto())).toEqual([]);
  });

  it("um único ponto em cada série não quebra nenhuma regra", () => {
    const um: Ponto[] = [["2025-12-01", 1]];
    const c = contexto({
      ipca: um, igpm: um, cdi: um, selicMeta: um, dolar: um, ibovespa: um, imabYield: um, idp: um, fbcf: um,
      mercado: mercado({ selicAtual: null, proximaReuniao: null, selicFimAno: null, ipcaImplicito12m: null }),
      ranking: { rotuloJanela: "12m", itens: [] },
    });
    expect(() => gerarInsights(c)).not.toThrow();
  });

  it("ordena por severidade e, no empate, pela ordem das regras", () => {
    const itens = [{ nome: "A", retorno: 0.1 }, { nome: "B", retorno: 0 }, { nome: "C", retorno: -0.1 }];
    const insights = gerarInsights(contexto({
      ipca: ipcaConstante(0.5),               // 1: alerta
      igpm: ipcaConstante(1),                 // 3: atenção
      mercado: mercado({ ipcaImplicito12m: 6 }), // 6: informativo; 8: atenção
      ranking: { rotuloJanela: "12m", itens }, // 13: informativo
    }));
    expect(insights.map((i) => i.id)).toEqual(["ipca_meta", "igpm_ipca", "ipca_implicito", "copom_precificado", "ranking"]);
  });
});
