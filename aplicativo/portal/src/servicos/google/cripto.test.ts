import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { cifrar, decifrar } from "./cripto";

const chave = randomBytes(32).toString("base64");

describe("cifra do refresh token (AES-256-GCM)", () => {
  it("ida e volta preserva o texto e usa IV aleatório", () => {
    const a = cifrar("token-secreto", chave);
    const b = cifrar("token-secreto", chave);
    expect(a).not.toBe(b);
    expect(decifrar(a, chave)).toBe("token-secreto");
  });

  it("falha com chave errada ou pacote adulterado", () => {
    const pacote = cifrar("token", chave);
    expect(() => decifrar(pacote, randomBytes(32).toString("base64"))).toThrow();
    const bytes = Buffer.from(pacote, "base64");
    bytes[bytes.length - 1] ^= 1;
    expect(() => decifrar(bytes.toString("base64"), chave)).toThrow();
  });

  it("exige chave de 32 bytes", () => {
    expect(() => cifrar("x", randomBytes(16).toString("base64"))).toThrow();
  });
});
