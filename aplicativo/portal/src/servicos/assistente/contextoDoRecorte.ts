import "server-only";

import { montarContexto } from "@/dominio/assistente/contexto";
import { formatarNumero, formatarPct } from "@/dominio/formatacao";
import { retornoNoModo } from "@/dominio/retornos/retornos";
import { ultimoPonto } from "@/dominio/series";

import type { Analise } from "../indicadores/analise";

/** Texto de contexto do recorte filtrado, recalculado no servidor (nunca vem do cliente). */
export function contextoDoRecorte(a: Analise, modo: Parameters<typeof retornoNoModo>[3]): string {
  const retornos = a.janelas.map((linha) => {
    const retorno = retornoNoModo(a.indices[linha.codigo], a.de, a.ate, modo, a.refs);
    return {
      nome: linha.indicador.nomeCurto,
      ultimaData: linha.ultimaData,
      celulaJanela: { janela: "inicio" as const, de: a.de, ate: a.ate, retorno, anualizado: null },
      celulas: linha.celulas,
    };
  });
  const ultimosValores = a.base.catalogo
    .map((i) => {
      const ultimo = ultimoPonto((a.serie[i.codigo] ?? []).filter(([d]) => d <= a.ate));
      if (!ultimo) return null;
      const valor = i.unidade.startsWith("%") ? formatarPct(ultimo[1], i.casas) : `${formatarNumero(ultimo[1], i.casas)} ${i.unidade}`;
      return { nome: i.nome, valor: `${valor}${i.unidade.startsWith("%") ? ` (${i.unidade})` : ""}`, data: ultimo[0] };
    })
    .filter((v): v is { nome: string; valor: string; data: string } => v !== null);

  return montarContexto({
    de: a.de,
    ate: a.ate,
    modo,
    retornos,
    ultimosValores,
    insights: a.insights,
    dataCurva: a.projecoes?.entrada.dataBase ?? null,
    horizontes: a.projecoes?.horizontes ?? [],
  });
}
