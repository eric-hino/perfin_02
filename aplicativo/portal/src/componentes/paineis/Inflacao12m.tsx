import { diferencaDeSeries, type MetaInflacao, serieAcumulada12m } from "@/dominio/inflacao";
import type { Ponto } from "@/dominio/series";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import { entre, linha } from "./series";

interface Props {
  ipca: readonly Ponto[];
  igpm: readonly Ponto[];
  de: string;
  ate: string;
  meta: MetaInflacao;
}

/** Acumulados de 12 meses com a faixa da meta, e o spread IGP-M − IPCA. */
export default function Inflacao12m({ ipca, igpm, de, ate, meta }: Props) {
  const ipca12 = serieAcumulada12m(ipca);
  const igpm12 = serieAcumulada12m(igpm);
  const faixa = {
    silent: true,
    itemStyle: { color: "rgba(65, 87, 101, 0.12)" },
    data: [[{ yAxis: meta.centro - meta.tolerancia }, { yAxis: meta.centro + meta.tolerancia }]],
  };
  const opcao12 = {
    legend: { data: ["IPCA 12m", "IGP-M 12m"] },
    series: [
      linha("IPCA 12m", "#A6452F", entre(ipca12, de, ate), { markArea: faixa }),
      linha("IGP-M 12m", "#415765", entre(igpm12, de, ate)),
    ],
  };
  const opcaoSpread = {
    series: [linha("IGP-M − IPCA (12m)", "#004C88", entre(diferencaDeSeries(igpm12, ipca12), de, ate), {
      markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: "#6D6E71" }, data: [{ yAxis: 0 }] },
    })],
  };
  return (
    <>
      <Painel titulo="Inflação em 12 meses" fonte="BCB/SGS 433 e 189"
        subtitulo={`Faixa sombreada: meta de ${meta.centro}% ± ${meta.tolerancia} p.p.`}>
        <Grafico opcao={opcao12} formato="pct" descricao="IPCA e IGP-M acumulados em 12 meses com a faixa da meta" />
      </Painel>
      <Painel titulo="Spread IGP-M − IPCA" subtitulo="Diferença entre os acumulados de 12 meses, em p.p." fonte="BCB/SGS">
        <Grafico opcao={opcaoSpread} formato="pp" altura={240} descricao="Diferença entre IGP-M e IPCA em 12 meses" />
      </Painel>
    </>
  );
}
