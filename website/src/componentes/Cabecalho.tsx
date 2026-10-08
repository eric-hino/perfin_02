import type { LinksDoPortal } from "@/lib/config";

import estilos from "./site.module.css";

interface Props {
  links: LinksDoPortal | null;
}

/** Barra do topo, sobre o hero: marca à esquerda e acesso ao Portal à direita. Some sem URL do Portal. */
export default function Cabecalho({ links }: Props) {
  if (!links) return null;
  return (
    <header className={estilos.cabecalho}>
      <p className={estilos.wordmark}>Perfin</p>
      <nav aria-label="Acesso" className={estilos.acesso}>
        <a className={estilos.linkEntrar} href={links.entrar}>Entrar</a>
        <a className={estilos.botaoCadastrar} href={links.cadastrar}>Cadastrar</a>
      </nav>
    </header>
  );
}
