"use client";

import { type DataISO, diasUteisEntre, formatarData } from "@/dominio/datas";
import { formatarFracaoPct, sinalDe } from "@/dominio/formatacao";
import type { IndiceAcumulado } from "@/dominio/retornos/indice";
import { retornosNoPeriodo } from "@/dominio/retornos/grade";
import { MODOS, type ModoRetorno } from "@/dominio/retornos/retornos";
import type { Indicador } from "@/dominio/series";

import estilos from "../graficos/graficos.module.css";
import ui from "../ui/ui.module.css";
import type { Janela } from "./tipos";

interface Props {
  selecao: Janela;
  indicadores: Indicador[];
  indices: Record<string, IndiceAcumulado>;
  modo: ModoRetorno;
  feriados: ReadonlySet<DataISO>;
  aoAmpliar: () => void;
  aoLimpar: () => void;
}

/** Retorno de cada série selecionada só entre as datas escolhidas no arrasto. */
export default function CartaoSelecao({ selecao, indicadores, indices, modo, feriados, aoAmpliar, aoLimpar }: Props) {
  const linhas = retornosNoPeriodo(indicadores, indices, selecao.de, selecao.ate, modo);
  const du = diasUteisEntre(selecao.de, selecao.ate, feriados);
  const rotuloModo = MODOS.find((m) => m.valor === modo)?.rotulo ?? modo;

  return (
    <section className={estilos.cartaoSelecao} aria-live="polite" aria-label="Retorno no período selecionado">
      <h3>
        {formatarData(selecao.de)} → {formatarData(selecao.ate)} · {du} dias úteis
      </h3>
      <p className={estilos.dica}>{rotuloModo}</p>
      <ul className={estilos.listaRetornos}>
        {linhas.map(({ indicador, retorno }) => (
          <li key={indicador.codigo}>
            <span>
              <span className={estilos.amostra} style={{ background: indicador.cor }} aria-hidden="true" /> {indicador.nomeCurto}
            </span>
            <strong className={`numero ${sinalDe(retorno)}`}>
              {modo === "pct_cdi" ? formatarFracaoPct(retorno, 1) : formatarFracaoPct(retorno, 2, true)}
            </strong>
          </li>
        ))}
      </ul>
      <div className={estilos.acoes}>
        <button type="button" className={ui.botaoPrimario} onClick={aoAmpliar}>Ampliar para este período</button>
        <button type="button" className={ui.botaoSecundario} onClick={aoLimpar}>Limpar (Esc)</button>
      </div>
    </section>
  );
}
