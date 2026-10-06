-- =============================================================================
-- Funções públicas (site) e dados iniciais (catálogo e parâmetros)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo inicial de indicadores
-- -----------------------------------------------------------------------------
insert into public.indicadores
  (codigo, nome, nome_curto, unidade, casas, frequencia, tipo_serie, agregacao, fonte, serie, cor, curva_projecao, publico, ordem)
values
  ('cdi',           'CDI',                                   'CDI',          '% a.d.',      6, 'diaria',     'taxa_periodo', 'composto',   'BCB_SGS',    '12',    '#101B2A', 'pre',           true,  1),
  ('selic_over',    'Selic efetiva (over)',                  'Selic over',   '% a.d.',      6, 'diaria',     'taxa_periodo', 'composto',   'BCB_SGS',    '11',    '#6D6E71', 'pre',           false, 2),
  ('selic_meta',    'Meta Selic (Copom)',                    'Selic meta',   '% a.a.',      2, 'diaria',     'taxa',         'ultimo',     'BCB_SGS',    '432',   '#002440', 'pre',           true,  3),
  ('ipca',          'IPCA',                                  'IPCA',         '% a.m.',      2, 'mensal',     'taxa_periodo', 'composto',   'BCB_SGS',    '433',   '#A6452F', 'ipca_real',     true,  4),
  ('igpm',          'IGP-M',                                 'IGP-M',        '% a.m.',      2, 'mensal',     'taxa_periodo', 'composto',   'BCB_SGS',    '189',   '#C99A8C', 'igpm_real',     true,  5),
  ('dolar_ptax',    'Dólar PTAX venda',                      'Dólar',        'R$/US$',      4, 'diaria',     'nivel',        'fechamento', 'BCB_SGS',    '1',     '#004C88', 'cupom_cambial', true,  6),
  ('ibovespa',      'Ibovespa',                              'Ibovespa',     'pontos',      0, 'diaria',     'nivel',        'fechamento', 'B3_INDICES', 'IBOV',  '#4CAC87', null,            false, 7),
  ('imab',          'IMA-B (número-índice)',                 'IMA-B',        'pontos',      2, 'diaria',     'nivel',        'fechamento', 'ANBIMA_IMA', 'IMA-B', '#415765', 'ipca_real',     false, 8),
  ('imab_yield',    'IMA-B — taxa indicativa (IPCA +)',      'Yield IMA-B',  '% a.a.',      2, 'diaria',     'taxa',         'ultimo',     'ANBIMA_IMA', 'IMA-B', '#415765', null,            false, 9),
  ('imab_duration', 'IMA-B — duration',                      'Duration IMA-B','dias úteis', 0, 'diaria',     'auxiliar',     'ultimo',     'ANBIMA_IMA', 'IMA-B', '#6D6E71', null,            false, 10),
  ('idp',           'Investimento Direto no País (ingressos líquidos)', 'IDP', 'US$ mi',   1, 'mensal',     'fluxo',        'soma',       'BCB_SGS',    '22885', '#002440', null,            false, 11),
  ('fbcf',          'Formação Bruta de Capital Fixo',        'FBCF',         'R$ mi',       0, 'trimestral', 'fluxo',        'soma',       'IBGE_SIDRA', '1846',  '#415765', null,            false, 12);

-- -----------------------------------------------------------------------------
-- Parâmetros de negócio (editáveis pelo admin)
-- -----------------------------------------------------------------------------
insert into public.parametros (chave, valor, descricao) values
  ('meta_inflacao',
   '{"centro": 3.0, "tolerancia": 1.5}',
   'Meta de inflação (IPCA 12 meses): centro e tolerância, em % e p.p.'),
  ('limiares_insights',
   '{
      "aceleracao_pp": 1.0,
      "descolamento_igpm_ipca_pp": 3.0,
      "juro_real_restritivo_pct": 5.0,
      "juro_real_expansionista_pct": 2.0,
      "dolar_variacao_mes_pct": 5.0,
      "drawdown_ibovespa_pct": 10.0,
      "mudanca_curva_pp": 0.25,
      "yield_imab_alto_pct": 6.0,
      "meses_extremo": 12
    }',
   'Limiares das regras de insights automáticos'),
  ('copom_reunioes',
   '{"datas": []}',
   'Datas (AAAA-MM-DD) das próximas reuniões do Copom, usadas na Selic implícita por reunião');

