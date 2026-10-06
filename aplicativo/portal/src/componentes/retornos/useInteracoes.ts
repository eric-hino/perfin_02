"use client";

import { useEffect, useRef } from "react";

import { deMs } from "@/dominio/datas";

import type { InstanciaGrafico } from "../graficos/useGrafico";
import { ALTURA_NAVEGADOR, MARGEM_INFERIOR } from "./opcaoRetornos";
import type { Janela } from "./tipos";

interface Arrasto {
  tipo: "eixo" | "selecao";
  x0: number;
  t0: number;
  msPorPixel: number;
  janela0: { inicio: number; fim: number };
}

interface Callbacks {
  aoMudarJanela: (janela: Janela) => void;
  aoSelecionar: (selecao: Janela | null, final: boolean) => void;
}

const MOVIMENTO_MINIMO_PX = 4;

function janelaAtual(grafico: InstanciaGrafico): { inicio: number; fim: number } {
  const zoom = (grafico.getOption() as { dataZoom?: { startValue?: number; endValue?: number }[] }).dataZoom?.[0];
  return { inicio: Number(zoom?.startValue ?? 0), fim: Number(zoom?.endValue ?? 0) };
}

function tempoNoPixel(grafico: InstanciaGrafico, x: number, y: number): number {
  const valor = grafico.convertFromPixel({ xAxisIndex: 0 }, [x, y]) as number | number[];
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Interações do gráfico de retornos:
 * - arrastar a faixa do eixo X desloca a janela (o navegador abaixo também);
 * - clicar e arrastar dentro do gráfico seleciona um período;
 * - o zoom (roda do mouse e alças do navegador) chega pelo evento "datazoom".
 */
export function useInteracoes(grafico: InstanciaGrafico | null, { aoMudarJanela, aoSelecionar }: Callbacks) {
  const callbacks = useRef({ aoMudarJanela, aoSelecionar });
  useEffect(() => {
    callbacks.current = { aoMudarJanela, aoSelecionar };
  }, [aoMudarJanela, aoSelecionar]);

  useEffect(() => {
    if (!grafico) return;
    const zr = grafico.getZr();
    let arrasto: Arrasto | null = null;

    const aoPressionar = (e: { offsetX: number; offsetY: number }) => {
      const altura = grafico.getHeight();
      const naFaixaDoEixo = e.offsetY >= altura - MARGEM_INFERIOR && e.offsetY < altura - ALTURA_NAVEGADOR - 8;
      const noGrafico = grafico.containPixel("grid", [e.offsetX, e.offsetY]);
      if (!naFaixaDoEixo && !noGrafico) return;
      const t0 = tempoNoPixel(grafico, e.offsetX, e.offsetY);
      const msPorPixel = (tempoNoPixel(grafico, e.offsetX + 100, e.offsetY) - t0) / 100;
      arrasto = { tipo: noGrafico ? "selecao" : "eixo", x0: e.offsetX, t0, msPorPixel, janela0: janelaAtual(grafico) };
    };

    const aoMover = (e: { offsetX: number; offsetY: number }) => {
      if (!arrasto) return;
      const dx = e.offsetX - arrasto.x0;
      if (arrasto.tipo === "eixo") {
        const deslocamento = -dx * arrasto.msPorPixel;
        grafico.dispatchAction({
          type: "dataZoom", dataZoomIndex: 0,
          startValue: arrasto.janela0.inicio + deslocamento, endValue: arrasto.janela0.fim + deslocamento,
        });
        return;
      }
      if (Math.abs(dx) < MOVIMENTO_MINIMO_PX) return;
      const t = arrasto.t0 + dx * arrasto.msPorPixel;
      const [a, b] = [arrasto.t0, t].sort((x, y) => x - y);
      callbacks.current.aoSelecionar({ de: deMs(a), ate: deMs(b) }, false);
    };

    const aoSoltar = (e: { offsetX: number }) => {
      if (arrasto?.tipo === "selecao") {
        const dx = e.offsetX - arrasto.x0;
        if (Math.abs(dx) < MOVIMENTO_MINIMO_PX) {
          callbacks.current.aoSelecionar(null, true);
        } else {
          const [a, b] = [arrasto.t0, arrasto.t0 + dx * arrasto.msPorPixel].sort((x, y) => x - y);
          callbacks.current.aoSelecionar({ de: deMs(a), ate: deMs(b) }, true);
        }
      }
      arrasto = null;
    };

    const aoZoom = () => {
      const { inicio, fim } = janelaAtual(grafico);
      if (inicio && fim) callbacks.current.aoMudarJanela({ de: deMs(inicio), ate: deMs(fim) });
    };

    zr.on("mousedown", aoPressionar);
    zr.on("mousemove", aoMover);
    zr.on("mouseup", aoSoltar);
    zr.on("globalout", aoSoltar);
    grafico.on("datazoom", aoZoom);
    return () => {
      zr.off("mousedown", aoPressionar);
      zr.off("mousemove", aoMover);
      zr.off("mouseup", aoSoltar);
      zr.off("globalout", aoSoltar);
      grafico.off("datazoom", aoZoom);
    };
  }, [grafico]);
}
