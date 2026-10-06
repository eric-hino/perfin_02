import type { Metadata } from "next";
import Link from "next/link";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import Grafico from "@/componentes/graficos/Grafico";
import GraficoRetornos from "@/componentes/retornos/GraficoRetornos";
import TabelaJanelas from "@/componentes/retornos/TabelaJanelas";
import EstadoVazio from "@/componentes/ui/EstadoVazio";
import Painel from "@/componentes/ui/Painel";
import TituloPagina from "@/componentes/ui/TituloPagina";
import ui from "@/componentes/ui/ui.module.css";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { MODOS } from "@/dominio/retornos/retornos";
import { carregarAnalise } from "@/servicos/indicadores/analise";
import { dadosDoGrafico, opcaoJanelaMovel } from "@/servicos/indicadores/retornos";

export const metadata: Metadata = { title: "Retornos" };

const MESES_MOVEL = [12, 24, 36];

export default async function Retornos({ searchParams }: PageProps<"/retornos">) {
  const parametros = await searchParams;
  const filtros = lerFiltros(parametros);
  const analise = await carregarAnalise(filtros);
  const dados = dadosDoGrafico(analise, filtros);
  const movel = MESES_MOVEL.includes(Number(parametros.movel)) ? Number(parametros.movel) : 12;
  const modo = MODOS.find((m) => m.valor === filtros.modo)?.rotulo ?? "Nominal";
  const baseQuery = new URLSearchParams({ ref: analise.ate, ...(filtros.modo !== "nominal" ? { modo: filtros.modo } : {}) }).toString();

  if (!dados.indicadores.length) {
    return <EstadoVazio titulo="Ainda não há dados" texto="A coleta de indicadores ainda não rodou." />;
  }

  return (
    <>
      <TituloPagina titulo="Retornos" subtitulo={`${modo} · de ${formatarData(analise.de)} a ${formatarData(analise.ate)}`} />
      <BarraFiltros referencia={analise.ate} janela={filtros.janela} modo={filtros.modo} granularidade={filtros.granularidade} />

      <Painel titulo="Retorno acumulado" subtitulo="Todas as séries começam em 0% no início da janela visível"
        fonte="BCB, B3 e ANBIMA; projeções pela curva B3 do último dia útil">
        <GraficoRetornos key={`${filtros.janela}|${dados.janelaInicial.de}|${dados.janelaInicial.ate}|${dados.modo}|${dados.selecionadas.join(",")}`}
          dados={dados} />
      </Painel>

      <Painel titulo="Tabela de janelas" subtitulo={`Até ${formatarData(analise.ate)} · janelas acima de 12 meses também anualizadas · clique para aplicar ao gráfico`}>
        <TabelaJanelas linhas={analise.janelas} modo={filtros.modo} referencia={analise.ate} baseQuery={baseQuery} />
      </Painel>

      <Painel titulo={`Janela móvel de ${movel} meses`} subtitulo="Retorno dos últimos N meses em cada fim de mês (últimos 10 anos)">
        <nav aria-label="Tamanho da janela móvel" className={ui.abas}>
          {MESES_MOVEL.map((m) => (
            <Link key={m} href={`/retornos?${baseQuery}&movel=${m}`} aria-current={m === movel ? "true" : undefined}
              scroll={false}>{m} meses</Link>
          ))}
        </nav>
        <Grafico opcao={opcaoJanelaMovel(analise, filtros, movel)} formato="fracao_pct" casas={1}
          descricao={`Retorno em janela móvel de ${movel} meses`} />
      </Painel>
    </>
  );
}
