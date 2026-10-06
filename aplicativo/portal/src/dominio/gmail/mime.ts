// Montagem de mensagem MIME (multipart/mixed) para rascunho no Gmail.
// Valida os destinatários para impedir injeção de cabeçalhos.

const REGEX_EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
export const MAXIMO_DESTINATARIOS = 20;

export interface Anexo {
  nome: string;
  tipo: string;
  conteudo: Uint8Array;
}

export interface Mensagem {
  para: string[];
  assunto: string;
  html: string;
  anexo: Anexo | null;
}

export function emailValido(email: string): boolean {
  return email.length <= 254 && REGEX_EMAIL.test(email);
}

export function validarDestinatarios(para: string[]): string[] {
  if (para.length > MAXIMO_DESTINATARIOS) throw new Error(`No máximo ${MAXIMO_DESTINATARIOS} destinatários.`);
  const limpos = para.map((e) => e.trim()).filter(Boolean);
  for (const email of limpos) {
    if (!emailValido(email)) throw new Error(`E-mail inválido: ${email.slice(0, 80)}`);
  }
  return limpos;
}

function base64(bytes: Uint8Array | string): string {
  return Buffer.from(bytes).toString("base64");
}

/** Cabeçalho com acentos codificado em RFC 2047 (UTF-8, base64). */
export function codificarCabecalho(texto: string): string {
  const limpo = texto.replace(/[\r\n]+/g, " ");
  return /^[\x20-\x7E]*$/.test(limpo) ? limpo : `=?UTF-8?B?${base64(limpo)}?=`;
}

function quebrarLinhas(texto: string, largura = 76): string {
  return texto.match(new RegExp(`.{1,${largura}}`, "g"))?.join("\r\n") ?? "";
}

function nomeDeArquivoSeguro(nome: string): string {
  return nome.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "anexo";
}

/** Monta a mensagem e devolve em base64url (formato do campo `raw` do Gmail). */
export function montarMensagem(m: Mensagem, fronteira = `perfin_${Date.now().toString(36)}`): string {
  const para = validarDestinatarios(m.para);
  const linhas = [
    ...(para.length ? [`To: ${para.join(", ")}`] : []),
    `Subject: ${codificarCabecalho(m.assunto)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${fronteira}"`,
    "",
    `--${fronteira}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    quebrarLinhas(base64(m.html)),
  ];
  if (m.anexo) {
    const nome = nomeDeArquivoSeguro(m.anexo.nome);
    linhas.push(
      `--${fronteira}`,
      `Content-Type: ${m.anexo.tipo}; name="${nome}"`,
      `Content-Disposition: attachment; filename="${nome}"`,
      "Content-Transfer-Encoding: base64",
      "",
      quebrarLinhas(base64(m.anexo.conteudo)),
    );
  }
  linhas.push(`--${fronteira}--`, "");
  return Buffer.from(linhas.join("\r\n")).toString("base64url");
}

/** Escapa texto para inserir em HTML. */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
