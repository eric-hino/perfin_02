# perfin_02 — Portal Perfin

Central de análise de indicadores econômicos do time Perfin:
- retornos comparáveis em qualquer janela;
- projeções implícitas nas curvas de juros da B3;
- insights automáticos;
- relatório do mês (Google Planilhas, Excel e rascunho no Gmail);
- agenda;
- assistente com Gemini;
- site público com indicadores em destaque e calculadora de correção.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `aplicativo/portal/` | Portal (Next.js + TypeScript), publicado na Vercel |
| `aplicativo/coletor/` | Coletor de indicadores (Python), roda no GitHub Actions |
| `aplicativo/supabase/` | Migrações do banco (Supabase), ferramentas e testes de RLS |
| `website/` | Site institucional público (Next.js), publicado na Vercel |
| `documentacao/` | Regras de negócio, arquitetura, configuração e segurança |
| `.claude/` | Configuração do Claude Code compartilhada pela equipe |

## Tecnologias

Next.js 16, React 19, TypeScript, Supabase (Postgres com RLS), Apache ECharts, Python 3, GitHub Actions e Vercel.

## Primeiros passos

1. Clone o repositório:

   ```bash
   git clone https://github.com/eric-hino/perfin_02.git
   ```

2. Crie o `.env` a partir do modelo. Localmente, só a `DATABASE_URL` é necessária (migrações e testes de RLS):

   ```bash
   cp .env.example .env
   ```

3. Siga [documentacao/configuracao.md](documentacao/configuracao.md) para configurar a Vercel, o Google Cloud, o Supabase e o GitHub.

4. Comandos de verificação:

   ```bash
   cd aplicativo/portal && npm install && npm run lint && npm run typecheck && npm run test && npm run build
   cd aplicativo/coletor && pip install -r requirements-dev.txt && python -m pytest -q
   ```

O sistema roda pela URL da Vercel, não em localhost.

## Claude Code

A pasta `.claude/` é versionada de propósito, para que toda a equipe use a mesma configuração:

- `CLAUDE.md` — contexto do projeto e comandos
- `rules/` — regras permanentes (idioma, documentação, fluxo de trabalho, arquitetura, React/Next.js, segurança)
- `agents/` — subagentes `architect`, `frontend`, `tester` e `reviewer`
- `skills/` — processos `implementar-funcionalidade` e `corrigir-bug`
- `hooks/` e `settings.json` — verificações automáticas (exigem `python3` no PATH)

Configurações pessoais ficam em `.claude/settings.local.json`, que não é versionado.

## Contribuição

- Documentação, comentários e mensagens em português (Brasil).
- Toda funcionalidade nova ou alterada deve ser refletida em `documentacao/`.
