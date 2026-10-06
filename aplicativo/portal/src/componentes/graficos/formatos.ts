import { formatarFracaoPct, formatarNumero, formatarPct, formatarReais } from "@/dominio/formatacao";

/** Formato dos valores de um gráfico (as funções não atravessam a fronteira servidor → cliente). */
export type Formato = "pct" | "fracao_pct" | "numero" | "reais" | "pp";

export function formatarValor(valor: unknown, formato: Formato, casas: number): string {
  const n = typeof valor === "number" ? valor : Array.isArray(valor) ? Number(valor[1]) : Number(valor);
  if (!Number.isFinite(n)) return "—";
  switch (formato) {
    case "pct": return formatarPct(n, casas);
    case "fracao_pct": return formatarFracaoPct(n, casas);
    case "reais": return formatarReais(n, casas);
    case "pp": return `${formatarNumero(n, casas)} p.p.`;
    default: return formatarNumero(n, casas);
  }
}

export function formatarEixo(valor: number, formato: Formato): string {
  switch (formato) {
    case "pct": return `${formatarNumero(valor, 1)}%`;
    case "fracao_pct": return `${formatarNumero(valor * 100, 0)}%`;
    case "reais": return formatarNumero(valor, 2);
    default: return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(valor);
  }
}
