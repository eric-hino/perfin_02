"use client";

import { useMemo } from "react";

import { type Preparado, prepararGrade } from "@/dominio/retornos/grade";

import type { DadosGraficoRetornos } from "./tipos";

/** Índices e valores na grade de dias úteis: calculados uma vez por conjunto de dados. */
export function usePreparar(dados: DadosGraficoRetornos): Preparado {
  return useMemo(() => prepararGrade(dados.indicadores, dados.pontos, dados.feriados), [dados]);
}
