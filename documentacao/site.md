# Site público (`website`)

É uma página única, estática e revalidada a cada hora (`revalidate = 3600`), com a identidade Perfin.

1. **Cabeçalho:** no canto superior direito ficam **Entrar** (`NEXT_PUBLIC_PORTAL_URL/login`) e **Cadastrar** (`NEXT_PUBLIC_PORTAL_URL/login?aba=cadastro`).
   - O login e o cadastro acontecem no Portal, que guarda a sessão. O site não tem sessão.
   - Os links vêm de `linksDoPortal()` (`lib/config.ts`) e somem se a variável não estiver definida.
2. **Institucional:** o que é o Portal e o botão **Entrar no Portal**, que também leva a `/login`.
3. **Indicadores em destaque:**
   - IPCA e IGP-M (12 meses e mês), Selic meta, CDI em 12 meses e dólar PTAX (com a variação do dia);
   - vêm da função `destaques_publicos()` e são só dados do BCB;
   - Ibovespa e IMA-B ficam de fora porque os termos de uso da B3 e da ANBIMA restringem a redistribuição.
4. **Calculadora de correção:** server action que valida a entrada com zod e chama `corrigir_valor()`, a mesma regra do Portal.

O site usa a chave publicável sem sessão. Pelo RLS, ela só alcança as duas funções públicas.

**Variáveis:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_URL`, `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Se faltarem, o site mostra "indicadores indisponíveis" em vez de quebrar.
