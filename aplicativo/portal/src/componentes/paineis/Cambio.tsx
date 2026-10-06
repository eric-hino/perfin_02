import { dolarRealMensal, fechamentoMensal } from "@/dominio/cambio";
import { serieMediaMovel, serieVolatilidadeMovel } from "@/dominio/estatisticas";
import type { IndiceAcumulado } from "@/dominio/retornos/indice";
import type { Ponto } from "@/dominio/series";
import type { PacoteProjecoes } from "@/servicos/indicadores/painel";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import AvisoProjecao from "./AvisoProjecao";
import { entre, linha, tracejada } from "./series";
import TabelaHorizontes from "./TabelaHorizontes";

interface Props {
  dolar: readonly Ponto[];
  ipca: IndiceAcumulado | undefined;
  de: string;
  ate: string;
  pacote: PacoteProjecoes | null;
}

/** Painéis de câmbio: PTAX com média móvel e dólar futuro, dólar real e volatilidade. */
export default function Cambio({ dolar, ipca, de, ate, pacote }: Props) {
  const futuro = (pacote?.projecoes.dolarFuturo ?? []).map((p) => [p.data, p.valor] as const);
  const ultimo = entre(dolar, de, ate).at(-1);
  const opcaoPtax = {
    legend: { data: ["PTAX venda", "Média móvel 21 dias", "Dólar futuro"] },
    series: [
      linha("PTAX venda", "#004C88", entre(dolar, de, ate)),
      linha("Média móvel 21 dias", "#6D6E71", entre(serieMediaMovel(dolar, 21), de, ate), { lineStyle: { width: 1 } }),
      ...(futuro.length && ultimo ? [tracejada("Dólar futuro", "#004C88", [ultimo, ...futuro.slice(0, 12)])] : []),
    ],
  };
  const mensal = fechamentoMensal(dolar, de, ate);
  const real = ipca ? dolarRealMensal(dolar, ipca, de, ate) : [];
  const opcaoReal = {
    legend: { data: ["Nominal (fechamento)", "Real (a preços de hoje)"] },
    series: [linha("Nominal (fechamento)", "#6D6E71", mensal), linha("Real (a preços de hoje)", "#004C88", real)],
  };
  const opcaoVol = { series: [linha("Volatilidade (63 dias úteis)", "#101B2A", entre(serieVolatilidadeMovel(dolar, 63), de, ate))] };

  return (
    <>
      <Painel titulo="Dólar PTAX" subtitulo="R$/US$; tracejado: dólar futuro pela paridade coberta" fonte="BCB/SGS 1; B3 (DI × Pré e cupom cambial)">
        <Grafico opcao={opcaoPtax} formato="reais" casas={4} descricao="Dólar PTAX, média móvel de 21 dias e dólar futuro" />
        {pacote && <TabelaHorizontes horizontes={pacote.horizontes} colunas={["dolar"]} />}
        <AvisoProjecao dataCurva={pacote?.entrada.dataBase ?? null} />
      </Painel>
      <Painel titulo="Dólar real" subtitulo="Fechamento mensal deflacionado pelo IPCA, a preços do último mês divulgado" fonte="BCB/SGS 1 e 433">
        <Grafico opcao={opcaoReal} formato="reais" casas={4} altura={260} descricao="Dólar nominal e dólar real" />
      </Painel>
      <Painel titulo="Volatilidade do câmbio" subtitulo="Anualizada, janela móvel de 63 dias úteis" fonte="BCB/SGS 1">
        <Grafico opcao={opcaoVol} formato="fracao_pct" casas={1} altura={240} descricao="Volatilidade anualizada do dólar" />
      </Painel>
    </>
  );
}
