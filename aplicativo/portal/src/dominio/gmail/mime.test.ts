import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { codificarCabecalho, escaparHtml, montarMensagem, validarDestinatarios } from "./mime";

function decodificar(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf8");
}

describe("mensagem MIME do rascunho", () => {
  it("monta multipart com corpo HTML e anexo em base64", () => {
    const raw = montarMensagem({
      para: ["ana@empresa.com.br"],
      assunto: "Relatório de indicadores — setembro/2026",
      html: "<p>Olá</p>",
      anexo: { nome: "relatorio.xlsx", tipo: "application/octet-stream", conteudo: new Uint8Array([1, 2, 3]) },
    }, "fronteira");
    const texto = decodificar(raw);
    expect(texto).toContain("To: ana@empresa.com.br");
    expect(texto).toContain("Subject: =?UTF-8?B?");
    expect(texto).toContain('Content-Type: multipart/mixed; boundary="fronteira"');
    expect(texto).toContain('filename="relatorio.xlsx"');
    expect(texto).toContain(Buffer.from([1, 2, 3]).toString("base64"));
    expect(texto.trim().endsWith("--fronteira--")).toBe(true);
  });

  it("sem destinatários não cria cabeçalho To", () => {
    expect(decodificar(montarMensagem({ para: [], assunto: "A", html: "x", anexo: null }))).not.toContain("To:");
  });

  it("rejeita destinatário com quebra de linha (injeção de cabeçalho)", () => {
    expect(() => validarDestinatarios(["a@b.com\r\nBcc: x@y.com"])).toThrow();
    expect(() => validarDestinatarios(["sem-arroba"])).toThrow();
    expect(() => validarDestinatarios(Array.from({ length: 21 }, (_, i) => `p${i}@a.com`))).toThrow();
  });

  it("assunto com quebra de linha não injeta cabeçalhos", () => {
    expect(codificarCabecalho("Oi\r\nBcc: x@y.com")).not.toMatch(/[\r\n]/);
  });

  it("escapa HTML", () => {
    expect(escaparHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  });
});

describe("o Portal nunca envia e-mails", () => {
  it("o módulo do Gmail só cria rascunhos e nenhum arquivo chama envio", () => {
    const gmail = fileURLToPath(new URL("../../servicos/google/gmail.ts", import.meta.url));
    expect(readFileSync(gmail, "utf8")).toContain("/users/me/drafts");
    const raiz = fileURLToPath(new URL("../../", import.meta.url));
    const arquivos = readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
    for (const arquivo of arquivos) {
      const codigo = readFileSync(join(raiz, arquivo), "utf8").replace(/^\s*\/\/.*$/gm, "");
      expect(codigo, arquivo).not.toMatch(/messages\/send|drafts\/send|gmail\/v1\/users\/me\/messages/);
    }
  });
});
