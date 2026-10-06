-- =============================================================================
-- Leitura em lote para o Portal (a API REST limita cada consulta a 1.000 linhas).
-- As duas funções são SECURITY INVOKER: o RLS de quem chama continua valendo,
-- então só usuários autorizados recebem dados.
-- =============================================================================

-- Séries compactas: {"cdi": [["2026-01-02", 0.0516], ...], "ipca": [...]}
create or replace function public.series_valores(p_codigos text[], p_de date, p_ate date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_codigos is null or cardinality(p_codigos) = 0 or cardinality(p_codigos) > 20 then
    raise exception 'Informe de 1 a 20 indicadores.' using errcode = '22023';
  end if;
  if p_de is null or p_ate is null or p_de > p_ate then
    raise exception 'Período inválido.' using errcode = '22023';
  end if;

  return coalesce((
    select jsonb_object_agg(codigo, pontos)
    from (
      select v.indicador_codigo as codigo,
             jsonb_agg(jsonb_build_array(v.data_referencia, v.valor) order by v.data_referencia) as pontos
      from public.indicador_valores v
      where v.indicador_codigo = any (p_codigos)
        and v.data_referencia between p_de and p_ate
      group by v.indicador_codigo
    ) s
  ), '{}'::jsonb);
end;
$$;

revoke execute on function public.series_valores(text[], date, date) from public, anon;
grant execute on function public.series_valores(text[], date, date) to authenticated;

-- Curvas do último dia útil disponível até p_data:
-- {"data_base": "2026-10-02", "curvas": {"pre": [[dc, du, taxa], ...], ...}}
create or replace function public.curvas_do_dia(p_data date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select max(c.data_base) as data_base
    from public.curvas_mercado c
    where c.data_base <= p_data
  )
  select case when b.data_base is null then null else jsonb_build_object(
    'data_base', b.data_base,
    'curvas', (
      select jsonb_object_agg(curva, vertices)
      from (
        select c.curva,
               jsonb_agg(jsonb_build_array(c.dias_corridos, c.dias_uteis, c.taxa) order by c.dias_corridos) as vertices
        from public.curvas_mercado c
        where c.data_base = b.data_base
        group by c.curva
      ) s
    )
  ) end
  from base b
$$;

revoke execute on function public.curvas_do_dia(date) from public, anon;
grant execute on function public.curvas_do_dia(date) to authenticated;
