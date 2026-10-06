import estilos from "./portal.module.css";

export default function Carregando() {
  return (
    <p className={estilos.carregando} role="status" aria-live="polite">
      Carregando os dados…
    </p>
  );
}
