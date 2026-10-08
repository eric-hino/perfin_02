-- =============================================================================
-- Cadastro aberto: qualquer pessoa cria conta (Google, ou e-mail e senha depois de
-- confirmar o e-mail) e entra com o papel "usuario". O admin bloqueia com ativo = false.
-- O papel NUNCA vem dos metadados enviados pelo cliente.
-- =============================================================================

alter table public.usuarios_autorizados
  add column if not exists nome text check (nome is null or char_length(nome) between 1 and 100),
  add column if not exists origem text not null default 'admin' check (origem in ('admin', 'cadastro'));

comment on column public.usuarios_autorizados.nome is
  'Nome informado no cadastro ou pelo admin (dado de exibição, não confiável).';
comment on column public.usuarios_autorizados.origem is
  'admin = incluído pelo administrador; cadastro = criado pelo gatilho na confirmação da conta.';

-- O admin inclui com nome. "origem" fica sem grant: o insert do admin usa o padrão 'admin'.
grant insert (nome) on public.usuarios_autorizados to authenticated;

-- -----------------------------------------------------------------------------
-- Gatilho em auth.users: cria a linha "usuario/cadastro" quando a conta passa a ter
-- e-mail confirmado (Google já chega confirmado; senha, ao clicar no link).
-- -----------------------------------------------------------------------------
create or replace function public.registrar_usuario_cadastrado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_nome  text := nullif(btrim(left(regexp_replace(coalesce(
                    new.raw_user_meta_data ->> 'nome',
                    new.raw_user_meta_data ->> 'full_name',
                    new.raw_user_meta_data ->> 'name', ''), '[[:cntrl:]]', '', 'g'), 100)), '');
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  -- Em UPDATE, só na PRIMEIRA confirmação: trocar o e-mail não cria linha nova
  -- (senão um usuário bloqueado escaparia do bloqueio trocando o e-mail).
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;
  -- Mesmo formato do check da tabela: um e-mail fora dele não pode derrubar o cadastro.
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return new;
  end if;

  -- Pré-cadastro do admin e bloqueios prevalecem; só completa o nome se faltar.
  insert into public.usuarios_autorizados (email, papel, ativo, origem, nome, criado_por)
  values (v_email, 'usuario', true, 'cadastro', v_nome, 'cadastro')
  on conflict (email) do update
    set nome = coalesce(public.usuarios_autorizados.nome, excluded.nome)
    where public.usuarios_autorizados.nome is null and excluded.nome is not null;
  return new;
end;
$$;

revoke execute on function public.registrar_usuario_cadastrado() from public, anon, authenticated;

drop trigger if exists registrar_usuario_cadastrado on auth.users;
create trigger registrar_usuario_cadastrado
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.registrar_usuario_cadastrado();

-- -----------------------------------------------------------------------------
-- Auth Hook "Before User Created": cadastro aberto; só recusa e-mail bloqueado ou
-- evento sem e-mail. Substitui a regra "senha só do admin principal": a confirmação
-- de e-mail obrigatória cobre a criação de conta com o e-mail de outra pessoa.
-- -----------------------------------------------------------------------------
create or replace function public.hook_antes_criar_usuario(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if v_email = '' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Acesso não autorizado.'));
  end if;
  if exists (select 1 from public.usuarios_autorizados u where u.email = v_email and not u.ativo) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Acesso bloqueado.'));
  end if;
  return '{}'::jsonb;
end;
$$;

revoke execute on function public.hook_antes_criar_usuario(jsonb) from public, anon, authenticated;
grant execute on function public.hook_antes_criar_usuario(jsonb) to supabase_auth_admin;
