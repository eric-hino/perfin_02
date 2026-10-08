import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// O proxy só renova a sessão do Supabase (cookies) e faz o redirecionamento
// grosso para o login. A autorização de verdade acontece em exigirPerfil()
// em cada layout e route handler, e no RLS do banco.

// /redefinir-senha não é pública: a sessão de recuperação (link do e-mail) conta como sessão.
const ROTAS_PUBLICAS = ["/login", "/auth/", "/acesso-nao-autorizado", "/privacidade", "/esqueci-senha"];

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return resposta;

  const supabase = createServerClient(url, chave, {
    // Mesmas opções de servicos/supabase/servidor.ts (cookies httpOnly).
    cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) resposta.cookies.set(name, value, options);
      },
    },
  });

  // getClaims valida o JWT (assinatura e validade) e renova a sessão se preciso.
  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(r));

  if (!data?.claims && !publica && !caminho.startsWith("/api/")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
