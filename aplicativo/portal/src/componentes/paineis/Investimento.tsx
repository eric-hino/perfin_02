import { idpEmReais, somaMovel, variacaoAnualFbcf } from "@/dominio/investimento";
import type { Ponto } from "@/dominio/series";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import { barras, entre, escalar, linha } from "./series";

interface Props {
  idp: readonly Ponto[];
  fbcf: readonly Ponto[];
  ipca: readonly Ponto[];
  ptax: readonly Ponto[];
  de: string;
  ate: string;
}

/** IDP (US$ e R$) e FBCF (valor do trimestre e variação contra o ano anterior). */
export default function Investimento({ idp, fbcf, ipca, ptax, de, ate }: Props) {
  const idpBi = escalar(idp, 1 / 1000);
  const opcaoIdp = {
    legend: { data: ["IDP no mês", "IDP em 12 meses"] },
    series: [
      barras("IDP no mês", "#415765", entre(idpBi, de, ate)),
      linha("IDP em 12 meses", "#101B2A", entre(somaMovel(idpBi, 12), de, ate)),
    ],
  };
  const reais = idpEmReais(idp, ptax);
  const opcaoReais = {
    legend: { data: ["IDP em R$ (12 meses)"] },
    series: [linha("IDP em R$ (12 meses)", "#004C88", entre(somaMovel(reais, 12), de, ate))],
  };
  const variacoes = variacaoAnualFbcf(fbcf, ipca).filter((v) => v.trimestre >= de && v.trimestre <= ate);
  const opcaoFbcf = {
    legend: { data: ["Nominal", "Real (aproximação)"] },
    series: [
      barras("Nominal", "#6D6E71", variacoes.map((v) => [v.trimestre, v.nominal] as const)),
      barras("Real (aproximação)", "#101B2A", variacoes.map((v) => [v.trimestre, v.real] as const)),
    ],
  };
  const opcaoFbcfValor = { series: [barras("FBCF no trimestre", "#415765", entre(escalar(fbcf, 1 / 1000), de, ate))] };

  return (
    <>
      <Painel titulo="Investimento Direto no País" subtitulo="Ingressos líquidos, US$ bilhões" fonte="BCB/SGS 22885">
        <Grafico opcao={opcaoIdp} formato="numero" casas={1} descricao="IDP mensal e acumulado em 12 meses em dólares" />
      </Painel>
      <Painel titulo="IDP em reais" subtitulo="Acumulado em 12 meses, R$ bilhões (convertido pela PTAX média de cada mês)" fonte="BCB/SGS 22885 e 1">
        <Grafico opcao={opcaoReais} formato="numero" casas={1} altura={240} descricao="IDP acumulado em 12 meses em reais" />
      </Painel>
      <Painel titulo="Formação Bruta de Capital Fixo" subtitulo="Valor do trimestre, R$ bilhões correntes" fonte="IBGE/SIDRA 1846">
        <Grafico opcao={opcaoFbcfValor} formato="numero" casas={0} altura={240} descricao="FBCF por trimestre" />
      </Painel>
      <Painel titulo="FBCF contra o mesmo trimestre do ano anterior" fonte="IBGE/SIDRA 1846; BCB/SGS 433"
        subtitulo="Variação em %; a real é uma aproximação deflacionada pelo IPCA de 12 meses">
        <Grafico opcao={opcaoFbcf} formato="pct" casas={1} altura={260} descricao="Variação anual nominal e real da FBCF" />
      </Painel>
    </>
  );
}
