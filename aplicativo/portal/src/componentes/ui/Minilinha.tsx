import estilos from "./cartao.module.css";

/** Minilinha (sparkline) com pontos normalizados entre 0 e 1. */
export default function Minilinha({ pontos }: { pontos: number[] }) {
  if (pontos.length < 2) return null;
  const caminho = pontos
    .map((y, i) => `${i === 0 ? "M" : "L"}${((i / (pontos.length - 1)) * 100).toFixed(2)},${(28 - y * 26).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={estilos.minilinha} aria-hidden="true">
      <path d={caminho} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
