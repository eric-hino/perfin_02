import "server-only";

import type { AbaPlanilha } from "@/dominio/relatorio/planilha";

import { chamarGoogleJson } from "./api";

// Cores da identidade Perfin para o cabeçalho das abas.
const AZUL_PERFIN = { red: 16 / 255, green: 27 / 255, blue: 42 / 255 };
const OFF_WHITE = { red: 249 / 255, green: 244 / 255, blue: 244 / 255 };

interface PlanilhaCriada {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheets: { properties: { sheetId: number; title: string } }[];
}

function celula(valor: string | number | null) {
  if (valor === null) return {};
  return typeof valor === "number" && Number.isFinite(valor)
    ? { userEnteredValue: { numberValue: valor } }
    : { userEnteredValue: { stringValue: String(valor) } };
}

/** Cria a planilha com todas as abas e os dados em uma única chamada. */
export async function criarPlanilha(accessToken: string, titulo: string, abas: AbaPlanilha[]) {
  const corpo = {
    properties: { title: titulo, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
    sheets: abas.map((aba, indice) => ({
      properties: { sheetId: indice, title: aba.titulo, gridProperties: { frozenRowCount: aba.linhasCabecalho } },
      data: [{ startRow: 0, startColumn: 0, rowData: aba.linhas.map((linha) => ({ values: linha.map(celula) })) }],
    })),
  };
  const criada = await chamarGoogleJson<PlanilhaCriada>(accessToken, "https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  await formatar(accessToken, criada.spreadsheetId, abas);
  return { id: criada.spreadsheetId, url: criada.spreadsheetUrl };
}

async function formatar(accessToken: string, planilhaId: string, abas: AbaPlanilha[]): Promise<void> {
  const requisicoes = abas.flatMap((aba, sheetId) => [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: aba.linhasCabecalho },
        cell: {
          userEnteredFormat: {
            backgroundColor: AZUL_PERFIN,
            textFormat: { foregroundColor: OFF_WHITE, bold: true, fontFamily: "Nunito Sans" },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    ...aba.formatosNumero.map((f) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: aba.linhasCabecalho, startColumnIndex: f.coluna, endColumnIndex: f.coluna + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: f.padrao } } },
        fields: "userEnteredFormat.numberFormat",
      },
    })),
    { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 12 } } },
  ]);
  await chamarGoogleJson(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(planilhaId)}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: requisicoes }),
  });
}
