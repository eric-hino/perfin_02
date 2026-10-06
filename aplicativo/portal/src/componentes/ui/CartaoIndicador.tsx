import estilos from "./cartao.module.css";
import Minilinha from "./Minilinha";

export interface DadosCartao {
  chave: string;
  rotulo: string;
  valor: string;
  detalhe?: string;
  variacao?: { texto: string; sinal: "positivo" | "negativo" | "neutro" };
  selo?: string;
  /** Pontos da minilinha (últimos 12 meses), já normalizados para 0..1. */
  minilinha?: number[];
}

/** Cartão de indicador (KPI): número grande, variação e minilinha de 12 meses. */
export default function CartaoIndicador({ rotulo, valor, detalhe, variacao, selo, minilinha }: DadosCartao) {
  return (
    <article className={estilos.cartao}>
      <h3 className={estilos.rotulo}>{rotulo}</h3>
      <p className={`${estilos.valor} numero`}>{valor}</p>
      {variacao && <p className={`${estilos.detalhe} numero ${variacao.sinal}`}>{variacao.texto}</p>}
      {detalhe && <p className={estilos.detalhe}>{detalhe}</p>}
      {selo && <p className={estilos.selo}>{selo}</p>}
      {minilinha && <Minilinha pontos={minilinha} />}
    </article>
  );
}
