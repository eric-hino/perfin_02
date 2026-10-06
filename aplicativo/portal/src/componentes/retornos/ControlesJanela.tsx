"use client";

import type { DataISO } from "@/dominio/datas";

import estilos from "../graficos/graficos.module.css";
import type { Janela } from "./tipos";

interface Props {
  janela: Janela;
  limites: { min: DataISO; max: DataISO };
  temCurva: boolean;
  projecoes: boolean;
  aoMudarData: (campo: keyof Janela, valor: string) => void;
  aoMudarProjecoes: (ligado: boolean) => void;
}

/** Campos de data da janela (alternativa por teclado ao arrasto) e projeções. */
export default function ControlesJanela({ janela, limites, temCurva, projecoes, aoMudarData, aoMudarProjecoes }: Props) {
  return (
    <div className={estilos.controles}>
      <label>Início da janela
        <input type="date" value={janela.de} min={limites.min} max={janela.ate}
          onChange={(e) => aoMudarData("de", e.target.value)} />
      </label>
      <label>Fim da janela
        <input type="date" value={janela.ate} min={janela.de} max={limites.max}
          onChange={(e) => aoMudarData("ate", e.target.value)} />
      </label>
      <label>
        <span>Projeções de mercado{temCurva ? "" : " (sem curva)"}</span>
        <select value={projecoes ? "1" : "0"} disabled={!temCurva} onChange={(e) => aoMudarProjecoes(e.target.value === "1")}>
          <option value="0">Desligadas</option>
          <option value="1">Ligadas (tracejado)</option>
        </select>
      </label>
    </div>
  );
}
