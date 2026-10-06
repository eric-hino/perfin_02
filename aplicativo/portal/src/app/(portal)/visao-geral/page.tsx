import type { Metadata } from "next";

import BarraFiltros from "@/componentes/filtros/BarraFiltros";
import ListaInsights from "@/componentes/insights/ListaInsights";
import CartaoIndicador from "@/componentes/ui/CartaoIndicador";
import EstadoVazio from "@/componentes/ui/EstadoVazio";
import Painel from "@/componentes/ui/Painel";
import TituloPagina from "@/componentes/ui/TituloPagina";
import cartao from "@/componentes/ui/cartao.module.css";
import ui from "@/componentes/ui/ui.module.css";
import { formatarData } from "@/dominio/datas";
import { lerFiltros } from "@/dominio/filtros";
import { montarCartoes } from "@/dominio/painel/cartoes";
import { ultimoPonto } from "@/dominio/series";
import { carregarAnalise } from "@/servicos/indicadores/analise";
import { parametros } from "@/servicos/indicadores/repositorio";

export const metadata: Metadata = { title: "Visão geral" };

export default async function VisaoGeral({ searchParams }: PageProps<"/visao-geral">) {
  const filtros = lerFiltros(await searchParams);
  const [analise, param] = await Promise.all([carregarAnalise(filtros), parametros()]);
  const cartoes = montarCartoes({
    referencia: analise.ate, meta: param.meta, series: analise.serie, horizontes: analise.projecoes?.horizontes ?? [],
  });

  return (
    <>
      <TituloPagina titulo="Visão geral" subtitulo={`Referência: ${formatarData(analise.ate)}`} />
      <BarraFiltros referencia={analise.ate} janela={filtros.janela} modo={filtros.modo}
        granularidade={filtros.granularidade} />

      <Painel titulo="Destaques" subtitulo="Regras automáticas com limiares definidos pelo administrador">
        <ListaInsights insights={analise.insights} />
      </Painel>

      <Painel titulo="Indicadores" fonte="BCB, IBGE, B3 e ANBIMA">
        {cartoes.length ? (
          <div className={cartao.grade}>
            {cartoes.map((c) => <CartaoIndicador key={c.chave} {...c} />)}
          </div>
        ) : (
          <EstadoVazio titulo="Ainda não há dados" texto="A coleta de indicadores ainda não rodou. Aguarde a próxima execução." />
        )}
      </Painel>

      <Painel titulo="Última referência por série" subtitulo="Data do dado mais recente coletado">
        <div className={ui.rolagem}>
          <table className={ui.tabela}>
            <thead><tr><th scope="col">Indicador</th><th scope="col">Fonte</th><th scope="col" className={ui.num}>Última referência</th></tr></thead>
            <tbody>
              {analise.base.catalogo.map((i) => {
                const ultimo = ultimoPonto(analise.serie[i.codigo] ?? []);
                return (
                  <tr key={i.codigo}>
                    <th scope="row">{i.nome}</th>
                    <td>{i.fonte.replace("_", " ")}</td>
                    <td className={ui.num}>{ultimo ? formatarData(ultimo[0]) : "sem dados"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>
    </>
  );
}
