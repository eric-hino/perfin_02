import { type Granularidade, agregar } from "@/dominio/agregacao";
import type { Ponto } from "@/dominio/series";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import { barras } from "./series";

interface Props {
  ipca: readonly Ponto[];
  igpm: readonly Ponto[];
  de: string;
  ate: string;
  granularidade: Granularidade;
}

/** Barras de IPCA × IGP-M por período (mês, trimestre ou ano, compostos). */
export default function InflacaoMensal({ ipca, igpm, de, ate, granularidade }: Props) {
  const gran = granularidade === "diaria" ? "mensal" : granularidade;
  const ag = (p: readonly Ponto[]) => agregar(p, "composto", gran, de, ate).map((x) => [x.periodo, x.valor] as const);
  const opcao = {
    legend: { data: ["IPCA", "IGP-M"] },
    series: [barras("IPCA", "#A6452F", ag(ipca)), barras("IGP-M", "#415765", ag(igpm))],
  };
  return (
    <Painel titulo="IPCA × IGP-M" subtitulo={`Variação por período (${gran}), em %`} fonte="BCB/SGS 433 e 189">
      <Grafico opcao={opcao} formato="pct" descricao="Barras com a variação do IPCA e do IGP-M por período" />
    </Painel>
  );
}
