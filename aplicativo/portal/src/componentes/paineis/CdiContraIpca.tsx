import { fimDoMes, inicioDoMes, somarMeses } from "@/dominio/datas";
import type { IndiceAcumulado } from "@/dominio/retornos/indice";
import { retornoEntre } from "@/dominio/retornos/retornos";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import { linha } from "./series";

interface Props {
  cdi: IndiceAcumulado | undefined;
  ipca: IndiceAcumulado | undefined;
  de: string;
  ate: string;
}

/** CDI acumulado contra IPCA acumulado na janela: R$ 1.000 aplicados no início. */
export default function CdiContraIpca({ cdi, ipca, de, ate }: Props) {
  const datas: string[] = [];
  for (let m = fimDoMes(de); m <= ate; m = fimDoMes(somarMeses(inicioDoMes(m), 1))) datas.push(m);
  const serie = (indice: IndiceAcumulado | undefined) =>
    indice ? datas.map((d) => [d, retornoEntre(indice, de, d)] as const).map(([d, r]) => [d, r === null ? null : 1000 * (1 + r)] as const) : [];
  const opcao = {
    legend: { data: ["CDI", "IPCA"] },
    series: [linha("CDI", "#101B2A", serie(cdi)), linha("IPCA", "#A6452F", serie(ipca))],
  };
  return (
    <Painel titulo="CDI contra a inflação" subtitulo="R$ 1.000 aplicados no início da janela" fonte="BCB/SGS 12 e 433">
      <Grafico opcao={opcao} formato="reais" altura={260} descricao="Valor de R$ 1.000 corrigido pelo CDI e pelo IPCA" />
    </Painel>
  );
}
