import { formatarData } from "@/dominio/datas";
import { formatarPct, formatarPp } from "@/dominio/formatacao";
import type { Ponto } from "@/dominio/series";
import type { PacoteProjecoes } from "@/servicos/indicadores/painel";

import Grafico from "../graficos/Grafico";
import Painel from "../ui/Painel";
import AvisoProjecao from "./AvisoProjecao";
import { entre, linha } from "./series";

interface Props {
  selicMeta: readonly Ponto[];
  de: string;
  ate: string;
  pacote: PacoteProjecoes | null;
}

/** Selic meta em degraus e a Selic implícita na curva por reunião do Copom (ou fim de mês). */
export default function SelicImplicita({ selicMeta, de, ate, pacote }: Props) {
  const historico = entre(selicMeta, de, ate);
  const implicita = pacote?.projecoes.selicImplicita ?? [];
  const temReunioes = (pacote?.entrada.reunioesCopom ?? []).some((d) => d >= (pacote?.entrada.dataBase ?? ""));
  const ultima = historico[historico.length - 1];
  const opcao = {
    legend: { data: ["Selic meta", "Selic implícita"] },
    series: [
      linha("Selic meta", "#101B2A", historico, { step: "end" }),
      linha("Selic implícita", "#004C88", [...(ultima ? [ultima] : []), ...implicita.map((p) => [p.data, p.valor] as const)],
        { step: "end", lineStyle: { width: 2, type: "dashed" } }),
    ],
  };
  const proxima = temReunioes ? implicita[0] : null;
  return (
    <Painel titulo="Selic: atual e implícita" fonte="BCB/SGS 432; B3 (DI × Pré)"
      subtitulo={temReunioes ? "Implícita por reunião do Copom (% a.a.)" : "Implícita por fim de mês (% a.a.) — cadastre as reuniões do Copom em Admin → Parâmetros"}>
      <Grafico opcao={opcao} formato="pct" descricao="Selic meta histórica e Selic implícita na curva de juros" />
      {proxima && ultima && (
        <p>
          Próxima reunião ({formatarData(proxima.data)}): mercado precifica Selic de <strong>{formatarPct(proxima.valor)}</strong>
          {" "}({formatarPp(proxima.valor - ultima[1])}).
        </p>
      )}
      <AvisoProjecao dataCurva={pacote?.entrada.dataBase ?? null} />
    </Painel>
  );
}
