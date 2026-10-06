import { partes } from "@/dominio/datas";
import type { Ponto } from "@/dominio/series";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Mapa de calor ano × mês do IPCA (sazonalidade), últimos 10 anos. */
export default function MapaCalorIpca({ ipca, ate }: { ipca: readonly Ponto[]; ate: string }) {
  const anoFinal = partes(ate).ano;
  const anos = Array.from({ length: 10 }, (_, i) => String(anoFinal - 9 + i));
  const dados = ipca
    .filter(([d]) => partes(d).ano > anoFinal - 10 && d <= ate)
    .map(([d, v]) => [partes(d).mes - 1, anos.indexOf(String(partes(d).ano)), v]);
  const opcao = {
    tooltip: { trigger: "item" },
    grid: { left: 8, right: 16, top: 8, bottom: 56, containLabel: true },
    xAxis: { type: "category", data: MESES, splitArea: { show: false } },
    yAxis: { type: "category", data: anos, scale: false },
    visualMap: {
      min: -0.5, max: 1.5, calculable: false, orient: "horizontal", left: 0, bottom: 0, itemHeight: 120,
      inRange: { color: ["#4CAC87", "#8FC9B2", "#E6E7E8", "#C99A8C", "#A6452F"] },
      textStyle: { fontSize: 10, color: "#6D6E71" },
    },
    series: [{ type: "heatmap", data: dados, label: { show: true, fontSize: 9, formatter: "{@[2]}" }, itemStyle: { borderColor: "#F9F4F4", borderWidth: 1 } }],
  };
  return (
    <Painel titulo="IPCA mês a mês" subtitulo="Variação mensal (%) por ano e mês — sazonalidade" fonte="BCB/SGS 433">
      <Grafico opcao={opcao} formato="pct" eixoTempo={false} altura={360} descricao="Mapa de calor do IPCA mensal por ano e mês" />
    </Painel>
  );
}
