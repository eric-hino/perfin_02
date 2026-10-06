import "server-only";

import { chamarGoogle, chamarGoogleJson } from "./api";

// Com o escopo drive.file o app só enxerga arquivos e pastas que ele mesmo criou.
const NOME_PASTA = "Portal Perfin";
const TIPO_PASTA = "application/vnd.google-apps.folder";
export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LIMITE_EXPORTACAO_BYTES = 10 * 1024 * 1024;

/** Id da pasta "Portal Perfin" criada pelo app (cria se não existir). */
export async function obterOuCriarPasta(accessToken: string): Promise<string> {
  const consulta = new URLSearchParams({
    q: `name = '${NOME_PASTA}' and mimeType = '${TIPO_PASTA}' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });
  const existente = await chamarGoogleJson<{ files?: { id: string }[] }>(
    accessToken, `https://www.googleapis.com/drive/v3/files?${consulta}`,
  );
  if (existente.files?.[0]?.id) return existente.files[0].id;

  const criada = await chamarGoogleJson<{ id: string }>(accessToken, "https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: NOME_PASTA, mimeType: TIPO_PASTA }),
  });
  return criada.id;
}

/** Move um arquivo criado pelo app para a pasta indicada. */
export async function moverParaPasta(accessToken: string, arquivoId: string, pastaId: string): Promise<void> {
  const parametros = new URLSearchParams({ addParents: pastaId, removeParents: "root", fields: "id" });
  await chamarGoogle(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(arquivoId)}?${parametros}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

/** Exporta uma Planilha Google como .xlsx. */
export async function exportarXlsx(accessToken: string, arquivoId: string): Promise<ArrayBuffer> {
  const parametros = new URLSearchParams({ mimeType: TIPO_XLSX });
  const resposta = await chamarGoogle(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(arquivoId)}/export?${parametros}`,
  );
  const conteudo = await resposta.arrayBuffer();
  if (conteudo.byteLength > LIMITE_EXPORTACAO_BYTES) throw new Error("Planilha grande demais para exportar.");
  return conteudo;
}
