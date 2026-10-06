import "server-only";

import { z } from "zod";

// Variáveis do servidor. Só NEXT_PUBLIC_SITE_URL vai ao navegador (é pública).
const esquema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https$/, message: "NEXT_PUBLIC_SITE_URL deve ser uma URL https" }),
  SUPABASE_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  GOOGLE_CLIENT_ID: z.string().endsWith(".apps.googleusercontent.com"),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "deve ter 32 bytes em base64"),
  ADMIN_EMAIL: z.email().transform((v) => v.trim().toLowerCase()),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().regex(/^[a-z0-9.\-]+$/).default("gemini-3.5-flash"),
});

export type Ambiente = z.infer<typeof esquema>;

let cache: Ambiente | null = null;

/** Lê e valida as variáveis de ambiente. Falha com mensagem clara (sem expor valores). */
export function ambiente(): Ambiente {
  if (cache) return cache;
  const resultado = esquema.safeParse(process.env);
  if (!resultado.success) {
    const campos = resultado.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida do Portal: ${campos}`);
  }
  cache = resultado.data;
  return cache;
}

/** URL pública do Portal (da variável NEXT_PUBLIC_SITE_URL), sem barra no fim. */
export function urlDoSite(): string {
  return ambiente().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}
