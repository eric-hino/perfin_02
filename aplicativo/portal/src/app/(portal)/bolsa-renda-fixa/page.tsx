import type { Metadata } from "next";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import Ibovespa from "@/componentes/paineis/Ibovespa";
import ImaB from "@/componentes/paineis/ImaB";
import TituloPagina from "@/componentes/ui/TituloPagina";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { carregarAnalise } from "@/servicos/indicadores/analise";

export const metadata: Metadata = { title: "Bolsa e renda fixa" };

export default async function BolsaRendaFixa({ searchParams }: PageProps<"/bolsa-renda-fixa">) {
  const filtros = lerFiltros(await searchParams, "24m");
  const a = await carregarAnalise(filtros);

  return (
    <>
      <TituloPagina titulo="Bolsa e renda fixa" subtitulo={`De ${formatarData(a.de)} a ${formatarData(a.ate)}`} />
      <BarraFiltros referencia={a.ate} janela={filtros.janela} modo={filtros.modo} granularidade={filtros.granularidade}
        mostrar={{ modo: false }} />
      <Ibovespa ibovespa={a.serie.ibovespa ?? []} indices={a.indices} de={a.de} ate={a.ate} />
      <ImaB yieldImab={a.serie.imab_yield ?? []} duration={a.serie.imab_duration ?? []} de={a.de} ate={a.ate} pacote={a.projecoes} />
    </>
  );
}
