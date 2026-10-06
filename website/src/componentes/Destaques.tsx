import { destaques } from "@/lib/dados";
import { cartoes } from "@/lib/formatacao";

import estilos from "./site.module.css";

/** Últimos valores públicos (BCB) — dados agregados, sem séries completas. */
export default async function Destaques() {
  const lista = await destaques();
  if (!lista) return <p className={estilos.secundario}>Indicadores indisponíveis no momento. Tente novamente mais tarde.</p>;
  if (!lista.length) return <p className={estilos.secundario}>Ainda não há indicadores publicados.</p>;
  return (
    <ul className={estilos.cartoes}>
      {cartoes(lista).map((c) => (
        <li key={c.codigo}>
          <h3>{c.rotulo}</h3>
          <p className={estilos.numero}>{c.valor}</p>
          <p className={estilos.secundario}>{c.detalhe}</p>
        </li>
      ))}
    </ul>
  );
}
