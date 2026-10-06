"use client";

import type { Indicador } from "@/dominio/series";

import estilos from "../graficos/graficos.module.css";

interface Props {
  indicadores: Indicador[];
  selecionadas: string[];
  aoAlternar: (codigo: string) => void;
}

/** Chips para escolher quais indicadores entram no gráfico. */
export default function SeletorSeries({ indicadores, selecionadas, aoAlternar }: Props) {
  return (
    <div className={estilos.chips} role="group" aria-label="Indicadores no gráfico">
      {indicadores.map((i) => (
        <button key={i.codigo} type="button" className={estilos.chip} aria-pressed={selecionadas.includes(i.codigo)}
          onClick={() => aoAlternar(i.codigo)}>
          <span className={estilos.amostra} style={{ background: i.cor }} aria-hidden="true" />
          {i.nomeCurto}
        </button>
      ))}
    </div>
  );
}
