// Datas no formato ISO "AAAA-MM-DD", tratadas sempre em UTC (sem fuso).

export type DataISO = string;

const MS_DIA = 86_400_000;
const REGEX_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ehDataISO(texto: string): boolean {
  if (!REGEX_ISO.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

/** Data de hoje no fuso de Brasília (America/Sao_Paulo). */
export function hojeEmSaoPaulo(agora: Date = new Date()): DataISO {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function paraMs(data: DataISO): number {
  return Date.parse(`${data}T00:00:00Z`);
}

export function deMs(ms: number): DataISO {
  return new Date(ms).toISOString().slice(0, 10);
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return deMs(paraMs(data) + dias * MS_DIA);
}

export function diasCorridos(de: DataISO, ate: DataISO): number {
  return Math.round((paraMs(ate) - paraMs(de)) / MS_DIA);
}

export function partes(data: DataISO): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split("-").map(Number);
  return { ano, mes, dia };
}

export function montar(ano: number, mes: number, dia: number): DataISO {
  return deMs(Date.UTC(ano, mes - 1, dia));
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function inicioDoMes(data: DataISO): DataISO {
  const { ano, mes } = partes(data);
  return montar(ano, mes, 1);
}

export function fimDoMes(data: DataISO): DataISO {
  const { ano, mes } = partes(data);
  return montar(ano, mes, diasNoMes(ano, mes));
}

/** Soma meses mantendo o dia (limitado ao último dia do mês de destino). */
export function somarMeses(data: DataISO, meses: number): DataISO {
  const { ano, mes, dia } = partes(data);
  const total = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return montar(novoAno, novoMes, Math.min(dia, diasNoMes(novoAno, novoMes)));
}

export function minData(a: DataISO, b: DataISO): DataISO {
  return a < b ? a : b;
}

export function maxData(a: DataISO, b: DataISO): DataISO {
  return a > b ? a : b;
}

export function ehFimDeSemana(data: DataISO): boolean {
  const dia = new Date(paraMs(data)).getUTCDay();
  return dia === 0 || dia === 6;
}

export function ehDiaUtil(data: DataISO, feriados: ReadonlySet<DataISO>): boolean {
  return !ehFimDeSemana(data) && !feriados.has(data);
}

/** Dias úteis no intervalo (de, ate] — convenção de mercado para contagem de prazo. */
export function diasUteisEntre(de: DataISO, ate: DataISO, feriados: ReadonlySet<DataISO>): number {
  if (ate <= de) return 0;
  let total = 0;
  for (let ms = paraMs(de) + MS_DIA, fim = paraMs(ate); ms <= fim; ms += MS_DIA) {
    if (ehDiaUtil(deMs(ms), feriados)) total += 1;
  }
  return total;
}

/** Lista de dias úteis no intervalo [de, ate]. */
export function listarDiasUteis(de: DataISO, ate: DataISO, feriados: ReadonlySet<DataISO>): DataISO[] {
  const dias: DataISO[] = [];
  for (let ms = paraMs(de), fim = paraMs(ate); ms <= fim; ms += MS_DIA) {
    const d = deMs(ms);
    if (ehDiaUtil(d, feriados)) dias.push(d);
  }
  return dias;
}

/** Último dia útil em ou antes da data. */
export function diaUtilAnterior(data: DataISO, feriados: ReadonlySet<DataISO>): DataISO {
  let d = data;
  while (!ehDiaUtil(d, feriados)) d = somarDias(d, -1);
  return d;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function formatarData(data: DataISO): string {
  const { ano, mes, dia } = partes(data);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

export function formatarMes(data: DataISO): string {
  const { ano, mes } = partes(data);
  return `${MESES[mes - 1]}/${ano}`;
}

export function formatarMesLongo(data: DataISO): string {
  const { ano, mes } = partes(data);
  return `${MESES_LONGOS[mes - 1]}/${ano}`;
}
