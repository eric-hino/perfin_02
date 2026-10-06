"use client";

import { useEffect } from "react";

import { EIXO_X, EIXO_Y, TEMA_PERFIN } from "./echarts";
import { type Formato, formatarEixo, formatarValor } from "./formatos";
import { useGrafico } from "./useGrafico";
import estilos from "./graficos.module.css";

export interface PropsGrafico {
  /** Opção do ECharts montada no servidor (só dados serializáveis). */
  opcao: Record<string, unknown>;
  formato: Formato;
  casas?: number;
  altura?: number;
  /** Descrição para leitores de tela. */
  descricao: string;
  /** Eixo X de datas (padrão) ou de categorias. */
  eixoTempo?: boolean;
}

function mesclarEixo(base: object, extra: unknown) {
  return Array.isArray(extra) ? extra.map((e) => ({ ...base, ...e })) : { ...base, ...(extra as object) };
}

/** Gráfico genérico com o tema Perfin e formatação pt-BR. */
export default function Grafico({ opcao, formato, casas = 2, altura = 320, descricao, eixoTempo = true }: PropsGrafico) {
  const { ref, grafico } = useGrafico();

  useEffect(() => {
    if (!grafico) return;
    const categoriaY = (opcao.yAxis as { type?: string } | undefined)?.type === "category";
    const eixoY = categoriaY
      ? { ...EIXO_Y, scale: false }
      : { ...EIXO_Y, axisLabel: { ...EIXO_Y.axisLabel, formatter: (v: number) => formatarEixo(v, formato) } };
    grafico.setOption(
      {
        ...TEMA_PERFIN,
        animation: false,
        tooltip: {
          ...TEMA_PERFIN.tooltip,
          trigger: "axis",
          valueFormatter: (v: unknown) => formatarValor(v, formato, casas),
        },
        ...opcao,
        xAxis: mesclarEixo({ ...EIXO_X, type: eixoTempo ? "time" : "category" }, opcao.xAxis ?? {}),
        yAxis: mesclarEixo(eixoY, opcao.yAxis ?? {}),
      },
      true,
    );
  }, [grafico, opcao, formato, casas, eixoTempo]);

  return <div ref={ref} className={estilos.grafico} style={{ height: altura }} role="img" aria-label={descricao} />;
}
