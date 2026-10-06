import estilos from "./ui.module.css";

interface Props {
  titulo: string;
  subtitulo?: string;
  fonte?: string;
  children: React.ReactNode;
}

/** Bloco de conteúdo com título, subtítulo (unidade) e fonte dos dados no rodapé. */
export default function Painel({ titulo, subtitulo, fonte, children }: Props) {
  return (
    <section className={estilos.secao}>
      <div>
        <h2>{titulo}</h2>
        {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
      </div>
      {children}
      {fonte && <p className={estilos.fonte}>Fonte: {fonte}</p>}
    </section>
  );
}
