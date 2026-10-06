import { formatarData } from "@/dominio/datas";
import type { PacoteProjecoes } from "@/servicos/indicadores/painel";

import Grafico from "../graficos/Grafico";
import EstadoVazio from "../ui/EstadoVazio";
import Painel from "../ui/Painel";
import TabelaHorizontes from "./TabelaHorizontes";

const CORES = ["#101B2A", "#6D6E71", "#E6E7E8"];
const ATE_DU = 252 * 10;

/** Curva DI × Pré de hoje contra 1 semana e 1 mês atrás (prazo em anos). */
export default function CurvaPre({ pacote }: { pacote: PacoteProjecoes | null }) {
  if (!pacote?.curvasPre.length) {
    return <Painel titulo="Curva DI × Pré"><EstadoVazio titulo="Sem curva de mercado" /></Painel>;
  }
  const opcao = {
    legend: { data: pacote.curvasPre.map((c) => `${c.rotulo} (${formatarData(c.dataBase)})`) },
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", name: "anos", nameLocation: "end", nameTextStyle: { fontSize: 10, color: "#6D6E71" }, min: 0, max: 10 },
    series: pacote.curvasPre.map((c, i) => ({
      name: `${c.rotulo} (${formatarData(c.dataBase)})`,
      type: "line",
      showSymbol: false,
      color: CORES[i],
      lineStyle: { width: i === 0 ? 2 : 1.5 },
      data: c.vertices.filter((v) => v.diasUteis <= ATE_DU).map((v) => [v.diasUteis / 252, v.taxa]),
    })),
  };
  return (
    <Painel titulo="Curva DI × Pré" subtitulo="Taxa (% a.a.) por prazo, em anos (dias úteis / 252)" fonte="B3 — Taxas de Mercado para Swaps">
      <Grafico opcao={opcao} formato="pct" eixoTempo={false} descricao="Curva de juros DI × Pré hoje, há uma semana e há um mês" />
      <TabelaHorizontes horizontes={pacote.horizontes} colunas={["cdi", "selic"]}
        anteriores={pacote.mesAnterior?.horizontes} dataAnterior={pacote.mesAnterior?.dataBase} />
    </Painel>
  );
}
