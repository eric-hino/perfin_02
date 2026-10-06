import type { PacoteProjecoes } from "@/servicos/indicadores/painel";

import Grafico from "../graficos/Grafico";
import EstadoVazio from "../ui/EstadoVazio";
import Painel from "../ui/Painel";
import AvisoProjecao from "./AvisoProjecao";
import { barras } from "./series";
import TabelaHorizontes from "./TabelaHorizontes";

/** IPCA (e IGP-M) implícitos nas curvas de juros. */
export default function IpcaImplicito({ pacote }: { pacote: PacoteProjecoes | null }) {
  if (!pacote) {
    return (
      <Painel titulo="Inflação implícita">
        <EstadoVazio titulo="Sem curva de mercado" texto="A curva DI × IPCA ainda não foi coletada." />
      </Painel>
    );
  }
  const { projecoes } = pacote;
  const opcao = {
    legend: { data: ["IPCA implícito", ...(projecoes.igpmMensal ? ["IGP-M implícito"] : [])] },
    series: [
      barras("IPCA implícito", "#A6452F", projecoes.ipcaMensal.slice(0, 12).map((t) => [t.mes, t.taxa] as const)),
      ...(projecoes.igpmMensal ? [barras("IGP-M implícito", "#415765", projecoes.igpmMensal.slice(0, 12).map((t) => [t.mes, t.taxa] as const))] : []),
    ],
  };
  return (
    <Painel titulo="Inflação implícita (breakeven)" fonte="B3: curvas DI × Pré, DI × IPCA e DI × IGP-M"
      subtitulo="Média implícita por mês, sem sazonalidade, em % (o primeiro mês cobre só o restante do mês)">
      <Grafico opcao={opcao} formato="pct" altura={260} descricao="Inflação implícita mês a mês nos próximos 12 meses" />
      <TabelaHorizontes horizontes={pacote.horizontes} colunas={["ipca", "igpm"]}
        anteriores={pacote.mesAnterior?.horizontes} dataAnterior={pacote.mesAnterior?.dataBase} />
      {!projecoes.igpmMensal && <p className="neutro">IGP-M: sem projeção de mercado (curva DI × IGP-M com poucos vértices).</p>}
      <AvisoProjecao dataCurva={pacote.entrada.dataBase} />
    </Painel>
  );
}
