-- =============================================================================
-- Portal Perfin — estrutura inicial
--
-- Todas as tabelas têm RLS ligado. O papel anon não acessa nenhuma tabela:
-- o site público usa só as funções destaques_publicos() e corrigir_valor().
-- A escrita de dados de mercado é feita só pelo papel coletor_indicadores
-- (senha definida manualmente, fora do git). Não há uso de service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitário: mantém atualizado_em em dia
-- -----------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

revoke execute on function public.tocar_atualizado_em() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Usuários autorizados (lista gerida pelo admin)
-- -----------------------------------------------------------------------------
create table public.usuarios_autorizados (
  email         text primary key
                check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  papel         text not null default 'usuario' check (papel in ('admin', 'usuario')),
  ativo         boolean not null default true,
  -- Admin principal (o ADMIN_EMAIL do ambiente). Definido só por SQL manual.
  principal     boolean not null default false,
  criado_por    text default (auth.jwt() ->> 'email'),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index usuarios_autorizados_um_principal
  on public.usuarios_autorizados (principal) where principal;

create trigger usuarios_autorizados_atualizado_em
  before update on public.usuarios_autorizados
  for each row execute function public.tocar_atualizado_em();

-- O admin principal não pode ser removido, desativado nem rebaixado.
create or replace function public.proteger_admin_principal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.principal then
      raise exception 'O administrador principal não pode ser removido.' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.principal and (
       new.papel <> 'admin' or not new.ativo or not new.principal or new.email <> old.email
     ) then
    raise exception 'O administrador principal não pode ser alterado.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.proteger_admin_principal() from public, anon, authenticated;

create trigger usuarios_autorizados_protege_principal
  before update or delete on public.usuarios_autorizados
  for each row execute function public.proteger_admin_principal();

-- -----------------------------------------------------------------------------
-- Funções de perfil (base das policies)
-- -----------------------------------------------------------------------------
create or replace function public.perfil_atual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.papel
  from public.usuarios_autorizados u
  where u.ativo
    and u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.eh_autorizado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.perfil_atual() in ('admin', 'usuario'), false)
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.perfil_atual() = 'admin', false)
$$;

revoke execute on function public.perfil_atual() from public, anon;
revoke execute on function public.eh_autorizado() from public, anon;
revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.perfil_atual() to authenticated;
grant execute on function public.eh_autorizado() to authenticated;
grant execute on function public.eh_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Auth Hook "Before User Created": só e-mails autorizados criam conta,
-- e cadastro por e-mail/senha só para administradores.
-- -----------------------------------------------------------------------------
create or replace function public.hook_antes_criar_usuario(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email    text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  v_provider text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '');
  v_papel    text;
begin
  select u.papel into v_papel
  from public.usuarios_autorizados u
  where u.email = v_email and u.ativo;

  if v_papel is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Acesso não autorizado.'));
  end if;

  if v_provider = 'email' and v_papel <> 'admin' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Acesso não autorizado.'));
  end if;

  return '{}'::jsonb;
end;
$$;

