// Projeções implícitas nos preços de mercado, a partir das curvas de um dia (data-base).

import {
  type DataISO, diasCorridos, diasUteisEntre, fimDoMes, inicioDoMes, montar, partes, somarDias, somarMeses,
} from "../datas";
import { type Vertice, cupomLinear, curvaImplicita, curvaUtilizavel, fatorAcumulado, taxaATermo } from "./curva";

export interface EntradaProjecao {
  dataBase: DataISO;
  feriados: ReadonlySet<DataISO>;
  pre: readonly Vertice[];
  ipcaReal: readonly Vertice[];
  igpmReal: readonly Vertice[];
  cupomCambial: readonly Vertice[];
  /** PTAX mais recente até a data-base. */
  dolarSpot: number | null;
  /** Taxa indicativa do IMA-B (% a.a. real) mais recente. */
  yieldImab: number | null;
  /** Diferença média recente Selic meta − CDI anualizado, em p.p. */
  spreadSelicCdi: number;
  /** Datas das próximas reuniões do Copom (decisão vale a partir do dia seguinte). */
  reunioesCopom: readonly DataISO[];
}

export interface TaxaMensal {
  mes: DataISO;   // primeiro dia do mês
  taxa: number;   // % no mês
  /** O mês começou antes da data-base: a taxa cobre só o restante do mês. */
  parcial?: boolean;
}

export interface PontoProjetado {
  data: DataISO;
  valor: number;
}

export interface Projecoes {
  dataBase: DataISO;
  cdiMensal: TaxaMensal[];
  ipcaMensal: TaxaMensal[];
  igpmMensal: TaxaMensal[] | null;   // null quando a curva DI × IGP-M não é utilizável
  imabMensal: TaxaMensal[] | null;   // carrego, supondo taxa constante
  selicImplicita: PontoProjetado[];  // % a.a. por reunião (ou fim de mês)
  dolarFuturo: PontoProjetado[];     // R$/US$ no fim de cada mês
}

const MESES_PROJETADOS = 24;

function du(e: EntradaProjecao, ate: DataISO): number {
  return diasUteisEntre(e.dataBase, ate, e.feriados);
}

/** Fins de mês futuros a partir da data-base. */
export function finsDeMes(dataBase: DataISO, quantidade = MESES_PROJETADOS): DataISO[] {
  const datas: DataISO[] = [];
  let mes = inicioDoMes(dataBase);
  for (let i = 0; i <= quantidade; i += 1) {
    const fim = fimDoMes(mes);
    if (fim > dataBase) datas.push(fim);
    mes = somarMeses(mes, 1);
  }
  return datas.slice(0, quantidade);
}

/** Taxa de cada mês (só a parte do mês depois da data-base) dado um fator acumulado por du. */
function taxasMensais(e: EntradaProjecao, fator: (du: number) => number): TaxaMensal[] {
  return finsDeMes(e.dataBase).map((fim) => {
    const inicio = somarDias(inicioDoMes(fim), -1);
    const duIni = inicio > e.dataBase ? du(e, inicio) : 0;
    const duFim = du(e, fim);
    return { mes: inicioDoMes(fim), taxa: (fator(duFim) / fator(duIni) - 1) * 100, parcial: inicio < e.dataBase };
  });
}

function selicImplicita(e: EntradaProjecao): PontoProjetado[] {
  const futuras = e.reunioesCopom.filter((d) => d >= e.dataBase).sort();
  const marcos = futuras.length ? futuras : finsDeMes(e.dataBase, 18);
  return marcos.map((data, i) => {
    const inicio = du(e, somarDias(data, 1));
    const proxima = marcos[i + 1] ? du(e, marcos[i + 1]) : inicio + 21;
    const termo = taxaATermo(e.pre, inicio, Math.max(proxima, inicio + 1)) ?? 0;
    return { data, valor: termo + e.spreadSelicCdi };
  });
}

function dolarFuturo(e: EntradaProjecao): PontoProjetado[] {
  if (e.dolarSpot === null || !e.cupomCambial.length) return [];
  const spot = e.dolarSpot;
  return finsDeMes(e.dataBase).map((data) => {
    const dc = diasCorridos(e.dataBase, data);
    const cupom = cupomLinear(e.cupomCambial, dc) ?? 0;
    const valor = (spot * fatorAcumulado(e.pre, du(e, data))) / (1 + (cupom / 100) * (dc / 360));
    return { data, valor };
  });
}

