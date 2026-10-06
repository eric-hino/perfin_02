import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM. Formato: base64( iv[12] | tag[16] | texto cifrado ).
const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

function chave(chaveBase64: string): Buffer {
  const bytes = Buffer.from(chaveBase64, "base64");
  if (bytes.length !== 32) throw new Error("Chave de cifra deve ter 32 bytes.");
  return bytes;
}

export function cifrar(texto: string, chaveBase64: string): string {
  const iv = randomBytes(TAMANHO_IV);
  const cifra = createCipheriv(ALGORITMO, chave(chaveBase64), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), conteudo]).toString("base64");
}

export function decifrar(pacoteBase64: string, chaveBase64: string): string {
  const pacote = Buffer.from(pacoteBase64, "base64");
  if (pacote.length <= TAMANHO_IV + TAMANHO_TAG) throw new Error("Pacote cifrado inválido.");
  const iv = pacote.subarray(0, TAMANHO_IV);
  const tag = pacote.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
  const decifra = createDecipheriv(ALGORITMO, chave(chaveBase64), iv);
  decifra.setAuthTag(tag);
  return Buffer.concat([decifra.update(pacote.subarray(TAMANHO_IV + TAMANHO_TAG)), decifra.final()]).toString("utf8");
}
