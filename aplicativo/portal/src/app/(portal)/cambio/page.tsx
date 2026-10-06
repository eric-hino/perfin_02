import type { Metadata } from "next";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import Cambio from "@/componentes/paineis/Cambio";
import TabelaMensalNivel from "@/componentes/paineis/TabelaMensalNivel";
import Painel from "@/componentes/ui/Painel";
import TituloPagina from "@/componentes/ui/TituloPagina";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { carregarAnalise } from "@/servicos/indicadores/analise";

export const metadata: Metadata = { title: "Câmbio" };

export default async function PaginaCambio({ searchParams }: PageProps<"/cambio">) {
  const filtros = lerFiltros(await searchParams, "24m");
  const a = await carregarAnalise(filtros);
  const dolar = a.serie.dolar_ptax ?? [];

  return (
    <>
      <TituloPagina titulo="Câmbio" subtitulo={`De ${formatarData(a.de)} a ${formatarData(a.ate)}`} />
      <BarraFiltros referencia={a.ate} janela={filtros.janela} modo={filtros.modo} granularidade={filtros.granularidade}
        mostrar={{ modo: false }} />
      <Cambio dolar={dolar} ipca={a.indices.ipca} de={a.de} ate={a.ate} pacote={a.projecoes} />
      <Painel titulo="Resumo mensal" subtitulo="Dólar PTAX venda (R$/US$), últimos 12 meses" fonte="BCB/SGS 1">
        <TabelaMensalNivel pontos={dolar} ate={a.ate} casas={4} />
      </Painel>
    </>
  );
}