export function projetar(e: EntradaProjecao): Projecoes {
  const pre = (d: number) => fatorAcumulado(e.pre, d);
  const implicitaIpca = curvaImplicita(e.pre, e.ipcaReal);
  const ipca = (d: number) => fatorAcumulado(implicitaIpca, d);
  const igpmOk = curvaUtilizavel(e.igpmReal);
  const implicitaIgpm = igpmOk ? curvaImplicita(e.pre, e.igpmReal) : [];
  const carrego = e.yieldImab === null ? null
    : (d: number) => Math.pow(1 + (e.yieldImab as number) / 100, d / 252) * ipca(d);

  return {
    dataBase: e.dataBase,
    cdiMensal: taxasMensais(e, pre),
    ipcaMensal: implicitaIpca.length ? taxasMensais(e, ipca) : [],
    igpmMensal: igpmOk ? taxasMensais(e, (d) => fatorAcumulado(implicitaIgpm, d)) : null,
    imabMensal: carrego && implicitaIpca.length ? taxasMensais(e, carrego) : null,
    selicImplicita: selicImplicita(e),
    dolarFuturo: dolarFuturo(e),
  };
}

// --- Horizontes -----------------------------------------------------------------

export type Horizonte = "3m" | "6m" | "12m" | "24m" | "fim_ano" | "fim_proximo_ano";

export const HORIZONTES: { valor: Horizonte; rotulo: string }[] = [
  { valor: "3m", rotulo: "3 meses" },
  { valor: "6m", rotulo: "6 meses" },
  { valor: "12m", rotulo: "12 meses" },
  { valor: "24m", rotulo: "24 meses" },
  { valor: "fim_ano", rotulo: "Fim deste ano" },
  { valor: "fim_proximo_ano", rotulo: "Fim do ano que vem" },
];

export function dataDoHorizonte(h: Horizonte, referencia: DataISO): DataISO {
  const { ano } = partes(referencia);
  if (h === "fim_ano") return montar(ano, 12, 31);
  if (h === "fim_proximo_ano") return montar(ano + 1, 12, 31);
  return somarMeses(referencia, Number(h.replace("m", "")));
}

export interface ValoresHorizonte {
  horizonte: Horizonte;
  data: DataISO;
  cdiAcumulado: number | null;      // % no período até o horizonte
  cdiAnual: number | null;          // % a.a. equivalente
  selicNoHorizonte: number | null;  // % a.a. (taxa a termo de 1 mês no horizonte + spread)
  ipcaAcumulado: number | null;     // % implícito até o horizonte
  igpmAcumulado: number | null;
  dolar: number | null;             // R$/US$ no horizonte
  imabCarrego: number | null;       // % acumulado do carrego até o horizonte
}

export function valoresNoHorizonte(e: EntradaProjecao, h: Horizonte, data: DataISO): ValoresHorizonte {
  const d = du(e, data);
  const valido = d > 0;
  const implicita = curvaImplicita(e.pre, e.ipcaReal);
  const fIpca = valido && implicita.length ? fatorAcumulado(implicita, d) : null;
  const fPre = valido ? fatorAcumulado(e.pre, d) : null;
  const igpm = curvaUtilizavel(e.igpmReal) && valido
    ? (fatorAcumulado(curvaImplicita(e.pre, e.igpmReal), d) - 1) * 100 : null;
  const dc = diasCorridos(e.dataBase, data);
  const cupom = cupomLinear(e.cupomCambial, dc);
  const termo = valido ? taxaATermo(e.pre, d, d + 21) : null;

  return {
    horizonte: h,
    data,
    cdiAcumulado: fPre === null ? null : (fPre - 1) * 100,
    cdiAnual: fPre === null ? null : (Math.pow(fPre, 252 / d) - 1) * 100,
    selicNoHorizonte: termo === null ? null : termo + e.spreadSelicCdi,
    ipcaAcumulado: fIpca === null ? null : (fIpca - 1) * 100,
    igpmAcumulado: igpm,
    dolar: e.dolarSpot !== null && fPre !== null && cupom !== null
      ? (e.dolarSpot * fPre) / (1 + (cupom / 100) * (dc / 360)) : null,
    imabCarrego: e.yieldImab !== null && fIpca !== null
      ? (Math.pow(1 + e.yieldImab / 100, d / 252) * fIpca - 1) * 100 : null,
  };
}

/** Valores em todos os horizontes; datas-alvo fixas permitem comparar curvas de dias diferentes. */
export function tabelaDeHorizontes(e: EntradaProjecao, referencia: DataISO): ValoresHorizonte[] {
  return HORIZONTES
    .map(({ valor }) => ({ valor, data: dataDoHorizonte(valor, referencia) }))
    .filter(({ data }) => data > e.dataBase)
    .map(({ valor, data }) => valoresNoHorizonte(e, valor, data));
}
