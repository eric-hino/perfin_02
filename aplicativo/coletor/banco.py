# -*- coding: utf-8 -*-
"""Acesso ao Supabase pelo papel coletor_indicadores (COLETOR_DATABASE_URL)."""

from __future__ import annotations

import json
import os
from datetime import date

from fontes.comum import PontoCurva, Valor

LOTE = 1000


def conectar():
    import psycopg

    url = os.environ.get("COLETOR_DATABASE_URL")
    if not url:
        raise SystemExit("Defina a variável de ambiente COLETOR_DATABASE_URL.")
    try:
        return psycopg.connect(url, connect_timeout=20, autocommit=True)
    except psycopg.OperationalError as erro:
        raise SystemExit(f"Não consegui conectar ao banco: {type(erro).__name__}")


def catalogo(con) -> list[dict]:
    cur = con.execute(
        "select codigo, fonte, serie, frequencia from public.indicadores where ativo order by ordem"
    )
    nomes = [c.name for c in cur.description]
    return [dict(zip(nomes, linha)) for linha in cur.fetchall()]


def ultima_data(con, indicador: str) -> date | None:
    return con.execute(
        "select max(data_referencia) from public.indicador_valores where indicador_codigo = %s",
        (indicador,),
    ).fetchone()[0]


def ultima_curva(con) -> date | None:
    return con.execute("select max(data_base) from public.curvas_mercado").fetchone()[0]


def datas_com_curva(con, desde: date) -> set[date]:
    cur = con.execute("select distinct data_base from public.curvas_mercado where data_base >= %s", (desde,))
    return {d for (d,) in cur.fetchall()}


def datas_com_valor(con, indicador: str, desde: date) -> set[date]:
    cur = con.execute(
        "select data_referencia from public.indicador_valores where indicador_codigo = %s and data_referencia >= %s",
        (indicador, desde),
    )
    return {d for (d,) in cur.fetchall()}


def gravar_valores(con, valores: list[Valor]) -> int:
    """Upsert que só regrava o que mudou. Retorna as linhas inseridas ou alteradas."""
    sql = (
        "insert into public.indicador_valores (indicador_codigo, data_referencia, valor) "
        "values (%s, %s, %s) "
        "on conflict (indicador_codigo, data_referencia) do update "
        "set valor = excluded.valor, coletado_em = now() "
        "where public.indicador_valores.valor is distinct from excluded.valor"
    )
    return _executar_em_lotes(con, sql, [(v.indicador, v.data, v.valor) for v in valores])


def gravar_curvas(con, pontos: list[PontoCurva]) -> int:
    sql = (
        "insert into public.curvas_mercado (data_base, curva, dias_corridos, dias_uteis, taxa) "
        "values (%s, %s, %s, %s, %s) "
        "on conflict (data_base, curva, dias_corridos) do update "
        "set dias_uteis = excluded.dias_uteis, taxa = excluded.taxa, coletado_em = now() "
        "where public.curvas_mercado.taxa is distinct from excluded.taxa"
    )
    linhas = [(p.data_base, p.curva, p.dias_corridos, p.dias_uteis, p.taxa) for p in pontos]
    return _executar_em_lotes(con, sql, linhas)


def gravar_feriados(con, feriados: dict[date, str]) -> int:
    sql = (
        "insert into public.feriados (data, descricao) values (%s, %s) "
        "on conflict (data) do update set descricao = excluded.descricao "
        "where public.feriados.descricao is distinct from excluded.descricao"
    )
    return _executar_em_lotes(con, sql, sorted(feriados.items()))


def _executar_em_lotes(con, sql: str, linhas: list[tuple]) -> int:
    total = 0
    with con.transaction():
        with con.cursor() as cur:
            for i in range(0, len(linhas), LOTE):
                cur.executemany(sql, linhas[i:i + LOTE], returning=False)
                total += max(cur.rowcount, 0)
    return total


def iniciar_coleta(con) -> int:
    return con.execute("insert into public.coletas default values returning id").fetchone()[0]


def finalizar_coleta(con, coleta_id: int, status: str, detalhes: dict) -> None:
    con.execute(
        "update public.coletas set status = %s, detalhes = %s::jsonb, finalizada_em = now() where id = %s",
        (status, json.dumps(detalhes, ensure_ascii=False, default=str), coleta_id),
    )
