import { describe, expect, it } from "vitest";

import { linksDoPortal } from "./config";

describe("linksDoPortal", () => {
  it("monta os links de entrar e cadastrar a partir da URL do Portal", () => {
    expect(linksDoPortal("https://portal.exemplo.com")).toEqual({
      entrar: "https://portal.exemplo.com/login",
      cadastrar: "https://portal.exemplo.com/login?aba=cadastro",
    });
  });

  it("retorna null sem URL do Portal", () => {
    expect(linksDoPortal(null)).toBeNull();
    expect(linksDoPortal("")).toBeNull();
  });
});
