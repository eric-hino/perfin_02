// Formatação em pt-BR e montagem dos cartões de destaque (regras de apresentação dos dados públicos).

import type { Destaque } from "./dados";

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

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function numero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

export function pct(valor: number | null | undefined, casas = 2): string {
  return valor === null || valor === undefined || !Number.isFinite(valor) ? "—" : `${numero(valor, casas)}%`;
}

export function mes(dataIso: string): string {
  const [ano, m] = dataIso.split("-").map(Number);
  return `${MESES[m - 1]}/${ano}`;
}

export function data(dataIso: string): string {
  const [ano, m, d] = dataIso.split("-");
  return `${d}/${m}/${ano}`;
}

export interface CartaoPublico {
  codigo: string;
  rotulo: string;
  valor: string;
  detalhe: string;
}

/** Cartões do site a partir dos destaques públicos (BCB/IBGE). */
export function cartoes(destaques: Destaque[]): CartaoPublico[] {
  const por = new Map(destaques.map((d) => [d.codigo, d]));
  const saida: CartaoPublico[] = [];
  for (const codigo of ["ipca", "igpm"]) {
    const d = por.get(codigo);
    if (d) saida.push({ codigo, rotulo: `${d.nome} em 12 meses`, valor: pct(d.acumulado12m), detalhe: `${mes(d.dataReferencia)}: ${pct(d.valor)} no mês` });
  }
  const selic = por.get("selic_meta");
  if (selic) saida.push({ codigo: "selic_meta", rotulo: "Selic meta", valor: pct(selic.valor), detalhe: `em ${data(selic.dataReferencia)}` });
  const cdi = por.get("cdi");
  if (cdi) saida.push({ codigo: "cdi", rotulo: "CDI em 12 meses", valor: pct(cdi.acumulado12m), detalhe: `até ${data(cdi.dataReferencia)}` });
  const dolar = por.get("dolar_ptax");
  if (dolar) {
    const variacao = dolar.valorAnterior ? (dolar.valor / dolar.valorAnterior - 1) * 100 : null;
    saida.push({ codigo: "dolar", rotulo: "Dólar PTAX venda", valor: `R$ ${numero(dolar.valor, 4)}`,
      detalhe: `${data(dolar.dataReferencia)} · ${variacao === null ? "" : `${variacao >= 0 ? "+" : ""}${pct(variacao)} no dia`}` });
  }
  return saida;
}
