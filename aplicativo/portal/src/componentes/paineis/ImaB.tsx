import { formatarNumero, formatarPct } from "@/dominio/formatacao";
import { type Ponto, valorAsOf } from "@/dominio/series";
import type { PacoteProjecoes } from "@/servicos/indicadores/painel";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import AvisoProjecao from "./AvisoProjecao";
import { entre, linha } from "./series";
import TabelaHorizontes from "./TabelaHorizontes";

interface Props {
  yieldImab: readonly Ponto[];
  duration: readonly Ponto[];
  de: string;
  ate: string;
  pacote: PacoteProjecoes | null;
}

/** IMA-B: juro real (yield IPCA+) com faixa mínimo/máximo e média, duration e carrego projetado. */
export default function ImaB({ yieldImab, duration, de, ate, pacote }: Props) {
  const pontos = entre(yieldImab, de, ate);
  const valores = pontos.map(([, v]) => v);
  const media = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
  const minimo = valores.length ? Math.min(...valores) : null;
  const maximo = valores.length ? Math.max(...valores) : null;
  const atual = valorAsOf(yieldImab, ate);
  const du = valorAsOf(duration, ate);
  const opcao = {
    series: [linha("Taxa indicativa IMA-B (IPCA +)", "#415765", pontos, {
      markArea: minimo !== null && maximo !== null
        ? { silent: true, itemStyle: { color: "rgba(65, 87, 101, 0.08)" }, data: [[{ yAxis: minimo }, { yAxis: maximo }]] } : undefined,
      markLine: media !== null
        ? { silent: true, symbol: "none", lineStyle: { color: "#6D6E71", type: "dashed" }, label: { show: false }, data: [{ yAxis: media }] } : undefined,
    })],
  };
  return (
    <Painel titulo="IMA-B: juro real" fonte="ANBIMA (IMA-B); B3 (DI × IPCA)"
      subtitulo={`Atual: IPCA + ${formatarPct(atual)} · média da janela ${formatarPct(media)} (tracejado) · faixa ${formatarPct(minimo)} a ${formatarPct(maximo)} · duration ${formatarNumero(du, 0)} dias úteis`}>
      <Grafico opcao={opcao} formato="pct" descricao="Taxa indicativa do IMA-B com faixa de mínimo e máximo" />
      {pacote && <TabelaHorizontes horizontes={pacote.horizontes} colunas={["imab"]} />}
      <p className="neutro">Carrego: (1 + juro real)^(du/252) × (1 + IPCA implícito) − 1, supondo a taxa constante.</p>
      <AvisoProjecao dataCurva={pacote?.entrada.dataBase ?? null} />
    </Painel>
  );
}
