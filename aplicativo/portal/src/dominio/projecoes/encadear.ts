// Continua um índice realizado com taxas mensais projetadas (linha tracejada dos gráficos).

import { type DataISO, fimDoMes, inicioDoMes, somarDias, somarMeses } from "../datas";
import type { PontoProjetado, TaxaMensal } from "./projecoes";

/**
 * Parte do valor do índice na última data realizada e aplica as taxas mensais
 * projetadas até `meses` fins de mês à frente. Meses entre o último realizado
 * e o início da projeção (ex.: IPCA ainda não divulgado), e um primeiro mês
 * projetado só em parte, usam a primeira taxa de mês cheio da projeção.
 */
export function encadearProjecao(
  valorBase: number,
  ultimaRealizada: DataISO,
  taxas: readonly TaxaMensal[],
  meses = 24,
): PontoProjetado[] {
  if (!taxas.length) return [];
  const porMes = new Map(taxas.map((t) => [t.mes, t.taxa]));
  const primeiraCheia = (taxas.find((t) => !t.parcial) ?? taxas[taxas.length - 1]).taxa;
  const primeiro = taxas[0];
  // Há lacuna quando o realizado termina antes do fim do mês anterior ao início da projeção.
  const lacuna = ultimaRealizada < somarDias(primeiro.mes, -1);
  const pontos: PontoProjetado[] = [];
  let valor = valorBase;
  let mes = inicioDoMes(ultimaRealizada);
  // Se a última data realizada é o fim do mês, a projeção começa no mês seguinte.
  if (fimDoMes(ultimaRealizada) === ultimaRealizada) mes = somarMeses(mes, 1);

  for (let i = 0; i < meses; i += 1) {
    const usaCheia = lacuna && (mes < primeiro.mes || (mes === primeiro.mes && primeiro.parcial === true));
    const taxa = usaCheia ? primeiraCheia : porMes.get(mes) ?? null;
    if (taxa === null) break;
    valor *= 1 + taxa / 100;
    pontos.push({ data: fimDoMes(mes), valor });
    mes = somarMeses(mes, 1);
  }
  return pontos;
}
