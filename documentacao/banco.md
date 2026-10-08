# Banco de dados (Supabase)

Migrações em `aplicativo/supabase/migrations/`, aplicadas por `python aplicativo/supabase/banco.py migrar`. O controle fica em `supabase_migrations.schema_migrations`, a mesma tabela do Supabase CLI.

| Migração | Conteúdo |
|---|---|
| `20261006120000_estrutura_portal.sql` | Tabelas, RLS, funções de perfil, Auth Hook, papel do coletor e privilégios |
| `20261006120100_funcoes_publicas_e_catalogo.sql` | Catálogo de indicadores, parâmetros iniciais, `destaques_publicos()` e `corrigir_valor()` |
| `20261006120200_leitura_em_lote.sql` | `series_valores()` e `curvas_do_dia()` (security invoker) |
| `20261006120300_hook_senha_so_principal.sql` | Auth Hook: cadastro por senha só para o admin principal (substituída pela regra abaixo) |
| `20261009120000_cadastro_aberto.sql` | Cadastro aberto: colunas `nome` e `origem`, gatilho `registrar_usuario_cadastrado` em `auth.users` e Auth Hook que só recusa e-mail bloqueado |

## Tabelas (RLS ligado em todas; `anon` sem privilégio em nenhuma)

| Tabela | Leitura | Escrita |
|---|---|---|
| `usuarios_autorizados` | admin | admin: inclui (`email`, `papel`, `ativo`, `nome`) e altera `papel` e `ativo`. O principal é protegido por gatilho. As linhas de cadastro são criadas pelo gatilho em `auth.users` |
| `indicadores` | autorizados, coletor | admin (`ativo`, `ordem`) |
| `indicador_valores` | autorizados, coletor | coletor (insert/update; sem delete) |
| `curvas_mercado` | autorizados, coletor | coletor |
| `feriados` | autorizados, coletor | coletor |
| `parametros` | autorizados | admin (`valor`) |
| `coletas` | admin, coletor | coletor |
| `google_credenciais` | só o dono | só o dono |
| `relatorios` | só o dono | só o dono (insert; update do rascunho) |

## Funções

| Função | Quem executa | Para quê |
|---|---|---|
| `perfil_atual()`, `eh_autorizado()`, `eh_admin()` | authenticated | Base das policies. `security definer` e `search_path=''`; leem `auth.jwt()->>'email'` |
| `hook_antes_criar_usuario(event)` | supabase_auth_admin | Auth Hook *Before User Created*: recusa só e-mail bloqueado (`ativo = false`) ou evento sem e-mail |
| `registrar_usuario_cadastrado()` | gatilho em `auth.users` (insert e confirmação do e-mail) | Cria a linha `usuario`/`cadastro` na primeira confirmação do e-mail. Ignora o papel dos metadados, preserva o pré-cadastro do admin e não cria linha na troca de e-mail |
| `destaques_publicos()` | anon, authenticated | Últimos valores dos indicadores públicos (BCB/IBGE) |
| `corrigir_valor(indice, mes_inicial, mes_final, valor)` | anon, authenticated | Correção por IPCA ou IGP-M, com validação dos parâmetros |
| `series_valores(codigos, de, ate)`, `curvas_do_dia(data)` | authenticated | Leitura em lote, sujeita ao RLS |

## Papel `coletor_indicadores`

- É criado `NOLOGIN` na migração. A senha é definida (e trocada) por `python aplicativo/supabase/banco.py senha-coletor`, que nunca a exibe.
- Tem só os privilégios das linhas "coletor" acima.
- O `service_role` não é usado em lugar nenhum.

## Ferramentas (`aplicativo/supabase/banco.py`)

Leem a `DATABASE_URL` do ambiente ou do `.env`. Sem IPv6, usam o Session Pooler `aws-0-sa-east-1`, configurável em `SUPABASE_POOLER_HOST`.

| Comando | O que faz |
|---|---|
| `migrar` | Aplica as migrações pendentes |
| `admin` | Cadastra o `ADMIN_EMAIL` como admin principal |
| `senha-coletor --github` | Gera nova senha do coletor e grava o secret `COLETOR_DATABASE_URL` no GitHub (usa o `gh`) |
| `senha-coletor --coletar <args>` | Gera nova senha e roda o coletor localmente com ela |
