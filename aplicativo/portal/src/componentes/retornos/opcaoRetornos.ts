// Monta a opção do ECharts do gráfico de retornos (função pura de apresentação).

import { formatarData, paraMs } from "@/dominio/datas";
import { formatarFracaoPct } from "@/dominio/formatacao";
import type { PontoProjetado } from "@/dominio/projecoes/projecoes";
import type { ModoRetorno } from "@/dominio/retornos/retornos";
import type { Indicador } from "@/dominio/series";

import { EIXO_X, EIXO_Y, TEMA_PERFIN } from "../graficos/echarts";
import { type Preparado, serieNaJanela, serieProjetada } from "@/dominio/retornos/grade";
import type { Janela } from "./tipos";

interface Entrada {
  preparado: Preparado;
  indicadores: Indicador[];
  selecionadas: string[];
  janela: Janela;
  modo: ModoRetorno;
  selecao: Janela | null;
  projecoes: Record<string, PontoProjetado[]> | null;
}

export const ALTURA_NAVEGADOR = 28;
export const MARGEM_INFERIOR = 72;

export function montarOpcao(e: Entrada): Record<string, unknown> {
  const visiveis = e.indicadores.filter((i) => e.selecionadas.includes(i.codigo));
  const linhas = visiveis.map((i, k) => ({
    id: i.codigo,
    name: i.nomeCurto,
    type: "line",
    showSymbol: false,
    sampling: "lttb",
    connectNulls: false,
    color: i.cor,
    lineStyle: { width: 2 },
    data: serieNaJanela(e.preparado, i.codigo, e.janela.de, e.modo),
    markArea: k === 0 && e.selecao
      ? { silent: true, itemStyle: { color: "rgba(0, 76, 136, 0.10)" }, data: [[{ xAxis: paraMs(e.selecao.de) }, { xAxis: paraMs(e.selecao.ate) }]] }
      : undefined,
    markLine: k === 0
      ? { silent: true, symbol: "none", lineStyle: { color: "#6D6E71", type: "solid", width: 1 }, label: { show: false }, data: [{ yAxis: 0 }] }
      : undefined,
  }));
  const projetadas = e.projecoes && e.modo === "nominal"
    ? visiveis.filter((i) => e.projecoes?.[i.codigo]?.length).map((i) => ({
      id: `${i.codigo}_proj`,
      name: `${i.nomeCurto} (projeção)`,
      type: "line",
      showSymbol: false,
      color: i.cor,
      lineStyle: { width: 2, type: "dashed" },
      data: serieProjetada(e.preparado, i.codigo, e.janela.de, e.projecoes?.[i.codigo] ?? []),
    }))
    : [];

  return {
    ...TEMA_PERFIN,
    animation: false,
    grid: { ...TEMA_PERFIN.grid, bottom: MARGEM_INFERIOR },
    legend: { ...TEMA_PERFIN.legend, data: visiveis.map((i) => i.nomeCurto) },
    tooltip: {
      ...TEMA_PERFIN.tooltip,
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: "#6D6E71" } },
      formatter: (params: { seriesName: string; value: [number, number | null]; color: string }[]) => {
        if (!params.length) return "";
        const data = formatarData(new Date(params[0].value[0]).toISOString().slice(0, 10));
        const itens = params
          .filter((p) => p.value[1] !== null)
          .map((p) => `<span style="color:${p.color}">■</span> ${p.seriesName}: ${formatarFracaoPct(p.value[1], 2, true)}`);
        return [`${data} · desde ${formatarData(e.janela.de)}`, ...itens].join("<br/>");
      },
    },
    xAxis: { ...EIXO_X, type: "time", min: paraMs(e.preparado.grade[0] ?? e.janela.de) },
    yAxis: { ...EIXO_Y, axisLabel: { ...EIXO_Y.axisLabel, formatter: (v: number) => formatarFracaoPct(v, 0) } },
    dataZoom: [
      {
        type: "slider", xAxisIndex: 0, filterMode: "none", height: ALTURA_NAVEGADOR, bottom: 8,
        startValue: paraMs(e.janela.de), endValue: paraMs(e.janela.ate),
        borderColor: "#E6E7E8", fillerColor: "rgba(16, 27, 42, 0.08)", handleStyle: { color: "#101B2A" },
        dataBackground: { lineStyle: { color: "#6D6E71" }, areaStyle: { color: "#E6E7E8" } },
        labelFormatter: (v: number) => formatarData(new Date(v).toISOString().slice(0, 10)),
        textStyle: { fontSize: 10, color: "#6D6E71" },
      },
      // Roda do mouse dá zoom; o arrasto dentro do gráfico fica para a seleção de período.
      { type: "inside", xAxisIndex: 0, filterMode: "none", zoomOnMouseWheel: true, moveOnMouseMove: false, moveOnMouseWheel: false },
    ],
    series: [...linhas, ...projetadas],
  };
}
