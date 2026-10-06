// Juros: CDI em 12 meses e juro real ex-post mês a mês.

import { type DataISO, fimDoMes, somarDias, somarMeses } from "./datas";
import { acumuladoMeses, compor, juroReal } from "./inflacao";
import { type Ponto, pontosEntre } from "./series";

/** CDI acumulado nos 12 meses terminados em `fim` (%). Null sem dados suficientes. */
export function cdiDozeMeses(cdi: readonly Ponto[], fim: DataISO): number | null {
  const pts = pontosEntre(cdi, somarDias(somarMeses(fim, -12), 1), fim);
  return pts.length > 200 ? compor(pts.map(([, v]) => v)) : null;
}

/** Juro real ex-post (CDI 12m descontado o IPCA 12m) em cada mês com IPCA divulgado. */
export function serieJuroRealExPost(cdi: readonly Ponto[], ipca: readonly Ponto[], de: DataISO, ate: DataISO): Ponto[] {
  const saida: Ponto[] = [];
  for (const [mes] of ipca) {
    if (mes < de || mes > ate) continue;
    const ipca12 = acumuladoMeses(ipca, mes, 12);
    const cdi12 = cdiDozeMeses(cdi, fimDoMes(mes));
    if (ipca12 !== null && cdi12 !== null) saida.push([mes, juroReal(cdi12, ipca12)]);
  }
  return saida;
}
