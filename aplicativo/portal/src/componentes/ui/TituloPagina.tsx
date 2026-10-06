import estilos from "./ui.module.css";

interface Props {
  titulo: string;
  subtitulo?: string;
}

export default function TituloPagina({ titulo, subtitulo }: Props) {
  return (
    <header className={estilos.cabecalhoSecao}>
      <h1>{titulo}</h1>
      {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
    </header>
  );
}
