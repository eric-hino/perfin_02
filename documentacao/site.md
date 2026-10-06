# Site público (`website`)

É uma página única, estática e revalidada a cada hora (`revalidate = 3600`), com a identidade Perfin.

1. **Institucional:** o que é o Portal e o botão **Entrar no Portal**, que leva a `NEXT_PUBLIC_PORTAL_URL/login`. O botão só aparece se a variável estiver definida.
2. **Indicadores em destaque:**
   - IPCA e IGP-M (12 meses e mês), Selic meta, CDI em 12 meses e dólar PTAX (com a variação do dia);
   - vêm da função `destaques_publicos()` e são só dados do BCB;
   - Ibovespa e IMA-B ficam de fora porque os termos de uso da B3 e da ANBIMA restringem a redistribuição.
3. **Calculadora de correção:** server action que valida a entrada com zod e chama `corrigir_valor()`, a mesma regra do Portal.

O site usa a chave publicável sem sessão. Pelo RLS, ela só alcança as duas funções públicas.

**Variáveis:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_URL`, `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Se faltarem, o site mostra "indicadores indisponíveis" em vez de quebrar.
