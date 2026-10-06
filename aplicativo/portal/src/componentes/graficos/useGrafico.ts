"use client";

import { useCallback, useState } from "react";

import { echarts } from "./echarts";

export type InstanciaGrafico = ReturnType<typeof echarts.init>;

/**
 * Callback ref que cria a instância do ECharts no elemento, acompanha o
 * redimensionamento e descarta tudo quando o elemento sai da tela
 * (React 19: a função retornada pelo callback ref é a limpeza).
 */
export function useGrafico(): { ref: (elemento: HTMLDivElement | null) => (() => void) | undefined; grafico: InstanciaGrafico | null } {
  const [grafico, setGrafico] = useState<InstanciaGrafico | null>(null);

  const ref = useCallback((elemento: HTMLDivElement | null) => {
    if (!elemento) return undefined;
    const instancia = echarts.init(elemento, undefined, { renderer: "canvas" });
    setGrafico(instancia);
    const observador = new ResizeObserver(() => instancia.resize());
    observador.observe(elemento);
    return () => {
      observador.disconnect();
      instancia.dispose();
      setGrafico(null);
    };
  }, []);

  return { ref, grafico };
}