-- -----------------------------------------------------------------------------
-- destaques_publicos(): últimos valores dos indicadores marcados como públicos
-- (somente BCB/IBGE). Retorna só agregados, nunca a série completa.
-- -----------------------------------------------------------------------------
create or replace function public.destaques_publicos()
returns table (
  codigo          text,
  nome            text,
  unidade         text,
  casas           smallint,
  data_referencia date,
  valor           numeric,
  valor_anterior  numeric,
  acumulado_12m   numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with ultimos as (
    select i.codigo, i.nome, i.unidade, i.casas, i.tipo_serie, i.frequencia,
           (select max(v.data_referencia) from public.indicador_valores v
             where v.indicador_codigo = i.codigo) as data_ultima
    from public.indicadores i
    where i.publico and i.ativo
  )
  select
    u.codigo, u.nome, u.unidade, u.casas, u.data_ultima,
    (select v.valor from public.indicador_valores v
      where v.indicador_codigo = u.codigo and v.data_referencia = u.data_ultima),
    (select v.valor from public.indicador_valores v
      where v.indicador_codigo = u.codigo and v.data_referencia < u.data_ultima
      order by v.data_referencia desc limit 1),
    case when u.tipo_serie = 'taxa_periodo' then (
      select round((exp(sum(ln(1 + v.valor / 100))) - 1) * 100, 4)
      from public.indicador_valores v
      where v.indicador_codigo = u.codigo
        and v.data_referencia > (u.data_ultima - interval '12 months')::date
        and v.data_referencia <= u.data_ultima
      having count(*) >= case when u.frequencia = 'mensal' then 12 else 200 end
    ) end
  from ultimos u
  where u.data_ultima is not null
  order by u.codigo
$$;

revoke execute on function public.destaques_publicos() from public;
grant execute on function public.destaques_publicos() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- corrigir_valor(): correção monetária por IPCA ou IGP-M, do mês inicial ao
-- mês final, ambos inclusive (mesma convenção da Calculadora do Cidadão/BCB).
-- -----------------------------------------------------------------------------
create or replace function public.corrigir_valor(
  p_indice      text,
  p_mes_inicial date,
  p_mes_final   date,
  p_valor       numeric
)
returns table (
  indice          text,
  mes_inicial     date,
  mes_final       date,
  meses           integer,
  fator           numeric,
  variacao_pct    numeric,
  valor_original  numeric,
  valor_corrigido numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ini      date;
  v_fim      date;
  v_meses    integer;
  v_achados  integer;
  v_fator    numeric;
  v_ultimo   date;
begin
  if p_indice is null or p_indice not in ('ipca', 'igpm') then
    raise exception 'Índice inválido. Use ipca ou igpm.' using errcode = '22023';
  end if;
  if p_mes_inicial is null or p_mes_final is null then
    raise exception 'Informe o mês inicial e o mês final.' using errcode = '22023';
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 1000000000000 then
    raise exception 'Valor deve ser maior que zero e até 1 trilhão.' using errcode = '22023';
  end if;

  v_ini := date_trunc('month', p_mes_inicial)::date;
  v_fim := date_trunc('month', p_mes_final)::date;
  if v_ini > v_fim then
    raise exception 'O mês inicial deve ser anterior ou igual ao mês final.' using errcode = '22023';
  end if;

  v_meses := (extract(year from age(v_fim, v_ini)) * 12 + extract(month from age(v_fim, v_ini)))::integer + 1;
  if v_meses > 600 then
    raise exception 'Período máximo de 50 anos.' using errcode = '22023';
  end if;

  select count(*), exp(sum(ln(1 + v.valor / 100)))
    into v_achados, v_fator
  from public.indicador_valores v
  where v.indicador_codigo = p_indice
    and v.data_referencia between v_ini and v_fim;

  if v_achados < v_meses then
    select max(v.data_referencia) into v_ultimo
    from public.indicador_valores v where v.indicador_codigo = p_indice;
    raise exception 'Índice não disponível para todo o período (último mês divulgado: %).',
      coalesce(to_char(v_ultimo, 'MM/YYYY'), 'nenhum') using errcode = '22023';
  end if;

  return query select
    p_indice, v_ini, v_fim, v_meses,
    round(v_fator, 10),
    round((v_fator - 1) * 100, 6),
    p_valor,
    round(p_valor * v_fator, 2);
end;
$$;

revoke execute on function public.corrigir_valor(text, date, date, numeric) from public;
grant execute on function public.corrigir_valor(text, date, date, numeric) to anon, authenticated;
