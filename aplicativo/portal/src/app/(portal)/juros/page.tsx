import type { Metadata } from "next";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import CdiContraIpca from "@/componentes/paineis/CdiContraIpca";
import CurvaPre from "@/componentes/paineis/CurvaPre";
import JuroReal from "@/componentes/paineis/JuroReal";
import SelicImplicita from "@/componentes/paineis/SelicImplicita";
import TituloPagina from "@/componentes/ui/TituloPagina";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { carregarAnalise } from "@/servicos/indicadores/analise";

export const metadata: Metadata = { title: "Juros" };

export default async function Juros({ searchParams }: PageProps<"/juros">) {
  const filtros = lerFiltros(await searchParams, "36m");
  const a = await carregarAnalise(filtros);

  return (
    <>
      <TituloPagina titulo="Juros" subtitulo={`De ${formatarData(a.de)} a ${formatarData(a.ate)}`} />
      <BarraFiltros referencia={a.ate} janela={filtros.janela} modo={filtros.modo} granularidade={filtros.granularidade}
        mostrar={{ modo: false }} />
      <SelicImplicita selicMeta={a.serie.selic_meta ?? []} de={a.de} ate={a.ate} pacote={a.projecoes} />
      <CurvaPre pacote={a.projecoes} />
      <JuroReal cdi={a.serie.cdi ?? []} ipca={a.serie.ipca ?? []} de={a.de} ate={a.ate} pacote={a.projecoes} />
      <CdiContraIpca cdi={a.indices.cdi} ipca={a.indices.ipca} de={a.de} ate={a.ate} />
    </>
  );
}
