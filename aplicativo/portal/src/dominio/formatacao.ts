// Formatação numérica em pt-BR.

const cacheFormatadores = new Map<string, Intl.NumberFormat>();

function formatador(minimo: number, maximo: number, sinal: boolean): Intl.NumberFormat {
  const chave = `${minimo}-${maximo}-${sinal}`;
  let f = cacheFormatadores.get(chave);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: minimo,
      maximumFractionDigits: maximo,
      signDisplay: sinal ? "exceptZero" : "auto",
    });
    cacheFormatadores.set(chave, f);
  }
  return f;
}

/** Número com casas fixas. Null vira "—". */
export function formatarNumero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return formatador(casas, casas, false).format(valor);
}

/** Valor já em % (ex.: 4,5 → "4,50%"). */
export function formatarPct(valor: number | null | undefined, casas = 2, sinal = false): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return `${formatador(casas, casas, sinal).format(valor)}%`;
}

/** Fração (ex.: 0,045 → "4,50%"). */
export function formatarFracaoPct(valor: number | null | undefined, casas = 2, sinal = false): string {
  return formatarPct(valor === null || valor === undefined ? valor : valor * 100, casas, sinal);
}

/** Pontos percentuais (ex.: 0,5 → "+0,50 p.p."). */
export function formatarPp(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return `${formatador(casas, casas, true).format(valor)} p.p.`;
}

export function formatarReais(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return `R$ ${formatador(casas, casas, false).format(valor)}`;
}

/** Sinal de um valor para colorir (positivo, negativo ou neutro). */
export function sinalDe(valor: number | null | undefined): "positivo" | "negativo" | "neutro" {
  if (valor === null || valor === undefined || !Number.isFinite(valor) || valor === 0) return "neutro";
  return valor > 0 ? "positivo" : "negativo";
}

/**
 * Lê um valor digitado em reais: "1.500,50", "1500,50", "1500.50" ou "1500".
 * Ponto só é separador de milhar no formato 1.234.567(,89). Ambíguo ou inválido → null.
 */
export function lerValorReais(texto: string): number | null {
  const t = texto.trim().replace(/^R\$\s*/, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d+([.,]\d{1,2})?$/.test(t)) return Number(t.replace(",", "."));
  return null;
}
