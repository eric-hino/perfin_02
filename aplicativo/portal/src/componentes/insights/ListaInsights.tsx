import type { Insight, Severidade } from "@/dominio/insights/tipos";

import estilos from "./insights.module.css";

const ROTULOS: Record<Severidade, string> = { alerta: "Alerta", atencao: "Atenção", informativo: "Informativo" };

interface Props {
  insights: Insight[];
  limite?: number;
}

/** Destaques automáticos gerados pelas regras do Portal. */
export default function ListaInsights({ insights, limite }: Props) {
  const itens = limite ? insights.slice(0, limite) : insights;
  if (!itens.length) {
    return <p className={estilos.vazio}>Nenhum destaque automático para o período.</p>;
  }
  return (
    <ul className={estilos.lista}>
      {itens.map((i) => (
        <li key={i.id} className={estilos[i.severidade]}>
          <span className={estilos.selo}>{ROTULOS[i.severidade]}</span>
          <strong>{i.titulo}</strong>
          <p>{i.texto}</p>
        </li>
      ))}
    </ul>
  );
}
