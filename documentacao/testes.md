# Testes e comandos

| Onde | Comando | O que cobre |
|---|---|---|
| `aplicativo/portal` | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | Ver a lista abaixo |
| `aplicativo/coletor` | `python -m pytest -q` | Interpretação de cada fonte com amostras reais (`testes/fixtures`), formatos inesperados, datas futuras do SGS, afinamento das curvas, falha num dia sem perder os dias bons, feriados (Páscoa, Consciência Negra, 252 dias úteis em 2025) |
| `aplicativo/supabase` | `python -m pytest aplicativo/supabase/testes -q` (só local, com `DATABASE_URL`; roda em transação desfeita) | RLS: anon não lê tabelas e só usa as funções públicas; não autorizado não vê dados; usuário não administra; admin principal protegido; privilégios mínimos do coletor; Auth Hook |
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
