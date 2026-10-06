import "server-only";

import { z } from "zod";

const esquema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https$/ }),
  NEXT_PUBLIC_PORTAL_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type Ambiente = z.infer<typeof esquema>;

/** Variáveis do site. Retorna null se faltar alguma (o site mostra "dados indisponíveis"). */
export function ambiente(): Ambiente | null {
  const resultado = esquema.safeParse(process.env);
  return resultado.success ? resultado.data : null;
}

/** URL do Portal para o botão "Entrar no Portal" (pública por definição). */
export function urlDoPortal(): string | null {
  const url = process.env.NEXT_PUBLIC_PORTAL_URL;
  return url && /^https:\/\//.test(url) ? url.replace(/\/+$/, "") : null;
}