revoke execute on function public.hook_antes_criar_usuario(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_antes_criar_usuario(jsonb) to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Catálogo de indicadores
-- -----------------------------------------------------------------------------
create table public.indicadores (
  codigo         text primary key check (codigo ~ '^[a-z][a-z0-9_]*$'),
  nome           text not null,
  nome_curto     text not null,
  unidade        text not null,
  casas          smallint not null default 2 check (casas between 0 and 8),
  frequencia     text not null check (frequencia in ('diaria', 'mensal', 'trimestral')),
  tipo_serie     text not null check (tipo_serie in ('taxa_periodo', 'nivel', 'taxa', 'fluxo', 'auxiliar')),
  agregacao      text not null check (agregacao in ('composto', 'fechamento', 'ultimo', 'soma')),
  fonte          text not null check (fonte in ('BCB_SGS', 'IBGE_SIDRA', 'B3_INDICES', 'ANBIMA_IMA')),
  serie          text not null,
  cor            text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  curva_projecao text check (curva_projecao in ('pre', 'ipca_real', 'igpm_real', 'cupom_cambial')),
  -- Pode aparecer no site público (só dados BCB/IBGE, de livre reprodução).
  publico        boolean not null default false,
  ordem          smallint not null default 0,
  ativo          boolean not null default true,
  atualizado_em  timestamptz not null default now(),
  constraint indicadores_publico_so_bcb_ibge
    check (not publico or fonte in ('BCB_SGS', 'IBGE_SIDRA'))
);

create trigger indicadores_atualizado_em
  before update on public.indicadores
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- Valores (formato longo: uma linha por indicador e data)
-- Mensal = dia 1 do mês; trimestral = dia 1 do trimestre.
-- -----------------------------------------------------------------------------
create table public.indicador_valores (
  indicador_codigo text not null references public.indicadores (codigo) on update cascade,
  data_referencia  date not null,
  valor            numeric not null,
  coletado_em      timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  primary key (indicador_codigo, data_referencia)
);

create index indicador_valores_data on public.indicador_valores (data_referencia);

create trigger indicador_valores_atualizado_em
  before update on public.indicador_valores
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- Curvas de mercado (B3 Taxas Referenciais), uma por dia útil
-- -----------------------------------------------------------------------------
create table public.curvas_mercado (
  data_base     date not null,
  curva         text not null check (curva in ('pre', 'ipca_real', 'igpm_real', 'cupom_cambial')),
  dias_corridos integer not null check (dias_corridos > 0),
  dias_uteis    integer not null check (dias_uteis >= 0),
  taxa          numeric not null,          -- % a.a. (252 du para pré/real; linear 360 para cupom)
  fonte         text not null default 'B3_TAXAS_REFERENCIAIS',
  coletado_em   timestamptz not null default now(),
  primary key (data_base, curva, dias_corridos)
);

create index curvas_mercado_curva_data on public.curvas_mercado (curva, data_base desc);

-- -----------------------------------------------------------------------------
-- Feriados nacionais (calendário de dias úteis, padrão ANBIMA)
-- -----------------------------------------------------------------------------
create table public.feriados (
  data      date primary key,
  descricao text not null
);

-- -----------------------------------------------------------------------------
-- Parâmetros de negócio (meta de inflação, limiares, calendário do Copom)
-- -----------------------------------------------------------------------------
create table public.parametros (
  chave          text primary key,
  valor          jsonb not null,
  descricao      text not null,
  atualizado_por text,
  atualizado_em  timestamptz not null default now()
);

create or replace function public.registrar_autor_parametro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.jwt() ->> 'email';
  return new;
end;
$$;

revoke execute on function public.registrar_autor_parametro() from public, anon, authenticated;

create trigger parametros_autor
  before update on public.parametros
  for each row execute function public.registrar_autor_parametro();

-- -----------------------------------------------------------------------------
-- Log de execuções do coletor
-- -----------------------------------------------------------------------------
create table public.coletas (
  id            bigint generated always as identity primary key,
  iniciada_em   timestamptz not null default now(),
  finalizada_em timestamptz,
  status        text not null default 'executando'
                check (status in ('executando', 'sucesso', 'parcial', 'falha')),
  detalhes      jsonb not null default '{}'::jsonb
);

create index coletas_iniciada on public.coletas (iniciada_em desc);

-- -----------------------------------------------------------------------------
-- Credenciais Google (refresh token cifrado pela aplicação, AES-256-GCM)
-- -----------------------------------------------------------------------------
create table public.google_credenciais (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  refresh_token_cifrado text not null,
  escopos               text[] not null default '{}',
  atualizado_em         timestamptz not null default now()
);

create trigger google_credenciais_atualizado_em
  before update on public.google_credenciais
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- Relatórios mensais gerados
-- -----------------------------------------------------------------------------
create table public.relatorios (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes_referencia     date not null check (extract(day from mes_referencia) = 1),
  planilha_id        text not null,
  planilha_url       text not null check (planilha_url like 'https://docs.google.com/%'),
  rascunho_id        text,
  rascunho_criado_em timestamptz,
  criado_em          timestamptz not null default now()
);

create index relatorios_usuario on public.relatorios (user_id, criado_em desc);

-- =============================================================================
-- Privilégios: nada para anon; authenticated só o necessário (RLS filtra linhas)
-- =============================================================================
revoke all on table
  public.usuarios_autorizados, public.indicadores, public.indicador_valores,
  public.curvas_mercado, public.feriados, public.parametros, public.coletas,
  public.google_credenciais, public.relatorios
from anon, authenticated;

grant select, delete on public.usuarios_autorizados to authenticated;
grant insert (email, papel, ativo) on public.usuarios_autorizados to authenticated;
grant update (papel, ativo) on public.usuarios_autorizados to authenticated;

grant select on public.indicadores to authenticated;
grant update (ativo, ordem) on public.indicadores to authenticated;

grant select on public.indicador_valores, public.curvas_mercado, public.feriados to authenticated;

grant select on public.parametros to authenticated;
grant update (valor) on public.parametros to authenticated;

grant select on public.coletas to authenticated;

grant select, insert, update, delete on public.google_credenciais to authenticated;

grant select on public.relatorios to authenticated;
grant insert (mes_referencia, planilha_id, planilha_url) on public.relatorios to authenticated;
grant update (rascunho_id, rascunho_criado_em) on public.relatorios to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.usuarios_autorizados enable row level security;
alter table public.indicadores          enable row level security;
alter table public.indicador_valores    enable row level security;
alter table public.curvas_mercado       enable row level security;
alter table public.feriados             enable row level security;
alter table public.parametros           enable row level security;
alter table public.coletas              enable row level security;
alter table public.google_credenciais   enable row level security;
alter table public.relatorios           enable row level security;

-- usuarios_autorizados: só administradores gerenciam
create policy "usuarios: admin lê" on public.usuarios_autorizados
  for select to authenticated using ((select public.eh_admin()));
create policy "usuarios: admin inclui" on public.usuarios_autorizados
  for insert to authenticated with check ((select public.eh_admin()));
create policy "usuarios: admin altera" on public.usuarios_autorizados
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy "usuarios: admin remove" on public.usuarios_autorizados
  for delete to authenticated using ((select public.eh_admin()));

-- indicadores
create policy "indicadores: autorizados leem" on public.indicadores
  for select to authenticated using ((select public.eh_autorizado()));
create policy "indicadores: admin altera" on public.indicadores
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

-- dados de mercado: leitura para autorizados
create policy "valores: autorizados leem" on public.indicador_valores
  for select to authenticated using ((select public.eh_autorizado()));
create policy "curvas: autorizados leem" on public.curvas_mercado
  for select to authenticated using ((select public.eh_autorizado()));
create policy "feriados: autorizados leem" on public.feriados
  for select to authenticated using ((select public.eh_autorizado()));

-- parâmetros
create policy "parametros: autorizados leem" on public.parametros
  for select to authenticated using ((select public.eh_autorizado()));
create policy "parametros: admin altera" on public.parametros
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

-- coletas: só admin acompanha
create policy "coletas: admin lê" on public.coletas
  for select to authenticated using ((select public.eh_admin()));

-- credenciais Google: só o dono
create policy "credenciais: dono lê" on public.google_credenciais
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.eh_autorizado()));
create policy "credenciais: dono inclui" on public.google_credenciais
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.eh_autorizado()));
create policy "credenciais: dono altera" on public.google_credenciais
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.eh_autorizado()))
  with check (user_id = (select auth.uid()) and (select public.eh_autorizado()));
