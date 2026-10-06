// Câmbio: fechamento mensal e dólar real.

import { agregar, fimDoPeriodo } from "./agregacao";
import type { DataISO } from "./datas";
import { deflacionar } from "./inflacao";
import type { IndiceAcumulado } from "./retornos/indice";
import type { Ponto } from "./series";

/** Fechamento de cada mês, datado no fim do mês (ou na data final, se o mês estiver em curso). */
export function fechamentoMensal(dolar: readonly Ponto[], de: DataISO, ate: DataISO): Ponto[] {
  return agregar(dolar, "fechamento", "mensal", de, ate).map((p) => {
    const fim = fimDoPeriodo(p.periodo, "mensal");
    return [fim < ate ? fim : ate, p.valor] as const;
  });
}

/**
 * Dólar real: fechamento mensal deflacionado pelo IPCA na mesma data, a preços do
 * último mês com IPCA divulgado. Meses depois do último IPCA ficam de fora.
 */
export function dolarRealMensal(dolar: readonly Ponto[], ipca: IndiceAcumulado, de: DataISO, ate: DataISO): Ponto[] {
  const base = ipca.ultimaData < ate ? ipca.ultimaData : ate;
  return deflacionar(fechamentoMensal(dolar, de, ate), (d) => ipca.valorEm(d), base);
}
