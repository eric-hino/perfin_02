import type { Metadata } from "next";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import Calculadora from "@/componentes/paineis/Calculadora";
import Inflacao12m from "@/componentes/paineis/Inflacao12m";
import InflacaoMensal from "@/componentes/paineis/InflacaoMensal";
import IpcaImplicito from "@/componentes/paineis/IpcaImplicito";
import MapaCalorIpca from "@/componentes/paineis/MapaCalorIpca";
import Painel from "@/componentes/ui/Painel";
import TituloPagina from "@/componentes/ui/TituloPagina";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { ultimoPonto } from "@/dominio/series";
import { carregarAnalise } from "@/servicos/indicadores/analise";
import { parametros } from "@/servicos/indicadores/repositorio";

export const metadata: Metadata = { title: "Inflação" };

export default async function Inflacao({ searchParams }: PageProps<"/inflacao">) {
  const filtros = lerFiltros(await searchParams, "36m");
  const [a, param] = await Promise.all([carregarAnalise(filtros), parametros()]);
  const ipca = a.serie.ipca ?? [];
  const igpm = a.serie.igpm ?? [];
  const ultimoIpca = ultimoPonto(ipca);

  return (
    <>
      <TituloPagina titulo="Inflação" subtitulo={`De ${formatarData(a.de)} a ${formatarData(a.ate)}`} />
      <BarraFiltros referencia={a.ate} janela={filtros.janela} modo={filtros.modo} granularidade={filtros.granularidade}
        mostrar={{ modo: false, granularidade: true }} />
      <InflacaoMensal ipca={ipca} igpm={igpm} de={a.de} ate={a.ate} granularidade={filtros.granularidade} />
      <Inflacao12m ipca={ipca} igpm={igpm} de={a.de} ate={a.ate} meta={param.meta} />
      <MapaCalorIpca ipca={ipca} ate={a.ate} />
      <IpcaImplicito pacote={a.projecoes} />
      <Painel titulo="Calculadora de correção" subtitulo="Corrige um valor por IPCA ou IGP-M, do mês inicial ao final (inclusive)"
        fonte="BCB/SGS; mesma regra da Calculadora do Cidadão">
        <Calculadora ultimoMes={(ultimoIpca?.[0] ?? a.ate).slice(0, 7)} />
      </Painel>
    </>
  );
}
