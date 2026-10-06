-- =============================================================================
-- Auth Hook: cadastro por e-mail e senha só para o administrador PRINCIPAL.
--
-- Antes, qualquer e-mail de papel admin podia criar conta por senha. Como o
-- cadastro público continua ligado (o login Google precisa dele), alguém poderia
-- pré-criar a conta de um admin recém-incluído com uma senha escolhida por ele.
-- Os demais administradores entram com o Google.
-- =============================================================================

create or replace function public.hook_antes_criar_usuario(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email     text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  v_provider  text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '');
  v_principal boolean;
begin
  select u.principal into v_principal
  from public.usuarios_autorizados u
  where u.email = v_email and u.ativo;

  if v_principal is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Acesso não autorizado.'));
  end if;

  if v_provider = 'email' and not v_principal then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Acesso não autorizado.'));
  end if;

  return '{}'::jsonb;
end;
$$;

revoke execute on function public.hook_antes_criar_usuario(jsonb) from public, anon, authenticated;
grant execute on function public.hook_antes_criar_usuario(jsonb) to supabase_auth_admin;
