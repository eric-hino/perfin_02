// Registro modular do ECharts: só os tipos usados entram no bundle.
import { BarChart, HeatmapChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart, BarChart, HeatmapChart, GridComponent, TooltipComponent, DataZoomComponent, MarkAreaComponent,
  MarkLineComponent, LegendComponent, VisualMapComponent, CanvasRenderer,
]);

export { echarts };

/** Tema Perfin: eixos cinza, grade só horizontal, sem moldura, fontes da marca. */
export const TEMA_PERFIN = {
  textStyle: { fontFamily: "Nunito Sans, Segoe UI, Helvetica, sans-serif", color: "#101B2A" },
  grid: { left: 8, right: 16, top: 32, bottom: 24, containLabel: true },
  tooltip: {
    backgroundColor: "#101B2A",
    borderWidth: 0,
    textStyle: { color: "#F9F4F4", fontSize: 12 },
    extraCssText: "border-radius:0;box-shadow:none;",
  },
  legend: { top: 0, left: 0, icon: "rect", itemWidth: 12, itemHeight: 2, textStyle: { fontSize: 11, color: "#6D6E71" } },
} as const;

export const EIXO_X = {
  axisLine: { lineStyle: { color: "#E6E7E8" } },
  axisTick: { show: false },
  axisLabel: { color: "#6D6E71", fontSize: 11 },
  splitLine: { show: false },
};

export const EIXO_Y = {
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: "#6D6E71", fontSize: 11 },
  splitLine: { lineStyle: { color: "#E6E7E8", width: 1 } },
  scale: true,
};
