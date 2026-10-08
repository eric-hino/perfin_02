# Configuração: Vercel, Google Cloud, Supabase e GitHub

Neste guia:
- `<portal>` é a URL do Portal na Vercel (ex.: `https://portal-perfin.vercel.app`);
- `<site>` é a URL do site;
- `<ref>` é o subdomínio da `SUPABASE_URL` (`https://<ref>.supabase.co`).

## Situação em 08/10/2026

| Item | Situação |
|---|---|
| Site | Projeto Vercel `perfin-site` (Root Directory `website`), no ar |
| Portal | Projeto Vercel `perfin-portal` criado (Root Directory `aplicativo/portal`, Node 24, Git conectado), com as variáveis de produção cadastradas; URL `https://perfin-portal.vercel.app` |
| Coletor | Secret `COLETOR_DATABASE_URL` gravado no GitHub; workflow rodando com sucesso |
| Ainda falta | Google Cloud (seção 2) e Supabase (seção 3): sem isso a página de login abre, mas o "Entrar com Google" não completa |

**Problemas que já aconteceram:**
- "Entrar no Portal" mostrava "This page doesn't exist". O site aponta para `NEXT_PUBLIC_PORTAL_URL`, e o projeto do Portal não existia na Vercel (`DEPLOYMENT_NOT_FOUND`).
- O workflow "Coletar indicadores" falhava com "Defina a variável de ambiente COLETOR_DATABASE_URL" porque o secret não tinha sido gravado.
- No Windows, se `banco.py senha-coletor --github` disser que o `gh` não está autenticado, mesmo com `gh auth status` dizendo o contrário, rode o comando abaixo. Ele passa o token da sessão por variável de ambiente.
  ```bash
  GH_TOKEN="$(gh auth token)" python aplicativo/supabase/banco.py senha-coletor --github
  ```
- **Não use `vercel deploy` a partir da pasta do repositório:** o CLI envia arquivos locais fora do git, como `.env` e `dados_perfin.txt`. O deploy é feito pelo `git push`, com o Git conectado.

## 1. Vercel

**Projetos:** crie 2 a partir do repositório `eric-hino/perfin_02`.

| Projeto | Root Directory | Framework |
|---|---|---|
| `portal` | `aplicativo/portal` | Next.js |
| `site` | `website` | Next.js |

O nome do projeto define a URL `https://<nome>.vercel.app`.

**Variáveis do Portal** (ambiente *Production*):
- `NEXT_PUBLIC_SITE_URL` = `<portal>`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`, gerada com:
  ```bash
  python -c "import secrets,base64;print(base64.b64encode(secrets.token_bytes(32)).decode())"
  ```
- `ADMIN_EMAIL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (opcional)

**Variáveis do site:**
- `NEXT_PUBLIC_SITE_URL` = `<site>`
- `NEXT_PUBLIC_PORTAL_URL` = `<portal>`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

**Deploy:** depois de cadastrar as variáveis, faça um novo deploy. Variáveis `NEXT_PUBLIC_*` entram no build, então qualquer mudança nelas exige outro deploy.

## 2. Google Cloud Console (projeto do OAuth client atual)

1. **APIs e serviços → Biblioteca:** ative **Google Calendar API**, **Google Drive API**, **Google Sheets API** e **Gmail API**.
2. **Google Auth Platform → Branding:**
   - nome "Portal Perfin" e e-mail de suporte;
   - página inicial `<site>`;
   - política de privacidade `<portal>/privacidade`;
   - domínios autorizados: `<portal sem https://>`, `<site sem https://>` e `<ref>.supabase.co`.
3. **Data Access:** adicione os escopos:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/gmail.compose`
4. **Audience:** tipo *External*.
   - **In production** (recomendado): mostra o aviso "app não verificado" e aceita até 100 usuários, sem expiração.
   - *Testing*: cadastre os e-mails como test users; o login expira a cada 7 dias.
5. **Clients → seu cliente Web:**
   - **Authorized JavaScript origins:** `<portal>`
   - **Authorized redirect URIs:** `https://<ref>.supabase.co/auth/v1/callback`. É a URL do **Supabase**, não a da Vercel.
6. **Recomendado:** restrinja a chave do Gemini à *Generative Language API*.

## 3. Supabase

As migrações já foram aplicadas e o admin principal já está em `usuarios_autorizados`.

1. **Authentication → Sign In / Providers → Google:** ative e cole o Client ID e o Client Secret.
2. **Authentication → Sign In / Providers → Email:** mantenha ativo (é o login do admin), com *Confirm email* ligado.
3. **Authentication → URL Configuration:**
   - **Site URL** = `<portal>`
   - **Redirect URLs** = `<portal>/auth/callback`
4. **Authentication → Users → Add user:**
   - e-mail = `ADMIN_EMAIL`, com uma **senha forte nova** (16 caracteres ou mais) e *Auto Confirm*;
   - a senha fica só no Supabase, e a `ADMIN_PASSWORD` pode sair do `.env`.
5. **Authentication → Policies (Password):** defina o comprimento mínimo de 12.
6. **Authentication → Auth Hooks → Before User Created:** tipo Postgres, função `public.hook_antes_criar_usuario`.

## 4. GitHub

1. Grave o secret do coletor. O comando gera uma senha nova para o papel `coletor_indicadores` e grava `COLETOR_DATABASE_URL` sem exibir nada:
   ```bash
   python aplicativo/supabase/banco.py senha-coletor --github
   ```
2. **Actions → Coletar indicadores → Run workflow:** rode uma vez para conferir. O resultado aparece em Portal → Admin → Coleta.
3. Se o repositório for público, o GitHub desativa agendamentos depois de 60 dias sem atividade. O Admin → Coleta avisa quando não há coleta há 4 dias ou mais.

## 5. `.env` local

Só é necessário para migrações e testes de RLS: `DATABASE_URL`. As demais variáveis ficam na Vercel e no GitHub. Veja `.env.example`.
