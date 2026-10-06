"use client";

import { useEffect, useMemo } from "react";

import { useGrafico } from "../graficos/useGrafico";
import estilos from "../graficos/graficos.module.css";
import CartaoSelecao from "./CartaoSelecao";
import ControlesJanela from "./ControlesJanela";
import { montarOpcao } from "./opcaoRetornos";
import SeletorSeries from "./SeletorSeries";
import type { DadosGraficoRetornos } from "./tipos";
import { usePreparar } from "./useDadosRetornos";
import { useEstadoRetornos } from "./useEstadoRetornos";
import { useInteracoes } from "./useInteracoes";

/** Gráfico de retorno acumulado: janela pelo eixo X, seleção de período por arrasto e projeções. */
export default function GraficoRetornos({ dados }: { dados: DadosGraficoRetornos }) {
  const preparado = usePreparar(dados);
  const { ref, grafico } = useGrafico();
  const estado = useEstadoRetornos(dados);
  const feriados = useMemo(() => new Set(dados.feriados), [dados.feriados]);
  const { janela, selecao, selecionadas, projecoes } = estado;

  const opcao = useMemo(() => montarOpcao({
    preparado, indicadores: dados.indicadores, selecionadas, janela, modo: dados.modo, selecao,
    projecoes: projecoes ? dados.projecoes : null,
  }), [preparado, dados, selecionadas, janela, selecao, projecoes]);

  useEffect(() => {
    grafico?.setOption(opcao, { replaceMerge: ["series"] });
  }, [grafico, opcao]);

  useInteracoes(grafico, { aoMudarJanela: estado.aoMudarJanela, aoSelecionar: estado.aoSelecionar });

  return (
    <div className={estilos.painel}>
      <SeletorSeries indicadores={dados.indicadores} selecionadas={selecionadas} aoAlternar={estado.alternarSerie} />
      <ControlesJanela janela={janela} temCurva={Boolean(dados.dataCurva)} projecoes={projecoes}
        limites={{ min: preparado.grade[0], max: preparado.grade[preparado.grade.length - 1] }}
        aoMudarData={estado.mudarData} aoMudarProjecoes={estado.mudarProjecoes} />
      <div className={estilos.areaGrafico}>
        <div ref={ref} className={estilos.grafico} style={{ height: 460 }} role="img"
          aria-label="Retorno acumulado dos indicadores selecionados, rebaseado em 0% no início da janela" />
      </div>
      <p className={estilos.dica}>
        Arraste a faixa de datas (eixo X) ou o navegador abaixo para mudar a janela; use a roda do mouse para zoom.
        Clique e arraste dentro do gráfico para ver o retorno só entre duas datas.
        {projecoes && dados.modo !== "nominal" ? " As projeções aparecem só no modo nominal." : ""}
      </p>
      {selecao && (
        <CartaoSelecao selecao={selecao} indicadores={dados.indicadores.filter((i) => selecionadas.includes(i.codigo))}
          indices={preparado.indices} modo={dados.modo} feriados={feriados}
          aoAmpliar={estado.ampliar} aoLimpar={estado.limparSelecao} />
      )}
    </div>
  );
}
