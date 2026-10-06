// Abas da Planilha Google do relatório do mês (dados puros; a gravação fica no serviço).

import { type DataISO, fimDoMes, formatarData, formatarMes, somarDias, somarMeses } from "../datas";
import type { LinhaResumo } from "./resumo";
import { acumuladoMeses, compor, juroReal } from "../inflacao";
import type { Insight } from "../insights/tipos";
import { HORIZONTES, type ValoresHorizonte } from "../projecoes/projecoes";
import { rotuloJanela } from "../retornos/janelas";
import type { CelulaJanela } from "../retornos/tabela";
import { type Ponto, pontosEntre, valorAsOf } from "../series";
import { resumoDoMes as resumoNivel } from "../estatisticas";
import { METODOLOGIA } from "./metodologia";

export type Celula = string | number | null;

export interface AbaPlanilha {
  titulo: string;
  linhasCabecalho: number;
  linhas: Celula[][];
  formatosNumero: { coluna: number; padrao: string }[];
}

export interface LinhaRetornos {
  nome: string;
  nominal: CelulaJanela[];
  real: CelulaJanela[];
}

export interface DadosRelatorio {
  mes: DataISO;                     // dia 1 do mês de referência
  geradoEm: string;                 // texto já formatado
  resumo: LinhaResumo[];
  insights: Insight[];
  retornos: LinhaRetornos[];
  dataCurva: DataISO | null;
  horizontes: ValoresHorizonte[];
  horizontesMesAnterior: ValoresHorizonte[] | null;
  dataCurvaMesAnterior: DataISO | null;
  series: Readonly<Record<string, readonly Ponto[]>>;
}

const PCT2 = "#,##0.00";
const PCT4 = "#,##0.0000";

const fracaoParaPct = (v: number | null) => (v === null ? null : v * 100);

function mesesDoRelatorio(mes: DataISO, quantidade = 24): DataISO[] {
  return Array.from({ length: quantidade }, (_, i) => somarMeses(mes, i - quantidade + 1));
}

function abaResumo(d: DadosRelatorio): AbaPlanilha {
  const linhas: Celula[][] = [
    ["Indicador", "Unidade", "Mês", "Mês anterior", "Variação", "No ano", "12 meses", "Mín. 12m", "Máx. 12m", "Observação"],
    ...d.resumo.map((l) => [
      l.indicador, l.unidade, l.mes, l.anterior, l.variacao, l.noAno, l.dozeMeses, l.minimo12m, l.maximo12m,
      [l.tipoVariacao === "pp" ? "variação em p.p." : "variação em %", l.status].filter(Boolean).join(" · "),
    ]),
    [],
    [`Relatório de indicadores — ${formatarMes(d.mes)}`],
    [`Gerado em ${d.geradoEm}. Fontes: BCB, IBGE, B3 e ANBIMA.`],
    [],
    ["Destaques do mês"],
    ...d.insights.map((i) => [`${i.titulo}: ${i.texto}`]),
  ];
  return { titulo: "Resumo", linhasCabecalho: 1, linhas, formatosNumero: [2, 3, 4, 5, 6, 7, 8].map((c) => ({ coluna: c, padrao: PCT4 })) };
}

function abaRetornos(d: DadosRelatorio): AbaPlanilha {
  const janelas = d.retornos[0]?.nominal.map((c) => rotuloJanela(c.janela)) ?? [];
  const bloco = (titulo: string, campo: "nominal" | "real"): Celula[][] => [
    [titulo, ...janelas],
    ...d.retornos.map((r) => [r.nome, ...r[campo].map((c) => fracaoParaPct(c.retorno))]),
  ];
  return {
    titulo: "Retornos",
    linhasCabecalho: 1,
    linhas: [...bloco("Retorno nominal (%)", "nominal"), [], ...bloco("Retorno real, descontado o IPCA (%)", "real")],
    formatosNumero: janelas.map((_, i) => ({ coluna: i + 1, padrao: PCT2 })),
  };
}

function abaProjecoes(d: DadosRelatorio): AbaPlanilha {
  const rotulo = (h: ValoresHorizonte) => HORIZONTES.find((x) => x.valor === h.horizonte)?.rotulo ?? h.horizonte;
  const antes = new Map((d.horizontesMesAnterior ?? []).map((h) => [h.horizonte, h]));
  const linhas: Celula[][] = [
    ["Horizonte", "Data", "CDI acumulado (%)", "CDI (% a.a.)", "Selic implícita (% a.a.)", "IPCA implícito (%)",
      "IGP-M implícito (%)", "Dólar (R$/US$)", "IMA-B carrego (%)", "Selic: mudança em 1 mês (p.p.)"],
    ...d.horizontes.map((h) => {
      const a = antes.get(h.horizonte);
      const mudanca = a?.selicNoHorizonte != null && h.selicNoHorizonte != null ? h.selicNoHorizonte - a.selicNoHorizonte : null;
      return [rotulo(h), formatarData(h.data), h.cdiAcumulado, h.cdiAnual, h.selicNoHorizonte, h.ipcaAcumulado,
        h.igpmAcumulado, h.dolar, h.imabCarrego, mudanca];
    }),
    [],
    [d.dataCurva ? `Curvas B3 de ${formatarData(d.dataCurva)}` : "Sem curva de mercado disponível."],
    [d.dataCurvaMesAnterior ? `Comparação com a curva de ${formatarData(d.dataCurvaMesAnterior)}.` : ""],
    ["Taxas de mercado embutem prêmios de risco; não são previsão nem recomendação."],
  ];
  return { titulo: "Projeções", linhasCabecalho: 1, linhas, formatosNumero: [2, 3, 4, 5, 6, 7, 8, 9].map((c) => ({ coluna: c, padrao: PCT4 })) };
}

