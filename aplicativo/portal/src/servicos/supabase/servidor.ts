import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { ambiente } from "../config/env";

/**
 * O Portal não usa cliente Supabase no navegador, então os cookies de sessão
 * podem (e devem) ser httpOnly: nenhum JavaScript da página lê os tokens.
 */
export const OPCOES_COOKIE = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/**
 * Cliente Supabase do servidor, com a sessão do usuário (cookies).
 * Usa a chave publicável: todo acesso a dados passa pelo RLS.
 */
export async function clienteSupabase() {
  const loja = await cookies();
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = ambiente();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: OPCOES_COOKIE,
    cookies: {
      getAll() {
        return loja.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) loja.set(name, value, options);
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}
