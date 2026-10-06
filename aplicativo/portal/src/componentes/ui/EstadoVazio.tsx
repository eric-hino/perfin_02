import estilos from "./ui.module.css";

interface Props {
  titulo: string;
  texto?: string;
  children?: React.ReactNode;
}

/** Estado vazio: não há dados para o recorte ou a funcionalidade. */
export default function EstadoVazio({ titulo, texto, children }: Props) {
  return (
    <section className={estilos.aviso}>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {children}
    </section>
  );
}