create policy "credenciais: dono remove" on public.google_credenciais
  for delete to authenticated using (user_id = (select auth.uid()));

-- relatórios: só o dono
create policy "relatorios: dono lê" on public.relatorios
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.eh_autorizado()));
create policy "relatorios: dono inclui" on public.relatorios
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.eh_autorizado()));
create policy "relatorios: dono altera" on public.relatorios
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.eh_autorizado()))
  with check (user_id = (select auth.uid()) and (select public.eh_autorizado()));

-- =============================================================================
-- Papel do coletor (GitHub Actions). Senha definida manualmente:
--   alter role coletor_indicadores with login password '<senha forte>';
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'coletor_indicadores') then
    create role coletor_indicadores nologin noinherit;
  end if;
end;
$$;

grant usage on schema public to coletor_indicadores;
grant select on public.indicadores to coletor_indicadores;
grant select, insert, update on public.indicador_valores to coletor_indicadores;
grant select, insert, update on public.curvas_mercado to coletor_indicadores;
grant select, insert, update on public.feriados to coletor_indicadores;
grant select, insert, update on public.coletas to coletor_indicadores;

create policy "indicadores: coletor lê" on public.indicadores
  for select to coletor_indicadores using (true);
create policy "valores: coletor lê" on public.indicador_valores
  for select to coletor_indicadores using (true);
create policy "valores: coletor inclui" on public.indicador_valores
  for insert to coletor_indicadores with check (true);
create policy "valores: coletor altera" on public.indicador_valores
  for update to coletor_indicadores using (true) with check (true);
create policy "curvas: coletor lê" on public.curvas_mercado
  for select to coletor_indicadores using (true);
create policy "curvas: coletor inclui" on public.curvas_mercado
  for insert to coletor_indicadores with check (true);
create policy "curvas: coletor altera" on public.curvas_mercado
  for update to coletor_indicadores using (true) with check (true);
create policy "feriados: coletor lê" on public.feriados
  for select to coletor_indicadores using (true);
create policy "feriados: coletor inclui" on public.feriados
  for insert to coletor_indicadores with check (true);
create policy "feriados: coletor altera" on public.feriados
  for update to coletor_indicadores using (true) with check (true);
create policy "coletas: coletor lê" on public.coletas
  for select to coletor_indicadores using (true);
create policy "coletas: coletor inclui" on public.coletas
  for insert to coletor_indicadores with check (true);
create policy "coletas: coletor altera" on public.coletas
  for update to coletor_indicadores using (true) with check (true);
