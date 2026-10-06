// Filtros globais do Portal, lidos da URL e validados (também no servidor).

import { z } from "zod";

import { GRANULARIDADES, type Granularidade } from "./agregacao";
import { type DataISO, ehDataISO } from "./datas";
import { JANELAS, type JanelaPronta, inicioDaJanela } from "./retornos/janelas";
import { MODOS, type ModoRetorno } from "./retornos/retornos";

export const DATA_MINIMA: DataISO = "2000-01-01";

export interface Filtros {
  /** Data de referência (fim da janela). Null = último dia com dados. */
  referencia: DataISO | null;
  janela: JanelaPronta | "personalizada";
  /** Início quando a janela é personalizada. */
  de: DataISO | null;
  modo: ModoRetorno;
  granularidade: Granularidade;
  /** Indicadores selecionados no gráfico de retornos (vazio = padrão). */
  series: string[];
  projecoes: boolean;
}

const data = z.string().refine(ehDataISO).refine((d) => d >= DATA_MINIMA && d <= "2100-12-31");
const janelas: [string, ...string[]] = ["personalizada", ...JANELAS.map((j) => j.valor)];

const esquema = z.object({
  ref: data.optional().catch(undefined),
  janela: z.enum(janelas).optional().catch(undefined),
  de: data.optional().catch(undefined),
  modo: z.enum(MODOS.map((m) => m.valor) as [ModoRetorno, ...ModoRetorno[]]).optional().catch(undefined),
  gran: z.enum(GRANULARIDADES.map((g) => g.valor) as [Granularidade, ...Granularidade[]]).optional().catch(undefined),
  series: z.string().max(200).regex(/^[a-z0-9_,]*$/).optional().catch(undefined),
  proj: z.enum(["0", "1"]).optional().catch(undefined),
});

type Entrada = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Lê os filtros da URL. Valores inválidos viram o padrão (nunca lançam erro). */
export function lerFiltros(entrada: Entrada, padraoJanela: JanelaPronta = "12m"): Filtros {
  const bruto = Object.fromEntries(
    ["ref", "janela", "de", "modo", "gran", "series", "proj"].map((k) => [k, primeiro(entrada[k])]),
  );
  const p = esquema.parse(bruto);
  const janela = (p.janela ?? padraoJanela) as Filtros["janela"];
  return {
    referencia: p.ref ?? null,
    janela: janela === "personalizada" && !p.de ? padraoJanela : janela,
    de: p.de ?? null,
    modo: p.modo ?? "nominal",
    granularidade: p.gran ?? "mensal",
    series: p.series ? [...new Set(p.series.split(",").filter(Boolean))].slice(0, 12) : [],
    projecoes: p.proj === "1",
  };
}

/** Intervalo efetivo [de, ate] dos filtros, dada a última data disponível. */
export function intervalo(f: Filtros, ultimaDisponivel: DataISO, primeiraDisponivel = DATA_MINIMA) {
  const ate = f.referencia && f.referencia < ultimaDisponivel ? f.referencia : ultimaDisponivel;
  const de = f.janela === "personalizada" && f.de
    ? (f.de < ate ? f.de : ate)
    : inicioDaJanela(f.janela as JanelaPronta, ate, primeiraDisponivel);
  return { de: de < primeiraDisponivel ? primeiraDisponivel : de, ate };
}

/** Monta a query string dos filtros (só o que difere do padrão). */
export function paraQuery(f: Partial<Filtros>): string {
  const p = new URLSearchParams();
  if (f.referencia) p.set("ref", f.referencia);
  if (f.janela) p.set("janela", f.janela);
  if (f.janela === "personalizada" && f.de) p.set("de", f.de);
  if (f.modo && f.modo !== "nominal") p.set("modo", f.modo);
  if (f.granularidade && f.granularidade !== "mensal") p.set("gran", f.granularidade);
  if (f.series?.length) p.set("series", f.series.join(","));
  if (f.projecoes) p.set("proj", "1");
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}
