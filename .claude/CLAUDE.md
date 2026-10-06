# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual

Portal Perfin: central de análise de indicadores econômicos. Stack: Next.js 16 (App Router) + TypeScript, Supabase (Postgres com RLS), Vercel, coletor Python no GitHub Actions. O sistema roda pela URL da Vercel (`NEXT_PUBLIC_SITE_URL`), não em localhost. Visão geral em `documentacao/README.md`.

## Comandos

Node.js está em `%LOCALAPPDATA%\Programs\node-v24.19.0-win-x64` (instalação de usuário).

```bash
# Portal e site (rodar dentro de aplicativo/portal ou website)
npm run lint && npm run typecheck && npm run test && npm run build

# Coletor
cd aplicativo/coletor && python -m pytest -q

# Banco (lê DATABASE_URL do .env; sem IPv6 usa o Session Pooler)
python aplicativo/supabase/banco.py migrar
python -m pytest aplicativo/supabase/testes -q        # RLS, em transação desfeita
python aplicativo/supabase/banco.py senha-coletor --github
```

## Estrutura

- `aplicativo/portal/` — Portal Next.js: `src/dominio` (cálculos puros e testados), `src/servicos` (Supabase/Google/Gemini, `server-only`), `src/componentes` (UI), `src/app` (rotas)
- `aplicativo/coletor/` — coletor Python (BCB, IBGE, B3, ANBIMA)
- `aplicativo/supabase/` — migrações SQL, `banco.py` e testes de RLS
- `website/` — site institucional público (Next.js)
- `documentacao/` — documentação do projeto (requisitos, decisões, manuais)

As áreas são independentes. Uma mudança em uma não deve exigir edição em outra sem necessidade explícita.

## Configuração do Claude (`.claude/`)

- `rules/` — regras permanentes do projeto, carregadas em toda sessão: idioma, documentação, fluxo de trabalho com agentes, arquitetura, React/Next.js e segurança.
- `agents/` — subagentes: `architect` (análise, só leitura), `frontend` (React/Next.js), `tester` (testes) e `reviewer` (code review, só leitura).
- `skills/` — processos reutilizáveis: `implementar-funcionalidade` e `corrigir-bug`.
- `hooks/` + `settings.json` — ações obrigatórias: bloqueia a edição de arquivos com credenciais (`.env`, chaves) e de lockfiles, e, ao final da resposta, cobra a atualização de `documentacao/` quando `aplicativo/` ou `website/` mudou. Os hooks exigem `python3` no PATH.
