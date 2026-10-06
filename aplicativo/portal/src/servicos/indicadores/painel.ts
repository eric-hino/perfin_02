import "server-only";

import { type DataISO, hojeEmSaoPaulo, somarDias, somarMeses } from "@/dominio/datas";
import type { ResumoMercado } from "@/dominio/insights/tipos";
import {
  type EntradaProjecao, type Projecoes, type ValoresHorizonte, projetar, tabelaDeHorizontes, valoresNoHorizonte,
} from "@/dominio/projecoes/projecoes";
import type { Vertice } from "@/dominio/projecoes/curva";
import { type Indicador, type Ponto, ultimoPonto, valorAsOf } from "@/dominio/series";
import { taxaDiariaParaAnual } from "@/dominio/estatisticas";

import { type CurvasDoDia, catalogo, curvasDoDia, feriados, parametros, series } from "./repositorio";

export interface Base {
  catalogo: Indicador[];
  feriados: DataISO[];
  /** Última data com CDI (referência padrão: último dia útil com dados). */
  ultimaData: DataISO;
}

export async function carregarBase(): Promise<Base> {
  const [cat, fer, cdiRecente] = await Promise.all([
    catalogo(), feriados(), series(["cdi"], somarDias(hoje(), -40), hoje()),
  ]);
  const ultimo = ultimoPonto(cdiRecente.cdi ?? []);
  return { catalogo: cat, feriados: fer, ultimaData: ultimo ? ultimo[0] : hoje() };
}

export function hoje(): DataISO {
  return hojeEmSaoPaulo();
}

// --- Projeções ---------------------------------------------------------------------

export interface PacoteProjecoes {
  entrada: EntradaProjecao;
  projecoes: Projecoes;
  horizontes: ValoresHorizonte[];
  semanaAnterior: { dataBase: DataISO; horizontes: ValoresHorizonte[] } | null;
  mesAnterior: { dataBase: DataISO; horizontes: ValoresHorizonte[] } | null;
  /** Curva DI × Pré de hoje, de ~1 semana e de ~1 mês atrás (painel de Juros). */
  curvasPre: { rotulo: string; dataBase: DataISO; vertices: Vertice[] }[];
}

function spreadSelicCdi(cdi: readonly Ponto[], selicMeta: readonly Ponto[]): number {
  const recentes = cdi.slice(-21);
  if (!recentes.length) return 0.1;
  const diferencas = recentes
    .map(([d, taxa]) => {
      const meta = valorAsOf(selicMeta, d);
      return meta === null ? null : meta - taxaDiariaParaAnual(taxa);
    })
    .filter((v): v is number => v !== null);
  return diferencas.length ? diferencas.reduce((s, v) => s + v, 0) / diferencas.length : 0.1;
}

function entradaDoDia(
  curvas: CurvasDoDia, base: Base, mercado: Record<string, Ponto[]>, reunioes: DataISO[],
): EntradaProjecao {
  const d = curvas.dataBase;
  const ate = (pontos: Ponto[] | undefined) => (pontos ?? []).filter(([data]) => data <= d);
  return {
    dataBase: d,
    feriados: new Set(base.feriados),
    pre: curvas.curvas.pre?.vertices ?? [],
    ipcaReal: curvas.curvas.ipca_real?.vertices ?? [],
    igpmReal: curvas.curvas.igpm_real?.vertices ?? [],
    cupomCambial: curvas.curvas.cupom_cambial?.vertices ?? [],
    dolarSpot: valorAsOf(mercado.dolar_ptax ?? [], d),
    yieldImab: valorAsOf(mercado.imab_yield ?? [], d),
    spreadSelicCdi: spreadSelicCdi(ate(mercado.cdi), mercado.selic_meta ?? []),
    reunioesCopom: reunioes,
  };
}

/** Projeções da curva mais recente até `referencia` e comparação com 1 semana e 1 mês antes. */
export async function carregarProjecoes(base: Base, referencia: DataISO): Promise<PacoteProjecoes | null> {
  const [atual, semana, mes, param, mercado] = await Promise.all([
    curvasDoDia(referencia),
    curvasDoDia(somarDias(referencia, -7)),
    curvasDoDia(somarMeses(referencia, -1)),
    parametros(),
    series(["dolar_ptax", "imab_yield", "cdi", "selic_meta"], somarMeses(referencia, -2), referencia),
  ]);
  if (!atual?.curvas.pre) return null;
  const entrada = entradaDoDia(atual, base, mercado, param.reunioesCopom);
  const comparar = (c: CurvasDoDia | null) => {
    if (!c?.curvas.pre || c.dataBase === atual.dataBase) return null;
    const e = entradaDoDia(c, base, mercado, param.reunioesCopom);
    // Mesmas datas-alvo da curva atual, para comparar o que mudou.
    const horizontes = tabelaDeHorizontes(entrada, atual.dataBase)
      .map((h) => valoresNoHorizonte(e, h.horizonte, h.data));
    return { dataBase: c.dataBase, horizontes };
  };
  return {
    entrada,
    projecoes: projetar(entrada),
    horizontes: tabelaDeHorizontes(entrada, atual.dataBase),
    semanaAnterior: comparar(semana),
    mesAnterior: comparar(mes),
    curvasPre: [
      { rotulo: "Hoje", curvas: atual },
      { rotulo: "1 semana antes", curvas: semana },
      { rotulo: "1 mês antes", curvas: mes },
    ].flatMap(({ rotulo, curvas }) =>
      curvas?.curvas.pre ? [{ rotulo, dataBase: curvas.dataBase, vertices: [...curvas.curvas.pre.vertices] }] : []),
  };
}

/** Resumo do mercado precificado, usado pelos insights e pelo assistente. */
export function resumoMercado(pacote: PacoteProjecoes | null, selicMeta: readonly Ponto[]): ResumoMercado | null {
  if (!pacote) return null;
  const { entrada, projecoes, horizontes, semanaAnterior } = pacote;
  const fimAno = horizontes.find((h) => h.horizonte === "fim_ano") ?? horizontes.find((h) => h.horizonte === "12m");
  const doze = horizontes.find((h) => h.horizonte === "12m");
  const fimAnoAntes = semanaAnterior?.horizontes.find((h) => h.horizonte === fimAno?.horizonte);
  const dozeAntes = semanaAnterior?.horizontes.find((h) => h.horizonte === "12m");
  const temReunioes = entrada.reunioesCopom.some((d) => d >= entrada.dataBase);
  const proxima = temReunioes ? projecoes.selicImplicita[0] : null;
  return {
    dataCurva: entrada.dataBase,
    selicAtual: valorAsOf(selicMeta, entrada.dataBase),
    proximaReuniao: proxima ? { data: proxima.data, selic: proxima.valor } : null,
    selicFimAno: fimAno?.selicNoHorizonte ?? null,
    ipcaImplicito12m: doze?.ipcaAcumulado ?? null,
    semanaAnterior: semanaAnterior
      ? {
        dataCurva: semanaAnterior.dataBase,
        selicFimAno: fimAnoAntes?.selicNoHorizonte ?? null,
        ipcaImplicito12m: dozeAntes?.ipcaAcumulado ?? null,
      }
      : null,
  };
}
