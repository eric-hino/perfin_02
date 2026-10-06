import type { Metadata } from "next";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import Investimento from "@/componentes/paineis/Investimento";
import TituloPagina from "@/componentes/ui/TituloPagina";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { carregarAnalise } from "@/servicos/indicadores/analise";

export const metadata: Metadata = { title: "Investimento e atividade" };

export default async function PaginaInvestimento({ searchParams }: PageProps<"/investimento">) {
  const filtros = lerFiltros(await searchParams, "60m");
  const a = await carregarAnalise(filtros);

  return (
    <>
      <TituloPagina titulo="Investimento e atividade" subtitulo={`De ${formatarData(a.de)} a ${formatarData(a.ate)}`} />
      <BarraFiltros referencia={a.ate} janela={filtros.janela} modo={filtros.modo} granularidade={filtros.granularidade}
        mostrar={{ modo: false }} />
      <Investimento idp={a.serie.idp ?? []} fbcf={a.serie.fbcf ?? []} ipca={a.serie.ipca ?? []} ptax={a.serie.dolar_ptax ?? []}
        de={a.de} ate={a.ate} />
    </>
  );
}
