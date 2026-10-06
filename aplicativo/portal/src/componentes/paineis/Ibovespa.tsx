import { drawdown, serieDrawdown, serieVolatilidadeMovel, volatilidadeAnualizada } from "@/dominio/estatisticas";
import { formatarData } from "@/dominio/datas";
import { formatarFracaoPct } from "@/dominio/formatacao";
import type { IndiceAcumulado } from "@/dominio/retornos/indice";
import { retornoEntre } from "@/dominio/retornos/retornos";
import type { Ponto } from "@/dominio/series";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import { entre, linha } from "./series";

interface Props {
  ibovespa: readonly Ponto[];
  indices: Record<string, IndiceAcumulado>;
  de: string;
  ate: string;
}

/** Ibovespa: retorno contra o CDI na janela, drawdown e volatilidade. */
export default function Ibovespa({ ibovespa, indices, de, ate }: Props) {
  const pontos = entre(ibovespa, de, ate);
  const datas = pontos.map(([d]) => d);
  const rebase = (codigo: string) => {
    const indice = indices[codigo];
    return indice ? datas.map((d) => [d, retornoEntre(indice, de, d)] as const) : [];
  };
  const opcaoRetorno = {
    legend: { data: ["Ibovespa", "CDI"] },
    series: [linha("Ibovespa", "#4CAC87", rebase("ibovespa")), linha("CDI", "#101B2A", rebase("cdi"))],
  };
  const dd = drawdown(pontos);
  const vol = volatilidadeAnualizada(pontos);
  const opcaoDd = { series: [linha("Queda desde o pico", "#A6452F", serieDrawdown(pontos), { areaStyle: { opacity: 0.15 } })] };
  const opcaoVol = { series: [linha("Volatilidade (63 dias úteis)", "#101B2A", entre(serieVolatilidadeMovel(ibovespa, 63), de, ate))] };

  return (
    <>
      <Painel titulo="Ibovespa contra o CDI" subtitulo="Retorno acumulado na janela (o Ibovespa é índice de retorno total)" fonte="B3; BCB/SGS 12">
        <Grafico opcao={opcaoRetorno} formato="fracao_pct" descricao="Retorno acumulado do Ibovespa e do CDI na janela" />
      </Painel>
      <Painel titulo="Drawdown do Ibovespa" fonte="B3"
        subtitulo={dd ? `Pior queda na janela: ${formatarFracaoPct(dd.maximo, 1)}${dd.dataPico ? ` (pico em ${formatarData(dd.dataPico)})` : ""}; atual: ${formatarFracaoPct(dd.atual, 1)}` : undefined}>
        <Grafico opcao={opcaoDd} formato="fracao_pct" casas={1} altura={220} descricao="Queda do Ibovespa desde o pico" />
      </Painel>
      <Painel titulo="Volatilidade do Ibovespa" subtitulo={`Anualizada; na janela inteira: ${formatarFracaoPct(vol, 1)}`} fonte="B3">
        <Grafico opcao={opcaoVol} formato="fracao_pct" casas={1} altura={220} descricao="Volatilidade anualizada do Ibovespa" />
      </Painel>
    </>
  );
}