function abaInflacao(d: DadosRelatorio): AbaPlanilha {
  const ipca = d.series.ipca ?? [];
  const igpm = d.series.igpm ?? [];
  const linhas: Celula[][] = [
    ["Mês", "IPCA (%)", "IPCA 12m (%)", "IGP-M (%)", "IGP-M 12m (%)", "IGP-M − IPCA 12m (p.p.)"],
    ...mesesDoRelatorio(d.mes).map((m) => {
      const a = acumuladoMeses(ipca, m, 12);
      const b = acumuladoMeses(igpm, m, 12);
      return [formatarMes(m), valorAsOf(pontosEntre(ipca, m, m), m), a, valorAsOf(pontosEntre(igpm, m, m), m), b,
        a === null || b === null ? null : b - a];
    }),
  ];
  return { titulo: "Inflação", linhasCabecalho: 1, linhas, formatosNumero: [1, 2, 3, 4, 5].map((c) => ({ coluna: c, padrao: PCT2 })) };
}

function abaJuros(d: DadosRelatorio): AbaPlanilha {
  const cdi = d.series.cdi ?? [];
  const linhas: Celula[][] = [
    ["Mês", "Selic meta no fim do mês (% a.a.)", "CDI no mês (%)", "CDI 12m (%)", "IPCA 12m (%)", "Juro real ex-post (%)"],
    ...mesesDoRelatorio(d.mes).map((m) => {
      const fim = fimDoMes(m);
      const doMes = pontosEntre(cdi, m, fim);
      const doze = pontosEntre(cdi, somarDias(somarMeses(fim, -12), 1), fim);
      const cdi12 = doze.length > 200 ? compor(doze.map(([, v]) => v)) : null;
      const ipca12 = acumuladoMeses(d.series.ipca ?? [], m, 12);
      return [formatarMes(m), valorAsOf(d.series.selic_meta ?? [], fim),
        doMes.length ? compor(doMes.map(([, v]) => v)) : null, cdi12, ipca12,
        cdi12 === null || ipca12 === null ? null : juroReal(cdi12, ipca12)];
    }),
  ];
  return { titulo: "Juros", linhasCabecalho: 1, linhas, formatosNumero: [1, 2, 3, 4, 5].map((c) => ({ coluna: c, padrao: PCT2 })) };
}

function abaNivel(d: DadosRelatorio, titulo: string, codigos: { codigo: string; nome: string }[]): AbaPlanilha {
  const cabecalho: Celula[] = ["Mês"];
  for (const { nome } of codigos) cabecalho.push(`${nome} fechamento`, `${nome} média`, `${nome} var. no mês (%)`);
  const linhas: Celula[][] = [cabecalho];
  for (const m of mesesDoRelatorio(d.mes)) {
    const linha: Celula[] = [formatarMes(m)];
    for (const { codigo } of codigos) {
      const pts = d.series[codigo] ?? [];
      const r = resumoNivel(pts, m, fimDoMes(m));
      const antes = valorAsOf(pts, somarDias(m, -1));
      linha.push(r?.fechamento ?? null, r?.media ?? null, r && antes ? (r.fechamento / antes - 1) * 100 : null);
    }
    linhas.push(linha);
  }
  return { titulo, linhasCabecalho: 1, linhas, formatosNumero: [] };
}

function abaInvestimento(d: DadosRelatorio): AbaPlanilha {
  const idp = d.series.idp ?? [];
  const linhas: Celula[][] = [
    ["Mês", "IDP no mês (US$ mi)", "IDP 12m (US$ mi)"],
    ...mesesDoRelatorio(d.mes).map((m) => {
      const ultimos = pontosEntre(idp, somarMeses(m, -11), m);
      return [formatarMes(m), valorAsOf(pontosEntre(idp, m, m), m),
        ultimos.length === 12 ? ultimos.reduce((s, [, v]) => s + v, 0) : null];
    }),
    [],
    ["Trimestre (início)", "FBCF (R$ mi correntes)"],
    ...(d.series.fbcf ?? []).slice(-8).map(([data, valor]) => [formatarMes(data), valor]),
  ];
  return { titulo: "Investimento", linhasCabecalho: 1, linhas, formatosNumero: [] };
}

export function montarAbas(d: DadosRelatorio): AbaPlanilha[] {
  return [
    abaResumo(d),
    abaRetornos(d),
    abaProjecoes(d),
    abaInflacao(d),
    abaJuros(d),
    abaNivel(d, "Câmbio", [{ codigo: "dolar_ptax", nome: "Dólar PTAX" }]),
    abaNivel(d, "Bolsa e RF", [{ codigo: "ibovespa", nome: "Ibovespa" }, { codigo: "imab", nome: "IMA-B" }]),
    abaInvestimento(d),
    { titulo: "Metodologia", linhasCabecalho: 1, linhas: METODOLOGIA.map((l) => [...l]), formatosNumero: [] },
  ];
}
