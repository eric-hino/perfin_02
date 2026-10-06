import { formatarPct } from "@/dominio/formatacao";
import { serieJuroRealExPost } from "@/dominio/juros";
import { taxaAVista } from "@/dominio/projecoes/curva";
import type { Ponto } from "@/dominio/series";
import type { PacoteProjecoes } from "@/servicos/indicadores/painel";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import { linha } from "./series";

interface Props {
  cdi: readonly Ponto[];
  ipca: readonly Ponto[];
  de: string;
  ate: string;
  pacote: PacoteProjecoes | null;
}

/** Juro real ex-post (realizado) e ex-ante (cupom de IPCA de 1 ano na curva de hoje). */
export default function JuroReal({ cdi, ipca, de, ate, pacote }: Props) {
  const exPost = serieJuroRealExPost(cdi, ipca, de, ate);
  const exAnte = pacote && pacote.entrada.ipcaReal.length ? taxaAVista(pacote.entrada.ipcaReal, 252) : null;
  const opcao = {
    series: [linha("Juro real ex-post (12m)", "#101B2A", exPost, {
      markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: "#6D6E71" }, data: [{ yAxis: 0 }] },
    })],
  };
  return (
    <Painel titulo="Juro real" fonte="BCB/SGS (CDI e IPCA); B3 (DI × IPCA)"
      subtitulo={`Ex-post: CDI 12m descontado o IPCA 12m (%). Ex-ante hoje (DI × IPCA, 1 ano): ${formatarPct(exAnte)} a.a.`}>
      <Grafico opcao={opcao} formato="pct" altura={260} descricao="Juro real ex-post em 12 meses" />
    </Painel>
  );
}
