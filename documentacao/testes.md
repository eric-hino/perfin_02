# Testes e comandos

| Onde | Comando | O que cobre |
|---|---|---|
| `aplicativo/portal` | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | Ver a lista abaixo |
| `aplicativo/coletor` | `python -m pytest -q` | Interpretação de cada fonte com amostras reais (`testes/fixtures`), formatos inesperados, datas futuras do SGS, afinamento das curvas, falha num dia sem perder os dias bons, feriados (Páscoa, Consciência Negra, 252 dias úteis em 2025) |
| `aplicativo/supabase` | `python -m pytest aplicativo/supabase/testes -q` (com `DATABASE_URL`; roda em transação desfeita; no CI, contra um Supabase local) | RLS: anon não lê tabelas e só usa as funções públicas; não autorizado e bloqueado não veem dados; usuário não administra nem se autopromove; admin principal protegido; privilégios mínimos do coletor. Auth Hook: aceita e-mail novo, recusa bloqueado. Gatilho de cadastro: cria `usuario`/`cadastro` só depois da confirmação, ignora papel nos metadados, preserva o pré-cadastro, não reativa bloqueado e não cria linha na troca de e-mail |
| `website` | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | Formatação e montagem dos cartões |

**O que os testes do Portal cobrem:**
- retornos (nível, CDI, IPCA pro rata, modos, anualização, rebase, janelas);
- projeções (flat-forward, termo, implícita, cupom, paridade, encadeamento);
- inflação e agregação;
- filtros;
- MIME e o "nunca envia e-mail";
- cifra AES-GCM;
- rotas (401, 403 e 400).

**Resultado em 06/10/2026:**

| Suíte | Resultado |
|---|---|
| Portal | 254 testes passando (inclui insights regra a regra, relatório, bordas das projeções, cartões, datas, agregação e grade do gráfico); lint, typecheck e build sem erros |
| Coletor | 25 testes passando |
| RLS | 10 passando e 1 pulado (sem usuários no Auth ainda) |
| Site | 4 testes passando; lint, typecheck e build sem erros |

O sistema roda pela URL da Vercel. Os testes rodam localmente, sem subir servidor.

## CI no GitHub (`.github/workflows/ci.yml`)

Roda em toda PR para o `main` e em todo push no `main`. Todos os jobs rodam sempre, e os cinco são checks obrigatórios do `main`.

| Job | O que faz |
|---|---|
| `portal` | Node 24, `npm ci`, lint, typecheck (`next typegen && tsc`), testes e build. O build roda **sem variáveis de ambiente**, para provar que não depende de segredos |
| `site` | O mesmo, em `website` |
| `coletor` | Python 3.12 e `pytest` |
| `banco` | Supabase CLI (versão fixa) sobe Postgres e Auth locais com `aplicativo/supabase/config.toml`, aplica as migrações e roda os testes de RLS. Não toca a produção |
| `segredos` | gitleaks em todo o histórico, para barrar chave commitada |

**Outros arquivos:**
- `.github/dependabot.yml` abre PRs semanais de atualização: npm (portal e site), pip (coletor e supabase) e GitHub Actions.
- `.github/pull_request_template.md` traz o checklist de testes, documentação, migração e configuração externa.

**Proteção do `main`:**
- o merge exige PR, os cinco checks verdes e a branch atualizada;
- não há revisão obrigatória, porque o projeto tem um único desenvolvedor;
- force-push é bloqueado.

**Testar uma migração nova contra a produção sem gravar:** aplique o SQL dentro da transação de cada teste e desfaça no fim (`lock_timeout` curto para não travar o Auth). A fixture `con` já define `lock_timeout = 5s`.
